# NanoLabs Print Agent para OnlyFood

NanoLabs Print Agent reemplaza la dependencia obligatoria de PrintNode con un agente local controlado por NanoLabs. OnlyFood conserva tres modos independientes: navegador, NanoLabs Print Agent y PrintNode.

## Instalación inicial

1. Instalá `NanoLabs-Print-Agent-Setup-0.1.0.exe` en la computadora conectada a las ticketeras.
2. En OnlyFood abrí **Configuración → Impresoras** y seleccioná **NanoLabs Print Agent**.
3. Guardá la configuración y pulsá **Vincular equipo**.
4. Copiá en el agente la URL del servidor y el código. El código vence a los 10 minutos y solo funciona una vez.
5. En el agente asigná las impresoras de cocina y mostrador. También se puede usar una impresora predeterminada como respaldo.
6. Ejecutá una prueba desde cada destino y dejá habilitado el inicio automático.

## Operación

El agente consulta la cola cada tres segundos. Cada trabajo queda reservado durante 60 segundos, se confirma al imprimir y puede reintentarse hasta tres veces. Si el equipo se apaga, los trabajos pendientes permanecen en el servidor.

Los tickets de OnlyFood se envían como ESC/POS RAW, incluyendo ancho de 58/80 mm, logo monocromático y corte. No se abre el diálogo del navegador. Si se activa **Total de medallones en comanda** en `Configuración > Impresoras`, el ticket de cocina agrega al final el total calculado desde las recetas, combos y extras del pedido. Las palabras configuradas allí determinan qué ingredientes y extras se consideran medallones. La comanda de cocina también muestra **TOTAL PANES** cuando contiene hamburguesas: una unidad de pan por hamburguesa armada, independientemente de sus medallones, incluyendo las hamburguesas de combos y respetando cantidades y pedidos sin pan. El cálculo usa la categoría/nombre del producto y, para hamburguesas con nombres de fantasía, la presencia de pan y medallón en su receta. Se aplica a Browser, PrintNode y NanoLabs Print Agent sin cambiar los tickets de venta ni la configuración de la impresora.

## Seguridad

- Solo se almacenan hashes de códigos y tokens en el servidor.
- El token local se cifra mediante el almacén seguro del sistema operativo cuando está disponible.
- Cada dispositivo queda limitado al comercio que lo vinculó.
- No se exponen puertos en la red local; todas las conexiones se originan desde el agente hacia HTTPS.
- Un dispositivo puede revocarse de inmediato desde el panel.

## Diagnóstico

- **Desconectado:** confirmar que el agente está abierto, que el servidor usa HTTPS y que el equipo tiene Internet.
- **Sin impresora asignada:** seleccionar cocina/mostrador o configurar una impresora predeterminada.
- **Trabajo fallido:** revisar el nombre de impresora, el spooler del sistema y la compatibilidad ESC/POS.
- **SmartScreen en Windows:** la versión inicial no posee firma comercial. Para distribución masiva se debe firmar el instalador con un certificado de firma de código de NanoLabs.

## Compatibilidad

La primera distribución está orientada a Windows x64. Linux y macOS utilizan el comando estándar `lp` y requieren una instalación específica para esas plataformas.


## Tres tickets para hamburgueserías (octubre de 2026)

En **Configuración > Impresoras** se puede activar **Tercer ticket: armado de hamburguesas** (desactivado por defecto). Se mantienen el ticket de **Cliente/Mostrador** (precios, pagos y datos) y el de **Cocina** (hamburguesas con composición final SIMPLE/DOBLE/TRIPLE/CUÁDRUPLE y totales de medallones/panes). El nuevo ticket **Armado** incluye el nombre del cliente, solamente hamburguesas —también las de combos—, instrucciones **SIN**, agregados, notas y **TOTAL PANES**, sin precios ni acompañamientos. Una doble + dos medallones figura como cuádruple, pero cuenta un pan.

- **Navegador:** tres sectores en la misma vista y marcas **CORTE AQUÍ**, o reimpresión individual desde Cocina y Despacho o en la vista de impresión.
- **PrintNode:** tercera impresión ESC/POS con corte propio; por defecto usa la impresora de cocina, o el ID opcional de la estación de armado.
- **NanoLabs Print Agent:** tercer trabajo ESC/POS independiente dirigido a la impresora ya asignada a `KITCHEN`; no requiere actualizar el instalador del agente. La contabilidad de trabajos mantiene `ASSEMBLY` separado de `KITCHEN`.

No se imprime armado en pedidos sin hamburguesas. El cambio es aditivo y requiere desplegar la migración `20261021160000_three_station_tickets` antes de habilitarlo. Los totales dependen de que cada receta tenga sus ingredientes/medallones configurados, o nombres/categorías reconocibles; probar con los productos reales antes de activarlo en producción.
