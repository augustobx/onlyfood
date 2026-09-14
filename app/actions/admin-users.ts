"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";
import { arePhonesEquivalent } from "@/lib/phone";

export async function updateUserPoints(clientId: string, points: number) {
  await requireAdmin();
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "loyalty");
  const parsed = z.object({ clientId: z.string().min(1).max(100), points: z.number().int().min(0).max(100_000_000) }).safeParse({ clientId, points });
  if (!parsed.success) return { success: false, error: "Datos inválidos." };
  try {
    const db = await getTenantDb();
    await db.client.update({ where: { id: parsed.data.clientId }, data: { points: parsed.data.points } });
    revalidatePath("/admin/users"); return { success: true };
  } catch { return { success: false, error: "No se pudieron actualizar los puntos." }; }
}

export async function resetUserPassword(clientId: string) {
  await requireAdmin();
  const tenant = await getTenantContext();
  const parsed = z.string().min(1).max(100).safeParse(clientId);
  if (!parsed.success) return { success: false, error: "Cliente inválido." };
  try {
    const db = await getTenantDb();
    await db.client.update({
      where: { id: parsed.data },
      data: { passwordSetupRequired: true },
    });
    // Invalidate existing sessions so client has to establish new credentials
    await db.session.deleteMany({ where: { clientId: parsed.data } });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error resetting user password:", error);
    return { success: false, error: "No se pudo restablecer la contraseña." };
  }
}

export type DuplicateClientGroup = {
  canonicalPhone: string;
  suggestedPrimaryId: string;
  clients: {
    id: string;
    name: string | null;
    phone: string;
    points: number;
    passwordSetupRequired: boolean;
    ordersCount: number;
    totalSpent: number;
    createdAt: Date;
  }[];
};

export async function detectDuplicateClients(): Promise<{ success: boolean; groups?: DuplicateClientGroup[]; error?: string }> {
  await requireAdmin();
  const tenant = await getTenantContext();
  try {
    const db = await getTenantDb();
    const allClients = await db.client.findMany({
      where: { tenantId: tenant.id },
      include: {
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, total: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const groups: DuplicateClientGroup[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < allClients.length; i++) {
      const current = allClients[i];
      if (visited.has(current.id)) continue;

      const matching = [current];
      for (let j = i + 1; j < allClients.length; j++) {
        const other = allClients[j];
        if (visited.has(other.id)) continue;
        if (arePhonesEquivalent(current.phone, other.phone)) {
          matching.push(other);
          visited.add(other.id);
        }
      }

      if (matching.length > 1) {
        visited.add(current.id);

        // Determinar cuenta sugerida para conservar como principal:
        // 1) Clave activa (passwordSetupRequired === false)
        // 2) Mayor saldo de puntos
        // 3) Mayor cantidad de pedidos
        // 4) Más antigua
        const sorted = [...matching].sort((a, b) => {
          if (!a.passwordSetupRequired && b.passwordSetupRequired) return -1;
          if (a.passwordSetupRequired && !b.passwordSetupRequired) return 1;
          if (b.points !== a.points) return b.points - a.points;
          if (b.orders.length !== a.orders.length) return b.orders.length - a.orders.length;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        groups.push({
          canonicalPhone: current.phone,
          suggestedPrimaryId: sorted[0].id,
          clients: matching.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            points: c.points,
            passwordSetupRequired: c.passwordSetupRequired,
            ordersCount: c.orders.length,
            totalSpent: c.orders.reduce((sum, o) => sum + (o.total || 0), 0),
            createdAt: c.createdAt,
          })),
        });
      }
    }

    return { success: true, groups };
  } catch (error) {
    console.error("Error detecting duplicates:", error);
    return { success: false, error: "No se pudieron detectar clientes duplicados." };
  }
}

export async function mergeClients(primaryClientId: string, secondaryClientId: string) {
  await requireAdmin();
  const tenant = await getTenantContext();

  const parsed = z.object({
    primaryClientId: z.string().min(1),
    secondaryClientId: z.string().min(1),
  }).safeParse({ primaryClientId, secondaryClientId });

  if (!parsed.success || parsed.data.primaryClientId === parsed.data.secondaryClientId) {
    return { success: false, error: "IDs de clientes inválidos." };
  }

  try {
    const db = await getTenantDb();

    const [primary, secondary] = await Promise.all([
      db.client.findFirst({
        where: { id: parsed.data.primaryClientId, tenantId: tenant.id },
      }),
      db.client.findFirst({
        where: { id: parsed.data.secondaryClientId, tenantId: tenant.id },
      }),
    ]);

    if (!primary || !secondary) {
      return { success: false, error: "Uno o ambos clientes no existen en la tienda." };
    }

    await db.$transaction(async (tx) => {
      // 1. Reasignar pedidos
      await tx.order.updateMany({
        where: { clientId: secondary.id, tenantId: tenant.id },
        data: { clientId: primary.id },
      });

      // 2. Reasignar cupones canjeados
      await tx.pointRedemption.updateMany({
        where: { clientId: secondary.id, tenantId: tenant.id },
        data: { clientId: primary.id },
      });

      // 3. Reasignar premios de ruleta
      await tx.rouletteWin.updateMany({
        where: { clientId: secondary.id, tenantId: tenant.id },
        data: { clientId: primary.id },
      });

      // 4. Eliminar sesiones del secundario
      await tx.session.deleteMany({
        where: { clientId: secondary.id },
      });

      // 5. Actualizar el cliente principal consolidando puntos, nombre y tier
      const shouldAdoptPassword = primary.passwordSetupRequired && !secondary.passwordSetupRequired;

      await tx.client.update({
        where: { id: primary.id },
        data: {
          points: primary.points + secondary.points,
          name: primary.name || secondary.name || null,
          customTierId: primary.customTierId || secondary.customTierId || null,
          ...(shouldAdoptPassword ? {
            password: secondary.password,
            passwordSetupRequired: false,
          } : {}),
        },
      });

      // 6. Eliminar el cliente secundario
      await tx.client.delete({
        where: { id: secondary.id },
      });
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      transferredPoints: secondary.points,
      primaryId: primary.id,
      deletedSecondaryId: secondary.id,
    };
  } catch (error) {
    console.error("Error merging clients:", error);
    return { success: false, error: "No se pudieron unificar los clientes." };
  }
}

