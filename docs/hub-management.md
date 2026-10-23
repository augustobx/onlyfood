# Administración desde NanoLabs Hub

El contrato `nanolabs.saas.management.v1` se publica en
`/api/integrations/nanolabs/management`. Requiere activación explícita en la web:
`HUB_MANAGEMENT_ENABLED=true` y `HUB_MANAGEMENT_TOKEN` de al menos 32 bytes,
distinto de `HUB_INTEGRATION_TOKEN`. El token de lectura conserva su contrato
`nanolabs.saas.tenants.v1` en `/api/integrations/nanolabs/tenants`.
Ninguno se inyecta en la base ni en el migrador.

Firma: HMAC SHA-256 de `timestamp\nMETHOD\npathnameAndQuery\nactor\nbody`,
con encabezados `X-NanoLabs-Timestamp` (epoch ms, tolerancia 5 minutos),
`X-NanoLabs-Actor`, `X-NanoLabs-Signature` hexadecimal y Bearer. GET firma cuerpo
vacío. El actor proviene de la sesión del Hub; no se fabrica una sesión nativa.
`HUB_MANAGEMENT_OPERATIONS` permite restringir la lista de operaciones; vacío
deniega todas. Los cuerpos JSON se limitan a 32 KiB.

GET admite `catalog`, `plans`, `tenant` y `audit`, con paginación de 100 para
planes/auditoría. El detalle incluye acceso efectivo separado del estado
persistido, fecha de prueba, dominios y estado sanitizado de integraciones.
Nunca devuelve hashes, secretos ni payloads cifrados.

POST: `{requestId, actor, operation, input}`. Operaciones:
`tenant.create`, `tenant.update`, `tenant.status`, `subscription.update`,
`subscription.renew`, `module.set`, `admin.update`, `admin.revoke`,
`plan.create`, `plan.update`, `payment.record`, `payment.status`.

La versión es SHA-256 del estado administrativo y timestamps nativos, no solo
`Tenant.updatedAt`; detecta cambios desde el panel nativo, pagos y features.
No incluye uso/pedidos, por lo que una venta no invalida el formulario.
El PK existente de `PlatformAuditLog` reclama el UUID de solicitud y almacena
el recibo en la misma transacción MariaDB que la mutación. Un reintento con
igual UUID/cuerpo devuelve el resultado; otro cuerpo devuelve 409. Un error
revierte también la reclamación. No requiere una migración de esquema.

Los servicios de suscripción, módulos, credenciales y pagos son compartidos
con SuperAdmin nativo. Asignar un plan conserva excepciones y fechas; activar
o renovar requiere período válido. Renombrar un slug conserva el dominio previo
como alias y registra el nuevo dominio dentro de la misma transacción.
Los IDs históricos que no son UUID siguen siendo válidos.

Pagos SaaS usan `SaaSPayment`, separados de ventas `PaymentRecord`. El importe
se transporta en centavos, conservando el modelo monetario existente. PAID
activa el período indicado; OVERDUE sincroniza PAST_DUE. REFUNDED/VOID registran
estados y no hacen devoluciones financieras externas. Las referencias duplicadas
se rechazan. Cambios de acceso revocan sesiones; cuentas compartidas y SuperAdmin
están protegidos. No hay borrados de tenants/planes ni impersonación.

## Pruebas y operación

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npx prisma validate` y build.
Pruebas DB: `RUN_DB_TESTS=true`, `TEST_DATABASE_URL` apuntando a MariaDB desechable
con nombre que contenga `test`. La prueba de control del Hub exige además hostname
`onlyfood-test-db`. Los scripts `hub-management-smoke.mjs` y
`hub-native-auth-smoke.mjs` exigen esa misma base y
`HUB_MANAGEMENT_TEST_ALLOW_MUTATIONS=isolated-only`. Nunca apuntarlos a producción.

Antes de desplegar, respaldar las 64 tablas (incluidas las históricas fuera de
Prisma), probar restauración en MariaDB 11.8.9 aislada y copiar fuera del host.
Conservar AUTH_SALT, ENCRYPTION_KEY, R2, clave runtime de Server Actions,
configuración, dispositivos y sesiones. No pasar secretos productivos al build.
Recrear solo `app` con `--no-deps --no-build`; no ejecutar migrador ni seeds.
Rollback de aplicación usa imagen/configuración anteriores y conserva la base
viva: restaurar un dump viejo descartaría los pedidos posteriores al respaldo.
