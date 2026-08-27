import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";
import { saveTenantIntegration, getTenantIntegration } from "@/lib/tenant-integrations";
import { objectStorage } from "@/lib/storage";

describe("FASE 3, 6 & 15: Multi-Tenant Cross-Isolation & Security (Beats vs Roma)", () => {
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
        tenantId: tenantBeatsId,
        name: "Doble Cuarto Beats",
        basePrice: 12000,
        categoryId: catBeats.id,
        isActive: true,
      },
    });

    // Create Product in Roma
    const prodRoma = await dbRoma.product.create({
      data: {
        tenantId: tenantRomaId,
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

  it("should isolate orders and prevent cross-tenant status tampering", async () => {
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

  it("should isolate encrypted tenant integrations and media assets", async () => {
    // 1. Save MP integration for Beats
    await saveTenantIntegration(tenantBeatsId, "MERCADO_PAGO", {
      accessToken: "APP_USR-beats-token-12345",
      publicKey: "APP_USR-beats-pubkey-12345",
    });

    // 2. Save MP integration for Roma
    await saveTenantIntegration(tenantRomaId, "MERCADO_PAGO", {
      accessToken: "APP_USR-roma-token-67890",
      publicKey: "APP_USR-roma-pubkey-67890",
    });

    // 3. Retrieve per tenant and verify zero cross-contamination
    const beatsCreds = await getTenantIntegration<{ accessToken: string }>(tenantBeatsId, "MERCADO_PAGO");
    const romaCreds = await getTenantIntegration<{ accessToken: string }>(tenantRomaId, "MERCADO_PAGO");

    expect(beatsCreds?.accessToken).toBe("APP_USR-beats-token-12345");
    expect(romaCreds?.accessToken).toBe("APP_USR-roma-token-67890");

    // 4. Verify storage key ownership validation
    const beatsKey = `tenants/${tenantBeatsId}/products/burger.webp`;
    const romaKey = `tenants/${tenantRomaId}/products/pizza.webp`;

    expect(objectStorage.isKeyOwnedByTenant(tenantBeatsId, beatsKey)).toBe(true);
    expect(objectStorage.isKeyOwnedByTenant(tenantBeatsId, romaKey)).toBe(false);
  });

  it("should isolate settings, roulette prizes and locations per tenant", async () => {
    const dbBeats = createTenantDb(tenantBeatsId);
    const dbRoma = createTenantDb(tenantRomaId);

    // 1. Roulette Prizes
    const prizeBeats = await dbBeats.roulettePrize.create({
      data: { name: "Burger Gratis Beats", probability: 0.1, type: "PERCENT", value: 100 },
    });
    const prizeRoma = await dbRoma.roulettePrize.create({
      data: { name: "Pizza Gratis Roma", probability: 0.05, type: "PERCENT", value: 100 },
    });

    const beatsPrizes = await dbBeats.roulettePrize.findMany();
    expect(beatsPrizes.some((p) => p.name === "Burger Gratis Beats")).toBe(true);
    expect(beatsPrizes.some((p) => p.name === "Pizza Gratis Roma")).toBe(false);

    // 2. Locations
    const beatsLocs = await dbBeats.location.findMany();
    const romaLocs = await dbRoma.location.findMany();
    expect(beatsLocs.every((l) => l.tenantId === tenantBeatsId)).toBe(true);
    expect(romaLocs.every((l) => l.tenantId === tenantRomaId)).toBe(true);

    // 3. SystemConfig
    const existingBeats = await dbBeats.systemConfig.findFirst();
    if (existingBeats) {
      await dbBeats.systemConfig.updateMany({ data: { appName: "Beats Burgers" } });
    } else {
      await dbBeats.systemConfig.create({ data: { appName: "Beats Burgers" } });
    }

    const existingRoma = await dbRoma.systemConfig.findFirst();
    if (existingRoma) {
      await dbRoma.systemConfig.updateMany({ data: { appName: "Roma Pizza" } });
    } else {
      await dbRoma.systemConfig.create({ data: { appName: "Roma Pizza" } });
    }

    const beatsConfig = await dbBeats.systemConfig.findFirst();
    const romaConfig = await dbRoma.systemConfig.findFirst();
    expect(beatsConfig?.tenantId).toBe(tenantBeatsId);
    expect(romaConfig?.tenantId).toBe(tenantRomaId);
    expect(beatsConfig?.appName).toBe("Beats Burgers");
    expect(romaConfig?.appName).toBe("Roma Pizza");
  });
});
