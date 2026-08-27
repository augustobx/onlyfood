import "server-only";

import { platformDb } from "@/lib/platform-db";
import { recordAuditLog } from "@/lib/audit";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import {
  createUserSession,
  deleteUserSession,
  getLoggedUser,
  hashUserPassword,
  verifyUserPassword,
} from "@/lib/user-auth";

export async function checkIsSuperAdmin(): Promise<boolean> {
  const user = await getLoggedUser();
  return Boolean(user?.isSuperAdmin);
}

export async function requireSuperAdmin() {
  const isAuthorized = await checkIsSuperAdmin();
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED_SUPERADMIN");
  }
}

export async function loginSuperAdmin(email: string, password: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const ip = await getRequestIp();
  if (!(await consumeRateLimit("superadmin-login", `${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000))) return false;
  const user = await platformDb.user.findUnique({ where: { email: normalizedEmail } });
  if (!user?.isSuperAdmin || !(await verifyUserPassword(password, user.passwordHash))) return false;
  await createUserSession(user.id);
  return true;
}

export async function logoutSuperAdmin() {
  await deleteUserSession();
}

export async function getPlatformMetrics() {
  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    canceledTenants,
    totalOrders,
    totalLocations,
    totalUsers,
    subscriptions,
    plans,
  ] = await Promise.all([
    platformDb.tenant.count(),
    platformDb.tenant.count({ where: { status: "ACTIVE" } }),
    platformDb.tenant.count({ where: { status: "TRIAL" } }),
    platformDb.tenant.count({ where: { status: "SUSPENDED" } }),
    platformDb.tenant.count({ where: { status: "CANCELED" } }),
    platformDb.order.count(),
    platformDb.location.count(),
    platformDb.user.count(),
    platformDb.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    platformDb.plan.findMany(),
  ]);

  const mrr = subscriptions.reduce((sum, sub) => sum + (sub.plan?.priceMonthly || 0), 0);

  const planDistribution = plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    count: subscriptions.filter((s) => s.planId === plan.id).length,
    priceMonthly: plan.priceMonthly,
  }));

  return {
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    canceledTenants,
    totalOrders,
    totalLocations,
    totalUsers,
    mrr,
    planDistribution,
  };
}

export async function listAllTenants(search?: string) {
  const where = search?.trim()
    ? {
        OR: [
          { name: { contains: search.trim() } },
          { slug: { contains: search.trim() } },
        ],
      }
    : undefined;

  return platformDb.tenant.findMany({
    where,
    include: {
      domains: true,
      locations: true,
      subscription: { include: { plan: true } },
      features: true,
      memberships: { include: { user: { select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true } } } },
      _count: { select: { orders: true, locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllPlans() {
  return platformDb.plan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: [{ priceMonthly: "asc" }, { name: "asc" }],
  });
}

export interface UpdatePlanInput {
  id: string;
  name: string;
  priceMonthly: number;
  maxLocations: number;
  maxProducts: number;
  features: FeatureKey[];
  isActive: boolean;
}

export interface CreatePlanInput extends Omit<UpdatePlanInput, "id"> {
  code: string;
}

export async function createPlan(input: CreatePlanInput) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{1,29}$/.test(code)) throw new Error("PLAN_CODE_INVALID");
  const featureSet = new Set(FEATURE_KEYS);
  if (input.features.some((feature) => !featureSet.has(feature))) {
    throw new Error("INVALID_FEATURE");
  }
  const existing = await platformDb.plan.findUnique({ where: { code } });
  if (existing) throw new Error("PLAN_CODE_EXISTS");
  const plan = await platformDb.plan.create({
    data: {
      code,
      name: input.name.trim(),
      priceMonthly: input.priceMonthly,
      maxLocations: input.maxLocations,
      maxProducts: input.maxProducts,
      features: [...new Set(input.features)],
      isActive: input.isActive,
    },
  });
  await recordAuditLog({
    action: "PLAN_CREATED",
    resource: "Plan",
    details: { planId: plan.id, code, name: plan.name },
  });
  return true;
}

export async function updatePlan(input: UpdatePlanInput) {
  const featureSet = new Set(FEATURE_KEYS);
  if (input.features.some((feature) => !featureSet.has(feature))) {
    throw new Error("INVALID_FEATURE");
  }
  const previous = await platformDb.plan.findUnique({ where: { id: input.id } });
  if (!previous) throw new Error("PLAN_NOT_FOUND");
  const updated = await platformDb.plan.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      priceMonthly: input.priceMonthly,
      maxLocations: input.maxLocations,
      maxProducts: input.maxProducts,
      features: [...new Set(input.features)],
      isActive: input.isActive,
    },
  });
  await recordAuditLog({
    action: "PLAN_UPDATED",
    resource: "Plan",
    details: {
      planId: input.id,
      code: updated.code,
      before: {
        name: previous.name,
        priceMonthly: previous.priceMonthly,
        maxLocations: previous.maxLocations,
        maxProducts: previous.maxProducts,
        features: previous.features,
        isActive: previous.isActive,
      },
      after: input,
    },
  });
  return true;
}

export interface UpdateSubscriptionInput {
  tenantId: string;
  planId: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED";
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export async function updateTenantSubscription(input: UpdateSubscriptionInput) {
  const [tenant, plan] = await Promise.all([
    platformDb.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } }),
    platformDb.plan.findUnique({ where: { id: input.planId }, select: { id: true, code: true } }),
  ]);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  if (input.currentPeriodEnd <= input.currentPeriodStart) throw new Error("INVALID_PERIOD");
  if (input.status === "TRIAL" && !input.trialEndsAt) {
    throw new Error("INVALID_TRIAL_END");
  }

  await platformDb.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { tenantId: input.tenantId },
      update: {
        planId: input.planId,
        status: input.status,
        trialEndsAt: input.status === "TRIAL" ? input.trialEndsAt : null,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
      },
      create: {
        tenantId: input.tenantId,
        planId: input.planId,
        status: input.status,
        trialEndsAt: input.status === "TRIAL" ? input.trialEndsAt : null,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
      },
    });
    await tx.tenant.update({ where: { id: input.tenantId }, data: { status: input.status } });
    await tx.platformAuditLog.create({
      data: {
        tenantId: input.tenantId,
        action: "SUBSCRIPTION_MANUALLY_UPDATED",
        resource: "Subscription",
        details: {
          planCode: plan.code,
          status: input.status,
          trialEndsAt: input.trialEndsAt?.toISOString() || null,
          currentPeriodStart: input.currentPeriodStart.toISOString(),
          currentPeriodEnd: input.currentPeriodEnd.toISOString(),
        },
      },
    });
  });
  return true;
}

export async function setTenantFeatureOverride(
  tenantId: string,
  featureKey: FeatureKey,
  state: "INHERIT" | "ENABLED" | "DISABLED",
) {
  const [tenant, featureValid] = await Promise.all([
    platformDb.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    Promise.resolve(FEATURE_KEYS.includes(featureKey)),
  ]);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (!featureValid) throw new Error("INVALID_FEATURE");

  await platformDb.$transaction(async (tx) => {
    if (state === "INHERIT") {
      await tx.tenantFeature.deleteMany({ where: { tenantId, featureKey } });
    } else {
      await tx.tenantFeature.upsert({
        where: { tenantId_featureKey: { tenantId, featureKey } },
        update: { isEnabled: state === "ENABLED" },
        create: { tenantId, featureKey, isEnabled: state === "ENABLED" },
      });
    }
    await tx.platformAuditLog.create({
      data: {
        tenantId,
        action: "TENANT_FEATURE_OVERRIDE_UPDATED",
        resource: "TenantFeature",
        details: { featureKey, state },
      },
    });
  });
  return true;
}

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  customDomain?: string;
  planCode: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword?: string;
  locationName?: string;
  locationAddress?: string;
  locationPhone?: string;
}

export async function provisionNewTenant(input: ProvisionTenantInput) {
  const cleanSlug = input.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
  if (!cleanSlug || cleanSlug.length < 2) throw new Error("SLUG_INVALID");

  const existing = await platformDb.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) throw new Error("SLUG_ALREADY_EXISTS");

  const plan = await platformDb.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  const planFeatures = Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === "string") : [];
  if (!input.ownerPassword || input.ownerPassword.length < 12) throw new Error("OWNER_PASSWORD_WEAK");
  const normalizedOwnerEmail = input.ownerEmail.toLowerCase().trim();
  const existingOwner = await platformDb.user.findUnique({ where: { email: normalizedOwnerEmail } });
  if (existingOwner && !(await verifyUserPassword(input.ownerPassword, existingOwner.passwordHash))) {
    throw new Error("OWNER_EMAIL_EXISTS");
  }
  const ownerPasswordHash = await hashUserPassword(input.ownerPassword);

  return platformDb.$transaction(async (tx) => {
    // 1. Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        slug: cleanSlug,
        name: input.name.trim(),
        status: "TRIAL",
      },
    });

    // 2. Create Primary Location
    await tx.location.create({
      data: {
        tenantId: tenant.id,
        name: input.locationName || "Sucursal Principal",
        code: "main",
        address: input.locationAddress || null,
        phone: input.locationPhone || null,
        isMain: true,
        isActive: true,
      },
    });

    // 3. Create Subdomain & optional custom domain
    const rootDomain = process.env.BASE_DOMAIN || process.env.ROOT_DOMAIN || "producto.nanolabs.app";
    await tx.tenantDomain.create({
      data: {
        tenantId: tenant.id,
        hostname: `${cleanSlug}.${rootDomain}`,
        isPrimary: !input.customDomain,
        verifiedAt: new Date(),
      },
    });

    if (input.customDomain) {
      await tx.tenantDomain.create({
        data: {
          tenantId: tenant.id,
          hostname: input.customDomain.toLowerCase().trim(),
          isPrimary: true,
          isCustom: true,
        },
      });
    }

    // 4. Create Subscription
    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Create Default Settings & Features
    await tx.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        appName: input.name.trim(),
        primaryColor: "#f97316",
        secondaryColor: "#0f172a",
        isStoreOpen: true,
      },
    });

    await tx.systemConfig.create({
      data: {
        tenantId: tenant.id,
        appName: input.name.trim(),
        isStoreOpen: true,
        allowImmediateOrders: true,
        allowScheduledTomorrow: true,
        allowAdvanceOrders: true,
        paymentCash: true,
        paymentMp: true,
        globalDiscount: 0,
        deliveryCost: 0,
        isPointsCatalogActive: planFeatures.includes("loyalty"),
        isRouletteActive: planFeatures.includes("roulette"),
        rouletteCost: 100,
      },
    });

    if (planFeatures.includes("loyalty")) {
      await tx.pointReward.createMany({
        data: [
          { tenantId: tenant.id, name: "10% de descuento", description: "Canjeable en tu próximo pedido.", pointsCost: 250, type: "PERCENT", value: 10, badgeText: "POPULAR", sequence: 1 },
          { tenantId: tenant.id, name: "$1.000 de descuento", description: "Descuento directo en tu próximo pedido.", pointsCost: 400, type: "AMOUNT", value: 1000, badgeText: "AHORRO", sequence: 2 },
        ],
      });
    }

    if (planFeatures.includes("roulette")) {
      await tx.roulettePrize.createMany({
        data: [
          { tenantId: tenant.id, name: "5% OFF", probability: 50, type: "PERCENT", value: 5, bgColor: "#7c3aed", textColor: "#ffffff" },
          { tenantId: tenant.id, name: "$500 OFF", probability: 30, type: "AMOUNT", value: 500, bgColor: "#ea580c", textColor: "#ffffff" },
          { tenantId: tenant.id, name: "10% OFF", probability: 20, type: "PERCENT", value: 10, bgColor: "#db2777", textColor: "#ffffff" },
        ],
      });
    }

    // 6. Create Owner User if email provided
    if (input.ownerEmail) {
      const user = await tx.user.upsert({
        where: { email: normalizedOwnerEmail },
        update: {},
        create: {
          email: normalizedOwnerEmail,
          name: input.ownerName || input.name,
          passwordHash: ownerPasswordHash,
          isSuperAdmin: false,
        },
      });

      await tx.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: { role: "OWNER" },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    // 7. Audit log
    await tx.platformAuditLog.create({
      data: {
        tenantId: tenant.id,
        action: "TENANT_PROVISIONED",
        resource: "Tenant",
        details: {
        slug: cleanSlug,
        plan: input.planCode,
        name: input.name,
        },
      },
    });

    return tenant;
  });
}

export async function setTenantStatus(tenantId: string, status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED") {
  const updated = await platformDb.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({ where: { id: tenantId }, data: { status } });
    await tx.subscription.updateMany({ where: { tenantId }, data: { status } });
    return tenant;
  });

  await recordAuditLog({
    tenantId,
    action: `TENANT_STATUS_${status}`,
    resource: "Tenant",
    details: { newStatus: status },
  });

  return updated;
}

export async function setTenantPlan(tenantId: string, planCode: string) {
  const plan = await platformDb.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  return platformDb.$transaction(async (tx) => {
    // 1. Update or create subscription
    await tx.subscription.upsert({
      where: { tenantId },
      update: { planId: plan.id, status: "ACTIVE" },
      create: {
        tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. El cambio de plan restablece excepciones individuales.
    await tx.tenantFeature.deleteMany({ where: { tenantId } });

    await recordAuditLog({
      tenantId,
      action: "TENANT_PLAN_CHANGED",
      resource: "Subscription",
      details: { planCode },
    });

    return true;
  });
}
