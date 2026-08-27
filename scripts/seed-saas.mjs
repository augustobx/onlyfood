import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import crypto from "crypto";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const connectionString = process.env.DATABASE_URL;

const dbUrl = new URL(connectionString);
const dbHost = dbUrl.hostname === "localhost" ? "127.0.0.1" : dbUrl.hostname;

const adapter = new PrismaMariaDb({
  host: dbHost,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username || "onlyfood",
  password: dbUrl.password || "",
  database: dbUrl.pathname.replace("/", ""),
  connectionLimit: 5,
  connectTimeout: 10000,
});

const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    code: "STARTER",
    name: "Plan Starter",
    priceMonthly: 25000,
    maxLocations: 1,
    maxProducts: 50,
    features: ["orders", "cashRegister", "quantityDiscounts"],
  },
  {
    code: "PRO",
    name: "Plan Profesional",
    priceMonthly: 45000,
    maxLocations: 3,
    maxProducts: 300,
    features: ["orders", "loyalty", "roulette", "printNode", "cashRegister", "quantityDiscounts"],
  },
  {
    code: "BUSINESS",
    name: "Plan Business",
    priceMonthly: 85000,
    maxLocations: 10,
    maxProducts: 2000,
    features: [
      "orders",
      "loyalty",
      "roulette",
      "whatsapp",
      "customDomain",
      "multipleLocations",
      "printNode",
      "advancedReports",
      "cashRegister",
      "quantityDiscounts",
    ],
  },
];

function encryptPayload(data) {
  const sourceKey = process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_MASTER_KEY || process.env.AUTH_SALT;
  if (!sourceKey || sourceKey.length < 32) throw new Error("Se requiere ENCRYPTION_KEY de al menos 32 caracteres.");
  const key = crypto.createHash("sha256").update(sourceKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encryptedPayload = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]).toString("base64");
  return { encryptedPayload, iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

async function ensureDemoLoyalty(tenantId) {
  const [rewardCount, prizeCount] = await Promise.all([
    prisma.pointReward.count({ where: { tenantId } }),
    prisma.roulettePrize.count({ where: { tenantId } }),
  ]);
  if (rewardCount === 0) {
    await prisma.pointReward.createMany({
      data: [
        { tenantId, name: "10% de descuento", description: "Canjeable en tu próximo pedido.", pointsCost: 250, type: "PERCENT", value: 10, badgeText: "POPULAR", sequence: 1 },
        { tenantId, name: "$1.000 de descuento", description: "Descuento directo en tu próximo pedido.", pointsCost: 400, type: "AMOUNT", value: 1000, badgeText: "AHORRO", sequence: 2 },
      ],
    });
  }
  if (prizeCount === 0) {
    await prisma.roulettePrize.createMany({
      data: [
        { tenantId, name: "5% OFF", probability: 50, type: "PERCENT", value: 5, bgColor: "#7c3aed", textColor: "#ffffff" },
        { tenantId, name: "$500 OFF", probability: 30, type: "AMOUNT", value: 500, bgColor: "#ea580c", textColor: "#ffffff" },
        { tenantId, name: "10% OFF", probability: 20, type: "PERCENT", value: 10, bgColor: "#db2777", textColor: "#ffffff" },
      ],
    });
  }
}

async function main() {
  console.log("🌱 NanoLabs OnlyFood SaaS: Ejecutando seed idempotente...");

  // 1. Seed SaaS Plans
  const planMap = {};
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      // Los valores son defaults de instalación. Una vez creado, el plan se
      // administra exclusivamente desde SuperAdmin y no debe resetearse al iniciar Docker.
      update: {},
      create: {
        code: p.code,
        name: p.name,
        priceMonthly: p.priceMonthly,
        maxLocations: p.maxLocations,
        maxProducts: p.maxProducts,
        features: p.features,
      },
    });
    planMap[p.code] = plan;
    console.log(`  ✓ Plan ${p.code} disponible`);
  }

  const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString("hex");
    return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
  };

  const superAdminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
  if (superAdminEmail || superAdminPassword) {
    if (!superAdminEmail || !superAdminPassword || superAdminPassword.length < 12) {
      throw new Error("SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 12 caracteres) deben configurarse juntos.");
    }
    await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: { passwordHash: hashPassword(superAdminPassword), isSuperAdmin: true },
      create: { email: superAdminEmail, name: "NanoLabs SuperAdmin", passwordHash: hashPassword(superAdminPassword), isSuperAdmin: true },
    });
    console.log("  ✓ Usuario SuperAdmin sincronizado desde variables de entorno.");
  }

  // One-way migration of legacy plaintext integration credentials.
  const legacyConfigs = await prisma.systemConfig.findMany({
    where: {
      OR: [{ mpAccessToken: { not: null } }, { metaApiToken: { not: null } }],
    },
  });
  for (const config of legacyConfigs) {
    if (config.mpAccessToken) {
      const encrypted = encryptPayload({ accessToken: config.mpAccessToken, publicKey: config.mpPublicKey || undefined });
      await prisma.tenantIntegration.upsert({
        where: { tenantId_type: { tenantId: config.tenantId, type: "MERCADO_PAGO" } },
        update: { ...encrypted, isActive: true },
        create: { tenantId: config.tenantId, type: "MERCADO_PAGO", ...encrypted, isActive: true },
      });
    }
    if (config.metaApiToken && config.metaPhoneNumberId) {
      const encrypted = encryptPayload({ apiToken: config.metaApiToken, phoneNumberId: config.metaPhoneNumberId, verifyToken: config.metaVerifyToken || "" });
      await prisma.tenantIntegration.upsert({
        where: { tenantId_type: { tenantId: config.tenantId, type: "WHATSAPP" } },
        update: { ...encrypted, externalAccountId: config.metaPhoneNumberId, isActive: true },
        create: { tenantId: config.tenantId, type: "WHATSAPP", externalAccountId: config.metaPhoneNumberId, ...encrypted, isActive: true },
      });
    }
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: { mpAccessToken: null, mpPublicKey: null, metaApiToken: null, metaPhoneNumberId: null, metaVerifyToken: null },
    });
  }

  // 2. Check if Demo Seed is enabled (default true for local testing)
  const shouldSeedDemo =
    process.env.SEED_DEMO_DATA === "true" ||
    process.env.NODE_ENV !== "production" ||
    !process.env.NODE_ENV;

  if (shouldSeedDemo) {
    console.log("🍔🍕 Creando Tenants Demo (Beats & Roma) para pruebas locales...");

    const rootDomain = process.env.BASE_DOMAIN || "localhost";
    const passwordHash = hashPassword(process.env.DEMO_ADMIN_PASSWORD || "DemoPass2026!");

    // ─── TENANT A: BEATS BURGERS (Plan PRO) ───
    const tenantBeats = await prisma.tenant.upsert({
      where: { slug: "beats" },
      update: { name: "Beats Burgers Demo", status: "ACTIVE" },
      create: {
        slug: "beats",
        name: "Beats Burgers Demo",
        status: "ACTIVE",
      },
    });

    const beatsLoc = await prisma.location.upsert({
      where: { tenantId_code: { tenantId: tenantBeats.id, code: "main" } },
      update: { name: "Beats Central", isMain: true, isActive: true },
      create: {
        tenantId: tenantBeats.id,
        name: "Beats Central",
        code: "main",
        address: "Av. Corrientes 1234, CABA",
        phone: "+5491155551111",
        isMain: true,
        isActive: true,
      },
    });

    await prisma.tenantDomain.upsert({
      where: { hostname: `beats.${rootDomain}` },
      update: { isPrimary: true },
      create: {
        tenantId: tenantBeats.id,
        hostname: `beats.${rootDomain}`,
        isPrimary: true,
        verifiedAt: new Date(),
      },
    });

    await prisma.subscription.upsert({
      where: { tenantId: tenantBeats.id },
      update: { planId: planMap.PRO.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      create: {
        tenantId: tenantBeats.id,
        planId: planMap.PRO.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.systemConfig.upsert({
      where: { tenantId: tenantBeats.id },
      update: { appName: "Beats Burgers Demo", primaryColor: "#f97316" },
      create: {
        tenantId: tenantBeats.id,
        appName: "Beats Burgers Demo",
        primaryColor: "#f97316",
        secondaryColor: "#9333ea",
        storeTheme: "URBAN_DARK",
        isStoreOpen: true,
        allowImmediateOrders: true,
        allowScheduledTomorrow: true,
        paymentCash: true,
        paymentMp: false,
        deliveryCost: 1500,
        isPointsCatalogActive: true,
        isRouletteActive: true,
        rouletteCost: 100,
      },
    });

    const userBeats = await prisma.user.upsert({
      where: { email: "owner@beats.local" },
      update: { passwordHash },
      create: {
        email: "owner@beats.local",
        name: "Owner Beats",
        passwordHash,
      },
    });

    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenantBeats.id, userId: userBeats.id } },
      update: { role: "OWNER" },
      create: {
        tenantId: tenantBeats.id,
        userId: userBeats.id,
        role: "OWNER",
      },
    });

    // Catálogo Beats
    const catBurgers = await prisma.category.upsert({
      where: { id: "beats-cat-burgers" },
      update: { name: "Smash Burgers", tenantId: tenantBeats.id },
      create: {
        id: "beats-cat-burgers",
        name: "Smash Burgers",
        sequence: 1,
        isActive: true,
        tenantId: tenantBeats.id,
      },
    });

    await prisma.product.upsert({
      where: { id: "beats-prod-double-bacon" },
      update: { basePrice: 9800, tenantId: tenantBeats.id, points: 98 },
      create: {
        id: "beats-prod-double-bacon",
        name: "Doble Bacon Cheddar",
        description: "Doble carne smash, panceta crocante y cheddar fundido.",
        basePrice: 9800,
        categoryId: catBurgers.id,
        isActive: true,
        points: 98,
        tenantId: tenantBeats.id,
      },
    });

    await ensureDemoLoyalty(tenantBeats.id);

    console.log("  ✓ Tenant A (Beats Burgers Demo) listo.");

    // ─── TENANT B: ROMA PIZZA (Plan BUSINESS) ───
    const tenantRoma = await prisma.tenant.upsert({
      where: { slug: "roma" },
      update: { name: "Roma Pizzería Demo", status: "ACTIVE" },
      create: {
        slug: "roma",
        name: "Roma Pizzería Demo",
        status: "ACTIVE",
      },
    });

    await prisma.location.upsert({
      where: { tenantId_code: { tenantId: tenantRoma.id, code: "main" } },
      update: { name: "Roma Sucursal 1", isMain: true, isActive: true },
      create: {
        tenantId: tenantRoma.id,
        name: "Roma Sucursal 1",
        code: "main",
        address: "Av. Santa Fe 4321, Palermo",
        phone: "+5491155552222",
        isMain: true,
        isActive: true,
      },
    });

    await prisma.tenantDomain.upsert({
      where: { hostname: `roma.${rootDomain}` },
      update: { isPrimary: true },
      create: {
        tenantId: tenantRoma.id,
        hostname: `roma.${rootDomain}`,
        isPrimary: true,
        verifiedAt: new Date(),
      },
    });

    await prisma.subscription.upsert({
      where: { tenantId: tenantRoma.id },
      update: { planId: planMap.BUSINESS.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      create: {
        tenantId: tenantRoma.id,
        planId: planMap.BUSINESS.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.systemConfig.upsert({
      where: { tenantId: tenantRoma.id },
      update: { appName: "Roma Pizzería Demo", primaryColor: "#dc2626" },
      create: {
        tenantId: tenantRoma.id,
        appName: "Roma Pizzería Demo",
        primaryColor: "#dc2626",
        secondaryColor: "#15803d",
        storeTheme: "CLEAN_BOUTIQUE",
        isStoreOpen: true,
        allowImmediateOrders: true,
        allowScheduledTomorrow: true,
        paymentCash: true,
        paymentMp: false,
        deliveryCost: 1800,
        isPointsCatalogActive: true,
        isRouletteActive: true,
        rouletteCost: 100,
      },
    });

    const userRoma = await prisma.user.upsert({
      where: { email: "owner@roma.local" },
      update: { passwordHash },
      create: {
        email: "owner@roma.local",
        name: "Owner Roma",
        passwordHash,
      },
    });

    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenantRoma.id, userId: userRoma.id } },
      update: { role: "OWNER" },
      create: {
        tenantId: tenantRoma.id,
        userId: userRoma.id,
        role: "OWNER",
      },
    });

    // Catálogo Roma
    const catPizzas = await prisma.category.upsert({
      where: { id: "roma-cat-pizzas" },
      update: { name: "Pizzas al Horno de Barro", tenantId: tenantRoma.id },
      create: {
        id: "roma-cat-pizzas",
        name: "Pizzas al Horno de Barro",
        sequence: 1,
        isActive: true,
        tenantId: tenantRoma.id,
      },
    });

    await prisma.product.upsert({
      where: { id: "roma-prod-fugazzeta" },
      update: { basePrice: 13500, tenantId: tenantRoma.id, points: 135 },
      create: {
        id: "roma-prod-fugazzeta",
        name: "Fugazzeta Rellena Especial",
        description: "Rellena con 500g de muzzarella, cebollas tiernas y orégano.",
        basePrice: 13500,
        categoryId: catPizzas.id,
        isActive: true,
        points: 135,
        tenantId: tenantRoma.id,
      },
    });

    await ensureDemoLoyalty(tenantRoma.id);

    console.log("  ✓ Tenant B (Roma Pizzería Demo) listo.");
  }

  console.log("🎉 Seed idempotente completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
