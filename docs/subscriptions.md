# Planes y suscripciones

Planes iniciales: `STARTER`, `PRO` y `BUSINESS`. Los precios, límites y opciones efectivos salen de la tabla `Plan`; no deben duplicarse en lógica nueva. El seed crea los planes que falten, pero nunca pisa cambios realizados desde SuperAdmin.

| Plan | Sucursales | Productos | Capacidades principales |
| --- | ---: | ---: | --- |
| STARTER | 1 | 50 | pedidos, caja diaria, descuentos por cantidad, efectivo/MP, subdominio |
| PRO | 3 | 300 | STARTER + loyalty, roulette, PrintNode, WebPush |
| BUSINESS | 10 por seed actual | 2000 | PRO + WhatsApp, custom domain, reportes |

Los límites de catálogo y sucursales se validan en backend. Las feature flags se comprueban también en Server Actions/servicios; ocultar una pantalla no constituye autorización.

## Control desde SuperAdmin

Desde `/superadmin`, una cuenta SuperAdmin puede:

- crear planes personalizados y editar nombre, precio mensual, límites, estado disponible y opciones incluidas;
- desactivar un plan para nuevas altas sin modificar las suscripciones existentes;
- asignar cualquier plan a un comercio, incluso uno inactivo;
- editar estado, inicio y fin del período y fecha de finalización de prueba;
- forzar cada opción como habilitada o deshabilitada para un comercio, o devolverla a la herencia del plan.
- cambiar el nombre o correo de cualquier usuario del comercio y restablecer su contraseña;
- revocar automáticamente las sesiones del usuario al modificar su acceso;
- registrar pagos SaaS manuales con importe, método, referencia, vencimiento, fecha efectiva, período y notas;
- consultar el historial de cobros y cambiar un pago entre `PENDING`, `PAID`, `OVERDUE`, `REFUNDED` y `VOID`.

La resolución efectiva de opciones aplica esta precedencia: una excepción `DISABLED` bloquea la opción; una excepción `ENABLED` la concede; sin excepción, se hereda el plan. Cambiar un plan afecta inmediatamente a todos los comercios que lo heredan, pero no elimina sus excepciones individuales. Todas estas operaciones pasan por autorización de SuperAdmin, validación de servidor y auditoría.

No se permite borrar planes desde la interfaz porque podrían tener historial de suscripciones. Para retirarlos se usa `isActive = false`, preservando integridad y trazabilidad.

## Estados

- `TRIAL`: acceso mientras `trialEndsAt` no haya vencido.
- `ACTIVE`: acceso mientras el período vigente no haya vencido.
- `PAST_DUE`: bloqueado actualmente por el resolver de tenant.
- `SUSPENDED`: bloqueado sin borrar datos.
- `CANCELED`: bloqueado sin borrar datos.

No hay un job interno que cambie automáticamente trials/períodos vencidos: el resolver los bloquea por fecha y los webhooks actualizan estados. Si se desea una gracia de 72 horas, debe implementarse explícitamente antes de documentarla como comportamiento.

## Billing SaaS

El historial manual utiliza `SaaSPayment` y nunca se mezcla con `PaymentRecord`, que pertenece a las ventas de cada comercio. Confirmar un pago pone la suscripción en `ACTIVE` y aplica el período facturado. Marcarlo `OVERDUE` sincroniza comercio y suscripción a `PAST_DUE`. Los cambios de identidad, contraseña, suscripción y pagos generan eventos en `PlatformAuditLog`; las contraseñas nunca se registran.

El tablero muestra MRR contractual, cobrado en el mes, monto pendiente y cantidad de pagos vencidos. El MRR es una estimación basada en suscripciones activas; el monto cobrado proviene únicamente de pagos `PAID`.

`MercadoPagoSaaSBillingProvider` crea una suscripción real mediante `/preapproval`, con email del pagador, referencia externa del tenant y callback a `/api/webhooks/billing`. La suscripción local queda pendiente hasta recibir confirmación del proveedor; no se activa por crear un link.

El webhook:

1. valida firma y antigüedad del timestamp;
2. reclama un `WebhookEvent` único para impedir replay;
3. consulta el estado autoritativo en Mercado Pago;
4. encuentra la suscripción por `providerSubscriptionId`/referencia;
5. actualiza `Subscription` y `Tenant`;
6. registra auditoría sanitizada.

Mapeo principal: `authorized` → `ACTIVE`, `paused`/pago vencido → `PAST_DUE`, `cancelled` → `CANCELED`. Probar el ciclo completo en sandbox antes de producción.

## Separación de pagos

Las credenciales de billing pertenecen a NanoLabs (`PLATFORM_MP_*`). Los pagos del consumidor usan la integración cifrada del comercio. No intercambiar esas credenciales: son flujos y destinatarios de fondos distintos.
