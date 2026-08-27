# Orden del catálogo

Cada producto y combo tiene un campo `sequence`. El administrador del comercio puede modificarlo desde `/admin/catalog` con los botones para subir y bajar elementos.

- Los productos se ordenan dentro de su categoría.
- Los combos mantienen un orden independiente.
- Productos activos y pausados participan del orden para que reactivarlos no cambie su ubicación.
- La tienda pública usa primero `sequence` y luego el nombre como desempate estable.
- Un producto nuevo se agrega al final del catálogo existente y luego puede reubicarse.

La acción de orden exige rol `OWNER` o `MANAGER`, comprueba que todos los IDs pertenezcan al comercio y rechaza el guardado si el catálogo cambió durante la edición. Al guardar se revalidan inmediatamente el catálogo administrativo y la tienda.
