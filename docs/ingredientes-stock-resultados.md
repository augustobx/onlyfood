# Ingredientes, stock y resultados — 30/10/2026

## Recorrido

Menú → Ingredientes y stock tiene una entrada permanente. El catálogo conserva su pestaña de ingredientes.

1. Crear ingrediente: nombre y unidad de receta (unidades, gramos o mililitros). El mínimo y las categorías son opcionales. Sin categoría puede usarse en cualquier receta. La unidad no se modifica una vez creado para evitar reinterpretar existencias.
2. Registrar compra: cantidad, unidad de compra y precio total. Kilos se convierten a gramos y litros a mililitros; ejemplo: 3 kg por $24.000 son 3.000 g a $8/g. Una porción de 30 g cuesta $240.
3. Receta: seleccionar ingredientes y cantidad por producto, con unidad visible. Combos y mitades conservan sus multiplicadores.
4. Disponibles: cantidad que puede usarse para nuevos pedidos. Reservados: ingredientes de pedidos comprometidos aún no entregados. El mínimo se define por ingrediente; no hay umbral fijo de diez unidades.
5. Merma y conteo: acciones secundarias con motivo obligatorio. El conteo corrige el disponible, excluyendo lo separado para pedidos. Si el disponible cambió mientras se completaba, se rechaza para evitar pisar una venta.
6. Historial: compras, ajustes, reservas y devoluciones; fecha de Argentina, cantidad, saldo, motivo y pedido cuando corresponde. Guarda actor en movimientos administrativos. Paginación de 30 movimientos.

## Costos

Las compras calculan costo promedio ponderado de existencias disponibles. No son egresos de Caja: registrar una compra de stock no mueve automáticamente efectivo, evitando duplicar movimientos contables.

Cada pedido nuevo guarda una instantánea de ingredientes, cantidades, unidad y costo al crearse. Cancelar devuelve esas cantidades aunque después cambie la receta. Una compra posterior no recalcula costos de esos pedidos. Pedidos anteriores no se reconstruyen con datos inventados: se señalan como estimaciones a recetas y costos actuales.

Resultados se filtra en servidor por fecha de creación y día de Argentina. Muestra valor de pedidos, importe actualmente pagado, pendiente y ticket promedio. Pagado no significa cobrado durante esas fechas. Cancelados quedan excluidos. Productos más vendidos cuenta unidades de producto, incluidos combos, pendientes y bonificados.

Costos y margen estimado se abre a pedido. Advierte recetas/precios incompletos y no presenta ganancia neta ni semáforos universales de rentabilidad. No incluye costos no modelados (sueldos, impuestos, comisiones, alquiler, extras sin receta, etc.). El consumo es previsto por receta; no es consumo físico medido. El detalle actual por producto permanece disponible.

## Integridad y permisos

- Un mismo cálculo contempla cantidades de componentes de combos, cantidad exterior, mitades e ingredientes quitados.
- Stock y movimiento se guardan en una única transacción con comparación del saldo/costo anterior. No permite saldo negativo ni sobrescribir compras o conteos concurrentes.
- Propietario/encargado administran stock; se valida rol, módulo y tenant en servidor.
- No se envía la instantánea de costos al seguimiento público del cliente.
- No se borran ingredientes: se pausan conservando recetas y movimientos.

## Migración y rollback

20261030120000_ingredient_units_movements_snapshots agrega unidad/mínimo a Ingredient, inventorySnapshot nullable a Order y la tabla IngredientMovement. Los ingredientes anteriores conservan unidad UNIT y cantidades/costos; se registra saldo inicial. No transforma unidades existentes ni cambia recetas antiguas.

El backup privado previo está en /home/augusto/onlyfood-stock-20261030 y su copia externa en C:/Users/abasq/Documents/OnlyFood-stock-20261030. La migración se ensaya sobre una copia restaurada antes del despliegue. El rollback de aplicación conserva la base con las columnas aditivas y usa la imagen previa protegida; no elimina movimientos ni restaura una base sobre ventas nuevas.

Si se opera temporalmente con la versión anterior, sus escrituras de stock no generan el nuevo historial y sus pedidos no guardan instantáneas; deben interpretarse como período legado al regresar. No borrar ni revertir columnas durante un rollback de aplicación.

## Verificación

Pruebas unitarias de conversiones, promedio, combos, mitades, costos congelados, fechas y separación de pagos. Integración con base aislada: movimiento/saldo atómico, rechazo de sobregiro y conteo obsoleto, aislamiento entre comercios, reservas simultáneas y rollback transaccional. Validación de migración sobre copia de producción y recorrido de navegador antes de publicar.
