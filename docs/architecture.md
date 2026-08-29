# Arquitectura Multi-Tenant — NanoLabs OnlyFood SaaS

## 1. Visión General

NanoLabs OnlyFood es una plataforma SaaS Multi-Tenant diseñada para operar cientos de comercios gastronómicos desde una **única aplicación desplegada** y una **única base de datos lógica**, garantizando aislamiento estricto de datos mediante `tenantId`, resolución dinámica de comercios por hostname/subdominio, onboarding autoservicio y soporte para múltiples sucursales (`Location`).

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
            │  (createTenantDb)│         │  (SuperAdmin Ops) │
            └───────┬──────────┘         └──┬────────────────┘
                    │                       │
                    └──────────────┬────────┘
                                   ▼
                    ┌───────────────────────────────┐
                    │     MariaDB 11.8 Database     │
                    │   onlyfood-db-1 (Healthy)     │
                    └───────────────────────────────┘
```

---

## 2. Niveles de Aislamiento y Seguridad

1. **Aislamiento de Datos (`createTenantDb`):**
   * Todas las entidades de negocio poseen una columna `tenantId` obligatoria con clave foránea a `Tenant.id`; `PlatformAuditLog` es la excepción porque también registra eventos globales.
   * Los accesos de lectura, creación, modificación y borrado se realizan mediante `createTenantDb(tenantId)` (`getTenantDb()`), que inyecta automáticamente filtros de tenant y previene accesos cruzados (IDOR).
2. **Aislamiento de Clientes (Storefront):**
   * Los clientes se identifican por `(tenantId, phone)`. Un mismo número de teléfono puede comprar en diferentes comercios manteniendo cuentas, puntos y pedidos completamente independientes.
3. **Aislamiento de Usuarios y Staff:**
   * El modelo `User` se vincula a comercios mediante `TenantMembership` con roles (`OWNER`, `MANAGER`, `KITCHEN`, `CASHIER`, `DELIVERY`, `STAFF`).
   * Los administradores de plataforma operan exclusivamente vía `platformDb` y sesión autenticada en `/superadmin`.
4. **Aislamiento de Almacenamiento:**
   * Archivos y fotos particionados por claves `tenants/{tenantId}/...` en almacenamiento local o Cloudflare R2 / S3.

---

## 3. Módulos y Portales del Ecosistema

1. **Tienda Online Pública (`/`):** Menú digital interactivo, armado de hamburguesas/pizzas, cupones, fidelización y checkout online. Resuelve dinámicamente la identidad y colores del comercio.
2. **Panel de Control del Comerciante (`/admin`):** Gestión en vivo de comandas, cocina, catálogo, fotos, repartidores, configuración y guía de puesta en marcha (`/admin/wizard`).
3. **Plataforma Central SuperAdmin (`/superadmin`):** Monitoreo global de MRR, estados de suscripción, provisionamiento manual de comercios y auditoría de accesos.
4. **Portal de Onboarding Público (`/onboarding`):** Registro autoservicio en 3 pasos con siembra automática de catálogo según rubro comercial.
5. **Webhooks y APIs de Integración (`/api/webhooks/*`):**
   * `/api/webhooks/mercadopago`: Cobro de pedidos de clientes.
   * `/api/webhooks/whatsapp`: verificación del webhook y recepción de estados de envío, entrega, lectura o error de Meta. Los mensajes entrantes no generan pedidos.
   * `/api/webhooks/billing`: Cobro recurrente de suscripciones SaaS de la plataforma.

---

## 4. Identidad visual por comercio

`SystemConfig.logoUrl` es la única fuente de identidad gráfica del comercio. Cuando existe, se utiliza en la navegación, seguimiento, pestaña del navegador, instalación PWA, previews sociales, notificaciones push y tickets. Cuando está vacío no se publica ni se dibuja un logo alternativo: se conserva únicamente el nombre textual del comercio.

La operación en vivo ordena cada etapa por `Order.deliveryTime`, manteniendo al final los pedidos sin un horario reconocible. El despacho permite segmentar en memoria por `needsDelivery` sin cambiar el estado ni el historial. Para cocina, `SystemConfig.kitchenPattyCountEnabled` gobierna la salida del total de medallones tanto en impresión de navegador como en PrintNode y NanoLabs Print Agent; `kitchenPattyKeywords` identifica ingredientes y extras, mientras que las cantidades se toman de las recetas persistidas.

El manifiesto y los metadatos se resuelven en cada request según el hostname del tenant. No deben agregarse `favicon.ico`, `apple-icon.png`, manifiestos estáticos ni imágenes de marca genéricas en `app/` o `public/`, porque las convenciones de archivos de Next.js tienen prioridad sobre los metadatos dinámicos.
