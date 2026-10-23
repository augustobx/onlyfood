import "server-only";
import type { Prisma } from "@prisma/client";
import { FEATURE_KEYS, type FeatureKey } from "./feature-catalog";
import { sanitizeLogDetails } from "./audit";
import { hashUserPassword } from "./user-auth";
import type { UpdateSubscriptionInput, UpdateTenantUserAccessInput, CreateSaaSPaymentInput, SaaSPaymentStatus } from "./superadmin";

export async function lockTenant(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$queryRaw`SELECT id FROM Tenant WHERE id = ${tenantId} FOR UPDATE`;
}
async function audit(tx: Prisma.TransactionClient, tenantId: string, action: string, resource: string, details: Record<string, unknown>, userId?: string) {
  await tx.platformAuditLog.create({ data: { tenantId, userId, action, resource, details: sanitizeLogDetails(details) } });
}
export async function changeSubscription(tx: Prisma.TransactionClient, input: UpdateSubscriptionInput) {
  await lockTenant(tx, input.tenantId);
  await tx.$queryRaw`SELECT id FROM Plan WHERE id = ${input.planId} LOCK IN SHARE MODE`;
  const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
  const plan = await tx.plan.findUnique({ where: { id: input.planId } });
  if (!tenant) throw Error("TENANT_NOT_FOUND");
  if (!plan) throw Error("PLAN_NOT_FOUND");
  if (input.currentPeriodEnd <= input.currentPeriodStart) throw Error("INVALID_PERIOD");
  if (input.status === "TRIAL" && !input.trialEndsAt) throw Error("INVALID_TRIAL_END");
  const data = { planId: input.planId, status: input.status, trialEndsAt: input.status === "TRIAL" ? input.trialEndsAt : null, currentPeriodStart: input.currentPeriodStart, currentPeriodEnd: input.currentPeriodEnd };
  await tx.subscription.upsert({ where: { tenantId: input.tenantId }, update: data, create: { tenantId: input.tenantId, ...data } });
  // Plan assignment preserves the tenant's explicit feature overrides.
  await tx.tenant.update({ where: { id: input.tenantId }, data: { status: input.status } });
  await audit(tx, input.tenantId, "SUBSCRIPTION_MANUALLY_UPDATED", "Subscription", { planCode: plan.code, status: input.status, trialEndsAt: input.trialEndsAt?.toISOString() || null, currentPeriodStart: input.currentPeriodStart.toISOString(), currentPeriodEnd: input.currentPeriodEnd.toISOString() });
  return true;
}
export async function changeFeature(tx: Prisma.TransactionClient, tenantId: string, featureKey: FeatureKey, state: "INHERIT" | "ENABLED" | "DISABLED") {
  await lockTenant(tx, tenantId);
  if (!await tx.tenant.findUnique({ where: { id: tenantId } })) throw Error("TENANT_NOT_FOUND");
  if (!FEATURE_KEYS.includes(featureKey)) throw Error("INVALID_FEATURE");
  if (state === "INHERIT") await tx.tenantFeature.deleteMany({ where: { tenantId, featureKey } });
  else await tx.tenantFeature.upsert({ where: { tenantId_featureKey: { tenantId, featureKey } }, update: { isEnabled: state === "ENABLED" }, create: { tenantId, featureKey, isEnabled: state === "ENABLED" } });
  if (state === "DISABLED") {
    const data = featureKey === "whatsapp" ? { whatsappNotificationsEnabled: false } : featureKey === "roulette" ? { isRouletteActive: false } : featureKey === "loyalty" ? { isPointsCatalogActive: false } : featureKey === "printNode" ? { autoPrintTickets: false, printingMode: "BROWSER" } : null;
    if (data) await tx.systemConfig.updateMany({ where: { tenantId }, data });
  }
  await audit(tx, tenantId, "TENANT_FEATURE_OVERRIDE_UPDATED", "TenantFeature", { featureKey, state });
  return true;
}
export async function changeUserAccess(tx: Prisma.TransactionClient, input: UpdateTenantUserAccessInput) {
  await lockTenant(tx, input.tenantId);
  const membership = await tx.tenantMembership.findUnique({ where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } }, include: { user: true } });
  if (!membership) throw Error("MEMBERSHIP_NOT_FOUND");
  if (membership.user.isSuperAdmin) throw Error("SUPERADMIN_PROTECTED");
  if (await tx.tenantMembership.count({ where: { userId: input.userId } }) > 1) throw Error("SHARED_ACCOUNT");
  const email = input.email.trim().toLowerCase();
  const owner = await tx.user.findUnique({ where: { email } });
  if (owner && owner.id !== input.userId) throw Error("EMAIL_ALREADY_EXISTS");
  if (input.password && input.password.length < 12) throw Error("PASSWORD_WEAK");
  const passwordHash = input.password ? await hashUserPassword(input.password) : undefined;
  await tx.user.update({ where: { id: input.userId }, data: { email, name: input.name?.trim() || null, ...(passwordHash ? { passwordHash } : {}) } });
  await tx.userSession.deleteMany({ where: { userId: input.userId } });
  await audit(tx, input.tenantId, passwordHash ? "TENANT_USER_CREDENTIALS_RESET" : "TENANT_USER_IDENTITY_UPDATED", "User", { previousEmail: membership.user.email, newEmail: email, name: input.name?.trim() || null, passwordChanged: Boolean(passwordHash), sessionsRevoked: true }, input.userId);
  return true;
}
async function synchronizePayment(tx: Prisma.TransactionClient, payment: { tenantId: string; subscriptionId: string; status: string; periodStart: Date; periodEnd: Date }) {
  if (payment.status === "PAID") {
    await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "ACTIVE", currentPeriodStart: payment.periodStart, currentPeriodEnd: payment.periodEnd, trialEndsAt: null } });
    await tx.tenant.update({ where: { id: payment.tenantId }, data: { status: "ACTIVE" } });
  } else if (payment.status === "OVERDUE") {
    await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "PAST_DUE" } });
    await tx.tenant.update({ where: { id: payment.tenantId }, data: { status: "PAST_DUE" } });
  }
}
export async function recordPayment(tx: Prisma.TransactionClient, input: CreateSaaSPaymentInput) {
  await lockTenant(tx, input.tenantId);
  const subscription = await tx.subscription.findUnique({ where: { tenantId: input.tenantId } });
  if (!subscription) throw Error("SUBSCRIPTION_NOT_FOUND");
  if (input.periodEnd <= input.periodStart) throw Error("INVALID_PERIOD");
  if (input.reference && await tx.saaSPayment.findFirst({ where: { tenantId: input.tenantId, reference: input.reference.trim() } })) throw Error("PAYMENT_DUPLICATE");
  const payment = await tx.saaSPayment.create({ data: { tenantId: input.tenantId, subscriptionId: subscription.id, amount: input.amount, currency: input.currency, status: input.status, method: input.method?.trim() || null, reference: input.reference?.trim() || null, notes: input.notes?.trim() || null, dueAt: input.dueAt || null, paidAt: input.status === "PAID" ? input.paidAt || new Date() : input.paidAt || null, periodStart: input.periodStart, periodEnd: input.periodEnd } });
  await synchronizePayment(tx, payment);
  await audit(tx, input.tenantId, "SAAS_PAYMENT_RECORDED", "SaaSPayment", { paymentId: payment.id, amount: payment.amount, currency: payment.currency, status: payment.status, reference: payment.reference });
  return payment;
}
export async function changePaymentStatus(tx: Prisma.TransactionClient, paymentId: string, status: SaaSPaymentStatus, paidAt?: Date | null) {
  const first = await tx.saaSPayment.findUnique({ where: { id: paymentId } });
  if (!first) throw Error("PAYMENT_NOT_FOUND");
  await lockTenant(tx, first.tenantId);
  const existing = await tx.saaSPayment.findUniqueOrThrow({ where: { id: paymentId } });
  const payment = await tx.saaSPayment.update({ where: { id: paymentId }, data: { status, paidAt: status === "PAID" ? paidAt || existing.paidAt || new Date() : paidAt ?? existing.paidAt } });
  await synchronizePayment(tx, payment);
  await audit(tx, payment.tenantId, "SAAS_PAYMENT_STATUS_UPDATED", "SaaSPayment", { paymentId, previousStatus: existing.status, newStatus: status, paidAt: payment.paidAt?.toISOString() || null });
  return payment;
}
