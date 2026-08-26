import pkgPrisma from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const { PrismaClient } = pkgPrisma;

const connectionString = process.env.DATABASE_URL || "mysql://beatsburgers:3a54738cd3c3f44951c4c2903eadd3727dec41d91af62ea063679471ab531f0e@db:3306/beatsburgers";

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
  console.log("🌱 Limpiando base de datos de ingredientes, productos y cargando Beats Bowls...");

  // 1. Limpieza segura de relaciones
  console.log("🧹 Eliminando órdenes previas y relaciones...");
  await prisma.orderItemExtra.deleteMany();
  await prisma.orderItemRemovedIngredient.deleteMany();
  await prisma.orderComboItemRemovedIngredient.deleteMany();
  await prisma.orderComboItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rouletteReward.deleteMany();
  await prisma.clientRewardRedemption.deleteMany();
  await prisma.productComboItem.deleteMany();
  await prisma.productIngredient.deleteMany();
  await prisma.productExtra.deleteMany();
  await prisma.ingredientCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.category.deleteMany();

  console.log("✅ Tablas limpiadas exitosamente.");

  // 2. Crear Categoría Beats Bowls
  console.log("🥗 Creando categoría Beats Bowls...");
  const bowlCategory = await prisma.category.create({
    data: {
      name: "Beats Bowls",
      isActive: true,
    }
  });

  // 3. Crear Ingredientes
  console.log("🥕 Creando ingredientes...");
  const ingredientsList = [
    { name: "Pollo grillado", cost: 1500, stock: 100 },
    { name: "Pasta fusilli", cost: 600, stock: 100 },
    { name: "Pasta mostachol", cost: 600, stock: 100 },
    { name: "Tomates cherry", cost: 500, stock: 100 },
    { name: "Espinaca", cost: 400, stock: 100 },
    { name: "Zanahoria", cost: 300, stock: 100 },
    { name: "Aceitunas", cost: 450, stock: 100 },
    { name: "Dip de yogur + limón", cost: 350, stock: 100 },
    { name: "Zucchini salteado", cost: 500, stock: 100 },
    { name: "Berenjena salteada", cost: 500, stock: 100 },
    { name: "Cebolla salteada", cost: 350, stock: 100 },
    { name: "Zanahoria salteada", cost: 350, stock: 100 },
    { name: "Huevo", cost: 300, stock: 100 },
    { name: "Mix de hojas verdes", cost: 450, stock: 100 },
    { name: "Medallón de merluza con espinaca", cost: 1800, stock: 100 },
    { name: "Arroz blanco", cost: 400, stock: 100 },
    { name: "Repollo morado", cost: 350, stock: 100 },
    { name: "Semillas de girasol", cost: 300, stock: 100 },
    { name: "Bondiola desmenuzada", cost: 2200, stock: 100 },
    { name: "Batata", cost: 400, stock: 100 },
    { name: "Garbanzos", cost: 450, stock: 100 },
    { name: "Cebolla caramelizada", cost: 400, stock: 100 },
    { name: "Aceite de oliva en los garbanzos", cost: 300, stock: 100 },
    { name: "Dip de BBQ casera liviana", cost: 350, stock: 100 },
    { name: "Carne salteada", cost: 2000, stock: 100 },
    { name: "Porotos negros", cost: 400, stock: 100 },
    { name: "Choclo", cost: 450, stock: 100 },
    { name: "Lechuga verde", cost: 350, stock: 100 },
    { name: "Dip de guacamole", cost: 500, stock: 100 },
  ];

  const ingredientMap = new Map();
  for (const ing of ingredientsList) {
    const created = await prisma.ingredient.create({
      data: {
        name: ing.name,
        costPerUnit: ing.cost,
        stock: ing.stock,
        isActive: true,
        categories: {
          create: { categoryId: bowlCategory.id }
        }
      }
    });
    ingredientMap.set(ing.name, created);
  }

  // 4. Crear los 5 Bowls del Menú Semanal
  console.log("🍲 Creando los 5 Bowls del Menú Semanal...");

  const bowls = [
    {
      name: "Chicken Pasta Bowl",
      day: "MONDAY",
      dayName: "Lunes",
      price: 7800,
      points: 50,
      description: "Pollo grillado, pasta fusilli, tomates cherry, espinaca, zanahoria, aceitunas y dip de yogur + limón.",
      ingredients: [
        "Pollo grillado",
        "Pasta fusilli",
        "Tomates cherry",
        "Espinaca",
        "Zanahoria",
        "Aceitunas",
        "Dip de yogur + limón"
      ]
    },
    {
      name: "Chicken Veggie Bowl",
      day: "TUESDAY",
      dayName: "Martes",
      price: 7800,
      points: 50,
      description: "Pollo grillado, pasta mostachol, zucchini salteado, berenjena salteada, cebolla salteada, zanahoria salteada, huevo y mix de hojas verdes.",
      ingredients: [
        "Pollo grillado",
        "Pasta mostachol",
        "Zucchini salteado",
        "Berenjena salteada",
        "Cebolla salteada",
        "Zanahoria salteada",
        "Huevo",
        "Mix de hojas verdes"
      ]
    },
    {
      name: "Ocean Bowl",
      day: "WEDNESDAY",
      dayName: "Miércoles",
      price: 8200,
      points: 50,
      description: "Medallón de merluza con espinaca, huevo, arroz blanco, repollo morado, tomates cherry, mix de hojas verdes, semillas de girasol y dip de yogur + limón.",
      ingredients: [
        "Medallón de merluza con espinaca",
        "Huevo",
        "Arroz blanco",
        "Repollo morado",
        "Tomates cherry",
        "Mix de hojas verdes",
        "Semillas de girasol",
        "Dip de yogur + limón"
      ]
    },
    {
      name: "Smoky Pork Bowl",
      day: "THURSDAY",
      dayName: "Jueves",
      price: 8500,
      points: 50,
      description: "Bondiola desmenuzada, batata, garbanzos, repollo morado, mix de hojas verdes, cebolla caramelizada, aceite de oliva en los garbanzos y dip de BBQ casera liviana.",
      ingredients: [
        "Bondiola desmenuzada",
        "Batata",
        "Garbanzos",
        "Repollo morado",
        "Mix de hojas verdes",
        "Cebolla caramelizada",
        "Aceite de oliva en los garbanzos",
        "Dip de BBQ casera liviana"
      ]
    },
    {
      name: "Mexican Bowl",
      day: "FRIDAY",
      dayName: "Viernes",
      price: 8500,
      points: 50,
      description: "Carne salteada, arroz blanco, porotos negros, choclo, lechuga verde, tomates cherry y dip de guacamole.",
      ingredients: [
        "Carne salteada",
        "Arroz blanco",
        "Porotos negros",
        "Choclo",
        "Lechuga verde",
        "Tomates cherry",
        "Dip de guacamole"
      ]
    }
  ];

  for (const bowl of bowls) {
    const ingData = bowl.ingredients.map(name => {
      const ing = ingredientMap.get(name);
      if (!ing) throw new Error(`Ingrediente no encontrado: ${name}`);
      return {
        ingredientId: ing.id,
        quantity: 1,
        isRemovable: true,
      };
    });

    const totalCost = bowl.ingredients.reduce((acc, name) => {
      const ing = ingredientMap.get(name);
      return acc + (ing?.costPerUnit || 0);
    }, 0);

    await prisma.product.create({
      data: {
        name: bowl.name,
        basePrice: bowl.price,
        suggestedCost: totalCost,
        points: bowl.points,
        description: bowl.description,
        availableDays: bowl.day, // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY
        allowHalf: false,
        onlyHalf: false,
        allowRemoveIngredients: true,
        isActive: true,
        showImage: false,
        categoryId: bowlCategory.id,
        ingredients: {
          create: ingData
        }
      }
    });

    console.log(`  ✓ Creado: ${bowl.name} (📅 ${bowl.dayName})`);
  }

  // 5. Configuración general
  console.log("⚙️  Ajustando SystemConfig...");
  const config = await prisma.systemConfig.findFirst();
  if (config) {
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        appName: "Beats Bowls",
        closedMessage: "Ya cerramos por hoy. ¡Hacé tu reserva para el menú semanal de bowls!",
      }
    });
  }

  console.log("✨ Carga completa finalizada con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed-bowls:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
