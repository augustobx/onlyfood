# Resolución de Tenants y Dominios (NanoLabs OnlyFood SaaS)

## 1. Algoritmo de Resolución en Servidor

El servidor prioriza `Host` y usa `x-forwarded-host` solo si falta. `x-tenant-host` se admite únicamente fuera de producción para pruebas. Caddy conserva el host original (`lib/tenant-context.ts`):

```
                  ┌────────────────────────────────────────┐
                  │            Incoming Request            │
                  │   Host: beats.localhost:8080 (Local)   │
                  │   Host: beats.producto.nanolabs.app    │
                  │   Host: pedidos.micomercio.com         │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │ 1. Buscar coincidencia exacta          │
                  │    en tabla `TenantDomain`             │
                  └───────────────────┬────────────────────┘
                            │ Coincide?
               ┌────────────┴────────────┐
           SÍ  │                         │ NO
               ▼                         ▼
    ┌─────────────────────┐   ┌────────────────────────────────────────┐
    │ Retornar Tenant     │   │ 2. Extraer subdominio                  │
    │ asociado al dominio │   │    (slug = "beats")                    │
    └─────────────────────┘   │ 3. Buscar en tabla `Tenant` por slug   │
                              └───────────────────┬────────────────────┘
                                                  │ Encontrado?
                                 ┌────────────────┴────────────────┐
                             SÍ  │                                 │ NO
                                 ▼                                 ▼
                      ┌─────────────────────┐           ┌─────────────────────┐
                      │ Retornar Tenant     │           │ Retornar Estado     │
                      │ asociado al slug    │           │ NOT_FOUND / 404     │
                      └─────────────────────┘           └─────────────────────┘
```

---

## 2. Tipos de Dominios Soportados

### 2.1 Subdominios Oficiales de Plataforma
* Formato: `{slug}.producto.nanolabs.app` (en producción) o `{slug}.localhost` (en desarrollo local).
* Disponibles en todos los planes (**STARTER**, **PRO**, **BUSINESS**).
* No requieren configuración DNS adicional por parte del comerciante.

### 2.2 Dominios Personalizados del Comercio (`customDomain`)
* Formato: `pedidos.micomercio.com` o `delivery.pizzeriaroma.com`.
* Exclusivo para el plan **BUSINESS**.
* Requiere que el comerciante cree un registro DNS tipo **CNAME** apuntando a `producto.nanolabs.app`.
* El registro no resuelve hasta tener `verifiedAt`. Caddy usa On-Demand TLS y consulta `/api/internal/caddy/ask` antes de emitir: la autorización exige que el resolver acepte el hostname. DNS debe apuntar al proxy y los puertos 80/443 deben ser públicos.

### 2.3 Dominio Raíz de Plataforma
* Las peticiones dirigidas al dominio principal (`producto.nanolabs.app` o `localhost:8080` sin subdominio) se enrutan automáticamente a:
  * `/onboarding`: Portal público de auto-registro para nuevos comercios.
  * `/superadmin`: Consola de control central para el equipo de NanoLabs.
  * `/api/health`: Endpoint de diagnóstico de infraestructura.
