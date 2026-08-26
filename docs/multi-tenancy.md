# Aislamiento de Datos y Prisma Tenant Guard

## 1. Reglas Estrictas de Desarrollo

> [!CAUTION]
> **PROHIBICIONES CRÍTICAS:**
> 1. **NUNCA usar `platformDb` dentro de módulos de storefront o acciones del comercio.**
> 2. **NUNCA aceptar `tenantId` enviado por el frontend como fuente de verdad.**
> 3. **NUNCA ejecutar consultas raw (`$queryRaw` / `$executeRaw`) sin revisión de seguridad y filtro explícito de tenant.**

---

## 2. Uso de `tenantDb` vs `platformDb`

### `tenantDb` (Acceso Seguro por Comercio)
Se instancia llamando a `createTenantDb(tenantId)`:

```ts
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";

export async function getProductsAction() {
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  // Filtra automáticamente por tenantId:
  const products = await db.product.findMany({
    where: { isActive: true },
  });

  return products;
}
```

### `platformDb` (Acceso de Super Admin NanoLabs)
Exclusivo para la administración centralizada:

```ts
import { platformDb } from "@/lib/platform-db";
import { requireSuperAdmin } from "@/lib/user-auth";

export async function listAllTenantsAction() {
  await requireSuperAdmin();
  return platformDb.tenant.findMany({
    include: { subscription: true, locations: true },
  });
}
```
