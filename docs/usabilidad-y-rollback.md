# Usabilidad de OnlyFood y recuperación

Esta revisión aplica los 22 hallazgos de `auditoria-usabilidad-2026-10-27.md` sobre la versión `6372795`, conservando el Theme 2 oficial, sus controles de tema, el login y la impresión térmica.

## Comportamiento

- Navegación agrupada y filtrada por rol y módulos; caja y reparto tienen una entrada acorde a su trabajo. Las autorizaciones siguen en servidor.
- Operación muestra disponibilidad efectiva, última actualización y fallos de conexión. En teléfono se selecciona una etapa; el menú abre en un panel lateral.
- El pedido manual comienza pendiente de cobro. El detalle destaca el siguiente paso; los estados terminales no ofrecen reactivación y un pago electrónico pendiente bloquea avances.
- Historial consulta en servidor, pagina de a 50 y agrega sobre todo el filtro. Soporta transferencia, fechas del negocio y búsqueda por identificador. La URL conserva filtros y página.
- Ajustes tiene un solo nivel, enlaces directos `?section=...`, protección de cambios pendientes y guardado de campos editados, sin sobrescribir cambios simultáneos de otras secciones. Correo indica su guardado independiente y protege borradores.
- Horarios de atención, modalidades y cupos se encuentran juntos. Cobros enlaza a la conexión de Mercado Pago. Dirección pública muestra dominios verificados y cómo solicitar cambios al administrador.
- Alta de productos comienza por datos de venta; personalización y receta se despliegan a demanda. Descuentos incluye plantillas y un ejemplo con el cálculo compartido del servidor.
- Una sola comunicación automática de entrada por sesión/comercio. Noticias y beneficios conservan accesos voluntarios. Completar cuenta se propone en Perfil; DNI no se pide automáticamente y las claves de acceso siguen disponibles.
- Puesta en marcha comprueba franjas para hoy, todos los medios habilitados y pedidos pagados/entregados. Sus enlaces llevan al ajuste correspondiente.
- Resultados explica pagos pendientes, fecha de creación y estimaciones a costos actuales. Guías distingue lectura local; SuperAdmin usa nombres legibles y métricas coherentes.

## Pruebas

`npm test` incluye políticas de preparación, permisos y filtros históricos. `npm run test:integration` requiere una MariaDB descartable, `TEST_DATABASE_URL` con `test` en su nombre y clave de cifrado de prueba. Las suites de control Hub requieren el alias de red `onlyfood-test-db`. Las pruebas históricas de resolución usan `BASE_DOMAIN=producto.nanolabs.app`.

`scripts/usability-smoke.mjs` prueba login nativo y destinos de seis roles, navegación y búsqueda global mediante Server Actions. Solo funciona con `USABILITY_TEST_ALLOW_MUTATIONS=isolated-only`, host de DB `onlyfood-test-db` y base terminada en `_test`, sobre fixtures explícitos de usabilidad. No ejecutarlo en producción.

Verificar también en navegador: guardar sección y correo, regresar a filtros, alta de producto, pedido manual pendiente, preparación/entrega, promoción, compra/seguimiento, menú móvil, módulos desactivados y aviso de desconexión. Usar datos ficticios para evitar notificaciones, cobros o impresión física reales.

## Respaldo y rollback

Respaldo previo en `/home/augusto/onlyfood-ux-20261027/` y copia externa al servidor en `C:\Users\abasq\Documents\OnlyFood-rollback-20261027\`. El directorio `predeploy/` contiene el checkpoint inmediato anterior a la actualización.

Incluye dump lógico, fuente/configuración privada, imagen Docker, objetos propios de R2 y manifiestos con SHA-256. Configuración y secretos permanecen fuera de Git. La restauración de DB se comprueba en un contenedor aislado, nunca sobre producción. Se conserva `onlyfood-app:rollback-ux-20261027`.

La actualización es compatible con la base existente y no agrega migraciones. Si falla la aplicación, recuperar primero la imagen anterior con el Compose de rollback, conservando DB, archivos y pedidos nuevos. El procedimiento concreto y la revisión se guardan en el directorio privado del release.

Restaurar la DB completa es una operación diferente: sobrescribe el estado comercial posterior al backup. Solo debe considerarse si los datos lo requieren, respaldando el estado actual y obteniendo autorización explícita antes de sobrescribirlos. Nunca eliminar volúmenes como parte de un rollback.
