# Centro de Guías

El panel administrativo incluye `/admin/guides`, un centro de aprendizaje autoservicio pensado para comercios incorporados mediante onboarding sin asistencia manual.

## Funcionamiento

- Explica propósito, procedimiento y buenas prácticas de cada módulo.
- Permite buscar por nombre, tarea o palabra relacionada.
- Filtra por categoría y por módulos disponibles en el plan efectivo.
- Conserva visibles las guías de módulos no incluidos, identificándolos como tales sin ofrecer acceso directo.
- Guarda en `localStorage` el avance de lectura por comercio y dispositivo; no representa una certificación ni modifica datos del tenant.
- Cada guía disponible enlaza al módulo correspondiente dentro del panel.

El catálogo vive en `lib/admin-guides.ts`. Toda entrada requiere ID único, ruta `/admin/*`, categoría, resumen, finalidad, pasos, recomendaciones, palabras clave y, cuando corresponde, una `FeatureKey` válida. La prueba unitaria de seguridad verifica estas condiciones.

## Relación con el onboarding

`/admin/wizard` sigue siendo el recorrido corto para abrir la tienda: catálogo, marca, pagos y horarios. Desde allí se enlaza al Centro de Guías para la capacitación operativa continua. El asistente mide configuración real; las guías miden únicamente lectura local.

Al agregar un módulo nuevo debe incorporarse simultáneamente:

1. navegación y autorización del módulo;
2. entrada en `ADMIN_GUIDES`;
3. `feature` correspondiente si depende del plan;
4. pasos basados en el comportamiento real de la interfaz;
5. actualización de la documentación técnica relacionada.
