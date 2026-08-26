# Almacenamiento en Cloudflare R2 / S3

## 1. Estructura de Object Keys

Todos los archivos multimedia se almacenan bajo el espacio de nombres del comercio:

```
tenants/
  {tenantId}/
      branding/
          {timestamp}_{hash}_logo.png
          {timestamp}_{hash}_background.webp
      products/
          {timestamp}_{hash}_burger_cheddar.webp
      promotions/
          {timestamp}_{hash}_banner_promo.jpg
```

---

## 2. Aislamiento y Operaciones

* La clase `ObjectStorageService` en `lib/storage.ts` valida que ninguna operación de borrado o reemplazo pueda afectar archivos de otro `tenantId`.
* Los archivos se validan por tipo MIME (JPG, PNG, WEBP, GIF, SVG, AVIF, MP4, WEBM) y tamaño máximo (10 MB imágenes, 50 MB videos).
* En la base de datos se almacena `objectKey` en la tabla `MediaAsset`.
