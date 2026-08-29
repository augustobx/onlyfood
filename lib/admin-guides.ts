import type { FeatureKey } from "@/lib/feature-catalog";

export type GuideCategory = "Primeros pasos" | "Operación" | "Catálogo" | "Clientes" | "Automatización" | "Configuración";

export interface AdminGuide {
  id: string;
  title: string;
  summary: string;
  purpose: string;
  category: GuideCategory;
  href: string;
  icon: "rocket" | "orders" | "calendar" | "history" | "cash" | "catalog" | "promotion" | "media" | "metrics" | "clients" | "rewards" | "roulette" | "settings" | "payment" | "whatsapp" | "printer" | "locations" | "domain";
  feature?: FeatureKey;
  minutes: number;
  steps: { title: string; detail: string }[];
  tips: string[];
  keywords: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = ["Primeros pasos", "Operación", "Catálogo", "Clientes", "Automatización", "Configuración"];

export const ADMIN_GUIDES: AdminGuide[] = [
  {
    id: "puesta-en-marcha", title: "Puesta en marcha", category: "Primeros pasos", href: "/admin/wizard", icon: "rocket", minutes: 5,
    summary: "El recorrido mínimo para abrir la tienda y empezar a recibir pedidos.",
    purpose: "Confirmar que marca, menú, pagos y horarios estén completos antes de compartir el enlace público.",
    steps: [
      { title: "Completá los controles reales", detail: "Entrá en Puesta en Marcha y resolvé identidad, catálogo activo, modalidades y franjas, cobros, dominio verificado y pedido de prueba." },
      { title: "Probá la tienda", detail: "Usá Ver mi tienda online, agregá un producto al carrito y recorré el checkout como lo haría un cliente." },
      { title: "Hacé un pedido de prueba", detail: "Creá un pedido pequeño y comprobá que aparezca en Pedidos Hoy con el medio de pago y modalidad correctos." },
      { title: "Abrí al público", detail: "Cuando todos los controles estén listos, abrí el local desde Pedidos Hoy y recién entonces compartí el dominio asignado." },
    ],
    tips: ["No publiques el enlace hasta completar un pedido de prueba.", "Si cambiás precios u horarios, repetí una compra de control."],
    keywords: ["inicio", "onboarding", "abrir", "publicar", "primer pedido"],
  },
  {
    id: "pedidos-hoy", title: "Pedidos Hoy", category: "Operación", href: "/admin/live", icon: "orders", feature: "orders", minutes: 6,
    summary: "Tablero en tiempo real para recibir, preparar, despachar y completar pedidos.",
    purpose: "Centralizar la operación del día y mantener informado al cliente sobre el estado de su compra.",
    steps: [
      { title: "Revisá los nuevos", detail: "Los pedidos ingresan ordenados por hora de entrega y ese horario queda visible en cada tarjeta. Abrí el detalle y verificá productos, variantes, pago, entrega y observaciones." },
      { title: "Cargá ventas de mostrador", detail: "Usá Nuevo pedido manual para elegir productos o combos, personalizar ingredientes y extras, cargar al cliente y dejar la venta pagada en efectivo." },
      { title: "Confirmá o rechazá", detail: "Confirmá únicamente cuando puedas producirlo. Los rechazados pasan a la papelera de Cancelados y desaparecen automáticamente de la agenda, pero conservan trazabilidad en el historial." },
      { title: "Avanzá por etapas", detail: "Mové el pedido a Cocina, luego a Despacho o Reparto y finalmente a Completado. En Despacho podés filtrar rápidamente envíos o retiros y ver cuántos hay de cada tipo." },
      { title: "Imprimí cuando corresponda", detail: "Usá el ticket manual o la impresión automática configurada. En Configuración > Impresoras podés activar el total de medallones de la comanda y definir las palabras que identifican ingredientes y extras. No dupliques impresiones si el pedido ya fue enviado." },
    ],
    tips: ["Mantené esta pantalla abierta durante el horario de atención.", "Antes de completar, confirmá entrega y cobro."],
    keywords: ["pedido", "cocina", "delivery", "estado", "ticket", "rechazar"],
  },
  {
    id: "agenda", title: "Agenda y calendario", category: "Operación", href: "/admin/calendar", icon: "calendar", feature: "orders", minutes: 5,
    summary: "Vista por fecha para organizar pedidos programados y producción futura.",
    purpose: "Anticipar compras, cocina y logística de pedidos para mañana o por encargo.",
    steps: [
      { title: "Elegí una fecha", detail: "Seleccioná el día para ver pedidos inmediatos programados, entregas y retiros asociados." },
      { title: "Revisá el resumen", detail: "Consultá cantidades consolidadas por producto para preparar producción y materias primas." },
      { title: "Abrí cada pedido", detail: "Verificá horario, cliente, modalidad y notas antes de preparar la jornada." },
      { title: "Coordiná cupos", detail: "Si un horario se completa, ajustá los cupos futuros desde Configuración para evitar sobreventa." },
    ],
    tips: ["Revisá la agenda al cierre y antes de iniciar cada jornada.", "Usá el resumen para compras y mise en place."],
    keywords: ["agenda", "calendario", "fecha", "mañana", "encargo", "producción"],
  },
  {
    id: "historial", title: "Historial de pedidos", category: "Operación", href: "/admin/history", icon: "history", feature: "orders", minutes: 4,
    summary: "Consulta histórica de ventas, estados, facturación y ticket promedio.",
    purpose: "Encontrar operaciones anteriores, responder reclamos y analizar resultados por período.",
    steps: [
      { title: "Definí el período", detail: "Filtrá las fechas que necesitás investigar o comparar." },
      { title: "Aplicá filtros", detail: "Buscá por cliente, pedido o estado para reducir el listado." },
      { title: "Abrí el detalle", detail: "Consultá productos, descuentos, modalidad, pago y cambios de estado guardados." },
      { title: "Leé los indicadores", detail: "Usá facturación, cantidad de pedidos y ticket promedio como resumen del período." },
    ],
    tips: ["No confundas pedido cancelado con venta efectiva.", "Para movimientos de efectivo usá Caja diaria."],
    keywords: ["historial", "venta", "buscar", "facturación", "ticket promedio", "reclamo"],
  },
  {
    id: "caja", title: "Caja diaria", category: "Operación", href: "/admin/cash", icon: "cash", feature: "cashRegister", minutes: 7,
    summary: "Apertura, ingresos, egresos, cierre y balances diarios por sucursal.",
    purpose: "Comparar el dinero esperado con el efectivo real y conservar un historial de movimientos explicados.",
    steps: [
      { title: "Abrí la caja", detail: "Elegí la sucursal e ingresá el saldo inicial contado antes de comenzar a operar." },
      { title: "Registrá movimientos", detail: "Cargá ingresos o egresos ajenos a pedidos con categoría, descripción e importe." },
      { title: "Controlá el balance", detail: "Durante el día revisá ventas, movimientos manuales y saldo esperado." },
      { title: "Cerrá con conteo", detail: "Ingresá el efectivo físico, agregá observaciones y guardá la diferencia calculada." },
    ],
    tips: ["No uses ingresos manuales para ventas que ya entraron como pedidos.", "Explicá siempre las diferencias y egresos."],
    keywords: ["caja", "ingreso", "egreso", "balance", "cierre", "efectivo"],
  },
  {
    id: "catalogo", title: "Catálogo, productos y combos", category: "Catálogo", href: "/admin/catalog", icon: "catalog", feature: "orders", minutes: 10,
    summary: "Creación y orden del menú, recetas, stock, extras y combos.",
    purpose: "Mantener lo que se vende, su precio, disponibilidad, presentación y composición operativa.",
    steps: [
      { title: "Creá categorías", detail: "Organizá el menú con nombres que el cliente entienda: hamburguesas, bebidas, postres u otros." },
      { title: "Cargá productos", detail: "Definí nombre, precio, descripción, imagen, días disponibles, puntos, ingredientes y extras." },
      { title: "Ordená la exhibición", detail: "Usá las flechas para subir o bajar productos dentro de su categoría y combos en su listado." },
      { title: "Gestioná stock y opciones", detail: "Actualizá ingredientes, costos, cantidades y extras. Para conservar los historiales, los productos, combos y categorías se pausan en lugar de eliminarse." },
    ],
    tips: ["Usá fotos livianas y claras.", "Probá cada producto con extras y mitades antes de publicarlo.", "El orden guardado se refleja en la tienda."],
    keywords: ["producto", "combo", "ingrediente", "extra", "stock", "precio", "orden", "categoría"],
  },
  {
    id: "promociones", title: "Descuentos por cantidad", category: "Catálogo", href: "/admin/promotions", icon: "promotion", feature: "quantityDiscounts", minutes: 6,
    summary: "Promociones automáticas por cantidad con porcentaje o precio final.",
    purpose: "Incentivar compras grupales o packs sin depender de cupones manuales.",
    steps: [
      { title: "Definí la regla", detail: "Elegí cuántas unidades completan el grupo y si el beneficio es porcentaje o precio final." },
      { title: "Seleccioná productos", detail: "Indicá exactamente qué productos participan; podés exigir variedad o permitir cualquier combinación elegible." },
      { title: "Configurá vigencia", detail: "Agregá fechas, prioridad y descripción clara para el cliente." },
      { title: "Probala en el carrito", detail: "Agregá la cantidad exacta y luego una cantidad superior para validar grupos completos y ahorro." },
    ],
    tips: ["Si coinciden promociones se aplica la de mayor ahorro.", "Revisá el margen antes de activar un precio final."],
    keywords: ["promo", "descuento", "cantidad", "pack", "porcentaje", "precio final"],
  },
  {
    id: "medios", title: "Galería de medios", category: "Catálogo", href: "/admin/media", icon: "media", feature: "orders", minutes: 4,
    summary: "Biblioteca central de logos, portadas y fotos de productos.",
    purpose: "Reutilizar imágenes optimizadas sin volver a subir archivos en cada formulario.",
    steps: [
      { title: "Subí un archivo", detail: "Elegí el tipo de uso y cargá una imagen JPG, PNG o WebP válida." },
      { title: "Esperá la confirmación", detail: "La aplicación valida y guarda el archivo en el almacenamiento configurado para tu comercio." },
      { title: "Reutilizá la imagen", detail: "Abrí el selector de medios desde productos o configuración y elegí el recurso existente." },
      { title: "Eliminá con cuidado", detail: "Antes de borrar confirmá que ninguna pantalla o producto siga usando esa URL." },
    ],
    tips: ["No uses SVG.", "Preferí formato WebP para fotos y PNG para logos transparentes."],
    keywords: ["foto", "imagen", "logo", "portada", "galería", "media", "r2"],
  },
  {
    id: "metricas", title: "Métricas", category: "Operación", href: "/admin/metricas", icon: "metrics", feature: "advancedReports", minutes: 5,
    summary: "Indicadores de ventas, productos y consumo para tomar decisiones.",
    purpose: "Detectar tendencias, productos importantes y costos que requieren atención.",
    steps: [
      { title: "Elegí un período representativo", detail: "Evitá sacar conclusiones de un único día salvo que estés controlando una acción puntual." },
      { title: "Compará ventas", detail: "Observá evolución, ticket y volumen de pedidos." },
      { title: "Revisá productos", detail: "Identificá productos con mayor movimiento y los que necesitan ajustes de precio o presentación." },
      { title: "Controlá costos", detail: "Mantené costos de ingredientes actualizados para que los indicadores sean útiles." },
    ],
    tips: ["Analizá tendencias semanales, no solo totales.", "Una baja venta también puede deberse a producto pausado o sin stock."],
    keywords: ["métrica", "reporte", "venta", "costo", "rentabilidad", "producto"],
  },
  {
    id: "clientes", title: "Clientes y puntos", category: "Clientes", href: "/admin/users", icon: "clients", feature: "loyalty", minutes: 5,
    summary: "Base de clientes, actividad, puntos y nivel de fidelización.",
    purpose: "Consultar el vínculo de cada comprador con el comercio y resolver ajustes controlados de puntos o nivel.",
    steps: [
      { title: "Buscá al cliente", detail: "Usá sus datos para localizar la cuenta correcta antes de modificarla." },
      { title: "Revisá su actividad", detail: "Consultá puntos, pedidos y nivel actual para entender el contexto." },
      { title: "Ajustá solo si corresponde", detail: "Sumá o restá puntos con un motivo verificable; evitá correcciones sin respaldo." },
      { title: "Comprobá el resultado", detail: "Confirmá el saldo y la categoría luego de guardar." },
    ],
    tips: ["Nunca compartas datos de un cliente con otro.", "Para reclamos de pedidos revisá también el Historial."],
    keywords: ["cliente", "usuario", "puntos", "nivel", "saldo", "fidelización"],
  },
  {
    id: "recompensas", title: "Canje de puntos", category: "Clientes", href: "/admin/rewards", icon: "rewards", feature: "loyalty", minutes: 8,
    summary: "Reglas de puntos, niveles y catálogo de premios canjeables.",
    purpose: "Premiar recurrencia con beneficios controlados y medibles.",
    steps: [
      { title: "Definí cuánto suma cada producto", detail: "Revisá los puntos otorgados en Catálogo para que el ritmo de acumulación sea sostenible." },
      { title: "Creá recompensas", detail: "Elegí costo en puntos, tipo de beneficio, valor, vigencia y orden de aparición." },
      { title: "Configurá niveles", detail: "Usá pedidos, gasto o puntos mínimos para segmentar beneficios por fidelidad." },
      { title: "Probá un canje", detail: "Con un cliente de prueba verificá descuento de puntos, creación del cupón y aplicación en checkout." },
    ],
    tips: ["El valor del premio debe ser coherente con los puntos entregados.", "Pausá beneficios vencidos en lugar de reutilizarlos con otro significado."],
    keywords: ["puntos", "canje", "premio", "cupón", "nivel", "fidelidad"],
  },
  {
    id: "ruleta", title: "Ruleta de premios", category: "Clientes", href: "/admin/games", icon: "roulette", feature: "roulette", minutes: 6,
    summary: "Juego de fidelización que consume puntos y entrega premios según probabilidad.",
    purpose: "Aumentar interacción y retorno sin perder control sobre el costo esperado de los premios.",
    steps: [
      { title: "Activá la ruleta", detail: "Definí el costo en puntos desde Configuración y confirmá que el módulo esté habilitado." },
      { title: "Cargá premios", detail: "Elegí nombre, tipo, valor o producto y colores visibles para cada segmento." },
      { title: "Asigná probabilidades", detail: "La suma debe representar una distribución coherente; los premios más costosos deberían ser menos frecuentes." },
      { title: "Hacé una prueba", detail: "Verificá descuento de puntos, premio generado y uso posterior en el pedido." },
    ],
    tips: ["Calculá el costo promedio antes de activar.", "No dejes la ruleta activa sin premios válidos."],
    keywords: ["ruleta", "juego", "premio", "probabilidad", "puntos"],
  },
  {
    id: "configuracion", title: "Configuración general", category: "Configuración", href: "/admin/settings", icon: "settings", minutes: 10,
    summary: "Operación, marca, horarios, pagos, delivery, diseño y comunicaciones.",
    purpose: "Definir cómo se presenta la tienda y qué reglas generales usa para aceptar pedidos.",
    steps: [
      { title: "Negocio", detail: "Configurá nombre, estado abierto/cerrado, mensaje de cierre y tipos de pedido aceptados." },
      { title: "Horarios", detail: "Definí apertura automática, anticipación, tiempo estimado y cupos de entrega o retiro." },
      { title: "Pagos y envíos", detail: "Elegí efectivo o Mercado Pago, costo fijo de envío y descuento global si corresponde." },
      { title: "Diseño y comunicación", detail: "Seleccioná uno de los ocho temas, incluidos Comic Food Pop y Arcade Kitchen con experiencias, animaciones y Club VIP propios. También podés configurar logo, colores, fondo, splash, bienvenida y un tablón de noticias con cierre manual o automático. WhatsApp e impresoras solo aparecen si el plan los habilita." },
    ],
    tips: ["Guardá y probá la tienda después de cada cambio importante.", "Un descuento global se aplica a todo el menú: usalo con cuidado."],
    keywords: ["configuración", "horario", "diseño", "tema", "envío", "abierto", "splash", "tablón", "noticias", "aviso"],
  },
  {
    id: "mercado-pago", title: "Mercado Pago del comercio", category: "Configuración", href: "/admin/settings", icon: "payment", feature: "orders", minutes: 7,
    summary: "Cobro online de pedidos directamente en la cuenta del comercio.",
    purpose: "Aceptar pagos digitales y confirmar pedidos según el estado autoritativo del proveedor.",
    steps: [
      { title: "Obtené las credenciales", detail: "Desde la cuenta de Mercado Pago del comercio generá Access Token y Public Key de la aplicación correcta." },
      { title: "Guardalas en M. Pago", detail: "Pegá cada valor en su campo. La aplicación los almacena cifrados y no vuelve a mostrarlos completos." },
      { title: "Habilitá el medio", detail: "En Pagos activá Mercado Pago para ofrecerlo durante el checkout." },
      { title: "Probá el ciclo", detail: "Realizá una compra controlada y confirmá pago, pedido, webhook y devolución ante cancelación." },
    ],
    tips: ["No uses credenciales de NanoLabs ni de otro comercio.", "Probá primero con importes pequeños."],
    keywords: ["mercado pago", "access token", "public key", "pago online", "webhook"],
  },
  {
    id: "whatsapp", title: "Avisos por WhatsApp", category: "Automatización", href: "/admin/settings", icon: "whatsapp", feature: "whatsapp", minutes: 12,
    summary: "Notificaciones automáticas de confirmación, cocina y pedido listo mediante Meta Cloud API.",
    purpose: "Mantener al cliente informado sin usar WhatsApp para tomar pedidos.",
    steps: [
      { title: "Creá las plantillas Utility", detail: "En WhatsApp Manager cargá las cuatro plantillas y sus variables tal como se muestran en Configuración > WhatsApp." },
      { title: "Configurá credenciales", detail: "Cargá token permanente, Phone Number ID, token de verificación, versión Graph API y prefijo telefónico." },
      { title: "Registrá el webhook", detail: "Copiá la URL pública indicada, usá el mismo verify token y suscribí el campo messages." },
      { title: "Validá y activá", detail: "Guardá, validá la conexión, elegí qué eventos enviar y activá Avisos de pedidos." },
      { title: "Controlá resultados", detail: "Revisá Últimos envíos para confirmar entregas, lecturas o reintentar fallos." },
    ],
    tips: ["Usá únicamente plantillas Utility aprobadas.", "En Argentina guardá celulares con código de área, sin 0 ni 15.", "Si cambia el token permanente, actualizalo antes de que venza el anterior."],
    keywords: ["whatsapp", "meta", "avisos", "plantillas", "token", "webhook", "phone number id"],
  },
  {
    id: "impresion", title: "Impresión de tickets", category: "Automatización", href: "/admin/settings", icon: "printer", minutes: 8,
    summary: "Impresión térmica desde navegador, NanoLabs Print Agent o PrintNode.",
    purpose: "Enviar comandas a mostrador y cocina con menos intervención operativa.",
    steps: [
      { title: "Elegí el modo", detail: "Navegador abre el diálogo, NanoLabs Print Agent imprime en silencio con infraestructura propia y PrintNode queda como compatibilidad opcional." },
      { title: "Vinculá el agente", detail: "Instalá NanoLabs Print Agent en la caja, generá un código de 10 minutos y asigná allí cocina, mostrador o una impresora predeterminada." },
      { title: "Configurá el rollo", detail: "Elegí 58 u 80 mm. En el diálogo del navegador usá márgenes Ninguno, escala 100 %, sin encabezados ni pies y respetá el tamaño CSS." },
      { title: "Activá autoimpresión", detail: "En modo navegador, OnlyFood abre el ticket al llegar un pedido. La confirmación final sigue protegida por el navegador." },
      { title: "Hacé pedidos de prueba", detail: "Probá ambos medios de pago y verificá contenido, destino y ausencia de duplicados." },
    ],
    tips: ["NanoLabs Print Agent debe quedar iniciado en el equipo que tiene las impresoras.", "Podés vincular más de un equipo por comercio para redundancia.", "El navegador no puede cambiar silenciosamente el controlador del sistema operativo."],
    keywords: ["impresora", "ticket", "nanolabs print agent", "printnode", "navegador", "térmica", "58mm", "80mm", "cocina", "mostrador", "papel"],
  },
  {
    id: "sucursales", title: "Múltiples sucursales", category: "Configuración", href: "/admin/settings", icon: "locations", feature: "multipleLocations", minutes: 6,
    summary: "Separación operativa por locales dentro del límite del plan.",
    purpose: "Asignar pedidos, cajas y recursos a la ubicación que realmente los gestiona.",
    steps: [
      { title: "Definí la principal", detail: "La sucursal principal se usa como referencia cuando una operación no indica otra ubicación." },
      { title: "Creá ubicaciones", detail: "Agregá nombre, código, dirección y teléfono sin superar el límite de tu plan." },
      { title: "Revisá operación", detail: "Seleccioná la ubicación correcta al abrir caja, organizar mensajeros o consultar actividad." },
      { title: "Desactivá antes de retirar", detail: "No elimines una sucursal con historial; desactivala para preservar relaciones." },
    ],
    tips: ["Usá códigos cortos y únicos.", "Controlá cada caja por separado."],
    keywords: ["sucursal", "local", "ubicación", "location", "caja"],
  },
  {
    id: "dominio", title: "Dominio personalizado", category: "Configuración", href: "/admin/settings", icon: "domain", feature: "customDomain", minutes: 7,
    summary: "Uso de un dominio propio además del subdominio incluido.",
    purpose: "Publicar la tienda bajo la dirección web elegida por la marca.",
    steps: [
      { title: "Elegí el dominio", detail: "Definí el hostname exacto, por ejemplo pedidos.mimarca.com, sin protocolo ni rutas." },
      { title: "Configurá DNS", detail: "Creá el registro indicado para apuntar el hostname al servidor de OnlyFood." },
      { title: "Solicitá la vinculación", detail: "Informá el dominio a NanoLabs/SuperAdmin para registrarlo, verificarlo y emitir su certificado." },
      { title: "Probá HTTPS", detail: "Confirmá tienda, carrito, checkout y panel bajo el dominio antes de difundirlo." },
    ],
    tips: ["No elimines el DNS mientras el dominio esté activo.", "Cada dominio propio requiere certificado válido."],
    keywords: ["dominio", "dns", "https", "certificado", "cname", "url"],
  },
];
