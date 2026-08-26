import "server-only";

import { cookies } from "next/headers";
import { platformDb } from "@/lib/platform-db";
import { recordAuditLog } from "@/lib/audit";
import { PLANS, PLAN_FEATURES, type PlanCode } from "@/lib/features";
import crypto from "crypto";

const SUPERADMIN_COOKIE = "onlyfood_superadmin_session";

export async function checkIsSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE)?.value;
  if (!token) return false;

  const expectedSecret = process.env.SUPERADMIN_KEY || process.env.ADMIN_PASSWORD || "OnlyFood2026!";
  const expectedToken = crypto.createHmac("sha256", expectedSecret).update("superadmin-session").digest("hex");
  return token === expectedToken;
}

export async function requireSuperAdmin() {
  const isAuthorized = await checkIsSuperAdmin();
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED_SUPERADMIN");
  }
}

export async function loginSuperAdmin(password: string): Promise<boolean> {
  const expectedSecret = process.env.SUPERADMIN_KEY || process.env.ADMIN_PASSWORD || "OnlyFood2026!";
  if (password === expectedSecret) {
    const token = crypto.createHmac("sha256", expectedSecret).update("superadmin-session").digest("hex");
    const cookieStore = await cookies();
    cookieStore.set(SUPERADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/superadmin",
    });
    return true;
  }
  return false;
}

export async function logoutSuperAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_COOKIE);
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
      memberships: { include: { user: true } },
      _count: { select: { orders: true, locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  customDomain?: string;
  planCode: PlanCode;
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

  return platformDb.$transaction(async (tx) => {
    // 1. Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        slug: cleanSlug,
        name: input.name.trim(),
        status: "ACTIVE",
      },
    });

    // 2. Create Primary Location
    const location = await tx.location.create({
      data: {
        tenantId: tenant.id,
        name: input.locationName || "Sucursal Principal",
        code: "main",
        address: input.locationAddress || null,
        phone: input.locationPhone || null,
        isPrimary: true,
        isActive: true,
      },
    });

    // 3. Create Subdomain & optional custom domain
    const rootDomain = process.env.ROOT_DOMAIN || "producto.nanolabs.app";
    await tx.tenantDomain.create({
      data: {
        tenantId: tenant.id,
        hostname: `${cleanSlug}.${rootDomain}`,
        isPrimary: !input.customDomain,
        verified: true,
      },
    });

    if (input.customDomain) {
      await tx.tenantDomain.create({
        data: {
          tenantId: tenant.id,
          hostname: input.customDomain.toLowerCase().trim(),
          isPrimary: true,
          verified: false,
        },
      });
    }

    // 4. Create Subscription
    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
      },
    });

    // Seed features for plan
    const featureKeys = PLAN_FEATURES[input.planCode] || [];
    for (const key of featureKeys) {
      await tx.tenantFeature.create({
        data: {
          tenantId: tenant.id,
          featureKey: key,
          isEnabled: true,
        },
      });
    }

    // 6. Create Owner User if email provided
    if (input.ownerEmail) {
      const passwordHash = crypto
        .createHash("sha256")
        .update(input.ownerPassword || "OnlyFood2026!")
        .digest("hex");

      const user = await tx.user.upsert({
        where: { email: input.ownerEmail.toLowerCase().trim() },
        update: {},
        create: {
          email: input.ownerEmail.toLowerCase().trim(),
          name: input.ownerName || input.name,
          passwordHash,
          isPlatformAdmin: false,
        },
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    // 7. Audit log
    await recordAuditLog({
      tenantId: tenant.id,
      action: "TENANT_PROVISIONED",
      resource: "Tenant",
      details: {
        slug: cleanSlug,
        plan: input.planCode,
        name: input.name,
      },
    });

    return tenant;
  });
}

export async function setTenantStatus(tenantId: string, status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED") {
  const updated = await platformDb.tenant.update({
    where: { id: tenantId },
    data: { status },
  });

  await recordAuditLog({
    tenantId,
    action: `TENANT_STATUS_${status}`,
    resource: "Tenant",
    details: { newStatus: status },
  });

  return updated;
}

export async function setTenantPlan(tenantId: string, planCode: PlanCode) {
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

    // 2. Sync features for new plan
    await tx.tenantFeature.deleteMany({ where: { tenantId } });
    const featureKeys = PLAN_FEATURES[planCode] || [];
    for (const key of featureKeys) {
      await tx.tenantFeature.create({
        data: {
          tenantId,
          featureKey: key,
          isEnabled: true,
        },
      });
    }

    await recordAuditLog({
      tenantId,
      action: "TENANT_PLAN_CHANGED",
      resource: "Subscription",
      details: { planCode },
    });

    return true;
  });
}
