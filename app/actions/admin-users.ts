"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";
import { arePhonesEquivalent, cleanPhoneNumber } from "@/lib/phone";
import { sendAdminClientPasswordReset } from "@/app/actions/client-security";

const adminContactSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().max(80),
  phone: z.string().trim().max(32),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
}).strict();

/**
 * Cambia datos del cliente SOLO dentro del comercio actual.
 * Nunca marca correos nuevos como verificados.
 * No toca puntos, pedidos, claves ni passkeys.
 */
export async function updateClientContactDetails(input: unknown) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const parsed = adminContactSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Revisá nombre, teléfono y correo del cliente." };
  const phone = cleanPhoneNumber(parsed.data.phone);
  if (!/^\\+?[0-9]{8,15}$/.test(phone)) {
    return { success: false as const, error: "Ingresá un teléfono válido (8 a 15 dígitos)." };
  }
  const loginKey = phone.replace(/\\D/g, "").slice(-6);
  const email = parsed.data.email || null;
  const db = await getTenantDb();
  const current = await db.client.findUnique({ where: { id: parsed.data.clientId } });
  if (!current) return { success: false as const, error: "El cliente no pertenece a este comercio." };
  const similar = await db.client.findMany({
    where: {
      id: { not: current.id },
      OR: [
        { phone },
        { phoneLoginKey: loginKey },
        ...(email ? [{ email }] : []),
      ],
    },
    select: { id: true, phone: true, email: true },
  });
  if (similar.some(other => email && other.email === email)) {
    return { success: false as const, error: "Ese correo ya pertenece a otra cuenta de este comercio." };
  }
  if (similar.some(other => arePhonesEquivalent(other.phone, phone))) {
    return { success: false as const, error: "Ese teléfono coincide con otra cuenta del comercio." };
  }
  const emailChanged = (current.email || null) !== email;
  if (current.forcePasswordChange && emailChanged) {
    return { success: false as const, error: "El cliente debe terminar su reseteo temporal antes de cambiar el correo desde administración." };
  }
  const phoneChanged = current.phone !== phone;

  try {
    await db.$transaction(async tx => {
      const result = await tx.client.updateMany({
        where: { id: current.id, tenantId: tenant.id },
        data: {
          name: parsed.data.name || null,
          phone,
          phoneLoginKey: loginKey,
          email,
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
      });
      if (result.count !== 1) throw new Error("CLIENT_NOT_FOUND");
      if (emailChanged) {
        await tx.clientSecurityToken.deleteMany({
          where: { tenantId: tenant.id, clientId: current.id },
        });
        await tx.clientRecoveryCode.deleteMany({
          where: { tenantId: tenant.id, clientId: current.id },
        });
      }
      if (phoneChanged) {
        // El cambio del identificador de ingreso cierra todas las sesiones anteriores.
        await tx.session.deleteMany({
          where: { tenantId: tenant.id, clientId: current.id },
        });
      }
    });
    revalidatePath("/admin/users");
    revalidatePath("/profile");
    return {
      success: true as const,
      client: {
        id: current.id, name: parsed.data.name || null, phone, email,
        emailVerifiedAt: emailChanged ? null : current.emailVerifiedAt,
      },
      requiresVerification: Boolean(emailChanged && email),
      sessionsRevoked: phoneChanged,
    };
  } catch (error) {
    console.error("Error updating tenant client contact:", error);
    return { success: false as const, error: "No se guardaron los datos. Verificá que teléfono y correo sean únicos." };
  }
}

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
  // No permitir un reseteo al simple conocimiento del teléfono.
  // La entrega se hace SOLO al correo previamente verificado por su dueño.
  return sendAdminClientPasswordReset(clientId);
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

