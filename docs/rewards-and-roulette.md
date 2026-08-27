# Fidelización, canje de puntos y ruleta

## Disponibilidad por plan

El catálogo de canjes depende de la opción `loyalty` y la ruleta de `roulette`. Ambas vienen incluidas en los planes PRO y BUSINESS. SuperAdmin puede agregarlas o quitarlas de cualquier plan y también definir excepciones por comercio; al deshabilitarlas, las funciones dejan de mostrarse y sus acciones quedan bloqueadas en servidor sin borrar datos históricos.

## Puntos y canjes

Cada producto puede definir cuántos puntos suma. En la instalación inicial, los productos que todavía tienen valor cero reciben aproximadamente un punto por cada $100 de precio, con un mínimo de 10; cualquier valor configurado manualmente se conserva.

El comercio administra el catálogo desde `/admin/rewards`. Puede crear beneficios de porcentaje, monto fijo, producto o combo, establecer costo, vigencia, orden, nivel mínimo y estado. Un canje descuenta los puntos y genera un cupón personal válido por 30 días. El pedido vuelve a comprobar cliente, saldo, vigencia, comercio y disponibilidad del premio antes de consumirlo. La deducción es atómica para impedir dos canjes simultáneos con el mismo saldo.

Una instalación nueva con fidelización habilitada recibe dos beneficios editables: 10% de descuento por 250 puntos y $1.000 de descuento por 400 puntos.

## Ruleta

La administración se encuentra en `/admin/games`. Allí OWNER o MANAGER puede encender o apagar el juego, cambiar el costo en puntos y administrar premios y probabilidades. La suma de probabilidades no puede superar 100%.

En la tienda, el acceso a la ruleta sólo aparece cuando la opción del plan está habilitada, la configuración está encendida y existe al menos un premio. Para girar, el cliente debe iniciar sesión y disponer del saldo requerido. El cobro de puntos, la selección criptográficamente aleatoria y la creación del premio ocurren dentro de una única transacción. Un premio ganado se reserva durante 24 horas y se consume al confirmar el pedido.

La configuración inicial usa un costo de 100 puntos y tres premios editables cuyas probabilidades suman 100%: 5% OFF, $500 OFF y 10% OFF.

## Activación de datos existentes

La migración `20260827002000_activate_loyalty_and_roulette` activa una sola vez los módulos para comercios cuyo plan los incluye. Sólo crea catálogos o premios cuando no existe ninguno y sólo completa puntos de productos cuyo valor era cero. Después de aplicada, las decisiones del administrador no son sobrescritas por reinicios ni por el seed idempotente.
