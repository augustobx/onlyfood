# ONLYFOOD — AUDITORÍA TÉCNICA INTEGRAL

Fecha: 2026-08-27

## Veredicto

**LOCAL: OPERATIVO Y VALIDADO.**

**PRODUCCIÓN: CONDICIONADA A INFRAESTRUCTURA Y PROVEEDORES EXTERNOS.**

La aplicación compila, levanta en Docker desde una base vacía, aplica las 18 migraciones, carga datos demo sin duplicados y completa un pedido en efectivo desde la tienda hasta el seguimiento privado. La salida pública todavía requiere credenciales y validaciones que no existen en el entorno local: Mercado Pago y WhatsApp sandbox, R2/S3 real, DNS/ACME y una restauración comprobada de backup.

## Resultado ejecutivo

- P0 críticos abiertos en el código revisado: ninguno.
- Docker build: PASS.
- Servicios: MariaDB, aplicación y proxy saludables; inicializador finalizado con código 0.
- Prisma validate y 18 migraciones sobre base vacía: PASS.
- TypeScript y Next.js production build: PASS.
- Unit tests: 10/10 PASS.
- Integration tests: 76/76 PASS sobre `onlyfood_test` descartable.
- npm audit: 0 vulnerabilidades conocidas.
- ESLint: 0 errores y 159 advertencias no bloqueantes de deuda heredada.
- Smoke HTTP y revisión visual de Beats/Roma, admin, SuperAdmin y onboarding: PASS.
- Flujo navegador catálogo → carrito → checkout efectivo → tracking con token: PASS.
- Identidad visual tenant-aware: PASS con logo configurado y sin fallback cuando está vacío.
- Control SuperAdmin de planes, vigencias y opciones por comercio: PASS.
- Caja diaria y promociones por cantidad con aislamiento tenant: PASS.
- Catálogo de canje y ruleta activados con premios iniciales en planes compatibles: PASS.
- Alta de productos con categoría, ingredientes y extras bajo aislamiento multi-tenant: PASS.
- Alta/edición de promociones y control de suscripciones con identificadores actuales o heredados: PASS.

## Base local recreada

Por autorización expresa se eliminó únicamente el volumen `onlyfood_mariadb_data`. La información que contenía no es recuperable. No se eliminaron los volúmenes de Caddy ni los archivos de uploads.

La base `onlyfood` se creó nuevamente desde cero. Actualmente contiene 18 migraciones versionadas y el seed idempotente dejó:

- Beats: 1 categoría y 1 producto.
- Roma: 1 categoría y 1 producto.
- Beats y Roma: catálogo de puntos activo con 2 canjes, ruleta activa con 3 premios y productos que generan puntos.
- Planes STARTER, PRO y BUSINESS.

Se creó aparte `onlyfood_test`, se ejecutó allí toda la integración y después se eliminó. Al finalizar solo existe la base principal `onlyfood`.

## Seguridad y multi-tenancy

- Auth administrativa: scrypt, sesiones persistidas, cookies seguras, membresía y roles verificados en servidor.
- IDOR: pedidos anónimos protegidos mediante token de tracking; consultas y mutaciones tenant-aware.
- Secretos: integraciones cifradas y configuración pública redactada; no existen master keys de acceso como fallback.
- Webhooks: firma/timestamp, resolución exacta de tenant e idempotencia para billing, Mercado Pago y WhatsApp.
- Uploads: validación por contenido binario, límites, ownership por tenant y rechazo de SVG.
- Rate limiting: buckets compartidos en MariaDB.
- Restricciones: `tenantId` obligatorio en modelos tenant-owned después del backfill.

## Checkout y pagos

- El servidor recalcula precios, descuentos, extras y total; no confía en importes del navegador.
- Cupones, ruleta, puntos e inventario se consumen dentro de transacciones o claims atómicos.
- Mercado Pago usa credenciales por tenant, firma de webhook y conciliación de monto.
- El checkout acepta correctamente una franja horaria opcional vacía; este caso se detectó y corrigió durante la prueba real.
- Pedido local verificado: efectivo, retiro, estado `PENDING` y seguimiento privado con token.

## Infraestructura local validada

| Componente | Resultado |
|---|---|
| `db` MariaDB 11.8 | healthy |
| `database-init` | exited 0 |
| `app` Next.js 16.3 | healthy |
| `proxy` Caddy 2.10 | healthy |
| Caddy local | configuración válida |
| Caddy producción | configuración válida |
| Docker image | build completo PASS |

URLs locales verificadas:

- `http://localhost:8080/api/health`
- `http://beats.localhost:8080`
- `http://roma.localhost:8080`
- `http://beats.localhost:8080/admin`
- `http://roma.localhost:8080/admin`
- `http://localhost:8080/superadmin`
- `http://localhost:8080/onboarding`

Las credenciales locales son las definidas en `.env.docker`; no se copian a la documentación ni al repositorio.

## Riesgos no bloqueantes para local

1. Los importes todavía usan `Float`. El checkout redondea y concilia a dos decimales, pero conviene migrar a centavos enteros o `Decimal`.
2. `createTenantDb` cubre las operaciones principales, pero nuevos nested writes deben mantener validación explícita de relaciones.
3. Permanecen 159 advertencias de lint, principalmente imports/estado heredado sin uso y `<img>` dinámicos.
4. Falta automatizar navegador E2E en CI, medir cobertura y probar hardware PrintNode real.

## Condiciones obligatorias antes de producción

1. Aplicar migraciones sobre un clon anonimizado de los datos productivos y medir bloqueos/duración.
2. Probar cobro y devolución en Mercado Pago sandbox, incluidos webhooks firmados e idempotencia.
3. Probar WhatsApp sandbox con `phone_number_id`, firma y tenant reales.
4. Configurar R2/S3 productivo y validar upload/read/delete y aislamiento cruzado.
5. Configurar DNS público, TLS On-Demand y dominio personalizado en staging.
6. Automatizar backups fuera del host y demostrar una restauración/PITR.
7. Cargar secretos productivos fuera de Git y rotar cualquier credencial histórica que haya estado expuesta.
8. Ejecutar el smoke final contra el dominio público después del despliegue.

## Conclusión

El entorno local está reconstruido y funcional. El código y la infraestructura local superan las verificaciones disponibles, incluida una compra completa real en navegador. No corresponde afirmar todavía que producción está validada: esa aprobación depende de pruebas con infraestructura externa y credenciales sandbox/productivas, no de cambios adicionales que puedan simularse localmente.
