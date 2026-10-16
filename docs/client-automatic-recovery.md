# Recuperación automática por WhatsApp — OnlyFood

## Flujo
1. Cliente sin correo entra a **¿Olvidaste tu clave? → No tengo correo**.
2. Ingresa teléfono registrado, acepta recibir código de seguridad y pulsa enviar.
3. OnlyFood usa **Meta WhatsApp Cloud API**, envía una plantilla **AUTHENTICATION** aprobada a ese número y no muestra el código en el navegador.
4. El cliente pega su **OTP de 8 dígitos**. Dura 10 minutos y se consume una sola vez. Inicia sesión y aparece el modal obligatorio para registrar correo.
5. Al asignar correo, incluso pendiente de confirmación, los códigos anteriores quedan invalidados. Después de verificar su email, la recuperación es **solo por correo**.

**No existe un token que permita entrar con un solo clic sin probar que el número pertenece al solicitante.** No se implementan contraseñas universales.

## Requisitos para activar en un comercio
- Integración **WhatsApp Cloud API** activa, con Phone Number ID y token Meta del comercio en su panel.
- Crear y aprobar una plantilla WhatsApp categoría **AUTHENTICATION**, idioma `es_AR`, nombre exacto `onlyfood_login_code`, botón **OTP → COPY_CODE** y una variable de código. Si la configuración del comercio tiene otro idioma, debe aprobar la plantilla en ese mismo idioma.
- El usuario debe aceptar el envío del código durante la solicitud.
- La integración previa para avisos de pedidos **no registra automáticamente esta plantilla de autenticación**.
- WhatsApp Web personal sin Meta Cloud API no permite este canal de recuperación.

## Límites
- Hasta 3 solicitudes por teléfono/hora y 12 por IP/hora, 8 intentos de canje por teléfono/IP cada 15 minutos.
- No se elige una cuenta cuando hay varios registros que coincidan con el mismo teléfono normalizado.
- Solo cuentas sin correo, incluido no verificado, pueden recibir OTP.
- 8 dígitos aleatorios, SHA-256 en DB, expira en 10 minutos, uso único; ninguna contraseña previa se comparte o modifica.
- Peticiones inexistentes no revelan si la cuenta existe.

## Testing antes de activar en tiendas
- Meta API real y plantilla aprobada; número de prueba con consentimiento.
- Éxito de envío y recepción; OTP correcto, incorrecto, vencido y reutilizado; IP/phone rate limits.
- Cliente con correo verificado o pendiente: no llega OTP; usar reset por email verificado.
- Envío fallido/credenciales ausentes: no otorgar acceso.
- Cliente con teléfono duplicado, cross-tenant, cambio de teléfono, cierre de sesión, registro de email y checkout.

No es viable un despliegue completo solo por CI: pruebas reales de WhatsApp/Meta requieren las credenciales de un tenant de prueba y la plantilla aprobada.
