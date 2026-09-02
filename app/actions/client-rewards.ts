"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getLoggedClient } from "@/lib/auth";
import { getPublicConfig } from "@/lib/public-config";
import { hasTenantFeature, requireTenantFeature } from "@/lib/features";
import { z } from "zod";

export async function fetchPublicRewards() {
  const tenant = await getTenantContext();
  if (!(await hasTenantFeature(tenant.id, "loyalty"))) {
    return { isActive: false, rewards: [], loggedClient: null, redemptions: [], tiers: [] };
  }
  const config = await getPublicConfig(tenant.id);
  if (!config || config.isPointsCatalogActive === false) {
    return { isActive: false, rewards: [], loggedClient: null, redemptions: [], tiers: [] };
  }

  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);

  const [rewards, tiers, dbClient, redemptions] = await Promise.all([
    db.pointReward.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { pointsCost: "asc" }],
      include: {
        product: { select: { id: true, name: true, basePrice: true, imageUrl: true, isActive: true } },
        minTier: { select: { id: true, name: true, badgeText: true, color: true, iconName: true, sequence: true } },
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
          where: {
            clientId: client.id,
            status: "AVAILABLE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
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

    if (clientTier && tiers.length > 0) {
      // Inherit maximum privileges from current and all previous tiers
      const unlockedTiers = tiers.filter((t) => t.sequence <= (clientTier.sequence ?? 0));
      const maxMultiplier = Math.max(clientTier.pointsMultiplier || 1.0, ...unlockedTiers.map((t) => t.pointsMultiplier || 1.0));
      const maxDiscount = Math.max(clientTier.discountPercent || 0, ...unlockedTiers.map((t) => t.discountPercent || 0));
      clientTier = {
        ...clientTier,
        pointsMultiplier: maxMultiplier,
        discountPercent: maxDiscount,
      };
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
    rewards: rewards.filter((reward) => (reward.type !== "PRODUCT" && reward.type !== "COMBO") || reward.product?.isActive),
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
  await requireTenantFeature(tenant.id, "loyalty");
  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);
  if (!client) {
    return { success: false, error: "Debes iniciar sesión con tu teléfono para canjear puntos." };
  }
  if (!z.string().uuid().safeParse(rewardId).success) {
    return { success: false, error: "El beneficio seleccionado no es válido." };
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
      if ((reward.type === "PRODUCT" || reward.type === "COMBO") && !reward.product?.isActive) {
        throw new Error("REWARD_NOT_FOUND");
      }

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

      // Descontar de forma condicional para evitar doble canje concurrente.
      const charged = await tx.client.updateMany({
        where: { id: client.id, points: { gte: reward.pointsCost } },
        data: { points: { decrement: reward.pointsCost } },
      });
      if (charged.count !== 1) throw new Error("INSUFFICIENT_POINTS");
      const updatedClient = await tx.client.findUniqueOrThrow({ where: { id: client.id } });

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
  if (!(await hasTenantFeature(tenant.id, "loyalty"))) return [];
  const db = createTenantDb(tenant.id);
  const client = await getLoggedClient(tenant.id);
  if (!client) return [];

  const coupons = await db.pointRedemption.findMany({
    where: {
      clientId: client.id,
      status: "AVAILABLE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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
