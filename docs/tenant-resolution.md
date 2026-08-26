# Resolución de Tenants y Dominios

## 1. Algoritmo de Resolución

El servidor analiza el encabezado `Host` / `x-forwarded-host` de la solicitud HTTP:

```
                  ┌───────────────────────────────┐
                  │       Incoming Request        │
                  │   Host: beats.nanolabs.app    │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 1. Buscar coincidencia exacta │
                  │    en tabla `TenantDomain`    │
                  └──────────────┬────────────────┘
                        │ Coincide?
           ┌────────────┴────────────┐
       SÍ  │                         │ NO
           ▼                         ▼
┌─────────────────────┐   ┌───────────────────────────────┐
│ Retornar Tenant     │   │ 2. Extraer subdominio         │
│ asociado al dominio │   │    (slug = "beats")           │
└─────────────────────┘   │ 3. Buscar en tabla `Tenant`   │
                          └──────────────┬────────────────┘
                                         │ Encontrado?
                            ┌────────────┴────────────┐
                        SÍ  │                         │ NO
                            ▼                         ▼
                 ┌─────────────────────┐   ┌─────────────────────┐
                 │ Retornar Tenant     │   │ Retornar error      │
                 │ asociado al slug    │   │ NOT_FOUND           │
                 └─────────────────────┘   └─────────────────────┘
```

---

## 2. Configuración de Dominios

* **Subdominios Oficiales:** `*.producto.nanolabs.app` (se verifican automáticamente y apuntan por CNAME al servidor).
* **Dominios Personalizados:** `pedidos.mimerce.com` (se registran con `isCustom: true`, requieren validación DNS y guardan `verifiedAt`).
