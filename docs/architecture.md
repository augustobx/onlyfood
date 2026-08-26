# Arquitectura Multi-Tenant — NanoLabs OnlyFood SaaS

## 1. Visión General

NanoLabs OnlyFood es una plataforma SaaS Multi-Tenant diseñada para operar cientos de comercios gastronómicos desde una **única aplicación desplegada** y una **única base de datos lógica**, garantizando aislamiento estricto de datos mediante `tenantId`, resolución dinámica de comercios por hostname/subdominio y soporte para múltiples sucursales (`Location`).

```
                    ┌───────────────────────────────┐
                    │      Internet / Cloudflare    │
                    │   (*.producto.nanolabs.app)   │
                    │   (pedidos.cliente.com)       │
                    └──────────────┬────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │   Caddy Reverse Proxy (:443)  │
                    └──────────────┬────────────────┘
                                   │ (Host Header)
                                   ▼
                    ┌───────────────────────────────┐
                    │   Next.js 16 Multi-Tenant App │
                    │   (Tenant Context Resolution) │
                    └───────┬───────────────┬───────┘
                            │               │
            ┌───────────────▼──┐         ┌──▼────────────────┐
            │     tenantDb     │         │    platformDb     │
            │  (Tenant Guard)  │         │  (Super Admin)    │
            └───────┬──────────┘         └──┬────────────────┘
                    │                       │
                    └──────────────┬────────┘
                                   ▼
                    ┌───────────────────────────────┐
                    │     MariaDB 11.8 Database     │
                    │  (Scoped by tenantId/location)│
                    └───────────────────────────────┘
```

---

## 2. Niveles de Aislamiento

1. **Aislamiento a Nivel de Datos:**
   * Todas las entidades de negocio poseen una columna `tenantId` con clave foránea a `Tenant.id`.
   * Los accesos de lectura, creación, modificación y borrado se realizan mediante `createTenantDb(tenantId)`, que inyecta automáticamente filtros de tenant y previene accesos cruzados (IDOR).
2. **Aislamiento a Nivel de Clientes (Storefront):**
   * Los clientes se identifican por `(tenantId, phone)`. Un mismo número de teléfono puede comprar en diferentes comercios manteniendo cuentas, puntos y pedidos completamente independientes.
3. **Aislamiento a Nivel de Usuarios y Staff:**
   * El modelo `User` se vincula a comercios mediante `TenantMembership` con roles (`OWNER`, `MANAGER`, `KITCHEN`, `CASHIER`, `DELIVERY`, `STAFF`).
   * Los Super Administradores de NanoLabs tienen la bandera `isSuperAdmin = true` para la gestión global de la plataforma mediante `platformDb`.
