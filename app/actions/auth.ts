"use server";

import { z } from "zod";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { hashPassword, verifyPassword, createSession, clearSession, getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";

const phoneSchema = z.string().trim().regex(/^\+?[0-9]{8,15}$/);
const loginIdentifierSchema = z.string().trim().min(1).max(50);
const passwordSchema = z.string().min(8).max(128);

type LoginClient = {
  id: string;
  phone: string;
  phoneLoginKey: string | null;
  password: string;
  passwordSetupRequired: boolean;
  name: string | null;
  points: number;
  createdAt: Date;
};

function phoneLoginKey(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-6) : null;
}

async function findClientsByIdentifier(tenantId: string, identifier: string) {
  const key = phoneLoginKey(identifier);
  const db = createTenantDb(tenantId);
  return db.client.findMany({
    where: {
      OR: [
        { phone: identifier },
        ...(key ? [{ phoneLoginKey: key }] : []),
      ],
    },
  });
}

function preferredClient(clients: LoginClient[], identifier: string) {
  return [...clients].sort((left, right) => {
    if (left.phone === identifier && right.phone !== identifier) return -1;
    if (right.phone === identifier && left.phone !== identifier) return 1;
    if (left.points !== right.points) return right.points - left.points;
    return left.createdAt.getTime() - right.createdAt.getTime();
  })[0];
}

async function mergeDuplicateClients(tenantId: string, primary: LoginClient, clients: LoginClient[]) {
  const duplicates = clients.filter((client) => client.id !== primary.id);
  if (duplicates.length === 0) return primary.id;

  const duplicateIds = duplicates.map((client) => client.id);
  const transferredPoints = duplicates.reduce((total, client) => total + client.points, 0);
  const db = createTenantDb(tenantId);

  await db.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { clientId: { in: duplicateIds } }, data: { clientId: primary.id } });
    await tx.rouletteWin.updateMany({ where: { clientId: { in: duplicateIds } }, data: { clientId: primary.id } });
    await tx.session.deleteMany({ where: { clientId: { in: duplicateIds } } });
    if (transferredPoints > 0) {
      await tx.client.update({ where: { id: primary.id }, data: { points: { increment: transferredPoints } } });
    }
    await tx.client.deleteMany({ where: { id: { in: duplicateIds } } });
  });
  return primary.id;
}

async function activateImportedClients(tenantId: string, clients: LoginClient[], identifier: string, password: string) {
  const primary = preferredClient(clients, identifier);
  if (!primary) return null;

  const db = createTenantDb(tenantId);
  const passwordHash = await hashPassword(password);
  const claimed = await db.$transaction(async (tx) => {
    const result = await tx.client.updateMany({
      where: { id: primary.id, passwordSetupRequired: true },
      data: {
        password: passwordHash,
        passwordSetupRequired: false,
        phoneLoginKey: phoneLoginKey(identifier),
      },
    });
    if (result.count === 1) await tx.session.deleteMany({ where: { clientId: primary.id } });
    return result;
  });

  if (claimed.count === 1) {
    await mergeDuplicateClients(tenantId, primary, clients);
    return primary.id;
  }

  // Si dos solicitudes intentan activar la misma cuenta simultáneamente, solo
  // continúa la que coincida con la contraseña que finalmente quedó guardada.
  const current = await db.client.findUnique({ where: { id: primary.id } });
  if (!current || current.passwordSetupRequired) return null;
  return (await verifyPassword(password, current.password)).valid ? current.id : null;
}

export async function registerClient(formData: FormData) {
  try {
    const ip = await getRequestIp();
    if (!(await consumeRateLimit("client-register", ip, 8, 60 * 60 * 1000))) {
      return { success: false, error: "Demasiados intentos. Probá más tarde." };
    }
    const parsed = z.object({
      phone: phoneSchema,
      password: passwordSchema,
      name: z.string().trim().max(80).optional(),
    }).safeParse({
      phone: formData.get("phone"),
      password: formData.get("password"),
      name: formData.get("name") || undefined,
    });
    if (!parsed.success) return { success: false, error: "Revisá el teléfono y usá una clave de al menos 8 caracteres." };

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);

    const existing = await findClientsByIdentifier(tenant.id, parsed.data.phone);
    if (existing.length > 0 && existing.every((client) => client.passwordSetupRequired)) {
      const clientId = await activateImportedClients(tenant.id, existing as LoginClient[], parsed.data.phone, parsed.data.password);
      if (!clientId) return { success: false, error: "No se pudo activar la cuenta. Intentá nuevamente." };
      await createSession(clientId, tenant.id);
      return { success: true, accountActivated: true };
    }
    if (existing.length > 0) return { success: false, error: "No se pudo crear la cuenta con esos datos." };

    const client = await db.client.create({
      data: {
        phone: parsed.data.phone,
        phoneLoginKey: phoneLoginKey(parsed.data.phone),
        password: await hashPassword(parsed.data.password),
        name: parsed.data.name || undefined,
      },
    });
    await createSession(client.id, tenant.id);
    return { success: true };
  } catch (error) {
    console.error("Auth register error:", error);
    return { success: false, error: "Hubo un error al registrarse." };
  }
}

export async function loginClient(formData: FormData) {
  try {
    const ip = await getRequestIp();
    if (!(await consumeRateLimit("client-login", ip, 10, 15 * 60 * 1000))) {
      return { success: false, error: "Demasiados intentos. Probá en 15 minutos." };
    }
    const parsed = z.object({ phone: loginIdentifierSchema, password: z.string().min(1).max(128) }).safeParse({
      phone: formData.get("phone"),
      password: formData.get("password"),
    });
    if (!parsed.success) return { success: false, error: "Credenciales incorrectas." };

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);

    const clients = await findClientsByIdentifier(tenant.id, parsed.data.phone);
    if (clients.length === 0) return { success: false, error: "Credenciales incorrectas." };

    const activeClients = clients.filter((client) => !client.passwordSetupRequired);
    if (activeClients.length === 0) {
      if (!passwordSchema.safeParse(parsed.data.password).success) {
        return { success: false, error: "Para activar tu cuenta elegí una clave de al menos 8 caracteres." };
      }
      const clientId = await activateImportedClients(tenant.id, clients as LoginClient[], parsed.data.phone, parsed.data.password);
      if (!clientId) return { success: false, error: "No se pudo activar la cuenta. Intentá nuevamente." };
      await createSession(clientId, tenant.id);
      return { success: true, accountActivated: true };
    }

    // Si una variante del mismo número ya fue activada, su contraseña tiene
    // prioridad. Así otra variante pendiente no puede reemplazarla.
    let matchedClient: LoginClient | null = null;
    let matchedLegacyPassword = false;
    for (const candidate of activeClients) {
      const verification = await verifyPassword(parsed.data.password, candidate.password);
      if (verification.valid) {
        matchedClient = candidate as LoginClient;
        matchedLegacyPassword = verification.legacy;
        break;
      }
    }
    if (!matchedClient) return { success: false, error: "Credenciales incorrectas." };
    if (matchedLegacyPassword) {
      await db.client.update({ where: { id: matchedClient.id }, data: { password: await hashPassword(parsed.data.password) } });
    }

    const clientId = await mergeDuplicateClients(tenant.id, matchedClient, clients as LoginClient[]);
    await createSession(clientId, tenant.id);
    return { success: true };
  } catch (error) {
    console.error("Auth login error:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}

export async function logoutClient() {
  await clearSession();
  return { success: true };
}

export async function fetchCurrentClient() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return null;
  const db = createTenantDb(tenant.id);

  const [dbClient, tiers] = await Promise.all([
    db.client.findUnique({
      where: { id: client.id },
      include: {
        customTier: true,
        orders: { where: { status: { not: "CANCELLED" } }, select: { id: true, total: true } },
      },
    }),
    db.customerTier.findMany({ where: { isActive: true }, orderBy: { sequence: "desc" } }),
  ]);

  let clientTier: any = dbClient?.customTier || null;
  if (!clientTier && dbClient && tiers.length > 0) {
    const ordersCount = dbClient.orders.length;
    const totalSpent = dbClient.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    clientTier = tiers.find((t) => {
      const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
      const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
      const meetsPoints = t.minPoints === 0 || dbClient.points >= t.minPoints;
      return meetsOrders && meetsSpent && meetsPoints;
    }) || tiers[tiers.length - 1];
  }

  let tierMultiplier = 1.0;
  let tierDiscountPercent = 0;
  if (clientTier) {
    const unlockedTiers = tiers.filter((t) => t.sequence <= (clientTier.sequence ?? 0));
    tierMultiplier = Math.max(clientTier.pointsMultiplier || 1.0, ...unlockedTiers.map((t) => t.pointsMultiplier || 1.0));
    tierDiscountPercent = Math.max(clientTier.discountPercent || 0, ...unlockedTiers.map((t) => t.discountPercent || 0));
  }

  return {
    id: client.id,
    phone: client.phone,
    name: client.name,
    points: dbClient?.points ?? client.points,
    tier: clientTier ? {
      id: clientTier.id,
      name: clientTier.name,
      badgeText: clientTier.badgeText,
      color: clientTier.color,
      discountPercent: tierDiscountPercent,
      pointsMultiplier: tierMultiplier,
    } : null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}
