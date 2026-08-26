# Seguridad y Cifrado Multi-Tenant

## 1. Cifrado de Secretos (AES-256-GCM)

Las credenciales de Mercado Pago, WhatsApp Meta Cloud API y PrintNode **NUNCA** se almacenan en texto plano en la base de datos.

* Se utiliza el algoritmo **AES-256-GCM** (cifrado simétrico autenticado).
* La clave maestra de 256 bits proviene de `ENCRYPTION_MASTER_KEY` o se deriva mediante SHA-256 de `AUTH_SALT`.
* Cada registro en `TenantIntegration` almacena:
  - `encryptedPayload`: Payload cifrado en Base64.
  - `iv`: Vector de inicialización de 16 bytes (Hex).
  - `authTag`: Tag de autenticación de 16 bytes (Hex) para prevenir manipulación o alteración de datos.

---

## 2. Protección contra IDOR (Insecure Direct Object References)

* Ninguna acción confía en IDs recibidos del frontend sin validar propiedad.
* El helper `assertTenantOwnership(tenantId, modelName, resourceId)` y el interceptor `tenantDb` garantizan que cualquier intento de acceder o alterar un recurso perteneciente a otro comercio sea rechazado de inmediato (`403 Forbidden` / `ACCESO_DENEGADO`).

---

## 3. Rate Limiting y Validación

* Rate limiting en memoria/DB mediante `RateLimitBucket` con ventanas temporales y límites por IP, usuario y tenant.
* Validación estricta de payloads en todos los Server Actions mediante esquemas Zod.
* Verificación de firmas criptográficas HMAC (SHA-256) en webhooks entrantes de Mercado Pago y WhatsApp.
