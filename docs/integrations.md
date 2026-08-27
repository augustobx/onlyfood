# Integraciones por comercio

Las credenciales se guardan cifradas en `TenantIntegration`. El panel nunca vuelve a mostrar secretos existentes; solo indica si la integración está configurada.

## Mercado Pago de la tienda

Cada tenant usa su propio `accessToken` y, opcionalmente, `publicKey` y `webhookSecret`. El backend recalcula precios desde MariaDB, crea la preferencia con las credenciales del comercio y agrega `?tenant={tenantId}` al webhook. Los retornos apuntan al hostname del comercio y llevan el token privado de seguimiento cuando el comprador es anónimo.

Webhook: `/api/webhooks/mercadopago?tenant={tenantId}`. Requiere firma válida. El secreto se toma de la integración cifrada o de `MP_WEBHOOK_SECRET`. La conciliación exige tenant, orden exacta, monto esperado y estado autoritativo consultado al proveedor.

## Billing NanoLabs

Usa `PLATFORM_MP_ACCESS_TOKEN` y `PLATFORM_MP_WEBHOOK_SECRET`. Nunca usar estas credenciales para cobrar pedidos de restaurantes. Endpoint: `/api/webhooks/billing`.

## WhatsApp Meta Cloud API

Disponible cuando la feature `whatsapp` está activa. Cada integración necesita `phoneNumberId`, `apiToken` y `verifyToken`; `externalAccountId` guarda el `phone_number_id` indexado para resolver el tenant exacto.

- GET `/api/webhooks/whatsapp`: valida el verify token contra las integraciones cifradas.
- POST: exige `X-Hub-Signature-256` con `META_APP_SECRET` y resuelve por `metadata.phone_number_id`.
- El sistema no procesa conversaciones entrantes ni crea pedidos desde WhatsApp.
- Los avisos se disparan al confirmar el pedido, comenzar la preparación y dejarlo listo para retiro o envío.
- Todos los envíos usan plantillas Utility aprobadas y quedan registrados en `WhatsAppNotification`.
- El webhook actualiza cada registro a `SENT`, `DELIVERED`, `READ` o `FAILED` según Meta.

Configurar Meta para enviar metadata con phone number ID y suscribir el campo `messages`. Un número no registrado se ignora; nunca se elige un tenant por defecto. La versión de Graph API se guarda por comercio y `META_GRAPH_API_VERSION` funciona como fallback. Ver [configuración y plantillas](./whatsapp-notifications.md).

## PrintNode

Disponible con la feature `printNode`. API key por tenant, o `PRINTNODE_API_KEY` como fallback controlado. Antes de enviar se valida que orden, ubicación, configuración e impresora pertenezcan al mismo tenant. Los trabajos RAW ESC/POS se registran en `PrintDispatch` para idempotencia y auditoría.

## WebPush

Las claves VAPID son de infraestructura (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), no de `SystemConfig`. Una suscripción a pedido exige ser el cliente autenticado o presentar el token de tracking. Las notificaciones anónimas no incluyen un deep link sin token.
