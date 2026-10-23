import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { platformDb } from "./platform-db";
import { FEATURE_KEYS, type FeatureKey } from "./feature-catalog";
import { provisionNewTenant } from "./superadmin";
import { changeSubscription, changeFeature, changeUserAccess, recordPayment, changePaymentStatus, lockTenant } from "./control-plane";
import { permittedManagementOperations, type ManagementAdapter } from "./hub-management-http";
import { ManagementError, requirePeriod, requireTenantSlug, type ManagementCommand } from "./hub-management-contract";

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const limits = ["maxLocations", "maxProducts"];
function adaptPlan(p: { id: string; code: string; name: string; priceMonthly: number; maxLocations: number; maxProducts: number; features: Prisma.JsonValue; isActive: boolean; updatedAt: Date }) {
  return { id: p.id, code: p.code, name: p.name, description: "", priceCents: Math.round(p.priceMonthly * 100), currency: "ARS", active: p.isActive, limits: { maxLocations: p.maxLocations, maxProducts: p.maxProducts }, modules: Object.fromEntries(FEATURE_KEYS.map(key => [key, Array.isArray(p.features) && p.features.includes(key)])), version: digest(p) };
}
function offset(url: URL) {
  const n = Number(url.searchParams.get("offset") || "0");
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw new ManagementError(400, "OFFSET", "Paginación inválida.");
  return n;
}
async function detail(db: Prisma.TransactionClient, tenantId: string) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, include: {
    subscription: { include: { plan: true } }, features: { orderBy: { featureKey: "asc" } }, domains: { orderBy: { hostname: "asc" } },
    memberships: { orderBy: { id: "asc" }, include: { user: { select: { id: true, name: true, email: true, isSuperAdmin: true, updatedAt: true } } } },
    _count: { select: { orders: true, products: true, clients: true, locations: true } },
  } });
  if (!t) throw new ManagementError(404, "NOT_FOUND", "Comercio inexistente.");
  const allPayments = await db.saaSPayment.findMany({ where: { tenantId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const integrations = await db.tenantIntegration.findMany({ where: { tenantId }, orderBy: { type: "asc" }, select: { type: true, isActive: true, updatedAt: true } });
  const sub = t.subscription, plan = sub?.plan;
  const overrides = new Map(t.features.map(f => [f.featureKey, f.isEnabled]));
  const effective = Object.fromEntries(FEATURE_KEYS.map(key => [key, { enabled: overrides.get(key) ?? (Array.isArray(plan?.features) && plan.features.includes(key)), override: overrides.get(key) ?? null }]));
  const operational = ["ACTIVE", "TRIAL"].includes(t.status) && !!sub && ((sub.status === "ACTIVE" && sub.currentPeriodStart <= new Date() && sub.currentPeriodEnd > new Date()) || (sub.status === "TRIAL" && !!sub.trialEndsAt && sub.trialEndsAt > new Date()));
  // Count/usage changes do not invalidate an administrative form. All control-plane
  // rows and their native timestamps do, including native payment/feature edits.
  const version = digest({ id: t.id, name: t.name, slug: t.slug, status: t.status, updatedAt: t.updatedAt, subscription: sub, features: t.features, domains: t.domains, memberships: t.memberships, payments: allPayments, integrations });
  return { id: t.id, name: t.name, slug: t.slug, status: t.status, version, access: { enabled: operational, reason: operational ? null : "Estado o período no habilitado" }, plan: plan ? adaptPlan(plan) : null,
    subscription: sub ? { id: sub.id, planId: sub.planId, status: sub.status, start: sub.currentPeriodStart.toISOString(), end: sub.currentPeriodEnd.toISOString(), trialEndsAt: sub.trialEndsAt?.toISOString() || null, provider: sub.provider } : null,
    modules: effective, admins: t.memberships.filter(m => !m.user.isSuperAdmin).map(m => ({ id: m.user.id, name: m.user.name || "", email: m.user.email, role: m.role, active: true })), usage: t._count,
    payments: allPayments.slice(0, 100).map(p => ({ id: p.id, amountCents: Math.round(p.amount * 100), currency: p.currency, method: p.method || "", reference: p.reference, status: p.status, notes: p.notes, dueAt: p.dueAt?.toISOString() || null, paidAt: p.paidAt?.toISOString() || null, start: p.periodStart.toISOString(), end: p.periodEnd.toISOString(), createdAt: p.createdAt.toISOString() })),
    domains: t.domains.map(d => ({ hostname: d.hostname, primary: d.isPrimary, custom: d.isCustom, verified: !!d.verifiedAt })), integrations: integrations.map(i => ({ type: i.type, configured: true, active: i.isActive })) };
}
async function read(resource: string, url: URL) {
  if (resource === "catalog") return { operations: permittedManagementOperations(), modules: FEATURE_KEYS, limits, optionalLimits: [], currency: "ARS", destructiveDelete: false, paymentLifecycle: true, trialDates: true, statuses: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CANCELED"], preservesDomainAliases: true };
  if (resource === "plans") {
    const start = offset(url), rows = await platformDb.plan.findMany({ orderBy: { id: "asc" }, skip: start, take: 101 });
    return { items: rows.slice(0, 100).map(adaptPlan), nextOffset: rows.length > 100 ? start + 100 : null };
  }
  const tenantId = url.searchParams.get("tenantId") || undefined;
  if (resource === "audit") {
    const start = offset(url), rows = await platformDb.platformAuditLog.findMany({ where: tenantId ? { tenantId } : {}, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: start, take: 101, select: { id: true, tenantId: true, userId: true, action: true, resource: true, createdAt: true, details: true } });
    return { items: rows.slice(0, 100).map(r => ({ id: r.id, tenantId: r.tenantId, actor: r.details && typeof r.details === "object" && !Array.isArray(r.details) && typeof r.details.actor === "string" ? r.details.actor : r.userId, action: r.action, entity: r.resource, entityId: r.tenantId, result: "success", createdAt: r.createdAt.toISOString() })), nextOffset: rows.length > 100 ? start + 100 : null };
  }
  if (resource !== "tenant" || !tenantId) throw new ManagementError(400, "RESOURCE", "Recurso de gestión inválido.");
  return detail(platformDb, tenantId);
}
function current(actual: string, expected: string) { if (actual !== expected) throw new ManagementError(409, "STALE_VERSION", "Los datos cambiaron. Actualizá la ficha antes de guardar."); }
function planInput(i: Extract<ManagementCommand, { operation: "plan.create" | "plan.update" }>["input"]) {
  if (Object.keys(i.modules).some(k => !FEATURE_KEYS.includes(k as FeatureKey)) || Object.keys(i.limits).some(k => !limits.includes(k)) || !i.limits.maxLocations || !i.limits.maxProducts) throw new ManagementError(422, "PLAN_FEATURES", "Módulos o límites inválidos.");
  return { name: i.name, priceMonthly: i.priceCents / 100, maxLocations: i.limits.maxLocations, maxProducts: i.limits.maxProducts, features: FEATURE_KEYS.filter(k => i.modules[k]), isActive: i.active };
}
async function execute(command: ManagementCommand, fingerprint: string) {
  function receipt(row: { details: Prisma.JsonValue; action: string } | null) {
    if (!row) return null;
    const d = row.details as Record<string, Prisma.JsonValue>;
    if (row.action !== "hub.management" || d?.fingerprint !== fingerprint) throw new ManagementError(409, "IDEMPOTENCY_CONFLICT", "La solicitud ya se utilizó con otros datos.");
    return d.result;
  }
  const prior = await platformDb.platformAuditLog.findUnique({ where: { id: command.requestId } });
  if (prior) return receipt(prior);
  try {
    return await platformDb.$transaction(async tx => {
      // The existing primary key is the durable unique receipt. It is inserted
      // before any mutation, and completed in the same MariaDB transaction.
      await tx.platformAuditLog.create({ data: { id: command.requestId, action: "hub.management", resource: command.operation, details: { fingerprint, actor: command.actor } } });
      let tenantId = "tenantId" in command.input ? command.input.tenantId : null;
      if (tenantId) {
        await lockTenant(tx, tenantId);
        const subscription = await tx.subscription.findUnique({ where: { tenantId }, select: { planId: true } });
        if (subscription) await tx.$queryRaw`SELECT id FROM Plan WHERE id = ${subscription.planId} LOCK IN SHARE MODE`;
      }
      const before = tenantId ? await detail(tx, tenantId) : null;
      if (before && "version" in command.input) current(before.version, command.input.version);
      let entityId: string | null = tenantId;
      switch (command.operation) {
        case "tenant.create": {
          const i = command.input; requireTenantSlug(i.slug); requirePeriod(new Date(i.start), new Date(i.end), true);
          await tx.$queryRaw`SELECT id FROM Plan WHERE id = ${i.planId} LOCK IN SHARE MODE`;
          const plan = await tx.plan.findUnique({ where: { id: i.planId } });
          if (!plan?.isActive) throw new ManagementError(422, "PLAN", "Plan inexistente o inactivo.");
          const t = await provisionNewTenant({ name: i.name, slug: i.slug, planCode: plan.code, ownerName: i.ownerName, ownerEmail: i.ownerEmail, ownerPassword: i.password }, tx);
          tenantId = t.id; entityId = t.id;
          await changeSubscription(tx, { tenantId, planId: plan.id, status: i.status, trialEndsAt: i.status === "TRIAL" ? new Date(i.end) : null, currentPeriodStart: new Date(i.start), currentPeriodEnd: new Date(i.end) }); break;
        }
        case "tenant.update": {
          const i = command.input;
          if (i.slug !== before!.slug) {
            requireTenantSlug(i.slug);
            const hostname = i.slug + "." + process.env.BASE_DOMAIN;
            const existing = await tx.tenantDomain.findUnique({ where: { hostname } });
            if (existing && existing.tenantId !== tenantId) throw new ManagementError(409, "CONFLICT", "Dominio ya utilizado.");
            const primaryCustom = before!.domains.some(d => d.primary && d.custom);
            if (!primaryCustom) await tx.tenantDomain.updateMany({ where: { tenantId: tenantId!, isPrimary: true }, data: { isPrimary: false } });
            await tx.tenantDomain.upsert({ where: { hostname }, create: { tenantId: tenantId!, hostname, isPrimary: !primaryCustom, verifiedAt: new Date() }, update: { isPrimary: !primaryCustom } });
          }
          await tx.tenant.update({ where: { id: tenantId! }, data: { name: i.name, slug: i.slug } }); break;
        }
        case "tenant.status": {
          const i = command.input;
          if (["ACTIVE", "TRIAL"].includes(i.status)) {
            const s = before!.subscription;
            if (!s) throw new ManagementError(422, "SUBSCRIPTION", "Configurá una suscripción vigente.");
            requirePeriod(new Date(s.start), new Date(i.status === "TRIAL" ? s.trialEndsAt || s.end : s.end), true);
          }
          await tx.tenant.update({ where: { id: tenantId! }, data: { status: i.status } });
          await tx.subscription.updateMany({ where: { tenantId: tenantId! }, data: { status: i.status } }); break;
        }
        case "subscription.update": {
          const i = command.input; requirePeriod(new Date(i.start), new Date(i.end), ["ACTIVE", "TRIAL"].includes(i.status));
          if (i.status === "TRIAL") requirePeriod(new Date(i.start), new Date(i.trialEndsAt || i.end), true);
          const p = await tx.plan.findUnique({ where: { id: i.planId } });
          if (!p || (!p.isActive && before!.subscription?.planId !== p.id)) throw new ManagementError(422, "PLAN", "Plan inexistente o inactivo.");
          await changeSubscription(tx, { tenantId: tenantId!, planId: i.planId, status: i.status, currentPeriodStart: new Date(i.start), currentPeriodEnd: new Date(i.end), trialEndsAt: i.trialEndsAt ? new Date(i.trialEndsAt) : null }); break;
        }
        case "subscription.renew": {
          const s = before!.subscription;
          if (!s) throw new ManagementError(422, "SUBSCRIPTION", "Configurá primero una suscripción.");
          const now = new Date(), end = new Date(Math.max(now.getTime(), Date.parse(s.end)) + command.input.days * 86400000);
          await changeSubscription(tx, { tenantId: tenantId!, planId: s.planId, status: "ACTIVE", trialEndsAt: null, currentPeriodStart: Date.parse(s.start) > now.getTime() ? now : new Date(s.start), currentPeriodEnd: end }); break;
        }
        case "module.set": {
          const i = command.input;
          if (!FEATURE_KEYS.includes(i.key as FeatureKey) || i.limit !== null) throw new ManagementError(422, "MODULE", "Opción inválida; los límites se administran en el plan.");
          await changeFeature(tx, tenantId!, i.key as FeatureKey, i.enabled === null ? "INHERIT" : i.enabled ? "ENABLED" : "DISABLED"); break;
        }
        case "admin.update": await changeUserAccess(tx, { ...command.input, tenantId: tenantId! }); break;
        case "admin.revoke": {
          const user = await tx.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: tenantId!, userId: command.input.userId } }, include: { user: true } });
          if (!user || user.user.isSuperAdmin) throw new ManagementError(404, "NOT_FOUND", "Administrador inexistente.");
          if (await tx.tenantMembership.count({ where: { userId: user.userId } }) > 1) throw new ManagementError(409, "SHARED_ACCOUNT", "La cuenta pertenece a varios comercios.");
          await tx.userSession.deleteMany({ where: { userId: user.userId } }); break;
        }
        case "plan.create": entityId = (await tx.plan.create({ data: { code: command.input.code, ...planInput(command.input) } })).id; break;
        case "plan.update": {
          const i = command.input; await tx.$queryRaw`SELECT id FROM Plan WHERE id = ${i.planId} FOR UPDATE`;
          const p = await tx.plan.findUnique({ where: { id: i.planId } });
          if (!p) throw new ManagementError(404, "NOT_FOUND", "Plan inexistente.");
          current(adaptPlan(p).version, i.version); await tx.plan.update({ where: { id: p.id }, data: planInput(i) }); entityId = p.id; break;
        }
        case "payment.record": {
          const i = command.input;
          requirePeriod(new Date(i.start), new Date(i.end), i.status === "PAID");
          const payment = await recordPayment(tx, { tenantId: tenantId!, amount: i.amountCents / 100, currency: i.currency, status: i.status, method: i.method, reference: i.reference, notes: i.notes, dueAt: i.dueAt ? new Date(i.dueAt) : null, paidAt: i.paidAt ? new Date(i.paidAt) : null, periodStart: new Date(i.start), periodEnd: new Date(i.end) }); entityId = payment.id; break;
        }
        case "payment.status": {
          const i = command.input, p = await tx.saaSPayment.findFirst({ where: { id: i.paymentId, tenantId: tenantId! } });
          if (!p) throw new ManagementError(404, "NOT_FOUND", "Pago inexistente.");
          if (i.status === "PAID") requirePeriod(p.periodStart, p.periodEnd, true);
          await changePaymentStatus(tx, p.id, i.status, i.paidAt ? new Date(i.paidAt) : null); entityId = p.id; break;
        }
      }
      if (tenantId) {
        const row = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { updatedAt: true } });
        await tx.tenant.update({ where: { id: tenantId }, data: { updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) } });
      }
      const result = { tenantId, entityId, operation: command.operation, ...(tenantId ? { version: (await detail(tx, tenantId)).version } : {}) };
      await tx.platformAuditLog.update({ where: { id: command.requestId }, data: { tenantId, details: json({ fingerprint, actor: command.actor, operation: command.operation, before: before ? { name: before.name, slug: before.slug, status: before.status, subscription: before.subscription, modules: before.modules } : null, changedFields: Object.keys(command.input).filter(k => k !== "password"), passwordChanged: "password" in command.input && !!command.input.password, result }) } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 });
  } catch (error) {
    // Concurrent inserts wait for the unique receipt owner to commit/rollback.
    const row = await platformDb.platformAuditLog.findUnique({ where: { id: command.requestId } });
    if (row) return receipt(row);
    if (error instanceof Error) {
      const map: Record<string, [number, string, string]> = { PAYMENT_DUPLICATE: [409, "PAYMENT_DUPLICATE", "La referencia de pago ya está registrada."], SHARED_ACCOUNT: [409, "SHARED_ACCOUNT", "La cuenta pertenece a varios comercios."], MEMBERSHIP_NOT_FOUND: [404, "NOT_FOUND", "Administrador inexistente."], SUPERADMIN_PROTECTED: [403, "ADMIN", "La cuenta SuperAdmin está protegida."], EMAIL_ALREADY_EXISTS: [409, "CONFLICT", "Correo ya utilizado."], INVALID_TRIAL_END: [422, "INVALID_PERIOD", "Ingresá el fin de la prueba."], SUBSCRIPTION_NOT_FOUND: [422, "SUBSCRIPTION", "Configurá primero una suscripción."] };
      if (map[error.message]) throw new ManagementError(...map[error.message]);
    }
    throw error;
  }
}
export const onlyfoodManagement: ManagementAdapter = { product: "onlyfood", read, execute };
