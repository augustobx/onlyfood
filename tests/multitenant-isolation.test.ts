import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";

describe("FASE 3 & 15: Multi-Tenant Cross-Isolation & Security (Beats vs Roma)", () => {
  let tenantBeatsId: string;
  let tenantRomaId: string;

  beforeAll(async () => {
    // 1. Ensure Tenant A (beats)
    const beats = await prisma.tenant.upsert({
      where: { slug: "beats" },
      update: { name: "BeatsBurgers", status: "ACTIVE" },
      create: { slug: "beats", name: "BeatsBurgers", status: "ACTIVE" },
    });
    tenantBeatsId = beats.id;

    // 2. Ensure Tenant B (roma)
    const roma = await prisma.tenant.upsert({
      where: { slug: "roma" },
      update: { name: "Roma Pizza", status: "ACTIVE" },
      create: { slug: "roma", name: "Roma Pizza", status: "ACTIVE" },
    });
    tenantRomaId = roma.id;
  });

  it("should completely isolate catalog items between Tenant A and Tenant B", async () => {
    const dbBeats = createTenantDb(tenantBeatsId);
    const dbRoma = createTenantDb(tenantRomaId);

    // Create Category in Beats
    const catBeats = await dbBeats.category.create({
      data: { name: "Hamburguesas Especiales Beats", isActive: true },
    });

    // Create Category in Roma
    const catRoma = await dbRoma.category.create({
      data: { name: "Pizzas a la Piedra Roma", isActive: true },
    });

    // Create Product in Beats
    const prodBeats = await dbBeats.product.create({
      data: {
        name: "Doble Cuarto Beats",
        basePrice: 12000,
        categoryId: catBeats.id,
        isActive: true,
      },
    });

    // Create Product in Roma
    const prodRoma = await dbRoma.product.create({
      data: {
        name: "Muzzarella Roma Gigante",
        basePrice: 15000,
        categoryId: catRoma.id,
        isActive: true,
      },
    });

    // 1. Beats queries products -> Must only see Beats products
    const beatsProducts = await dbBeats.product.findMany();
    expect(beatsProducts.some((p) => p.name === "Doble Cuarto Beats")).toBe(true);
    expect(beatsProducts.some((p) => p.name === "Muzzarella Roma Gigante")).toBe(false);

    // 2. Roma queries products -> Must only see Roma products
    const romaProducts = await dbRoma.product.findMany();
    expect(romaProducts.some((p) => p.name === "Muzzarella Roma Gigante")).toBe(true);
    expect(romaProducts.some((p) => p.name === "Doble Cuarto Beats")).toBe(false);

    // 3. Beats queries categories -> Must only see Beats categories
    const beatsCategories = await dbBeats.category.findMany();
    expect(beatsCategories.some((c) => c.name === "Hamburguesas Especiales Beats")).toBe(true);
    expect(beatsCategories.some((c) => c.name === "Pizzas a la Piedra Roma")).toBe(false);

    // 4. Cross-Tenant write/read attempt: Beats tries to find Roma's product by ID
    const crossFind = await dbBeats.product.findUnique({
      where: { id: prodRoma.id },
    });
    expect(crossFind).toBeNull();

    // 5. Cross-Tenant update attempt: Beats tries to modify Roma's product
    const crossUpdate = await dbBeats.product.updateMany({
      where: { id: prodRoma.id },
      data: { name: "Hacked Product" },
    });
    expect(crossUpdate.count).toBe(0);

    // Verify Roma's product remained untouched
    const romaCheck = await dbRoma.product.findUnique({ where: { id: prodRoma.id } });
    expect(romaCheck?.name).toBe("Muzzarella Roma Gigante");
  });

  it("should allow independent clients with identical phone numbers across different tenants", async () => {
    const dbBeats = createTenantDb(tenantBeatsId);
    const dbRoma = createTenantDb(tenantRomaId);
    const sharedPhone = "+5491199998888";

    // Clean any previous test clients with this phone
    await prisma.client.deleteMany({ where: { phone: sharedPhone } });

    // Client registers on Beats
    const clientBeats = await dbBeats.client.create({
      data: {
        phone: sharedPhone,
        password: "hash_beats_password",
        name: "Carlos en Beats",
        points: 250,
      },
    });

    // Same person registers on Roma
    const clientRoma = await dbRoma.client.create({
      data: {
        phone: sharedPhone,
        password: "hash_roma_password",
        name: "Carlos en Roma",
        points: 50,
      },
    });

    expect(clientBeats.id).not.toBe(clientRoma.id);
    expect(clientBeats.tenantId).toBe(tenantBeatsId);
    expect(clientRoma.tenantId).toBe(tenantRomaId);

    // Query from Beats
    const beatsLookup = await dbBeats.client.findFirst({ where: { phone: sharedPhone } });
    expect(beatsLookup?.name).toBe("Carlos en Beats");
    expect(beatsLookup?.points).toBe(250);

    // Query from Roma
    const romaLookup = await dbRoma.client.findFirst({ where: { phone: sharedPhone } });
    expect(romaLookup?.name).toBe("Carlos en Roma");
    expect(romaLookup?.points).toBe(50);
  });

  it("should isolate orders and prevents cross-tenant status tampering", async () => {
    const dbBeats = createTenantDb(tenantBeatsId);
    const dbRoma = createTenantDb(tenantRomaId);

    const orderBeats = await dbBeats.order.create({
      data: {
        clientName: "Cliente Beats",
        clientPhone: "+5491122223333",
        needsDelivery: true,
        deliveryAddress: "Av. Corrientes 1234",
        paymentMethod: "CASH",
        total: 8500,
        status: "NEW",
      },
    });

    const orderRoma = await dbRoma.order.create({
      data: {
        clientName: "Cliente Roma",
        clientPhone: "+5491144445555",
        needsDelivery: false,
        paymentMethod: "CASH",
        total: 14000,
        status: "NEW",
      },
    });

    // Beats cannot find Roma order
    const crossOrder = await dbBeats.order.findUnique({ where: { id: orderRoma.id } });
    expect(crossOrder).toBeNull();

    // Roma tries to cancel Beats order -> 0 rows affected
    const crossCancel = await dbRoma.order.updateMany({
      where: { id: orderBeats.id },
      data: { status: "CANCELLED" },
    });
    expect(crossCancel.count).toBe(0);

    // Verify Beats order status remained NEW
    const beatsOrderCheck = await dbBeats.order.findUnique({ where: { id: orderBeats.id } });
    expect(beatsOrderCheck?.status).toBe("NEW");
  });
});
