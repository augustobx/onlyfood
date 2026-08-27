# Aislamiento de Datos y Prisma Tenant Guard (Multi-Tenancy)

## 1. Principios Fundamentales y Reglas de Seguridad

> [!CAUTION]
> **REGLAS CRÍTICAS DE AISLAMIENTO:**
> 1. **NUNCA usar `platformDb` dentro del Storefront, Panel de Administración del Comercio o Server Actions de Comerciantes.**
> 2. **NUNCA aceptar un `tenantId` originado en el cliente/frontend como fuente de verdad.** La identidad del tenant se resuelve exclusivamente en el servidor mediante el Hostname o la sesión autenticada.
> 3. **NUNCA ejecutar consultas SQL en crudo (`$queryRaw` / `$executeRaw`) sin revisión explícita y filtrado estricto por `tenantId`.**

---

## 2. Abstracción `createTenantDb(tenantId)`

El mecanismo de aislamiento de NanoLabs OnlyFood SaaS intercepta automáticamente todas las operaciones de Prisma mediante extensiones client-side (`prisma.$extends`).

### Modelos con Aislamiento Automático (`TENANT_SCOPED_MODELS`):
* `Location`
* `TenantMembership`
* `SystemConfig`
* `Category`
* `Product`
* `Ingredient`
* `Extra`
* `Order`
* `CustomerTier`
* `Client`
* `PointReward`
* `PointRedemption`
* `RoulettePrize`
* `RouletteWin`
* `DeliveryTimeSlot`
* `Messenger`
* `PushSubscription`
* `MediaAsset`
* `WhatsAppSession`
* `TenantSettings`
* `TenantIntegration`
* `PaymentRecord`
* `PrintDispatch`
* `Session`

---

## 3. Comportamiento de las Operaciones en `tenantDb`

1. **Lecturas (`findMany`, `findFirst`, `count`, `aggregate`):** Inyecta forzosamente `{ tenantId }` en la cláusula `where`.
2. **Búsquedas Únicas (`findUnique`, `findUniqueOrThrow`):** Transforma la consulta en un `findFirst` con `{ id, tenantId }`, impidiendo que un comercio consulte un registro de otro comercio conociendo su ID (prevención IDOR).
3. **Creación (`create`, `createMany`, `upsert`):** Fuerza la propiedad `tenantId` en el payload principal. Los IDs de relaciones y nested writes deben validarse explícitamente en la acción; el guard genérico no puede inferir la propiedad de todas las relaciones.
4. **Modificación (`update`, `updateMany`):** Verifica previamente que el registro pertenezca al `tenantId` y elimina cualquier intento de mutar la columna `tenantId`.
5. **Eliminación (`delete`, `deleteMany`):** Valida la pertenencia del registro antes de ejecutar la eliminación física.

La base agrega una segunda barrera: `tenantId` es `NOT NULL`, tiene foreign key y los valores reutilizables por comercio emplean índices compuestos. Para relaciones críticas recibidas desde el cliente, las acciones consultan previamente todos los IDs con `tenantDb` antes de conectar o borrar.

---

## 4. Ejemplos de Implementación

### 4.1 Uso en Módulos de Comercio
```typescript
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";

export async function getProductsAction() {
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  // Consulta 100% aislada: retorna solo los productos del comercio resuelto
  return db.product.findMany({
    where: { isActive: true },
    include: { category: true },
  });
}
```

### 4.2 Uso en Módulos Globales SuperAdmin
```typescript
import { platformDb } from "@/lib/platform-db";
import { requireSuperAdmin } from "@/lib/user-auth";

export async function listAllTenantsAction() {
  await requireSuperAdmin();

  // Acceso global cross-tenant reservado para la plataforma NanoLabs
  return platformDb.tenant.findMany({
    include: { subscription: true, locations: true },
  });
}
```
