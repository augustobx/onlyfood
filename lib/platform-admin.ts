import "server-only";

import { platformDb } from "@/lib/platform-db";
import { requireSuperAdmin } from "@/lib/user-auth";

export interface CreateTenantPayload {
  slug: string;
  name: string;
  planCode: string;
  initialAdminEmail?: string;
}

/**
 * Obtiene métricas globales de la plataforma NanoLabs.
 */
export async function getPlatformOverview() {
  await requireSuperAdmin();

  const [
    totalTenants,
    activeTenants,
    totalOrders,
    totalUsers,
    recentAuditLogs,
  ] = await Promise.all([
    platformDb.tenant.count(),
    platformDb.tenant.count({ where: { status: "ACTIVE" } }),
    platformDb.order.count(),
    platformDb.user.count(),
    platformDb.platformAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { name: true, slug: true } },
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  return {
    totalTenants,
    activeTenants,
    totalOrders,
    totalUsers,
    recentAuditLogs,
  };
}

/**
 * Lista todos los comercios registrados en la plataforma.
 */
export async function listAllTenants() {
  await requireSuperAdmin();

  return platformDb.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      locations: true,
      domains: true,
      _count: {
        select: {
          orders: true,
          products: true,
          clients: true,
          memberships: true,
        },
      },
    },
  });
}

/**
 * Crea un nuevo Tenant con su Location principal, dominio y suscripción inicial.
 */
export async function createNewTenant(payload: CreateTenantPayload) {
  const superAdmin = await requireSuperAdmin();

  const cleanSlug = payload.slug.toLowerCase().trim();
  const existing = await platformDb.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) {
    throw new Error("SLUG_TAKEN: Este subdominio o slug ya está en uso.");
  }

  const plan = await platformDb.plan.findUniqueOrThrow({
    where: { code: payload.planCode },
  });

  const tenant = await platformDb.tenant.create({
    data: {
      slug: cleanSlug,
      name: payload.name.trim(),
      status: "ACTIVE",
      locations: {
        create: {
          name: "Principal",
          code: "main",
          isMain: true,
        },
      },
      domains: {
        create: {
          hostname: `${cleanSlug}.producto.nanolabs.app`,
          isPrimary: true,
          isCustom: false,
          verifiedAt: new Date(),
        },
      },
      subscription: {
        create: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      settings: {
        create: {
          appName: payload.name.trim(),
          primaryColor: "#f97316",
          secondaryColor: "#9333ea",
          storeTheme: "ORIGINAL",
        },
      },
    },
  });

  // Registrar en logs de auditoría
  await platformDb.platformAuditLog.create({
    data: {
      tenantId: tenant.id,
      userId: superAdmin.id,
      action: "TENANT_CREATED",
      resource: "Tenant",
      details: { slug: cleanSlug, plan: payload.planCode },
    },
  });

  return tenant;
}

/**
 * Suspende o reactiva un Tenant.
 */
export async function setTenantStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  const superAdmin = await requireSuperAdmin();

  const updated = await platformDb.tenant.update({
    where: { id: tenantId },
    data: { status },
  });

  await platformDb.platformAuditLog.create({
    data: {
      tenantId,
      userId: superAdmin.id,
      action: status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_REACTIVATED",
      resource: "Tenant",
      details: { newStatus: status },
    },
  });

  return updated;
}
