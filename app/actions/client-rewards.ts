"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getLoggedClient } from "@/lib/auth";
import { getPublicConfig } from "@/lib/public-config";

export async function fetchPublicRewards() {
  const config = await getPublicConfig();
  if (!config || config.isPointsCatalogActive === false) {
    return { isActive: false, rewards: [], loggedClient: null, redemptions: [], tiers: [] };
  }

  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);

  const [rewards, tiers, dbClient, redemptions] = await Promise.all([
    db.pointReward.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { pointsCost: "asc" }],
      include: {
        product: { select: { id: true, name: true, basePrice: true, imageUrl: true } },
        minTier: { select: { id: true, name: true, badgeText: true, color: true, iconName: true } },
      },
    }),
    db.customerTier.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    }),
    client
      ? db.client.findUnique({
          where: { id: client.id },
          include: {
            orders: {
              where: { status: { not: "CANCELLED" } },
              select: { id: true, total: true },
            },
            customTier: true,
          },
        })
      : null,
    client
      ? db.pointRedemption.findMany({
          where: { clientId: client.id, status: "AVAILABLE" },
          include: {
            reward: {
              include: { product: { select: { id: true, name: true, basePrice: true, imageUrl: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  // Determine client tier
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
      // Find highest tier matching requirements
      const reverseTiers = [...tiers].sort((a, b) => b.sequence - a.sequence || b.minSpent - a.minSpent);
      clientTier = reverseTiers.find((t) => {
        const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
        const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
        const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
        return meetsOrders && meetsSpent && meetsPoints;
      }) || tiers[0];
    }

    // Find next tier for progression
    if (clientTier && tiers.length > 1) {
      const currentIndex = tiers.findIndex((t) => t.id === clientTier.id);
      if (currentIndex >= 0 && currentIndex < tiers.length - 1) {
        nextTier = tiers[currentIndex + 1];
        // Calculate progress to next tier based on whichever requirement is set
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

  return {
    isActive: true,
    rewards,
    tiers,
    loggedClient: dbClient
      ? {
          id: dbClient.id,
          name: dbClient.name,
          phone: dbClient.phone,
          points: dbClient.points,
          ordersCount: dbClient.orders.length,
          totalSpent: dbClient.orders.reduce((s, o) => s + (o.total || 0), 0),
          tier: clientTier,
          nextTier,
          progressPercent,
        }
      : null,
    redemptions,
  };
}

export async function redeemReward(rewardId: string) {
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);
  if (!client) {
    return { success: false, error: "Debes iniciar sesión con tu teléfono para canjear puntos." };
  }

  const config = await db.systemConfig.findFirst({ select: { isPointsCatalogActive: true } });
  if (config?.isPointsCatalogActive === false) {
    return { success: false, error: "El catálogo de puntos está desactivado temporalmente." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const currentClient = await tx.client.findUnique({
        where: { id: client.id },
        include: {
          orders: { where: { status: { not: "CANCELLED" } } },
          customTier: true,
        },
      });
      if (!currentClient) throw new Error("CLIENT_NOT_FOUND");

      const [reward, tiers] = await Promise.all([
        tx.pointReward.findUnique({
          where: { id: rewardId, isActive: true },
          include: { product: true, minTier: true },
        }),
        tx.customerTier.findMany({ where: { isActive: true }, orderBy: { sequence: "desc" } }),
      ]);

      if (!reward) throw new Error("REWARD_NOT_FOUND");

      // Verify minimum tier requirement if set
      if (reward.minTierId && reward.minTier) {
        let clientTier = currentClient.customTier;
        if (!clientTier && tiers.length > 0) {
          const ordersCount = currentClient.orders.length;
          const totalSpent = currentClient.orders.reduce((sum, o) => sum + (o.total || 0), 0);
          const points = currentClient.points;

          clientTier = tiers.find((t) => {
            const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
            const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
            const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
            return meetsOrders && meetsSpent && meetsPoints;
          }) || tiers[tiers.length - 1];
        }

        const requiredSequence = reward.minTier.sequence;
        const clientSequence = clientTier?.sequence ?? 0;

        if (clientSequence < requiredSequence) {
          throw new Error("TIER_REQUIREMENT_NOT_MET");
        }
      }

      if (currentClient.points < reward.pointsCost) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      // Descontar puntos
      const updatedClient = await tx.client.update({
        where: { id: client.id },
        data: { points: { decrement: reward.pointsCost } },
      });

      // Crear cupón/beneficio
      const redemption = await tx.pointRedemption.create({
        data: {
          clientId: client.id,
          rewardId,
          pointsSpent: reward.pointsCost,
          status: "AVAILABLE",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          tenantId: tenant.id,
        },
        include: {
          reward: {
            include: { product: true },
          },
        },
      });

      return { updatedClient, redemption };
    });

    revalidatePath("/");
    revalidatePath("/checkout");
    revalidatePath("/profile");

    return {
      success: true,
      newPoints: result.updatedClient.points,
      redemption: result.redemption,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INSUFFICIENT_POINTS") {
      return { success: false, error: "No tenés suficientes puntos para canjear este beneficio." };
    }
    if (code === "TIER_REQUIREMENT_NOT_MET") {
      return { success: false, error: "Este beneficio es exclusivo para clientes con un nivel de membresía superior." };
    }
    if (code === "REWARD_NOT_FOUND") {
      return { success: false, error: "Este beneficio ya no se encuentra disponible." };
    }
    console.error("Client redeem error:", error);
    return { success: false, error: "No se pudo realizar el canje." };
  }
}

export async function fetchClientAvailableCoupons() {
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);
  if (!client) return [];

  const coupons = await db.pointRedemption.findMany({
    where: {
      clientId: client.id,
      status: "AVAILABLE",
    },
    include: {
      reward: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return coupons;
}
