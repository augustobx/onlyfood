import "server-only";

import { createTenantDb } from "@/lib/tenant-db";

/**
 * Validador contra vulnerabilidades IDOR (Insecure Direct Object References).
 * Garantiza que cualquier recurso solicitado por ID pertenezca estrictamente al tenant autenticado.
 */
export async function assertTenantOwnership(
  tenantId: string,
  modelName: "order" | "product" | "category" | "client" | "reward" | "roulettePrize",
  resourceId: string
): Promise<void> {
  if (!tenantId || !resourceId) {
    throw new Error("SECURITY_VIOLATION: Parámetros inválidos para validación de propiedad.");
  }

  const tenantDb = createTenantDb(tenantId);
  const resource = await (tenantDb as any)[modelName].findUnique({
    where: { id: resourceId },
    select: { id: true },
  });

  if (!resource) {
    throw new Error(`IDOR_PREVENTED: El recurso solicitado no existe o pertenece a otro comercio.`);
  }
}
