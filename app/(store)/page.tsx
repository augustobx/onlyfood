import { createTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { StorefrontClient } from "./StorefrontClient";
import { getLoggedClient } from "@/lib/auth";
import { calculateOrderRequirements } from "@/lib/inventory";
import { publicConfigSelect } from "@/lib/public-config";

export default async function StorePage() {
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);
  const config = await db.systemConfig.findFirst({ select: publicConfigSelect });
  const loggedClient = await getLoggedClient();
  
  const allowsFutureOrders = Boolean(config?.allowScheduledTomorrow || config?.allowAdvanceOrders);

  if (config && !config.isStoreOpen && !allowsFutureOrders) {
    const isNexo = config.storeTheme === "NEXO";
    return (
      <div className={`closed-store flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4 px-4 ${isNexo ? "rounded-[2rem] bg-slate-950 text-white shadow-2xl" : "bg-slate-50"}`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 text-4xl ${isNexo ? "bg-white/10" : "bg-slate-200"}`}>🌙</div>
        {isNexo && <span className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Estamos descansando</span>}
        <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${isNexo ? "text-white" : "text-slate-800"}`}>Cerrado por el momento</h1>
        <p className={`text-lg max-w-md ${isNexo ? "text-slate-300" : "text-muted-foreground"}`}>{config.closedMessage || "Volvé pronto para hacer tu pedido o revisá nuestros horarios comerciales."}</p>
      </div>
    );
  }

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sequence: 'asc' },
    include: {
      products: {
        where: { isActive: true, isCombo: false },
        orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
        include: {
          ingredients: { include: { ingredient: true } },
          extras: { include: { extra: true } }
        }
      }
    }
  });

  const combos = await db.product.findMany({
    where: { isActive: true, isCombo: true },
    orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
    include: {
      comboItemsConfig: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } }
    }
  });

  // Los pedidos antiguos que todavía no pudieron reservar inventario también
  // reducen la disponibilidad pública para no vender esas unidades dos veces.
  const legacyPendingOrders = await db.order.findMany({
    where: { status: "NEW", stockCommitted: false },
    include: {
      items: {
        include: {
          removedIngredients: true,
          product: { include: { ingredients: { include: { ingredient: true } } } },
          secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
          comboItems: { include: { removedIngredients: true, product: { include: { ingredients: { include: { ingredient: true } } } } } },
        },
      },
    },
  });
  const legacyDemand = new Map<string, number>();
  for (const order of legacyPendingOrders) {
    for (const requirement of calculateOrderRequirements(order.items)) {
      legacyDemand.set(requirement.ingredientId, (legacyDemand.get(requirement.ingredientId) ?? 0) + requirement.required);
    }
  }
  const applyLegacyDemand = (usage: any) => ({
    ...usage,
    ingredient: {
      ...usage.ingredient,
      stock: Math.max(0, usage.ingredient.stock - (legacyDemand.get(usage.ingredientId) ?? 0)),
    },
  });
  for (const category of categories) {
    for (const product of category.products) product.ingredients = product.ingredients.map(applyLegacyDemand);
  }
  for (const combo of combos) {
    for (const comboItem of combo.comboItemsConfig) comboItem.product.ingredients = comboItem.product.ingredients.map(applyLegacyDemand);
  }

  const [prizes, tiers, dbClient] = await Promise.all([
    tenant.features.has("roulette") ? db.roulettePrize.findMany({
      include: { product: true },
    }) : [],
    tenant.features.has("loyalty") ? db.customerTier.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    }) : [],
    loggedClient
      ? db.client.findUnique({
          where: { id: loggedClient.id },
          include: {
            orders: {
              where: { status: { not: "CANCELLED" } },
              select: { id: true, total: true },
            },
            customTier: true,
          },
        })
      : null,
  ]);

  let clientTier: any = null;
  let nextTier: any = null;
  let progressPercent = 0;

  if (dbClient) {
    const ordersCount = dbClient.orders.length;
    const totalSpent = dbClient.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const points = dbClient.points;

    if (dbClient.customTier) {
      clientTier = dbClient.customTier;
    } else if (tiers.length > 0) {
      const reverseTiers = [...tiers].sort((a, b) => b.sequence - a.sequence || b.minSpent - a.minSpent);
      clientTier = reverseTiers.find((t) => {
        const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
        const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
        const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
        return meetsOrders && meetsSpent && meetsPoints;
      }) || tiers[0];
    }

    if (clientTier && tiers.length > 1) {
      const currentIndex = tiers.findIndex((t) => t.id === clientTier.id);
      if (currentIndex >= 0 && currentIndex < tiers.length - 1) {
        nextTier = tiers[currentIndex + 1];
        if (nextTier.minSpent > 0) {
          progressPercent = Math.min(100, Math.round((totalSpent / nextTier.minSpent) * 100));
        } else if (nextTier.minOrdersCount > 0) {
          progressPercent = Math.min(100, Math.round((ordersCount / nextTier.minOrdersCount) * 100));
        } else if (nextTier.minPoints > 0) {
          progressPercent = Math.min(100, Math.round((points / nextTier.minPoints) * 100));
        }
      }
    }
  }

  // Safe client with full tier info
  const safeClient = dbClient
    ? {
        id: dbClient.id,
        name: dbClient.name,
        phone: dbClient.phone,
        points: dbClient.points,
        tier: clientTier,
        nextTier,
        progressPercent,
      }
    : null;

  return (
    <StorefrontClient
      categories={categories}
      combos={combos}
      loggedClient={safeClient}
      config={config}
      prizes={prizes}
      loyaltyEnabled={tenant.features.has("loyalty")}
      rouletteEnabled={tenant.features.has("roulette")}
    />
  );
}
