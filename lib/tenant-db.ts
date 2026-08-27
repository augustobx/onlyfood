import "server-only";

import { prisma } from "@/lib/prisma";

// Modelos que pertenecen exclusivamente a un tenant
const TENANT_SCOPED_MODELS = new Set([
  "Location",
  "TenantMembership",
  "SystemConfig",
  "Category",
  "Product",
  "Ingredient",
  "Extra",
  "Order",
  "CustomerTier",
  "Client",
  "PointReward",
  "PointRedemption",
  "RoulettePrize",
  "RouletteWin",
  "DeliveryTimeSlot",
  "Messenger",
  "PushSubscription",
  "MediaAsset",
  "WhatsAppSession",
  "WhatsAppNotification",
  "TenantSettings",
  "TenantIntegration",
  "PaymentRecord",
  "PrintDispatch",
  "Session",
  "CashSession",
  "CashMovement",
  "QuantityDiscount",
]);

/**
 * Helper para obtener directamente la instancia tenantDb del contexto actual de la petición
 */
export async function getTenantDb() {
  const { getTenantContext } = await import("@/lib/tenant-context");
  const tenant = await getTenantContext();
  return createTenantDb(tenant.id);
}

/**
 * Crea una instancia de Prisma Client con Tenant Guard automático para el tenantId dado.
 * Inyecta filtros en todas las consultas y asegura que los registros creados pertenezcan al tenant.
 */
export function createTenantDb(tenantId: string) {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("TENANT_DB_GUARD: tenantId requerido y no puede estar vacío.");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Si el modelo no es tenant-scoped, ejecutar consulta normal
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const safeArgs = (args || {}) as any;

          // 1. Operaciones de lectura
          if (
            operation === "findMany" ||
            operation === "findFirst" ||
            operation === "findFirstOrThrow" ||
            operation === "count" ||
            operation === "aggregate" ||
            operation === "groupBy"
          ) {
            safeArgs.where = {
              ...(safeArgs.where || {}),
              tenantId,
            };
            return query(safeArgs);
          }

          // 2. Operación findUnique / findUniqueOrThrow
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            // Prisma findUnique requiere un unique input. Si se pasa id, verificamos también tenantId
            // transformándolo en findFirst para forzar el aislamiento estricto por tenantId
            if (safeArgs.where) {
              const findFirstArgs = {
                ...safeArgs,
                where: {
                  ...safeArgs.where,
                  tenantId,
                },
              };
              const delegate = (prisma as unknown as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)];
              const result = await delegate.findFirst(findFirstArgs);
              if (!result && operation === "findUniqueOrThrow") {
                throw new Error(`Registro no encontrado en ${model} para el comercio actual.`);
              }
              return result;
            }
            return query(safeArgs);
          }

          // 3. Inserciones (create)
          if (operation === "create") {
            safeArgs.data = {
              ...(safeArgs.data || {}),
              tenantId,
            };
            return query(safeArgs);
          }

          // 4. Inserciones masivas (createMany)
          if (operation === "createMany") {
            if (Array.isArray(safeArgs.data)) {
              safeArgs.data = safeArgs.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            } else if (safeArgs.data) {
              safeArgs.data = {
                ...safeArgs.data,
                tenantId,
              };
            }
            return query(safeArgs);
          }

          // 5. Actualizaciones individuales (update)
          if (operation === "update") {
            // Validar que el registro pertenece al tenant antes de actualizar
            const delegate = (prisma as unknown as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)];
            const existing = await delegate.findFirst({
              where: {
                ...safeArgs.where,
                tenantId,
              },
              select: { id: true },
            });

            if (!existing) {
              throw new Error(`ACCESO_DENEGADO: No existe el registro en ${model} o pertenece a otro comercio.`);
            }

            // Evitar que se cambie el tenantId
            if (safeArgs.data && "tenantId" in safeArgs.data) {
              delete safeArgs.data.tenantId;
            }

            return query(safeArgs);
          }

          // 6. Actualizaciones masivas (updateMany)
          if (operation === "updateMany") {
            safeArgs.where = {
              ...(safeArgs.where || {}),
              tenantId,
            };
            if (safeArgs.data && "tenantId" in safeArgs.data) {
              delete safeArgs.data.tenantId;
            }
            return query(safeArgs);
          }

          // 7. Eliminaciones individuales (delete)
          if (operation === "delete") {
            // Validar que el registro pertenece al tenant antes de eliminar
            const delegate = (prisma as unknown as Record<string, any>)[model.charAt(0).toLowerCase() + model.slice(1)];
            const existing = await delegate.findFirst({
              where: {
                ...safeArgs.where,
                tenantId,
              },
              select: { id: true },
            });

            if (!existing) {
              throw new Error(`ACCESO_DENEGADO: No existe el registro en ${model} o pertenece a otro comercio.`);
            }

            return query(safeArgs);
          }

          // 8. Eliminaciones masivas (deleteMany)
          if (operation === "deleteMany") {
            safeArgs.where = {
              ...(safeArgs.where || {}),
              tenantId,
            };
            return query(safeArgs);
          }

          // 9. Upsert
          if (operation === "upsert") {
            safeArgs.create = {
              ...(safeArgs.create || {}),
              tenantId,
            };
            safeArgs.where = {
              ...(safeArgs.where || {}),
              tenantId,
            };
            return query(safeArgs);
          }

          return (query as any)(safeArgs);
        },
      },
    },
  });
}

export type TenantDbClient = ReturnType<typeof createTenantDb>;
