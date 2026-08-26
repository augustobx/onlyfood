import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeHostname } from "@/lib/tenant-context";

/**
 * Agrega un nuevo dominio o subdominio a un Tenant.
 */
export async function addTenantDomain(tenantId: string, hostname: string, isCustom = false) {
  const cleanHost = normalizeHostname(hostname);
  if (!cleanHost || cleanHost.length < 3) {
    throw new Error("INVALID_HOSTNAME: El nombre de dominio no es válido.");
  }

  // Validar si el dominio ya está registrado por otro comercio
  const existing = await prisma.tenantDomain.findUnique({
    where: { hostname: cleanHost },
    include: { tenant: true },
  });

  if (existing) {
    if (existing.tenantId === tenantId) {
      return existing;
    }
    throw new Error("DOMAIN_ALREADY_EXISTS: Este dominio ya está registrado en la plataforma.");
  }

  return prisma.tenantDomain.create({
    data: {
      tenantId,
      hostname: cleanHost,
      isCustom,
      isPrimary: false,
      verifiedAt: isCustom ? null : new Date(), // Subdominios oficiales se verifican automáticamente
    },
  });
}

/**
 * Marca un dominio personalizado como verificado (ej. tras verificar CNAME o DNS TXT).
 */
export async function verifyTenantDomain(domainId: string) {
  return prisma.tenantDomain.update({
    where: { id: domainId },
    data: { verifiedAt: new Date() },
  });
}

/**
 * Establece un dominio como el primario para el Tenant.
 */
export async function setPrimaryTenantDomain(tenantId: string, domainId: string) {
  await prisma.$transaction([
    prisma.tenantDomain.updateMany({
      where: { tenantId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.tenantDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    }),
  ]);
}
