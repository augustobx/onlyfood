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

Los tickets de OnlyFood se envían como ESC/POS RAW, incluyendo ancho de 58/80 mm, logo monocromático y corte. No se abre el diálogo del navegador.

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
