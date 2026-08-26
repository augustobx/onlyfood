# BeatsBurgers — Sistema de Pedidos Online & Gestión Gastronómica

Aplicación web completa para la gestión de pedidos y ventas de hamburguesas, bowls y combos de **BeatsBurgers**, preparada para ejecutarse en producción con Next.js, MariaDB, Prisma, Caddy y Docker Compose / Docker Desktop.

## Características Principales

- 🍔 **Catálogo y Personalización**: Productos con extras, exclusión de ingredientes, combos y mitades.
- ⚡ **Modalidades de Pedido**:
  - **Para el momento (ASAP)**: Pedidos con entrega o retiro inmediato en franjas horarias y cupos en tiempo real.
  - **Programados para Mañana**: Pedidos agendados para el día siguiente.
  - **Por Encargo (Fecha Futura)**: Pedidos planificados con calendario interactivo y días de anticipación mínimos/máximos.
- 🎁 **Sistema de Puntos Beats**: Acumulación automática de puntos por compras (1 punto por cada $100) y canje en tienda.
- 🔴 **Tablero en Vivo Kanban (`/admin/live`)**: Gestión de cocina y despacho con filtros rápidos por *Turno de Hoy*, *Programados Mañana* y *Por Encargo Futuros*.
- 📜 **Historial General (`/admin/history`)**: Búsqueda en tiempo real, filtros avanzados por estado, fechas, tipos de orden y reimpresión de tickets.
- 🕒 **Cronograma Semanal y Horarios (`/admin/settings`)**: Configuración por día (Lunes a Domingo) con doble turno y apertura automática por hora local.
- 🖨️ **Impresión Térmica Dual**: Modos Navegador y PrintNode directo en rollos de 58mm y 80mm para cocina y mostrador.

## Puesta en marcha con Docker Desktop / Docker Compose

Requisitos: Docker Desktop / Docker Engine con Compose.

1. Copiar `.env.docker.example` como `.env.docker`.
2. Ajustar los valores en `.env.docker`. (Para local: `HTTP_PORT=8080`, `BASE_URL=http://localhost:8080`, `SITE_ADDRESS=:80`).
3. Iniciar los contenedores:

```bash
docker compose --env-file .env.docker up -d --build
```

Caddy obtiene y renueva automáticamente el certificado TLS cuando `SITE_ADDRESS` contiene un dominio válido. En entorno local abre en `http://localhost:8080`.

## Operación

```bash
# Estado de los contenedores
docker compose --env-file .env.docker ps

# Ver registros en vivo
docker compose --env-file .env.docker logs -f app proxy db

# Actualizar o reconstruir
docker compose --env-file .env.docker up -d --build

# Detener sin borrar datos
docker compose --env-file .env.docker down
```

El contenedor `database-init` ejecuta `prisma migrate deploy` antes de iniciar la aplicación. La base de datos persiste en el volumen `beatsburgers_mariadb_data`.

La migracion `20260812223000_import_legacy_clients` restaura 413 clientes del respaldo historico. Conserva telefono, nombre, puntos y fecha de alta; no importa contraseñas ni tokens. En el primer ingreso de cada cliente, la clave que escriba (minimo 8 caracteres) queda guardada como su nueva clave. La importacion usa el telefono como dato unico y no sobrescribe una cuenta que ya exista.

No ejecutar `docker compose down -v` en produccion: elimina definitivamente la base y los datos de Caddy.

## Backups

En Windows:

```powershell
powershell -ExecutionPolicy Bypass -File docker/backup.ps1 -Destination D:\backups\nfood -EnvFile .env.docker
```

Programar ese comando diariamente y copiar los archivos fuera del servidor. Probar periodicamente una restauracion en un entorno separado.

## Verificaciones

```bash
npm ci
npm run lint
npm run build
npm audit --omit=dev
```

El endpoint `/api/health` verifica aplicacion y base de datos. `/api/orders` y `/api/messengers` deben responder `401` sin una sesion administrativa.

## Impresion de tickets

La aplicacion ofrece dos modos desde **Administracion > Configuracion > Impresoras**:

- **Navegador:** modo semiautomatico. El dashboard debe estar abierto y el operador confirma el dialogo de impresion.
- **PrintNode:** impresion directa en formato termico RAW/ESC-POS, sin depender del tamano de pagina del controlador de Windows. Configurar `PRINTNODE_API_KEY` en `.env.docker`, reiniciar los contenedores y guardar en el panel los IDs de las impresoras de cocina y mostrador.

En modo PrintNode, los pedidos en efectivo se imprimen al crearse y los de Mercado Pago cuando se acredita el pago. Cada destino se registra por separado para evitar duplicados. Los botones **Probar cocina**, **Probar mostrador** e **Imprimir ahora** permiten verificar o repetir una impresion.

## Splash de apertura

Desde **Administracion > Configuracion > Splash** se puede activar la pantalla de apertura y elegir entre la imagen tradicional o un video. El video incluido se encuentra en `/uploads/splashvid.mp4`, se reproduce completo, silenciado y una sola vez por sesion. La navegacion interna no vuelve a mostrar el splash.

## Desarrollo local con Docker

Usar `SITE_ADDRESS=:80`, `HTTP_PORT=8080`, `HTTPS_PORT=8443` y `BASE_URL=http://localhost:8080` en `.env.docker`. Abrir `http://localhost:8080`.
