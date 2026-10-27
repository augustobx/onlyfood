# OnlyFood: auditoría de usabilidad y simplificación

Fecha: 27/10/2026. Revisión local: `855a021911aa934d0272587183f17a4549f919a0`.

## Diagnóstico

OnlyFood ofrece un circuito amplio, pero le exige al usuario conocer demasiado de su organización interna. La complejidad aparece por acumulación de destinos, configuración repartida, nombres inconsistentes y acciones avanzadas expuestas antes de necesitarlas. Además, hay señales de estado que pueden generar una confianza equivocada.

La dirección recomendada es conservar las capacidades y reducir las decisiones simultáneas. Cada persona debería reconocer dónde está, qué requiere atención y cuál es su siguiente acción.

## Alcance y límites de la evidencia

Auditoría heurística del código de interfaz, sus consultas y acciones relacionadas: panel administrativo y sus 15 destinos, pedidos manuales, detalle de pedidos, tienda y variantes de tema, carrito, checkout, seguimiento, perfil, acceso y recuperación, onboarding comercial, guías y SuperAdmin. Se revisaron componentes compartidos y políticas que afectan estos recorridos.

Los hallazgos confirmados describen lo que implementa esta revisión; su efecto sobre facilidad de uso es una evaluación profesional, todavía sin medición con usuarios. Los riesgos visuales, de rendimiento o de accesibilidad que requieren ejecución se identifican como pendientes.

La navegación pública a `https://onlyfood.nanoapps.ar` llegó al login de SuperAdmin. No había una sesión administrativa autenticada en ese navegador. No se completaron compras ni cambios productivos. No se levantó una base local ni se ejecutó una matriz interactiva de roles, dispositivos y temas. Por eso este documento no certifica toda la experiencia desplegada, seguridad, integraciones o rendimiento real. La revisión local coincide con la revisión indicada por el informe de despliegue del 26/10 en NanoHUB, sin comprobar nuevamente la imagen remota.

No se modificó código funcional. Se entrega diagnóstico y diseño propuesto, con validaciones para una implementación posterior.

## Lo que conviene preservar

- El detalle de pedido compartido por operación, agenda e historial.
- El flujo completo de preparación, retiro y reparto, con protección de pagos electrónicos pendientes.
- El checkout ya distingue entrega/retiro, direcciones, horarios, medios de pago y revisión final. Los textos del botón cambian según el pago.
- Las direcciones guardadas, recompra, seguimiento y navegación móvil existentes.
- La personalización de productos, combos, ingredientes y extras; mostrarla progresivamente.
- La separación entre ventas del comercio y administración de suscripciones SaaS.
- La existencia de un asistente de puesta en marcha y guías. Corregir su precisión y ubicación.
- La preservación del historial al pausar productos o categorías.

## Prioridades

P1: afecta la confianza operativa, puede inducir errores o bloquear el comienzo. P2: aumenta esfuerzo y aprendizaje. P3: mejora consistencia y mantenimiento. Estas prioridades son de producto; no equivalen a severidades de seguridad.

| ID | Prioridad | Hallazgo confirmado en código | Consecuencia y cambio propuesto |
|---|---|---|---|
| U01 | P1 | La puesta en marcha afirma que los pedidos inmediatos no requieren franjas. El checkout exige `deliverySlotId` para `IMMEDIATE`. | Un comercio con solo pedidos de hoy y sin franjas puede aprobar ese control y fallar al vender. Compartir la política de requisitos entre asistente y checkout. |
| U02 | P1 | “Cobros listos” solo contempla efectivo o Mercado Pago configurado. | Transferencia como único medio válido queda pendiente; efectivo puede hacer pasar el control aunque MP habilitado esté incompleto. Mostrar preparación por medio habilitado. |
| U03 | P1 | “Pedido de prueba completo” se cumple con `ordersCount > 0`. | Un pedido pendiente o cancelado basta para presentarlo como circuito probado. Separar “primer pedido recibido” de una prueba completada y verificable. |
| U04 | P1 | El tablero sondea cada cinco segundos, registra errores en consola y mantiene un indicador verde fijo de operación en vivo. | Una pantalla sin actualizar puede parecer vigente. Mostrar última actualización, reconexión y pérdida de conexión; distinguir carga inicial fallida de cero pedidos. |
| U05 | P1 | Historial carga como máximo 1.000 pedidos; búsqueda, fechas y estadísticas se calculan sobre ese conjunto. | Una búsqueda antigua puede devolver vacío aunque exista el pedido. Llevar filtros y agregados al servidor con paginación y total real; informar el alcance. |
| U06 | P1 | Configuración ofrece “Guardar Todos los Cambios”, pero correo tiene estado y guardado independientes; cupos y mensajeros usan acciones propias. | No hay un contrato único de persistencia. Guardar por sección, indicar cambios pendientes y avisar antes de perderlos. |
| U07 | P1 | El pedido manual inicia y se reinicia con `paymentStatus = PAID`. | Quien carga un pedido telefónico puede registrarlo como cobrado por omisión. Hacer explícita la decisión; probar un valor inicial pendiente según el contexto. |
| U08 | P2 | El menú tiene hasta 15 destinos sin agrupación y filtra por feature, no por rol. El backend sí distingue roles. | Cocina o reparto pueden ver destinos que luego no pueden usar. Derivar navegación, inicio y acciones del rol y de las features efectivas. Mantener autorización backend. |
| U09 | P2 | “Pedidos Hoy” abre “Cocina y Despacho”; “Promociones” abre “Descuentos por cantidad”; “Canje de Puntos” abre “Fidelización & Ranking de Compradores”. | El usuario debe reconciliar nombres. Usar el mismo nombre en menú, título, enlaces y guías. |
| U10 | P2 | Configuración combina tres pestañas externas con hasta nueve internas. “Horarios” y “Horarios (Cupos)” están en niveles distintos; “Pagos” y “M. Pago” también. | Se necesita recordar la ubicación de cada regla. Unificar por tarea y permitir enlaces directos a cada sección. |
| U11 | P2 | La pantalla diaria muestra aprobación de transferencias y planificación de tandas antes del kanban, incluso vacías. | La atención se desvía de los pedidos que requieren acción. Mostrar excepciones relevantes como avisos; abrir reparto y herramientas secundarias a demanda. |
| U12 | P2 | El formulario de producto comienza con reglas de mitades y quitar ingredientes antes del nombre y precio, y expone puntos, receta y extras. | Una alta sencilla parece avanzada. Poner datos de venta primero; secciones plegables de personalización, receta/costos y fidelización. |
| U13 | P2 | La apertura manual aparece en pedidos y configuración; también hay reglas de horario automático y cupos en otra pestaña. | Es difícil anticipar si la tienda realmente acepta pedidos. Mostrar un estado efectivo con motivo: pausa manual, fuera de horario, modalidad desactivada o falta de cupos. |
| U14 | P2 | Splash, tablón y globo de bienvenida se encadenan si están habilitados; ruleta y puntos agregan accesos flotantes. | El primer acceso puede requerir atravesar varias comunicaciones antes de comprar. Definir un presupuesto de interrupciones y preferir avisos integrados. |
| U15 | P2 | El onboarding de cuenta se monta en todo el layout de tienda. Puede pedir correo faltante, DNI opcional y passkey. | Puede interrumpir compra o seguimiento con tareas de cuenta. Mover las invitaciones opcionales al perfil o después del pedido; revisar cuándo pedir correo conservando la recuperación segura. |
| U16 | P2 | El paso DNI acepta formato, guarda solo `dniProvidedAt` y aclara que no verifica identidad. | Pedir un dato sensible sin una utilidad visible agrega fricción y desconfianza. Revisar la necesidad de producto antes de conservarlo en el recorrido. |
| U17 | P2 | Promociones mezcla listado con un editor permanente, prioridad numérica y selección extensa de productos; no muestra simulación del precio resultante. | Hay que entender la regla mentalmente antes de guardarla. Plantillas y ejemplo de “5 unidades → total → ahorro”, calculado con la misma política del servidor. |
| U18 | P2 | Guías llama “Progreso del equipo” a lecturas guardadas en `localStorage` por dispositivo. | El título promete seguimiento compartido. Renombrar a “Tu lectura en este dispositivo” o implementar progreso real por usuario/equipo si se necesita. |
| U19 | P2 | Asistente enlaza identidad, operación, pagos y dominio a `/admin/settings`, siempre en su pestaña inicial; esa pantalla no ofrece gestión de dominio. | La ayuda entrega trabajo de búsqueda y un destino sin resolución para dominio. Enlazar al control exacto y ofrecer una vía real de gestión o soporte. |
| U20 | P2 | Historial suma pedidos no cancelados bajo “Facturación”; métricas suma pedidos no cancelados y calcula insumos con recetas y costos actuales. | Puede confundirse valor pedido con cobrado y estimación de insumos con rentabilidad histórica. Explicitar alcance, estado de pago, criterio temporal y naturaleza estimada. |
| U21 | P2 | Hay formularios con placeholders como único nombre visible, botones de icono sin etiqueta explícita y barras de pestañas anchas sin adaptación local clara. | Riesgo de uso con teclado, lector y pantallas estrechas. Corregir nombres accesibles y validar foco, zoom, tamaños táctiles y desbordamiento real. No se certifica incumplimiento WCAG sin prueba. |
| U22 | P3 | SuperAdmin expone estados como `TRIAL`, `PAST_DUE`, `OVERDUE` y `VOID`; la tarjeta “Comercios Activos” muestra `totalTenants`. | Agrega traducción mental y ambigüedad. Etiquetas en español con valores internos intactos, y nombres de métricas acordes al cálculo. |

## Evidencia principal para reproducir la revisión

Rutas relativas al repositorio OnlyFood. Las líneas corresponden a la revisión indicada arriba.

| Hallazgos | Fuente y verificación |
|---|---|
| U01–03, U19 | `app/admin/wizard/page.tsx:24–31`: condiciones de cada control. `app/actions/checkout.ts:259` y siguientes: requisito y reserva de franja inmediata. |
| U04, U11, U13 | `app/admin/live/page.tsx:160–216`: polling y tratamiento de errores; `:750` y siguientes: cabecera, bandeja y posición del reparto. `app/admin/live/DeliveryBatchPlanner.tsx`: estado vacío y controles. |
| U05 | `app/admin/history/page.tsx:35`: `take: 1000`; `app/admin/history/HistoryClient.tsx:42–114`: filtros y sumas locales. No se identificó un aviso de este límite en esa pantalla. |
| U06, U10 | `app/admin/settings/page.tsx`: estructura externa y destino inicial. `app/admin/settings/SettingsForm.tsx:83` y siguientes: payload global; `:256–270`: botón y pestañas. `components/admin/EmailSettingsPanel.tsx:40` y `:152`: guardado separado. |
| U07 | `app/admin/live/AdminOrderComposer.tsx:57`, `:237`, `:457–469`; `app/actions/checkout.ts:782`: tratamiento del estado informado para pedidos administrativos. |
| U08–09 | `app/admin/AdminShell.tsx:31` y siguientes: rutas y filtrado; `app/admin/layout.tsx`: solo transmite features al shell. `lib/admin-session.ts`: roles; páginas de caja, historial, catálogo y configuración: permisos diferentes. |
| U12 | `app/admin/catalog/CatalogClient.tsx`, formulario `add-prod`: reglas de mitades antes de Nombre/Precio; receta, puntos y extras en el mismo editor. |
| U14 | `app/(store)/StorefrontClient.tsx:443–496`, `:661`, `:1017`: coordinación de splash, tablón, bienvenida y accesos promocionales. La secuencia comercial principal ya tiene coordinación; no se afirma que esos tres avisos se superpongan. |
| U15–16 | `app/(store)/layout.tsx`; `components/ClientAccountOnboarding.tsx:16–59` y `:140` en adelante; `app/actions/client-profile.ts`, función `completeClientDniStep`. DNI y passkey tienen “Ahora no”; correo faltante es bloqueante en la interfaz. |
| U17 | `app/admin/promotions/PromotionsClient.tsx:53` y siguientes: editor, prioridad y productos. |
| U18 | `app/admin/guides/GuidesClient.tsx:38`, `:65`, `:80`; `docs/guides.md`: alcance local del avance. |
| U20 | `app/admin/history/HistoryClient.tsx:105–111`, `:202`; `app/admin/metricas/page.tsx`: consulta sin filtro de pago; `MetricsClient.tsx:27–91`: costos actuales y total de pedidos. |
| U21 | `app/admin/cash/CashDashboardClient.tsx`: campos de apertura/cierre; `CatalogClient.tsx`: botones de edición; `components/ui/tabs.tsx` y listas de catálogo/configuración: revisar adaptación interactiva. |
| U22 | `app/superadmin/SuperAdminControlModals.tsx:16–17` y selects de estados; `SuperAdminDashboardClient.tsx`, tarjeta “Comercios Activos”. |

## Propuesta de organización

Cinco áreas de negocio, con sus opciones secundarias. En escritorio pueden ser grupos de navegación; no hace falta un acordeón que esconda cada destino ni agregar una pantalla obligatoria entre el usuario y su tarea.

| Área | Contenido | Qué aparece primero |
|---|---|---|
| Operación | Pedidos de hoy, Programados, Historial | Para quien opera: pedidos pendientes y siguiente acción. Caja conserva acceso directo para cajero. |
| Menú | Productos, Combos, Ingredientes y stock, Extras, Imágenes | Buscar, editar precio, disponibilidad y crear producto. |
| Clientes | Cuentas, Valoraciones, Beneficios, Ruleta | Buscar cliente; recuperar acceso como tarea contextual. |
| Negocio | Caja, Resultados, Promociones | Para dueño/encargado: estado de caja y resumen del período con definiciones. |
| Ajustes | Comercio, Horarios y cupos, Cobros, Entregas, Apariencia, Integraciones | Configuración básica; detalles técnicos al conectar o diagnosticar servicios. |

Ayuda persistente y contextual. Puesta en marcha visible mientras falten requisitos, luego accesible desde Ajustes. Historial y Programados comparten ubicación y vocabulario de pedidos. La galería funciona también desde los selectores de imágenes.

Evitar un segundo sistema de preferencias de “modo simple/avanzado” global. La revelación progresiva puede vivir en cada tarea y preservar las configuraciones existentes. Si después hay evidencia para perfiles de negocio, agregarlos como valores iniciales editables, sin eliminar capacidades.

## Recorridos propuestos

### Operar un turno

Entrada según rol → ver pedidos que requieren atención → preparar → listo para retirar o despachar → entregar. Mantener pago y preparación como dimensiones distintas, con textos claros y una acción principal según el estado. Acciones secundarias en “Más”, cancelación identificada y confirmada.

Cabecera compacta: estado efectivo de la tienda, salud de conexión y nuevo pedido. Caja o transferencias requieren un aviso cuando corresponda. La planificación de reparto tiene su propio panel, sin desplazar siempre las comandas.

En teléfono, priorizar una etapa/lista de trabajo seleccionable con contadores. El kanban de cuatro columnas apiladas debe compararse en uso real: cada etapa tiene actualmente un mínimo de 600 px, lo que puede alejar mucho los pedidos listos. Conservar una vista amplia para cocina si sirve durante el turno.

### Crear un producto

Nombre, categoría, precio y disponibilidad → guardar. Foto, descripción y alérgenos visibles como información complementaria. Personalización, receta/costos, extras, mitades y puntos se abren cuando se necesitan. La información de alérgenos debe seguir siendo fácil de localizar y editar.

No exigir comprender control de stock o fidelización para publicar un producto sencillo. Mostrar una vista previa de cómo lo verá el cliente y mensajes de validación junto al campo responsable.

### Cargar un pedido por teléfono o mostrador

Productos → cliente/entrega → momento → cobro → resumen. Puede seguir siendo una pantalla rápida para usuarios frecuentes; la mejora es jerarquía y valores iniciales explícitos, no imponer más pasos.

Diferenciar “Preparar pedido” de “Venta entregada en mostrador”. Mostrar con claridad el impacto de marcarlo cobrado o entregado antes de confirmar. Preservar búsqueda de clientes y personalización ya existentes. Alinear los medios disponibles y sus nombres con el contrato del circuito administrativo, sin confundir un registro manual con un pago online verificado.

### Comprar

Menú → producto → carrito → entrega/horario/pago → confirmación → seguimiento. Conservar la separación actual del checkout y las direcciones guardadas. Evaluar si carrito y revisión final repiten demasiado contenido antes de fusionar pantallas.

Una comunicación comercial principal al entrar. Noticias secundarias integradas en la tienda. Invitación a puntos, ruleta o acceso biométrico después de la compra o por elección del cliente. Mantener la decisión del comercio sobre cuenta obligatoria, mostrando de antemano cuándo se necesita.

Probar contrato funcional común en todos los temas: agregar, personalizar, volver, revisar precio, abrir carrito, confirmar y seguir. Cada tema puede conservar personalidad visual; las mismas acciones deben conservar significado.

### Poner un comercio en marcha

Cada control debe tener estado verificable, explicación breve y acción al destino exacto. Mostrar el próximo pendiente sin presentar seis problemas iguales. Diferenciar “configuración lista” de “tienda abierta”.

Validar modalidades y cupos con la política del checkout; validar cada medio habilitado; mostrar el enlace público real y quién puede modificarlo. Un pedido existente prueba recepción; no prueba preparación, pago ni entrega. Evitar declarar ese circuito completo sin evidencia suficiente.

### Administrar la plataforma

SuperAdmin debe priorizar comercios que requieren atención, vencimientos y cobros pendientes. En cada comercio: resumen, suscripción, opciones efectivas, accesos y pagos. Para una feature mostrar tanto “heredada del plan” como su resultado efectivo y la explicación de la excepción. Para cambios de plan, estado o acceso: resumen del efecto y confirmación proporcional a la consecuencia.

Mantener el alcance separado del panel gastronómico. El lenguaje técnico de infraestructura pertenece al diagnóstico de soporte. Los estados visibles deben estar en español, aunque la API conserve sus códigos.

## Secuencia de implementación

### Fase 1: precisión y confianza

Resolver U01–07: requisitos del asistente, límites del historial, actualización visible, guardado y estado de cobro manual. Acordar definiciones de ventas/cobros y estimaciones en U20 antes de renombrar métricas. No limitar esta fase a cambios cosméticos.

Verificación: fixtures de solo pedidos de hoy sin cupos; transferencia como único pago; efectivo más MP incompleto; pedido cancelado como único historial; caída de red; más de 1.000 pedidos; correo editado junto con ajustes generales; pedido telefónico pendiente de pago.

### Fase 2: orientación y tareas frecuentes

Agrupar navegación y adaptarla por rol; unificar nombres; reorganizar horarios/cupos y medios de pago; enlaces directos y retorno estable a pestañas/filtros; simplificar producto y tablero diario. Mantener URLs anteriores o redirigirlas de forma compatible.

Verificación: dueño, encargado, cocina, caja, reparto y staff; módulos activos/inactivos; acceso directo a rutas; tareas con catálogo chico y grande. Cambiar el menú nunca sustituye el control de permisos del servidor.

### Fase 3: compra, ayuda y coherencia visual

Reducir interrupciones; revisar DNI y momentos de mejora de cuenta; guías junto a la tarea; promocionar con simulación comprensible; consistencia de componentes, foco y legibilidad. Probar móvil y escritorio en todos los temas que realmente ofrece Configuración, con comercio vacío y representativo.

## Criterios de aceptación propuestos

Son objetivos para validar, no resultados ya obtenidos.

- Una persona nueva identifica cómo recibir un pedido, cargar uno manual y cambiar un precio sin ayuda. Medir éxito, tiempo y retrocesos antes/después con usuarios reales.
- Cocina y reparto ven destinos y acciones adecuados a su rol. Un acceso no autorizado sigue bloqueado en servidor.
- En una desconexión el tablero deja de afirmar actualización vigente y permite recuperar el estado sin perder una edición.
- Un cambio muestra si está guardado, pendiente o falló, y dónde corregirlo.
- Una búsqueda histórica consulta todo el universo autorizado y comunica rango y paginación; los totales coinciden con el alcance indicado.
- El asistente falla exactamente cuando el checkout no puede operar por un requisito de configuración, y cada pendiente tiene un destino resolutivo.
- En una compra normal se pueden encontrar precio final, modalidad, fecha/hora y medio de pago sin atravesar invitaciones opcionales de cuenta.
- La navegación y los formularios se completan con teclado; los controles tienen nombres accesibles; no hay acciones tapadas en móvil o con zoom. Verificar 360, 390, 768 y 1440 px y zoom de 200% como matriz inicial.
- Se conserva historial, configuración, integraciones, permisos, aislamiento y cálculo de importes en servidor. Ninguna simplificación elimina funciones existentes por omisión.

## Pendientes para cerrar la validación interactiva

Usar un tenant de prueba con datos representativos y cuentas por rol; recorrer tareas en navegador; validar hardware de impresión y proveedores en entornos adecuados; medir rendimiento con datos abundantes; entrevistar a personal de cocina/caja y a compradores. Los informes técnicos anteriores aportan contexto, pero no reemplazan estas verificaciones de facilidad de uso.

La primera intervención recomendada es corregir las señales operativas y reorganizar navegación/configuración. Eso aborda las causas observables de confusión y deja la renovación visual apoyada en tareas claras.
