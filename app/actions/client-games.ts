"use server";

import crypto from "crypto";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { requireTenantFeature } from "@/lib/features";

export async function spinRoulette() {
  try {
    const tenant = await getTenantContext();
    await requireTenantFeature(tenant.id, "roulette");
    const client = await getLoggedClient(tenant.id);
    if (!client) return { success: false, error: "Necesitás iniciar sesión." } as const;
    const ip = await getRequestIp();
    if (!(await consumeRateLimit("roulette", `${tenant.id}:${client.id}:${ip}`, 20, 60 * 60 * 1000))) {
      return { success: false, error: "Demasiados intentos. Probá más tarde." } as const;
    }

    const db = createTenantDb(tenant.id);

    return db.$transaction(async (tx) => {
      const lockedClient = await tx.client.findUniqueOrThrow({ where: { id: client.id }, select: { points: true } });
      const existing = await tx.rouletteWin.findFirst({
        where: { clientId: client.id, claimedAt: null, expiresAt: { gt: new Date() } },
        include: { prize: { include: { product: { select: { id: true, name: true } } } } },
      });
      if (existing) {
        return { success: true, remainingPoints: lockedClient.points, prize: { ...existing.prize, winId: existing.id } } as const;
      }

      const config = await tx.systemConfig.findFirst();
      if (!config?.isRouletteActive) return { success: false, error: "La ruleta no está disponible." } as const;
      const cost = Math.max(0, config.rouletteCost);
      const prizes = await tx.roulettePrize.findMany({
        include: { product: { select: { id: true, name: true, isActive: true } } },
      });
      const eligible = prizes.filter((prize) => prize.probability > 0 && (prize.type !== "PRODUCT" || prize.product?.isActive));
      const totalWeight = eligible.reduce((sum, prize) => sum + prize.probability, 0);
      if (!eligible.length || totalWeight <= 0) return { success: false, error: "No hay premios configurados." } as const;

      const charged = await tx.client.updateMany({
        where: { id: client.id, points: { gte: cost } },
        data: { points: { decrement: cost } },
      });
      if (charged.count !== 1) return { success: false, error: "No tenés suficientes puntos." } as const;

      const roll = (crypto.randomInt(0, 1_000_000) / 1_000_000) * totalWeight;
      let cumulative = 0;
      const selected = eligible.find((prize) => {
        cumulative += prize.probability;
        return roll < cumulative;
      }) ?? eligible[eligible.length - 1];
      const win = await tx.rouletteWin.create({
        data: { clientId: client.id, prizeId: selected.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), tenantId: tenant.id },
      });
      const updated = await tx.client.findUniqueOrThrow({ where: { id: client.id }, select: { points: true } });
      return {
        success: true,
        remainingPoints: updated.points,
        prize: {
          id: selected.id,
          name: selected.name,
          type: selected.type,
          value: selected.value,
          product: selected.product ? { id: selected.product.id, name: selected.product.name } : null,
          winId: win.id,
        },
      } as const;
    });
  } catch (error) {
    console.error("Roulette spin failed:", error);
    return { success: false, error: "No se pudo girar la ruleta." } as const;
  }
}
