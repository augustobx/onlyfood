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

## Configuración desde el panel

1. Ingresar a **Admin → Configuración → Correo**.
2. Elegir SMTP, Resend o Brevo y completar los datos.
3. Presionar **Guardar correo**.
4. Ingresar un destinatario y usar **Enviar prueba**; verificar la recepción real del mensaje.
5. Recién entonces activar **Negocio → Exigir cuenta para comprar** si se desea.

Si no hay credenciales o el servidor rechaza un email, el sistema **no simula un envío exitoso**. El cliente conserva opción de login por contraseña/biometría si aplica. Los enlaces de recuperación solo se entregan a correos ya verificados.

SMTP exige certificado TLS válido: no se copia `rejectUnauthorized:false` ni se permiten credenciales en texto plano. Las respuestas de error evitan exponer contraseñas. Para Resend/Brevo, el remitente debe estar validado ante el proveedor.

## Alternativa: variables de entorno globales
Sin configuración de email guardada para un comercio, se pueden utilizar variables en el servidor:

```dotenv
EMAIL_PROVIDER=SMTP
SMTP_HOST=c2801249.ferozo.com
SMTP_PORT=465
SMTP_USER=psp@nanolabs.online
SMTP_PASS=
SMTP_FROM="OnlyFood <psp@nanolabs.online>"
# En lugar de SMTP también puede utilizarse EMAIL_PROVIDER=RESEND o BREVO:
RESEND_API_KEY=
BREVO_API_KEY=
EMAIL_FROM=
```

No agregar claves reales al repositorio. Para las tiendas multitenant, usar el panel es preferible. La configuración por comercio reemplaza a los valores globales cuando existe.

## Seguridad y despliegue

- El código está en un PR **draft**: no se aplicaron migraciones ni cambios de producción.
- Antes de fusionar: `npm ci`, `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, backup y verificación en staging.
- Validar email en dos comercios, configuración independiente, errores SMTP, certificado, enlaces vencidos y credenciales ya guardadas.
- No se migraron contraseñas ni configuraciones privadas de OnlyPadel.
