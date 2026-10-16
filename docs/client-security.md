# Autenticación de clientes: passkeys, correo y checkout

Implementación por tenant. Rama: `feat/client-passkeys-email-recovery-checkout-auth`.

## Funcionalidades
- Registro de cliente con nombre, teléfono, **email** y contraseña (mínimo 8 caracteres).
- Correo de verificación con token aleatorio, hash SHA-256 en base de datos y vencimiento de 60 minutos. Confirmación explícita en `/verify-email`.
- Restablecimiento en `/reset-password` mediante correo **verificado**: token de un solo uso (30 minutos), rate limiting y revocación de sesiones de cliente después de cambiar la contraseña.
- Passkeys WebAuthn similares a OnlyPadel: Face ID, Touch ID, Windows Hello y autenticadores compatibles. La clave privada y los datos biométricos permanecen en el dispositivo. Las credenciales pertenecen al tenant, al cliente y al dominio (RP ID).
- Gestión de dispositivos y correo desde `/profile`. El login biométrico es una alternativa opcional a la clave.
- En `/admin/settings` → Negocio, interruptor **Exigir cuenta para comprar**. Por defecto `false` (modo compatible con invitados). El servidor valida la política de tenant en la creación de pedidos; los pedidos administrativos no cambian.

## Configurar envíos
Configurar **una** de:
- `RESEND_API_KEY` y `EMAIL_FROM`, o
- `BREVO_API_KEY` y `EMAIL_FROM`.

Usar un remitente verificado real del dominio. Sin proveedor, no se simula la entrega: la interfaz informa que falta configurar el servicio. **No copiar claves de OnlyPadel ni subir credenciales al repositorio.**

El envío se realiza por la API HTTPS de Resend o Brevo; no se habilitó SMTP heredado sin STARTTLS validado.

## Clientes anteriores
Los clientes existentes conservan su teléfono, clave y compras anteriores. No se les asigna un email ficticio. Necesitan iniciar sesión y verificar uno desde `/profile` antes de poder restablecer contraseñas por correo. Para quienes todavía no tienen acceso, el comercio debe gestionar una verificación de identidad y recuperación asistida.

## Despliegue y validaciones previas
1. Backup verificado de MariaDB. No probar migraciones sobre producción directamente.
2. En ambiente staging: `npm ci`, `npx prisma validate`, `npx prisma migrate deploy`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
3. Probar registro, verificación y restablecimiento en 2 tenants diferentes; enlaces vencidos/reutilizados, cuenta sin correo y contraseña actual.
4. Probar passkeys en HTTPS en Android/iOS/Windows, cambiar de dispositivo, remover credenciales y verificar separación por dominio y comercio.
5. Probar checkout con interruptor apagado/encendido: invitado, cliente autenticado y pedidos directos del admin; asegurar que el carrito se mantiene.
6. Configurar claves de correo en staging y producción **antes** de activar el checkout obligatorio. Activarlo comercio por comercio.

**Precaución:** No confundir passkeys de autenticación con acceso al sensor biométrico; el servidor no recibe huellas ni rostros. Ni la migración ni el despliegue se ejecutan por crear el PR.
