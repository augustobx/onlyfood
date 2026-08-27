import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";

const enabled = process.env.RUN_DB_TESTS === "true";
const suite = enabled ? describe : describe.skip;

suite("cash register and quantity promotions tenancy", () => {
  let beats: any;
  let roma: any;
  let cashSessionId = "";
  let movementId = "";
  let promotionId = "";
  let productId = "";

  beforeAll(async () => {
    beats = await prisma.tenant.findUniqueOrThrow({ where: { slug: "beats" }, include: { locations: true } });
    roma = await prisma.tenant.findUniqueOrThrow({ where: { slug: "roma" } });
    const product = await prisma.product.create({ data: { tenantId: beats.id, name: "Producto promo integración", basePrice: 1000 } });
    productId = product.id;
  });

  afterAll(async () => {
    if (movementId) await prisma.cashMovement.deleteMany({ where: { id: movementId } });
    if (cashSessionId) await prisma.cashSession.deleteMany({ where: { id: cashSessionId } });
    if (promotionId) await prisma.quantityDiscount.deleteMany({ where: { id: promotionId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("isolates cash sessions and movements by tenant", async () => {
    const beatsDb = createTenantDb(beats.id);
    const romaDb = createTenantDb(roma.id);
    const session = await beatsDb.cashSession.create({ data: {
      tenantId: beats.id,
      locationId: beats.locations[0].id,
      businessDate: new Date("2035-01-02T00:00:00.000Z"),
      openingBalance: 1000,
    } });
    cashSessionId = session.id;
    const movement = await beatsDb.cashMovement.create({ data: { tenantId: beats.id, cashSessionId: session.id, type: "EXPENSE", category: "Prueba", description: "Movimiento aislado", amount: 200 } });
    movementId = movement.id;
    expect(await romaDb.cashSession.findFirst({ where: { id: session.id } })).toBeNull();
    expect(await romaDb.cashMovement.findFirst({ where: { id: movement.id } })).toBeNull();
  });

  it("isolates promotions and their product assignments", async () => {
    const beatsDb = createTenantDb(beats.id);
    const romaDb = createTenantDb(roma.id);
    const promotion = await beatsDb.quantityDiscount.create({ data: {
      tenantId: beats.id,
      name: "Promo integración",
      minQuantity: 5,
      type: "PERCENT",
      value: 10,
      products: { create: { productId } },
    } });
    promotionId = promotion.id;
    expect(await beatsDb.quantityDiscount.findFirst({ where: { id: promotion.id } })).toBeTruthy();
    expect(await romaDb.quantityDiscount.findFirst({ where: { id: promotion.id } })).toBeNull();

    const updated = await beatsDb.quantityDiscount.update({
      where: { id: promotion.id },
      data: {
        name: "Promo integración editada",
        products: { deleteMany: {}, create: [{ productId }] },
      },
      include: { products: true },
    });
    expect(updated.name).toBe("Promo integración editada");
    expect(updated.products).toHaveLength(1);
  });
});
