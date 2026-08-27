# Seguridad

## Autenticación y autorización

- Admin y SuperAdmin autentican por email y contraseña con hashes `scrypt` y comparación constante.
- Las sesiones se almacenan en `UserSession`; las cookies son `HttpOnly`, `SameSite=Lax`, expiran y usan `Secure` en producción.
- Cada acceso admin vuelve a resolver el tenant del host y exige una `TenantMembership` válida. Las acciones sensibles comprueban roles en backend.
- SuperAdmin exige `User.isSuperAdmin`; no existe master key HTTP ni contraseña administrativa global.
- Las cuentas de compradores tienen sesiones ligadas tanto al cliente como al tenant. Una sesión de un host no autoriza otro tenant.

## Aislamiento e IDOR

- Los modelos comerciales exigen `tenantId` en Prisma y tienen `NOT NULL` en la migración.
- `createTenantDb()` agrega el tenant a operaciones de lectura y escritura. Además, cada acción que recibe IDs valida relaciones y pertenencia antes de escribir.
- El seguimiento anónimo requiere un token criptográfico de 32 bytes. En base se guarda solo SHA-256; el UUID del pedido por sí solo no permite leerlo ni suscribirse a WebPush.
- Los custom domains solo resuelven después de `verifiedAt`; tenants suspendidos, cancelados o vencidos no sirven storefront/admin.

El guard de Prisma no inspecciona de forma universal todos los nested writes. Por eso las acciones de catálogo y checkout validan explícitamente productos, categorías, ingredientes, extras, recompensas, ubicaciones y clientes. Cualquier nueva acción con `connect`, IDs anidados o SQL crudo debe repetir esa validación o incorporar constraints compuestos.

## Secretos

Las integraciones por tenant se guardan en `TenantIntegration` cifradas con AES-256-GCM, IV aleatorio y authentication tag. La clave sale de `ENCRYPTION_KEY`, `ENCRYPTION_MASTER_KEY` o `AUTH_SALT`; no hay fallback embebido y se exige una fuente de al menos 32 caracteres.

El frontend recibe únicamente indicadores “configurado/no configurado” y datos públicos. `SystemConfig` deja de ser el repositorio de tokens heredados cuando existe una integración cifrada.

La rotación de la clave maestra todavía requiere una migración operativa decrypt/re-encrypt; conservar la clave en un gestor de secretos y respaldarla por separado.

## Webhooks

- Pagos de tienda: HMAC de Mercado Pago, timestamp reciente y tenant explícito en la URL generada.
- Billing SaaS: HMAC obligatorio, timestamp, `request-id` y claim idempotente mediante `WebhookEvent`.
- WhatsApp: `X-Hub-Signature-256` obligatorio; el tenant se resuelve por `phone_number_id`, nunca escogiendo el primer comercio activo.

No habilites una integración hasta configurar su secreto de firma. Para Mercado Pago de tienda se usa primero el secreto cifrado del tenant y luego `MP_WEBHOOK_SECRET` como fallback.

## Uploads

- Prefijo obligatorio `tenants/{tenantId}/`.
- Tamaño máximo: 10 MiB para imágenes y 50 MiB para video.
- Lista permitida: JPEG, PNG, WebP, GIF, AVIF, MP4, WebM y QuickTime.
- Se verifican MIME declarado y bytes mágicos. SVG está rechazado.
- Delete exige registro `MediaAsset` del tenant y clave bajo su prefijo.

## Rate limit y logs

El rate limit usa buckets persistidos en MariaDB, por lo que se comparte entre instancias. La actualización está dentro de una transacción, aunque una instalación de gran volumen debería evaluar Redis y protección perimetral. No confiar en el rate limit de aplicación como defensa global ante DDoS.

Los logs no deben contener contraseñas, cookies, access tokens ni payloads completos de integraciones. `PlatformAuditLog` sanitiza claves sensibles, pero cada nuevo campo debe revisarse antes de incluirlo en `details`.
