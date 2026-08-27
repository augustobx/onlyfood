# Almacenamiento multimedia

`lib/storage.ts` implementa dos proveedores:

| Proveedor | Uso | Persistencia |
| --- | --- | --- |
| `local` | desarrollo | `public/uploads/tenants/{tenantId}/...` |
| `r2` / `s3` | producción | bucket compatible con S3 |

En `NODE_ENV=production`, el proveedor local falla salvo `ALLOW_LOCAL_STORAGE=true`. Esa excepción existe para entornos controlados, no para una instalación productiva con varias réplicas o filesystem efímero.

## Configuración R2/S3

- `R2_ENDPOINT` o `S3_ENDPOINT`
- `R2_BUCKET` o `S3_BUCKET`
- `R2_ACCESS_KEY_ID` o `S3_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY` o `S3_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL` o `NEXT_PUBLIC_CDN_URL`
- opcionales: `S3_REGION`, `S3_FORCE_PATH_STYLE`

El bucket debe bloquear listado público. Si los objetos se publican por CDN, limitar el origen al bucket y aplicar CORS solo a los dominios necesarios. Habilitar versionado y lifecycle.

## Seguridad

Las claves se generan en el servidor y siempre comienzan con `tenants/{tenantId}/`. No se confía en paths enviados por el navegador. Para borrar, primero se carga `MediaAsset` mediante el cliente tenant-safe y luego se valida nuevamente el prefijo.

Tipos permitidos: JPEG, PNG, WebP, GIF, AVIF, MP4, WebM y QuickTime. Se rechaza SVG. El servidor valida tamaño, MIME y firma binaria antes de escribir.

Límites: 10 MiB para imágenes y 50 MiB para videos. Caddy limita el cuerpo completo a 50 MB; debe mantenerse alineado con la aplicación.

## Prueba manual de aislamiento

1. Subir una imagen autenticado en Tenant A.
2. Guardar el ID y object key.
3. Intentar eliminar ese ID desde Tenant B.
4. Esperar `not found`/`forbidden` y confirmar que el objeto siga disponible para Tenant A.
5. Repetir con un filename que contenga `../`; debe rechazarse o normalizarse sin salir del prefijo.
