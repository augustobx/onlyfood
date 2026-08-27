import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";

const suite = process.env.RUN_DB_TESTS === "true" ? describe : describe.skip;

suite("catalog product integrity", () => {
  let tenantId = "";
  let categoryId = "";
  let ingredientId = "";
  let extraId = "";
  let productId = "";

  beforeAll(async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "beats" } });
    tenantId = tenant.id;
    const db = createTenantDb(tenantId);
    const [category, ingredient, extra] = await Promise.all([
      db.category.create({ data: { name: "Categoría integridad producto", isActive: true } }),
      db.ingredient.create({ data: { name: "Ingrediente integridad producto", stock: 100, costPerUnit: 10 } }),
      db.extra.create({ data: { name: "Extra integridad producto", price: 500, isActive: true } }),
    ]);
    categoryId = category.id;
    ingredientId = ingredient.id;
    extraId = extra.id;
  });

  afterAll(async () => {
    if (productId) await prisma.product.deleteMany({ where: { id: productId, tenantId } });
    if (extraId) await prisma.extra.deleteMany({ where: { id: extraId, tenantId } });
    if (ingredientId) await prisma.ingredient.deleteMany({ where: { id: ingredientId, tenantId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId, tenantId } });
  });

  it("creates a tenant-scoped product with category, ingredients and extras", async () => {
    const db = createTenantDb(tenantId);
    const product = await db.product.create({
      data: {
        tenantId,
        name: "Producto integridad catálogo",
        basePrice: 15000,
        points: 100,
        categoryId,
        ingredients: { create: [{ ingredientId, quantity: 1, isRemovable: true }] },
        extras: { create: [{ extraId }] },
      },
      include: { category: true, ingredients: true, extras: true },
    });
    productId = product.id;

    expect(product.tenantId).toBe(tenantId);
    expect(product.category?.id).toBe(categoryId);
    expect(product.ingredients).toHaveLength(1);
    expect(product.extras).toHaveLength(1);
  });
});
