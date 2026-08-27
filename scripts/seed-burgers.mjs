import pkgPrisma from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const { PrismaClient } = pkgPrisma;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const connectionString = process.env.DATABASE_URL;

const dbUrl = new URL(connectionString);
const dbHost = dbUrl.hostname === "localhost" ? "127.0.0.1" : dbUrl.hostname;

const adapter = new PrismaMariaDb({
  host: dbHost,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace("/", ""),
  connectionLimit: 5,
  connectTimeout: 10000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍔 Agregando hamburguesas Pink Floyd y AC/DC...");

  // 1. Categoría Burgers
  let burgerCategory = await prisma.category.findFirst({
    where: { name: "Burgers" }
  });

  if (!burgerCategory) {
    burgerCategory = await prisma.category.create({
      data: {
        name: "Burgers",
        sequence: 1,
        isActive: true,
      }
    });
    console.log("✅ Categoría 'Burgers' creada.");
  } else {
    console.log("ℹ️ Categoría 'Burgers' ya existe.");
  }

  // 2. Ingredientes requeridos
  const requiredIngredients = [
    { name: "Pan de papa", costPerUnit: 800, stock: 100 },
    { name: "Salsa garlic", costPerUnit: 400, stock: 100 },
    { name: "Repollo aliñado", costPerUnit: 350, stock: 100 },
    { name: "Medallón smash", costPerUnit: 1800, stock: 100 },
    { name: "Cheddar", costPerUnit: 600, stock: 100 },
    { name: "Champiñones salteados", costPerUnit: 700, stock: 100 },
    { name: "Salsa barbacoa", costPerUnit: 400, stock: 100 },
    { name: "Panceta", costPerUnit: 900, stock: 100 },
    { name: "Papas fritas tipo lays", costPerUnit: 500, stock: 100 },
  ];

  const ingredientMap = new Map();

  for (const item of requiredIngredients) {
    let ing = await prisma.ingredient.findFirst({
      where: { name: item.name }
    });

    if (!ing) {
      ing = await prisma.ingredient.create({
        data: {
          name: item.name,
          costPerUnit: item.costPerUnit,
          stock: item.stock,
          isActive: true,
        }
      });
      console.log(`✅ Ingrediente creado: ${item.name}`);
    } else {
      ing = await prisma.ingredient.update({
        where: { id: ing.id },
        data: { stock: 100 }
      });
      console.log(`ℹ️ Ingrediente actualizado a 100 stock: ${item.name}`);
    }
    ingredientMap.set(item.name, ing.id);
  }

  // 3. Crear Pink Floyd
  const pinkFloydIngredients = [
    "Pan de papa",
    "Salsa garlic",
    "Repollo aliñado",
    "Medallón smash",
    "Cheddar",
    "Champiñones salteados"
  ];

  let pinkFloyd = await prisma.product.findFirst({
    where: { name: "Pink Floyd" }
  });

  if (pinkFloyd) {
    await prisma.productIngredient.deleteMany({ where: { productId: pinkFloyd.id } });
    await prisma.product.delete({ where: { id: pinkFloyd.id } });
  }

  pinkFloyd = await prisma.product.create({
    data: {
      name: "Pink Floyd",
      basePrice: 9800,
      description: "Pan de papa, salsa garlic, repollo aliñado, medallón smash, cheddar y champiñones salteados.",
      categoryId: burgerCategory.id,
      availableDays: "", // diario
      isActive: true,
      allowRemoveIngredients: true,
      points: 50,
      ingredients: {
        create: pinkFloydIngredients.map(name => ({
          ingredientId: ingredientMap.get(name),
          isRemovable: true,
          quantity: 1,
        }))
      }
    }
  });
  console.log("🍔 Hamburguesa 'Pink Floyd' creada con éxito.");

  // 4. Crear AC/DC
  const acdcIngredients = [
    "Pan de papa",
    "Salsa barbacoa",
    "Medallón smash",
    "Cheddar",
    "Panceta",
    "Papas fritas tipo lays"
  ];

  let acdc = await prisma.product.findFirst({
    where: { name: "AC/DC" }
  });

  if (acdc) {
    await prisma.productIngredient.deleteMany({ where: { productId: acdc.id } });
    await prisma.product.delete({ where: { id: acdc.id } });
  }

  acdc = await prisma.product.create({
    data: {
      name: "AC/DC",
      basePrice: 9800,
      description: "Pan de papa, salsa barbacoa, medallón smash, cheddar, panceta y papas fritas tipo lays.",
      categoryId: burgerCategory.id,
      availableDays: "", // diario
      isActive: true,
      allowRemoveIngredients: true,
      points: 50,
      ingredients: {
        create: acdcIngredients.map(name => ({
          ingredientId: ingredientMap.get(name),
          isRemovable: true,
          quantity: 1,
        }))
      }
    }
  });
  console.log("⚡ Hamburguesa 'AC/DC' creada con éxito.");

  console.log("🎉 Ambas hamburguesas fueron cargadas correctamente al catálogo.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
