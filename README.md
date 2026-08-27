# NanoLabs OnlyFood SaaS

Plataforma gastronómica multi-tenant construida con Next.js 16, TypeScript, Prisma 7, MariaDB 11.8, Docker Compose y Caddy. Incluye storefront, catálogo ordenable, administración por comercio, centro de guías autoservicio, caja diaria, promociones automáticas por cantidad, fidelización con canje de puntos, ruleta de premios y SuperAdmin maestro con control de planes, vigencias, accesos y pagos SaaS, además de onboarding, Mercado Pago, WhatsApp, PrintNode y almacenamiento S3/R2.

## Inicio local con Docker

Requisitos: Docker Desktop con el motor iniciado y Docker Compose v2.

```powershell
Copy-Item .env.docker.local.example .env.docker
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

En desarrollo local el ejemplo habilita almacenamiento en disco y crea los tenants demo. Cambiá las contraseñas del archivo copiado si el equipo es compartido.

URLs:

- Plataforma: `http://localhost:8080`
- Beats: `http://beats.localhost:8080`
- Roma: `http://roma.localhost:8080`
- Admin: `http://beats.localhost:8080/admin`
- SuperAdmin: `http://localhost:8080/superadmin`
- Onboarding: `http://localhost:8080/onboarding`
- Salud: `http://localhost:8080/api/health`

Las credenciales locales son las definidas en `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` y `DEMO_ADMIN_PASSWORD` de `.env.docker`. No existen claves maestras ni contraseñas administrativas embebidas en la aplicación.

## Desarrollo sin contenedores para la aplicación

Con una instancia MariaDB disponible y `DATABASE_URL` configurada:

```powershell
npm ci
npx prisma migrate deploy
node scripts/seed-saas.mjs
npm run dev
```

## Verificación

```powershell
npx prisma validate
npx tsc --noEmit
npm run lint
npm test
npm run build
```

`npm test` ejecuta pruebas unitarias sin base. Las pruebas que crean tenants y verifican aislamiento, billing y storage requieren una base desechable:

```powershell
$env:TEST_DATABASE_URL = "mysql://usuario:clave@127.0.0.1:3306/onlyfood_test"
npm run test:integration
```

No ejecutes las pruebas de integración contra producción. Los scripts históricos `seed.mjs` y `seed-bowls.mjs` están bloqueados salvo autorización explícita y solo deben usarse con bases descartables; el seed soportado es `scripts/seed-saas.mjs`.

## Producción

Usá `.env.docker.example` como plantilla. En producción son obligatorios:

- contraseñas de MariaDB fuertes;
- `AUTH_SALT` y `ENCRYPTION_MASTER_KEY`/`ENCRYPTION_KEY` aleatorios de al menos 32 caracteres;
- `BASE_DOMAIN` y `BASE_URL` públicos correctos;
- SuperAdmin inicial con contraseña de al menos 12 caracteres;
- object storage R2/S3 (`STORAGE_PROVIDER=r2` o `s3`);
- secretos de firma de los webhooks habilitados;
- TLS y DNS verificados;
- backup probado antes de aceptar pedidos.

`SEED_DEMO_DATA=false` evita crear Beats y Roma. El arranque usa `prisma migrate deploy`; nunca `prisma db push`.

La guía operativa completa está en [docs/deployment.md](./docs/deployment.md). La auditoría y el estado verificable están en [docs/production-readiness.md](./docs/production-readiness.md).

## Seguridad y multi-tenancy

- La identidad del comercio se obtiene del hostname validado, no de un `tenantId` enviado por el navegador.
- Las operaciones comerciales usan `createTenantDb(tenantId)` y los IDs recibidos se validan contra el tenant.
- Los registros tenant-owned requieren `tenantId` en Prisma y MariaDB.
- Admin y SuperAdmin usan usuarios, sesiones expirables y autorización backend por membresía/rol.
- El seguimiento anónimo de pedidos requiere un token aleatorio; conocer el UUID no alcanza.
- Credenciales de integraciones se cifran con AES-256-GCM y no se envían al frontend.
- Webhooks de Mercado Pago y Meta requieren firma válida.
- SVG está rechazado y los uploads se validan por tamaño, MIME y firma binaria.

Más detalle: [arquitectura](./docs/architecture.md), [multi-tenancy](./docs/multi-tenancy.md), [seguridad](./docs/security.md), [integraciones](./docs/integrations.md), [storage](./docs/storage.md), [suscripciones](./docs/subscriptions.md), [centro de guías](./docs/guides.md), [orden del catálogo](./docs/catalog-ordering.md), [caja y promociones](./docs/cash-and-promotions.md), [puntos y ruleta](./docs/rewards-and-roulette.md), [dominios](./docs/tenant-resolution.md) y [backups](./docs/backups.md).
