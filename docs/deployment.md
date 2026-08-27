# Despliegue y operación

## Entorno local

1. Iniciar Docker Desktop.
2. Crear el archivo local:

```powershell
Copy-Item .env.docker.local.example .env.docker
```

3. Levantar únicamente este proyecto:

```powershell
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

Estado esperado: `db`, `app` y `proxy` healthy; `database-init` finalizado con código 0. La inicialización aplica `prisma migrate deploy` y luego el seed idempotente. El ejemplo local usa puertos 8080/8443, storage local y demos habilitadas.

Pruebas rápidas:

```powershell
Invoke-WebRequest http://localhost:8080/api/health
Invoke-WebRequest http://beats.localhost:8080
Invoke-WebRequest http://roma.localhost:8080
Invoke-WebRequest http://localhost:8080/onboarding
Invoke-WebRequest http://localhost:8080/superadmin
```

## Variables

Obligatorias para la aplicación:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de Prisma; Compose la construye desde las variables DB. |
| `AUTH_SALT` | Compatibilidad de hashes heredados; mínimo 32 caracteres. |
| `ENCRYPTION_KEY` o `ENCRYPTION_MASTER_KEY` | Cifrado AES-256-GCM; mínimo 32 caracteres. |
| `BASE_DOMAIN` | Dominio base para subdominios de tenants. |
| `BASE_URL` | URL pública de plataforma y webhooks; HTTPS en producción. |

Inicialización opcional:

| Variable | Uso |
| --- | --- |
| `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` | Crea/actualiza el SuperAdmin inicial; contraseña mínima 12. |
| `SEED_DEMO_DATA` | `true` solo en local/staging descartable. |
| `DEMO_ADMIN_PASSWORD` | Contraseña de los dueños demo. |
| `TEST_DATABASE_URL` | Solo tests de integración; debe apuntar a una base cuyo nombre contenga `test`. |

Producción e integraciones:

| Variable | Uso |
| --- | --- |
| `STORAGE_PROVIDER` | `r2` o `s3` en producción. |
| `R2_*` / `S3_*` | Endpoint, bucket, credenciales, región y URL pública. |
| `PLATFORM_MP_ACCESS_TOKEN` | Credencial NanoLabs para cobrar suscripciones SaaS. |
| `PLATFORM_MP_WEBHOOK_SECRET` | Firma del webhook de billing. |
| `MP_WEBHOOK_SECRET` | Fallback global de firma para pagos de tiendas. |
| `META_APP_SECRET` | Firma de payloads WhatsApp. |
| `PRINTNODE_API_KEY` | Fallback opcional; se prefieren credenciales por tenant. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | WebPush. |

`ALLOW_LOCAL_STORAGE=true` es solo para desarrollo. `ROOT_DOMAIN` se admite como alias heredado, pero la variable canónica es `BASE_DOMAIN`.

## Publicación

Antes del primer arranque:

1. Configurar DNS para que el dominio base, subdominios y dominios personalizados lleguen al proxy. El Caddyfile productivo usa On-Demand TLS y consulta `/api/internal/caddy/ask`; solo el dominio base o un tenant activo con dominio válido puede obtener certificado. La plantilla local monta `Caddyfile.local` y usa HTTP.
2. Copiar `.env.docker.example` a `.env.docker` y reemplazar todos los placeholders.
3. Mantener `SEED_DEMO_DATA=false`, `ALLOW_LOCAL_STORAGE=false` y object storage configurado.
4. Crear y verificar un backup restaurable de la base anterior.
5. Validar la migración primero sobre un clon de producción.
6. Ejecutar:

```bash
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=200 database-init app db proxy
```

7. Verificar `/api/health`, onboarding, SuperAdmin, un tenant, admin, checkout sandbox y recepción firmada de webhooks.

## Rollback

Las migraciones de Prisma no se revierten automáticamente. Ante una falla:

1. dejar de aceptar tráfico;
2. conservar logs y copia de la base fallida;
3. restaurar el backup probado;
4. desplegar la imagen anterior;
5. verificar healthcheck y consistencia antes de reabrir.

No uses `prisma db push`, no ejecutes seeds históricos sobre datos reales y no uses `docker compose down -v` en producción.

## Operación

```bash
docker compose --env-file .env.docker logs -f app db proxy
docker compose --env-file .env.docker restart app proxy
docker compose --env-file .env.docker down
```

`down` conserva los volúmenes. La opción `-v` los elimina y no forma parte del procedimiento normal.
