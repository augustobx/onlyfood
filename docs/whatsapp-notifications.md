# Avisos transaccionales por WhatsApp

OnlyFood utiliza Meta WhatsApp Cloud API exclusivamente para enviar actualizaciones de pedidos. No responde conversaciones entrantes y no permite armar pedidos por chat.

## Requisitos de plataforma

En el contenedor deben existir:

- `META_APP_SECRET`: App Secret de la aplicación de Meta. Es global para la plataforma y valida la firma del webhook.
- `META_GRAPH_API_VERSION`: versión de respaldo, por ejemplo `v23.0`. Cada comercio puede definir su versión desde el panel.
- `BASE_URL`: URL HTTPS pública de OnlyFood. El panel construye el webhook como `{BASE_URL}/api/webhooks/whatsapp`.

Cada comercio configura desde **Administración > Configuración > WhatsApp**:

- Token de acceso permanente.
- Phone Number ID.
- Token de verificación de al menos 16 caracteres.
- Versión de Graph API.
- Prefijo telefónico predeterminado. Para celulares argentinos se recomienda `549`.
- Idioma y nombres exactos de las cuatro plantillas aprobadas.

En Meta Developers se debe registrar la URL mostrada por el panel, ingresar el mismo token de verificación y suscribir el campo `messages`.

## Plantillas Utility

Los nombres predeterminados pueden modificarse, pero el orden y cantidad de variables deben respetarse.

### `onlyfood_order_confirmed`

Categoría: Utility. Idioma predeterminado: `es_AR`. Variables del cuerpo: 6.

```text
Hola {{1}}. Confirmamos tu pedido #{{2}} en {{3}}.

Detalle:
{{4}}

Total: {{5}}
Modalidad: {{6}}
```

Variables: cliente, número corto de pedido, comercio, detalle completo, total y modalidad/dirección/horario.

Para efectivo y pedidos creados desde administración se envía al crear el pedido. Para Mercado Pago se envía únicamente después de que el pago queda acreditado.

### `onlyfood_order_preparing`

Categoría: Utility. Variables del cuerpo: 3.

```text
Hola {{1}}. Tu pedido #{{2}} ya está en la cocina de {{3}} y comenzó a prepararse. Te avisaremos cuando esté listo.
```

Variables: cliente, número corto de pedido y comercio. Se dispara al pasar a `IN_PROCESS`.

### `onlyfood_order_ready_pickup`

Categoría: Utility. Variables del cuerpo: 3.

```text
Hola {{1}}. Tu pedido #{{2}} ya está listo para retirar en {{3}}. ¡Te esperamos!
```

Variables: cliente, número corto de pedido y comercio. Se dispara al pasar un pedido sin envío a `FINISHED`.

### `onlyfood_order_ready_delivery`

Categoría: Utility. Variables del cuerpo: 4.

```text
Hola {{1}}. Tu pedido #{{2}} ya está listo y espera ser enviado a {{3}}. Te avisaremos cuando salga. — {{4}}
```

Variables: cliente, número corto de pedido, dirección y comercio. Se dispara al pasar un pedido con envío a `PENDING_DELIVERY`.

## Registro y reintentos

Cada evento genera como máximo un registro por pedido. Los estados disponibles son `PENDING`, `PROCESSING`, `SENT`, `DELIVERED`, `READ` y `FAILED`. El panel muestra los últimos envíos y permite reintentar únicamente los fallidos, evitando duplicados por clics o transiciones repetidas.

Meta exige opt-in para iniciar mensajes. El comercio debe informar durante el checkout que el número se utilizará para actualizaciones operativas del pedido y respetar cualquier solicitud de baja.
