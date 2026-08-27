import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (process.env.ALLOW_LEGACY_DESTRUCTIVE_SEED !== "true") {
  throw new Error("Legacy seed disabled. Use scripts/seed-saas.mjs for the multi-tenant application.");
}
const connectionString = process.env.DATABASE_URL;

const dbUrl = new URL(connectionString);
const dbHost = dbUrl.hostname === "localhost" ? "127.0.0.1" : dbUrl.hostname;

const adapter = new PrismaMariaDb({
  host: dbHost,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username || "root",
  password: dbUrl.password || "",
  database: dbUrl.pathname.replace("/", ""),
  connectionLimit: 10,
  connectTimeout: 10000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando inserción de semilla BeatsBurgers...");

  // 1. Configuración General del Sistema
  console.log("⚙️  Configurando SystemConfig...");
  const existingConfig = await prisma.systemConfig.findFirst();
  const defaultBusinessHours = JSON.stringify([
    { day: 0, dayName: "Domingo", isOpen: true, shift1Open: "12:00", shift1Close: "16:00", shift2Open: "19:30", shift2Close: "00:00" },
    { day: 1, dayName: "Lunes", isOpen: false, shift1Open: "19:30", shift1Close: "23:30", shift2Open: "", shift2Close: "" },
    { day: 2, dayName: "Martes", isOpen: true, shift1Open: "19:30", shift1Close: "23:30", shift2Open: "", shift2Close: "" },
    { day: 3, dayName: "Miércoles", isOpen: true, shift1Open: "19:30", shift1Close: "23:30", shift2Open: "", shift2Close: "" },
    { day: 4, dayName: "Jueves", isOpen: true, shift1Open: "19:30", shift1Close: "00:00", shift2Open: "", shift2Close: "" },
    { day: 5, dayName: "Viernes", isOpen: true, shift1Open: "12:00", shift1Close: "15:30", shift2Open: "19:30", shift2Close: "01:00" },
    { day: 6, dayName: "Sábado", isOpen: true, shift1Open: "12:00", shift1Close: "16:00", shift2Open: "19:30", shift2Close: "01:30" },
  ]);

  if (existingConfig) {
    await prisma.systemConfig.update({
      where: { id: existingConfig.id },
      data: {
        appName: "BeatsBurgers",
        isStoreOpen: true,
        closedMessage: "Ya cerramos por hoy. ¡Volvemos mañana con las mejores smash burgers y bowls!",
        whatsappMessage: "¡Hola {{cliente}}! Tu pedido de BeatsBurgers está: {{estado}} 🍔🔥",
        primaryColor: "#f97316",
        secondaryColor: "#9333ea",
        storeTheme: "NEXO",
        welcomeBalloonEnabled: true,
        welcomeBalloonText: "¡Bienvenido a BeatsBurgers! Acumulá puntos y canjeá premios 🎁",
        deliveryCost: 1200,
        globalDiscount: 0,
        paymentCash: true,
        paymentMp: true,
        isRouletteActive: true,
        rouletteCost: 50,
        allowScheduledTomorrow: true,
        allowAdvanceOrders: true,
        advanceOrderMinDays: 1,
        advanceOrderMaxDays: 30,
        asapEstimatedMinutes: 40,
        businessHours: defaultBusinessHours,
        autoScheduleEnabled: false,
      },
    });
  } else {
    await prisma.systemConfig.create({
      data: {
        appName: "BeatsBurgers",
        isStoreOpen: true,
        closedMessage: "Ya cerramos por hoy. ¡Volvemos mañana con las mejores smash burgers y bowls!",
        whatsappMessage: "¡Hola {{cliente}}! Tu pedido de BeatsBurgers está: {{estado}} 🍔🔥",
        primaryColor: "#f97316",
        secondaryColor: "#9333ea",
        storeTheme: "NEXO",
        welcomeBalloonEnabled: true,
        welcomeBalloonText: "¡Bienvenido a BeatsBurgers! Acumulá puntos y canjeá premios 🎁",
        deliveryCost: 1200,
        globalDiscount: 0,
        paymentCash: true,
        paymentMp: true,
        isRouletteActive: true,
        rouletteCost: 50,
        allowScheduledTomorrow: true,
        allowAdvanceOrders: true,
        advanceOrderMinDays: 1,
        advanceOrderMaxDays: 30,
        asapEstimatedMinutes: 40,
        businessHours: defaultBusinessHours,
        autoScheduleEnabled: false,
      },
    });
  }

  // 2. Franjas Horarias (DeliveryTimeSlot)
  console.log("⏰ Creando franjas horarias...");
  const slotsData = [
    { time: "20:00 - 20:45", capacity: 15, available: 15, isAvailable: true, order: 1 },
    { time: "20:45 - 21:30", capacity: 18, available: 18, isAvailable: true, order: 2 },
    { time: "21:30 - 22:15", capacity: 20, available: 20, isAvailable: true, order: 3 },
    { time: "22:15 - 23:00", capacity: 15, available: 15, isAvailable: true, order: 4 },
    { time: "23:00 - 23:45", capacity: 12, available: 12, isAvailable: true, order: 5 },
  ];

  for (const s of slotsData) {
    const exists = await prisma.deliveryTimeSlot.findFirst({ where: { time: s.time } });
    if (!exists) await prisma.deliveryTimeSlot.create({ data: s });
  }

  // 3. Cadetes / Mensajeros
  console.log("🛵 Creando repartidores...");
  const messengersData = [
    { name: "Lucas Gómez", phone: "1145219874", isActive: true },
    { name: "Martín Rossi", phone: "1168931122", isActive: true },
    { name: "Sofía Fernández", phone: "1133445566", isActive: true },
  ];
  for (const m of messengersData) {
    const exists = await prisma.messenger.findFirst({ where: { phone: m.phone } });
    if (!exists) await prisma.messenger.create({ data: m });
  }

  // 4. Premios de Ruleta
  console.log("🎡 Creando premios de ruleta...");
  const prizesData = [
    { name: "10% OFF en tu pedido", description: "Descuento en tu próxima compra", probability: 25, active: true },
    { name: "Papas Rústicas Gratis", description: "Porción de papas gratis", probability: 20, active: true },
    { name: "+50 Puntos Beats", description: "Suma 50 puntos a tu saldo", probability: 30, active: true },
    { name: "Gaseosa 500ml Gratis", description: "Llevate una bebida fría de regalo", probability: 15, active: true },
    { name: "2x1 en Hamburguesas", description: "Comprás 1 y te llevás 2", probability: 10, active: true },
  ];
  for (const p of prizesData) {
    const exists = await prisma.roulettePrize.findFirst({ where: { name: p.name } });
    if (!exists) await prisma.roulettePrize.create({ data: p });
  }

  // 5. Ingredientes de Control de Stock
  console.log("🥩 Creando ingredientes para stock...");
  const ingredientsData = [
    { name: "Medallón Smash Beef 120g", stock: 250, unit: "un" },
    { name: "Pechuga de Pollo Crispy", stock: 140, unit: "un" },
    { name: "Medallón Veggie Lentejas", stock: 80, unit: "un" },
    { name: "Queso Cheddar Fundido", stock: 350, unit: "fetas" },
    { name: "Queso Provolone Ahumado", stock: 120, unit: "fetas" },
    { name: "Panceta Ahumada Crispy", stock: 220, unit: "tiras" },
    { name: "Cebolla Caramelizada", stock: 90, unit: "porciones" },
    { name: "Cebolla Morada Encurtida", stock: 100, unit: "porciones" },
    { name: "Pepinillos Agridulces (Pickles)", stock: 150, unit: "porciones" },
    { name: "Lechuga Capuchina Fresca", stock: 100, unit: "porciones" },
    { name: "Tomate Redondo en Rodajas", stock: 110, unit: "rodajas" },
    { name: "Huevo a la Plancha", stock: 130, unit: "un" },
    { name: "Salsa Secreta Beats", stock: 400, unit: "dips" },
    { name: "Salsa Barbacoa Ahumada", stock: 300, unit: "dips" },
    { name: "Mayo Trufada", stock: 200, unit: "dips" },
    { name: "Palta Hass Fresca", stock: 120, unit: "porciones" },
    { name: "Arroz Yamaní Integral", stock: 60, unit: "porciones" },
    { name: "Quinoa Roja Andina", stock: 50, unit: "porciones" },
    { name: "Salmón Ahumado Premium", stock: 70, unit: "porciones" },
    { name: "Edamame al Vapor", stock: 80, unit: "porciones" },
    { name: "Pan de Papa Brioche", stock: 300, unit: "un" },
  ];

  const ingredientMap = new Map();
  for (const ing of ingredientsData) {
    let item = await prisma.ingredient.findFirst({ where: { name: ing.name } });
    if (!item) {
      item = await prisma.ingredient.create({ data: ing });
    }
    ingredientMap.set(ing.name, item.id);
  }

  // 6. Categorías
  console.log("📂 Creando categorías de productos...");
  const categoriesData = [
    { name: "Hamburguesas Smash & Especiales", order: 1 },
    { name: "Bowls & Ensaladas Saludables", order: 2 },
    { name: "Combos Beats (Burger + Papas + Bebida)", order: 3 },
    { name: "Acompañamientos & Entradas", order: 4 },
    { name: "Bebidas & Cervezas", order: 5 },
    { name: "Postres & Shakes", order: 6 },
  ];

  const categoryMap = new Map();
  for (const cat of categoriesData) {
    let item = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!item) {
      item = await prisma.category.create({ data: cat });
    }
    categoryMap.set(cat.name, item.id);
  }

  // 7. Extras / Adicionales
  console.log("➕ Creando extras y adicionales...");
  const extrasData = [
    { name: "Extra Medallón Smash Beef 120g", price: 2200, categoryName: "Hamburguesas Smash & Especiales" },
    { name: "Extra Queso Cheddar Fundido", price: 1200, categoryName: "Hamburguesas Smash & Especiales" },
    { name: "Extra Panceta Ahumada Crispy", price: 1400, categoryName: "Hamburguesas Smash & Especiales" },
    { name: "Extra Palta Hass", price: 1500, categoryName: "Bowls & Ensaladas Saludables" },
    { name: "Dip Salsa Secreta Beats", price: 800, categoryName: "Acompañamientos & Entradas" },
    { name: "Dip Barbacoa Ahumada", price: 800, categoryName: "Acompañamientos & Entradas" },
    { name: "Huevo a la Plancha Extra", price: 900, categoryName: "Hamburguesas Smash & Especiales" },
  ];

  for (const ex of extrasData) {
    let extraItem = await prisma.extra.findFirst({ where: { name: ex.name } });
    if (!extraItem) {
      extraItem = await prisma.extra.create({
        data: {
          name: ex.name,
          price: ex.price,
          isAvailable: true,
        },
      });
    }
    const catId = categoryMap.get(ex.categoryName);
    if (catId) {
      const link = await prisma.extraCategory.findUnique({
        where: { extraId_categoryId: { extraId: extraItem.id, categoryId: catId } },
      });
      if (!link) {
        await prisma.extraCategory.create({
          data: { extraId: extraItem.id, categoryId: catId },
        });
      }
    }
  }

  // 8. Productos
  console.log("🍔 Creando productos con ingredientes y recetas...");
  const productsData = [
    // Burgers
    {
      name: "Beats Monster Triple",
      description: "Triple medallón smash 120g, triple cheddar americano, cuádruple panceta crispy y salsa Beats en suave pan brioche de papa.",
      price: 14500,
      categoryName: "Hamburguesas Smash & Especiales",
      order: 1,
      ingredients: [
        { name: "Medallón Smash Beef 120g", quantity: 3, canRemove: false },
        { name: "Queso Cheddar Fundido", quantity: 3, canRemove: true },
        { name: "Panceta Ahumada Crispy", quantity: 4, canRemove: true },
        { name: "Salsa Secreta Beats", quantity: 1, canRemove: true },
        { name: "Pan de Papa Brioche", quantity: 1, canRemove: false },
      ],
    },
    {
      name: "Oklahoma Smash Onion",
      description: "Doble smash cocinado a la plancha con cebolla ultrafina caramelizada incrustada en la carne, doble cheddar y pepinillos agridulces.",
      price: 11800,
      categoryName: "Hamburguesas Smash & Especiales",
      order: 2,
      ingredients: [
        { name: "Medallón Smash Beef 120g", quantity: 2, canRemove: false },
        { name: "Queso Cheddar Fundido", quantity: 2, canRemove: true },
        { name: "Cebolla Caramelizada", quantity: 1, canRemove: true },
        { name: "Pepinillos Agridulces (Pickles)", quantity: 1, canRemove: true },
        { name: "Pan de Papa Brioche", quantity: 1, canRemove: false },
      ],
    },
    {
      name: "Royale Deluxe",
      description: "Doble medallón smash, queso provolone ahumado derretido, lechuga capuchina crujiente, tomate redondo, cebolla morada encurtida y mayo trufada.",
      price: 12500,
      categoryName: "Hamburguesas Smash & Especiales",
      order: 3,
      ingredients: [
        { name: "Medallón Smash Beef 120g", quantity: 2, canRemove: false },
        { name: "Queso Provolone Ahumado", quantity: 2, canRemove: true },
        { name: "Lechuga Capuchina Fresca", quantity: 1, canRemove: true },
        { name: "Tomate Redondo en Rodajas", quantity: 1, canRemove: true },
        { name: "Cebolla Morada Encurtida", quantity: 1, canRemove: true },
        { name: "Mayo Trufada", quantity: 1, canRemove: true },
        { name: "Pan de Papa Brioche", quantity: 1, canRemove: false },
      ],
    },
    {
      name: "Crispy Chicken Bacon",
      description: "Suprema de pollo frita ultra crocante marinada en especias, queso cheddar fundido, panceta ahumada y salsa barbacoa en pan brioche.",
      price: 11200,
      categoryName: "Hamburguesas Smash & Especiales",
      order: 4,
      ingredients: [
        { name: "Pechuga de Pollo Crispy", quantity: 1, canRemove: false },
        { name: "Queso Cheddar Fundido", quantity: 1, canRemove: true },
        { name: "Panceta Ahumada Crispy", quantity: 2, canRemove: true },
        { name: "Salsa Barbacoa Ahumada", quantity: 1, canRemove: true },
        { name: "Pan de Papa Brioche", quantity: 1, canRemove: false },
      ],
    },
    {
      name: "Veggie Crunch Burger",
      description: "Medallón artesanal de lentejas y hongos portobello, palta hass fresca, queso provolone, rúcula fresca y mayo vegana suave.",
      price: 10500,
      categoryName: "Hamburguesas Smash & Especiales",
      order: 5,
      ingredients: [
        { name: "Medallón Veggie Lentejas", quantity: 1, canRemove: false },
        { name: "Palta Hass Fresca", quantity: 1, canRemove: true },
        { name: "Queso Provolone Ahumado", quantity: 1, canRemove: true },
        { name: "Pan de Papa Brioche", quantity: 1, canRemove: false },
      ],
    },
    // Bowls
    {
      name: "Super Protein Power Bowl",
      description: "Base nutritiva de quinoa roja y arroz yamaní, pechuga grillada en cubos, palta hass fresca, huevo soft, tomates cherry y sésamo tostado.",
      price: 12800,
      categoryName: "Bowls & Ensaladas Saludables",
      order: 1,
      ingredients: [
        { name: "Quinoa Roja Andina", quantity: 1, canRemove: false },
        { name: "Arroz Yamaní Integral", quantity: 1, canRemove: false },
        { name: "Pechuga de Pollo Crispy", quantity: 1, canRemove: true },
        { name: "Palta Hass Fresca", quantity: 1, canRemove: true },
        { name: "Huevo a la Plancha", quantity: 1, canRemove: true },
      ],
    },
    {
      name: "Fresh Salmon & Avocado Bowl",
      description: "Finas láminas de salmón ahumado premium, palta hass, edamame al vapor, pepino fresco, arroz yamaní y reducción de teriyaki cítrica.",
      price: 15900,
      categoryName: "Bowls & Ensaladas Saludables",
      order: 2,
      ingredients: [
        { name: "Salmón Ahumado Premium", quantity: 1, canRemove: false },
        { name: "Palta Hass Fresca", quantity: 1, canRemove: true },
        { name: "Edamame al Vapor", quantity: 1, canRemove: true },
        { name: "Arroz Yamaní Integral", quantity: 1, canRemove: false },
      ],
    },
    // Sides
    {
      name: "Papas Rústicas Beats con Cheddar & Bacon",
      description: "Papas cortadas a mano con piel, fritas al punto justo, bañadas en abundante queso cheddar caliente y lluvia de panceta crocante.",
      price: 6800,
      categoryName: "Acompañamientos & Entradas",
      order: 1,
      ingredients: [
        { name: "Queso Cheddar Fundido", quantity: 2, canRemove: true },
        { name: "Panceta Ahumada Crispy", quantity: 2, canRemove: true },
      ],
    },
    {
      name: "Aros de Cebolla Golden Crispy",
      description: "Aros de cebolla rebozados con panko extra crujiente, servidos con dip de salsa barbacoa ahumada.",
      price: 5500,
      categoryName: "Acompañamientos & Entradas",
      order: 2,
      ingredients: [
        { name: "Salsa Barbacoa Ahumada", quantity: 1, canRemove: false },
      ],
    },
    // Bebidas
    {
      name: "Coca-Cola Original 500ml",
      description: "Botella 500ml bien fría.",
      price: 2400,
      categoryName: "Bebidas & Cervezas",
      order: 1,
      ingredients: [],
    },
    {
      name: "Coca-Cola Sin Azúcar 500ml",
      description: "Botella 500ml bien fría.",
      price: 2400,
      categoryName: "Bebidas & Cervezas",
      order: 2,
      ingredients: [],
    },
    {
      name: "Cerveza Artesanal IPA 473ml",
      description: "Lata 473ml, amargor balanceado y aroma cítrico lupulado.",
      price: 4200,
      categoryName: "Bebidas & Cervezas",
      order: 3,
      ingredients: [],
    },
    // Postres
    {
      name: "Chocotorta Clásica en Vaso",
      description: "Capas de galletitas Chocolinas embebidas en café con crema de dulce de leche y queso crema artesanal.",
      price: 4500,
      categoryName: "Postres & Shakes",
      order: 1,
      ingredients: [],
    },
    {
      name: "Milkshake Oreo & Dulce de Leche",
      description: "Helado artesanal de crema americana batido con galletitas Oreo trituradas y dulce de leche repostero.",
      price: 5800,
      categoryName: "Postres & Shakes",
      order: 2,
      ingredients: [],
    },
  ];

  const productMap = new Map();
  for (const prod of productsData) {
    const catId = categoryMap.get(prod.categoryName);
    let p = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          categoryId: catId,
          order: prod.order,
          isAvailable: true,
        },
      });
    }
    productMap.set(prod.name, p);

    // Relacionar ingredientes
    for (const ing of prod.ingredients) {
      const ingId = ingredientMap.get(ing.name);
      if (ingId) {
        const link = await prisma.productIngredient.findUnique({
          where: { productId_ingredientId: { productId: p.id, ingredientId: ingId } },
        });
        if (!link) {
          await prisma.productIngredient.create({
            data: {
              productId: p.id,
              ingredientId: ingId,
              quantity: ing.quantity,
              canRemove: ing.canRemove,
            },
          });
        }
      }
    }
  }

  // 9. Clientes de Ejemplo
  console.log("👥 Creando clientes de prueba con puntos...");
  const clientsData = [
    { name: "Juan Pérez", phone: "1155443322", points: 120 },
    { name: "Camila Benítez", phone: "1166778899", points: 250 },
    { name: "Rodrigo Morales", phone: "1144223311", points: 80 },
    { name: "Natalia Castro", phone: "1122334455", points: 410 },
    { name: "Diego Salgado", phone: "1199887766", points: 550 },
  ];

  const clientMap = new Map();
  for (const c of clientsData) {
    let client = await prisma.client.findFirst({ where: { phone: c.phone } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: c.name,
          phone: c.phone,
          password: "",
          passwordSetupRequired: true,
          points: c.points,
        },
      });
    }
    clientMap.set(c.phone, client);
  }

  // 10. Órdenes de Ejemplo (Inmediatas, Mañana y Por Encargo)
  console.log("📦 Creando órdenes de ejemplo en diferentes etapas...");
  const burger1 = productMap.get("Beats Monster Triple");
  const burger2 = productMap.get("Oklahoma Smash Onion");
  const bowl1 = productMap.get("Super Protein Power Bowl");
  const fries = productMap.get("Papas Rústicas Beats con Cheddar & Bacon");
  const drink1 = productMap.get("Coca-Cola Original 500ml");
  const cadete1 = await prisma.messenger.findFirst({ where: { name: "Lucas Gómez" } });

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const customAdvanceDate = new Date();
  customAdvanceDate.setDate(customAdvanceDate.getDate() + 5);

  const ordersToCreate = [
    // 1. Inmediato / Preparando en cocina (Hoy)
    {
      clientName: "Juan Pérez",
      clientPhone: "1155443322",
      needsDelivery: true,
      deliveryAddress: "Av. Corrientes 2450, Piso 4 B",
      deliveryTime: "21:30",
      orderType: "IMMEDIATE",
      status: "IN_PROCESS",
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      total: 22500,
      earnedPoints: 225,
      items: [
        { product: burger1, quantity: 1, subtotal: 14500 },
        { product: fries, quantity: 1, subtotal: 6800 },
      ],
    },
    // 2. Inmediato / Nuevo pedido (Hoy)
    {
      clientName: "Camila Benítez",
      clientPhone: "1166778899",
      needsDelivery: false,
      deliveryAddress: null,
      deliveryTime: "22:00",
      orderType: "IMMEDIATE",
      status: "NEW",
      paymentMethod: "MP",
      paymentStatus: "PAID",
      total: 14200,
      earnedPoints: 142,
      items: [
        { product: burger2, quantity: 1, subtotal: 11800 },
        { product: drink1, quantity: 1, subtotal: 2400 },
      ],
    },
    // 3. Inmediato / A Reparto con Cadete Asignado (Hoy)
    {
      clientName: "Rodrigo Morales",
      clientPhone: "1144223311",
      needsDelivery: true,
      deliveryAddress: "Juramento 1950, PB",
      deliveryTime: "20:45",
      orderType: "IMMEDIATE",
      status: "PENDING_DELIVERY",
      messengerId: cadete1?.id,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      total: 14000,
      earnedPoints: 140,
      items: [
        { product: bowl1, quantity: 1, subtotal: 12800 },
      ],
    },
    // 4. Programado para Mañana (SCHEDULED_TOMORROW)
    {
      clientName: "Natalia Castro",
      clientPhone: "1122334455",
      needsDelivery: true,
      deliveryAddress: "Scalabrini Ortiz 880, 2do A",
      deliveryTime: "21:30",
      orderType: "SCHEDULED_TOMORROW",
      scheduledDate: tomorrowDate,
      scheduledTime: "21:30",
      status: "NEW",
      paymentMethod: "MP",
      paymentStatus: "PAID",
      total: 23700,
      earnedPoints: 237,
      items: [
        { product: burger1, quantity: 1, subtotal: 14500 },
        { product: fries, quantity: 1, subtotal: 6800 },
        { product: drink1, quantity: 1, subtotal: 2400 },
      ],
    },
    // 5. Por Encargo a Fecha Futura (CUSTOM_DATE)
    {
      clientName: "Diego Salgado",
      clientPhone: "1199887766",
      needsDelivery: true,
      deliveryAddress: "Av. Libertador 4400, Salón Eventos",
      deliveryTime: "22:00",
      orderType: "CUSTOM_DATE",
      scheduledDate: customAdvanceDate,
      scheduledTime: "22:00",
      status: "NEW",
      paymentMethod: "MP",
      paymentStatus: "PAID",
      total: 62600,
      earnedPoints: 626,
      items: [
        { product: burger1, quantity: 2, subtotal: 29000 },
        { product: burger2, quantity: 2, subtotal: 23600 },
        { product: fries, quantity: 1, subtotal: 6800 },
        { product: drink1, quantity: 1, subtotal: 2400 },
      ],
    },
  ];

  for (const o of ordersToCreate) {
    const client = clientMap.get(o.clientPhone);
    const order = await prisma.order.create({
      data: {
        clientName: o.clientName,
        clientPhone: o.clientPhone,
        needsDelivery: o.needsDelivery,
        deliveryAddress: o.deliveryAddress,
        deliveryTime: o.deliveryTime,
        orderType: o.orderType,
        scheduledDate: o.scheduledDate || null,
        scheduledTime: o.scheduledTime || null,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        total: o.total,
        earnedPoints: o.earnedPoints,
        clientId: client?.id || null,
        messengerId: o.messengerId || null,
      },
    });

    for (const item of o.items) {
      if (item.product) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.product.id,
            quantity: item.quantity,
            subtotal: item.subtotal,
          },
        });
      }
    }
  }

  console.log("✨ ¡Semilla completada exitosamente con todos los datos de BeatsBurgers!");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando semilla:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
