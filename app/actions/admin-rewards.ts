"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";

const rewardSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  pointsCost: z.number().int().min(1).max(100_000),
  type: z.enum(["PRODUCT", "PERCENT", "AMOUNT", "COMBO", "PROMO"]),
  value: z.number().min(0).max(1_000_000).optional().nullable(),
  productId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  badgeText: z.string().max(30).optional().nullable(),
  minTierId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sequence: z.number().int().default(0),
});

const tierSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  badgeText: z.string().trim().min(1).max(30),
  minOrdersCount: z.number().int().min(0).default(0),
  minPoints: z.number().int().min(0).default(0),
  minSpent: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  pointsMultiplier: z.number().min(1.0).max(10.0).default(1.0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f97316"),
  bgGradient: z.string().default("from-amber-500 to-yellow-600"),
  iconName: z.string().default("Crown"),
  description: z.string().max(500).optional().nullable(),
  sequence: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function fetchAdminRewards() {
  await requireAdmin();
  const db = await getTenantDb();
  const [rewards, products, tiers, config] = await Promise.all([
    db.pointReward.findMany({
      orderBy: [{ sequence: "asc" }, { createdAt: "desc" }],
      include: {
        product: { select: { id: true, name: true, basePrice: true, imageUrl: true } },
        minTier: { select: { id: true, name: true, badgeText: true, color: true } },
        _count: { select: { redemptions: true } },
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, basePrice: true, isCombo: true },
      orderBy: { name: "asc" },
    }),
    db.customerTier.findMany({
      orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    }),
    db.systemConfig.findFirst({
      select: { id: true, isPointsCatalogActive: true },
    }),
  ]);

  return {
    rewards,
    products,
    tiers,
    isPointsCatalogActive: config?.isPointsCatalogActive ?? true,
  };
}

export async function savePointReward(input: unknown) {
  await requireAdmin();
  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." };
  }

  const data = parsed.data;

  try {
    const db = await getTenantDb();
    if (data.id) {
      await db.pointReward.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description || null,
          pointsCost: data.pointsCost,
          type: data.type,
          value: data.type === "PERCENT" || data.type === "AMOUNT" ? data.value : null,
          productId: data.type === "PRODUCT" || data.type === "COMBO" ? data.productId : null,
          imageUrl: data.imageUrl || null,
          badgeText: data.badgeText || null,
          minTierId: data.minTierId || null,
          isActive: data.isActive,
          sequence: data.sequence,
        },
      });
    } else {
      await db.pointReward.create({
        data: {
          name: data.name,
          description: data.description || null,
          pointsCost: data.pointsCost,
          type: data.type,
          value: data.type === "PERCENT" || data.type === "AMOUNT" ? data.value : null,
          productId: data.type === "PRODUCT" || data.type === "COMBO" ? data.productId : null,
          imageUrl: data.imageUrl || null,
          badgeText: data.badgeText || null,
          minTierId: data.minTierId || null,
          isActive: data.isActive,
          sequence: data.sequence,
        },
      });
    }

    revalidatePath("/admin/games");
    revalidatePath("/admin/rewards");
    revalidatePath("/admin/users");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error saving point reward:", error);
    return { success: false, error: "No se pudo guardar la recompensa." };
  }
}

export async function togglePointReward(id: string, isActive: boolean) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    await db.pointReward.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/games");
    revalidatePath("/admin/rewards");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al cambiar estado." };
  }
}

export async function deletePointReward(id: string) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    await db.pointReward.delete({
      where: { id },
    });
    revalidatePath("/admin/games");
    revalidatePath("/admin/rewards");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo eliminar la recompensa." };
  }
}

export async function togglePointsCatalog(isActive: boolean) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    const config = await db.systemConfig.findFirst({ select: { id: true } });
    if (!config) return { success: false, error: "Configuración no encontrada." };

    await db.systemConfig.update({
      where: { id: config.id },
      data: { isPointsCatalogActive: isActive },
    });
    revalidatePath("/admin/games");
    revalidatePath("/admin/rewards");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al cambiar estado del catálogo." };
  }
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER TIERS & BADGES ACTIONS (RANKING)
// ═══════════════════════════════════════════════════════════════

export async function fetchAdminTiers() {
  await requireAdmin();
  const db = await getTenantDb();
  const tiers = await db.customerTier.findMany({
    orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    include: {
      _count: { select: { rewards: true, clients: true } },
    },
  });
  return { success: true, tiers };
}

export async function saveCustomerTier(input: unknown) {
  await requireAdmin();
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos del nivel inválidos." };
  }

  const data = parsed.data;

  try {
    const db = await getTenantDb();
    if (data.id) {
      await db.customerTier.update({
        where: { id: data.id },
        data: {
          name: data.name,
          badgeText: data.badgeText,
          minOrdersCount: data.minOrdersCount,
          minPoints: data.minPoints,
          minSpent: data.minSpent,
          discountPercent: data.discountPercent,
          pointsMultiplier: data.pointsMultiplier,
          color: data.color,
          bgGradient: data.bgGradient,
          iconName: data.iconName,
          description: data.description || null,
          sequence: data.sequence,
          isActive: data.isActive,
        },
      });
    } else {
      await db.customerTier.create({
        data: {
          name: data.name,
          badgeText: data.badgeText,
          minOrdersCount: data.minOrdersCount,
          minPoints: data.minPoints,
          minSpent: data.minSpent,
          discountPercent: data.discountPercent,
          pointsMultiplier: data.pointsMultiplier,
          color: data.color,
          bgGradient: data.bgGradient,
          iconName: data.iconName,
          description: data.description || null,
          sequence: data.sequence,
          isActive: data.isActive,
        },
      });
    }

    revalidatePath("/admin/rewards");
    revalidatePath("/admin/users");
    revalidatePath("/profile");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error saving customer tier:", error);
    return { success: false, error: "No se pudo guardar el nivel de fidelización." };
  }
}

export async function deleteCustomerTier(id: string) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    await db.$transaction(async (tx) => {
      // Unlink rewards and clients using this tier
      await tx.pointReward.updateMany({
        where: { minTierId: id },
        data: { minTierId: null },
      });
      await tx.client.updateMany({
        where: { customTierId: id },
        data: { customTierId: null },
      });
      await tx.customerTier.delete({ where: { id } });
    });

    revalidatePath("/admin/rewards");
    revalidatePath("/admin/users");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer tier:", error);
    return { success: false, error: "No se pudo eliminar el nivel." };
  }
}

export async function fetchCustomerRanking() {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    const [clients, tiers] = await Promise.all([
      db.client.findMany({
        include: {
          orders: {
            where: { status: { not: "CANCELLED" } },
            select: { id: true, total: true, status: true, paymentStatus: true, createdAt: true },
          },
          customTier: true,
        },
      }),
      db.customerTier.findMany({
        where: { isActive: true },
        orderBy: [{ sequence: "desc" }, { minSpent: "desc" }, { minOrdersCount: "desc" }],
      }),
    ]);

    // Calculate metrics and rank for each client
    const rankedClients = clients.map((c) => {
      const completedOrders = c.orders;
      const ordersCount = completedOrders.length;
      const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const points = c.points || 0;

      // Determine active tier (manual override or highest met requirement)
      let activeTier = c.customTier;
      if (!activeTier && tiers.length > 0) {
        activeTier = tiers.find((t) => {
          const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
          const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
          const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
          return meetsOrders && meetsSpent && meetsPoints;
        }) || tiers[tiers.length - 1];
      }

      return {
        id: c.id,
        name: c.name || "Sin nombre",
        phone: c.phone,
        ordersCount,
        totalSpent,
        points,
        tier: activeTier ? {
          id: activeTier.id,
          name: activeTier.name,
          badgeText: activeTier.badgeText,
          color: activeTier.color,
          bgGradient: activeTier.bgGradient,
          iconName: activeTier.iconName,
          discountPercent: activeTier.discountPercent,
          pointsMultiplier: activeTier.pointsMultiplier,
        } : null,
        lastOrderDate: completedOrders.length > 0
          ? completedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null,
      };
    });

    // Sort by total spent desc, then orders count desc, then points desc
    rankedClients.sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
      if (b.ordersCount !== a.ordersCount) return b.ordersCount - a.ordersCount;
      return b.points - a.points;
    });

    return {
      success: true,
      ranking: rankedClients.map((client, index) => ({
        rank: index + 1,
        ...client,
      })),
      tiers,
    };
  } catch (error) {
    console.error("Error fetching customer ranking:", error);
    return { success: false, error: "No se pudo calcular el ranking de clientes." };
  }
}

export async function adminAssignRewardToClient(clientId: string, rewardId: string) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    const result = await db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: clientId } });
      if (!client) throw new Error("CLIENT_NOT_FOUND");

      const reward = await tx.pointReward.findUnique({ where: { id: rewardId } });
      if (!reward) throw new Error("REWARD_NOT_FOUND");

      if (client.points < reward.pointsCost) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { points: { decrement: reward.pointsCost } },
      });

      const redemption = await tx.pointRedemption.create({
        data: {
          clientId,
          rewardId,
          pointsSpent: reward.pointsCost,
          status: "AVAILABLE",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { reward: true },
      });

      return { updatedClient, redemption };
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/rewards");
    revalidatePath("/");
    return { success: true, newPoints: result.updatedClient.points, redemption: result.redemption };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INSUFFICIENT_POINTS") {
      return { success: false, error: "El cliente no tiene suficientes puntos para este premio." };
    }
    if (code === "CLIENT_NOT_FOUND") {
      return { success: false, error: "Cliente no encontrado." };
    }
    if (code === "REWARD_NOT_FOUND") {
      return { success: false, error: "Recompensa no encontrada." };
    }
    console.error("Admin reward assign error:", error);
    return { success: false, error: "No se pudo asignar el premio." };
  }
}

export async function adminAdjustClientPoints(clientId: string, deltaPoints: number) {
  await requireAdmin();
  try {
    const db = await getTenantDb();
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Cliente no encontrado." };

    const newPoints = Math.max(0, client.points + deltaPoints);
    const updated = await db.client.update({
      where: { id: clientId },
      data: { points: newPoints },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/rewards");
    return { success: true, points: updated.points };
  } catch (error) {
    console.error("Points adjustment error:", error);
    return { success: false, error: "No se pudieron ajustar los puntos." };
  }
}
