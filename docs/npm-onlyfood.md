# Nginx Proxy Manager para OnlyFood

## Certificado wildcard

Solicitar en Nginx Proxy Manager un certificado Let's Encrypt para:

- `onlyfood.nanoapps.ar`
- `*.nanoapps.ar`

Usar DNS Challenge con el proveedor Cloudflare. El token debe llamarse, por
convención, `onlyfood-npm-acme-nanolabs-online` y limitarse a la zona
`nanoapps.ar` con permisos `Zone DNS Edit` y `Zone Read`. Las credenciales
se cargan en Nginx Proxy Manager, no en el repositorio ni en `.env.docker`:

```text
dns_cloudflare_api_token = TOKEN
```

No cambiar los registros públicos hasta validar la aplicación contra el nuevo
servidor.

## Proxy Host definitivo

- Domain Names: `onlyfood.nanoapps.ar`, `*.nanoapps.ar`
- Scheme: `http`
- Forward Hostname: `onlyfood-app`
- Forward Port: `3000`
- Websockets Support: habilitado
- Block Common Exploits: habilitado
- SSL Certificate: wildcard emitido mediante Cloudflare DNS Challenge
- Force SSL: habilitado
- HTTP/2 Support: habilitado

El Proxy Host se crea después de que `onlyfood-app` exista en la red Docker
externa `proxy`, para que Nginx pueda resolver el upstream al validar su
configuración.
