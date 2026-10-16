# OnlyFood — Correo de clientes (adaptado de OnlyPadel)

El sistema utiliza los mismos transportes disponibles en OnlyPadel: **SMTP 465 SSL / 587 STARTTLS, Resend API y Brevo API**, con una pestaña administrativa para guardar y probar el envío. Su implementación en OnlyFood es **independiente por comercio** y aprovecha `TenantIntegration` con cifrado AES-256-GCM; los secretos no se guardan en texto plano ni aparecen en las respuestas del panel.

## Valores públicos tomados de los formularios de OnlyPadel

Los siguientes valores eran **defaults en el código fuente**, no una lectura de las credenciales efectivas del servidor:

| Opción | Valor |
|---|---|
| Servidor SMTP | `c2801249.ferozo.com` |
| Puerto | `465` |
| Usuario SMTP | `psp@nanolabs.online` |
| Remitente adaptado | `OnlyFood <psp@nanolabs.online>` |

El password SMTP de OnlyPadel **no se encuentra en GitHub** y no se ha copiado. Ingresar la contraseña real desde el panel OnlyFood → Admin → Configuración → **Correo**, si se autoriza usar esa misma casilla. Se guarda cifrada para el comercio; la entrada se vacía luego de guardar.

## Remitente independiente por comercio — obligatorio

Cada tienda debe guardar sus propias credenciales desde su panel. **No existe fallback automático al correo de OnlyFood, OnlyPadel u otro tenant**. Si no está configurado, se rechazan los envíos de seguridad de ese comercio y se informa al administrador. Esto evita suplantar el remitente y mezclar cuentas.

| Comercio | Usuario SMTP | Remitente |
|---|---|---|
| Raptor | `raptor@nanolabs.online` | `Raptor <raptor@nanolabs.online>` |
| Otro tenant | Casilla propia del comercio | Su propia casilla autorizada |

Los valores `c2801249.ferozo.com` / `465` precargan **solamente host y puerto**, porque pueden compartirse entre casillas de Ferozo. El usuario SMTP, contraseña y remitente deben indicarse en cada comercio. Los correos de verificación de cuenta, recuperación y pruebas usan exclusivamente la configuración de ese tenant.

## Configuración desde el panel

1. Ingresar a **Admin → Configuración → Correo**.
2. Elegir SMTP, Resend o Brevo y completar los datos.
3. Presionar **Guardar correo**.
4. Ingresar un destinatario y usar **Enviar prueba**; verificar la recepción real del mensaje.
5. Recién entonces activar **Negocio → Exigir cuenta para comprar** si se desea.

Si no hay credenciales o el servidor rechaza un email, el sistema **no simula un envío exitoso**. El cliente conserva opción de login por contraseña/biometría si aplica. Los enlaces de recuperación solo se entregan a correos ya verificados.

SMTP exige certificado TLS válido: no se copia `rejectUnauthorized:false` ni se permiten credenciales en texto plano. Las respuestas de error evitan exponer contraseñas. Para Resend/Brevo, el remitente debe estar validado ante el proveedor.

## Variables globales del servidor (referencia, no fallback de seguridad)
Las variables `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` o `EMAIL_FROM` del entorno **no se aplican automáticamente** a los correos de recuperación de otros tenants. La configuración por comercio es obligatoria.

No agregar claves reales al repositorio. Los envíos de verificación y recuperación siempre requieren la configuración independiente del comercio.

## Seguridad y despliegue

- El código está en un PR **draft**: no se aplicaron migraciones ni cambios de producción.
- Antes de fusionar: `npm ci`, `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, backup y verificación en staging.
- Validar email en dos comercios, configuración independiente, errores SMTP, certificado, enlaces vencidos y credenciales ya guardadas.
- No se migraron contraseñas ni configuraciones privadas de OnlyPadel.
