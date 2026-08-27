# Caja diaria y promociones por cantidad

## Caja diaria

Cada sucursal puede tener una caja por fecha comercial. El acceso está disponible en `/admin/cash` para `OWNER`, `MANAGER` y `CASHIER`.

El módulo depende de la opción de plan `cashRegister`; SuperAdmin puede habilitarla o bloquearla por plan o por comercio.

Una caja registra:

- saldo inicial y observaciones de apertura;
- ventas en efectivo entregadas durante la sesión;
- ingresos y egresos manuales con categoría, descripción, importe, fecha y usuario;
- saldo esperado, efectivo contado, diferencia y observaciones de cierre;
- historial filtrable por fechas y sucursal.

El saldo esperado se calcula como:

`saldo inicial + ventas en efectivo + ingresos manuales - egresos`

Las ventas se incorporan cuando un pedido con método `CASH` llega a `DELIVERED`. Los movimientos no se eliminan desde la interfaz para conservar trazabilidad. Una caja cerrada puede reabrirse únicamente con rol `OWNER` o `MANAGER`; el evento queda auditado.

## Descuentos por cantidad

La administración se realiza en `/admin/promotions` con rol `OWNER` o `MANAGER`. El módulo y su aplicación automática dependen de la opción de plan `quantityDiscounts`; al deshabilitarla desaparece del panel y deja de aplicar promociones nuevas, sin borrar su historial.

Cada promoción define:

- uno o varios productos elegibles;
- cantidad mínima por grupo;
- descuento porcentual o precio final por grupo completo;
- prioridad, vigencia opcional y estado activo/inactivo.

Ejemplo: una promoción de 5 bowls con precio final de $25.000 aplica una vez al comprar entre 5 y 9 unidades elegibles, y dos veces entre 10 y 14.

Solo califican grupos completos. Si hay productos elegibles con diferentes precios, se toman primero las unidades de menor precio. Si coinciden varias promociones, se aplica únicamente la que produzca el mayor ahorro; no se acumulan promociones por cantidad entre sí. Después se aplican el descuento general y los beneficios/cupones existentes.

El carrito muestra una estimación inmediata. El importe definitivo siempre se recalcula en servidor con precios, productos, vigencias y reglas actuales. El pedido guarda el importe y detalle de la promoción aplicada, y el ticket y panel administrativo lo muestran por separado. El mismo motor se usa para tienda web, venta manual y WhatsApp.
