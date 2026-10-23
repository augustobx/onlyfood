import "server-only";

import { prisma } from "@/lib/prisma";
import { lockTenant } from "./control-plane";

export interface CreateLocationInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
}

/**
 * Obtiene todas las sucursales de un Tenant.
 */
export async function getTenantLocations(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
}

/**
 * Crea una nueva sucursal validando el límite máximo permitido por el plan de suscripción.
 */
export async function createTenantLocation(tenantId: string, input: CreateLocationInput) {
  return prisma.$transaction(async tx => {
  await lockTenant(tx, tenantId);
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      subscription: { include: { plan: true } },
      locations: true,
      features: true,
    },
  });

  const maxAllowed = tenant.subscription?.plan?.maxLocations || 1;
  const override = tenant.features.find(f => f.featureKey === "multipleLocations");
  const inherited = Array.isArray(tenant.subscription?.plan.features) && tenant.subscription.plan.features.includes("multipleLocations");
  if (tenant.locations.length >= maxAllowed) {
    throw new Error(`PLAN_LIMIT_REACHED: Tu plan actual permite un máximo de ${maxAllowed} sucursal(es).`);
  }
  if (tenant.locations.length > 0 && !(override ? override.isEnabled : inherited)) {
    throw new Error("FEATURE_DISABLED: El módulo de múltiples sucursales no está habilitado.");
  }
  if (tenant.locations.length >= maxAllowed) {
    throw new Error(`PLAN_LIMIT_REACHED: Tu plan actual permite un máximo de ${maxAllowed} sucursal(es).`);
  }

  // Si se marca como principal, desmarcar las anteriores
  if (input.isMain) {
    await tx.location.updateMany({
      where: { tenantId, isMain: true },
      data: { isMain: false },
    });
  }

  return tx.location.create({
    data: {
      tenantId,
      name: input.name,
      code: input.code.toLowerCase().trim(),
      address: input.address,
      phone: input.phone,
      isMain: input.isMain ?? (tenant.locations.length === 0),
      isActive: true,
    },
  });
  });
}
