"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { hashPassword, verifyPassword, createSession, clearSession, getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { cleanPhoneNumber } from "@/lib/phone";
import { normalizeClientLoginIdentifier, isEmailLoginIdentifier } from "@/lib/client-login-identifier";
import { sendEmailVerification } from "@/app/actions/client-security";


const phoneSchema = z.string().trim().regex(/^\+?[0-9]{8,15}$/);
const loginIdentifierSchema = z.string().trim().min(1).max(254);
const passwordSchema = z.string().min(8).max(128);

type LoginClient = {
  id: string;
  phone: string;
  phoneLoginKey: string | null;
  password: string;
  passwordSetupRequired: boolean;
  forcePasswordChange: boolean;
  temporaryPasswordExpiresAt: Date | null;
  name: string | null;
  points: number;
  createdAt: Date;
};

function phoneLoginKey(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-6) : null;
}

async function findClientsByIdentifier(tenantId: string, identifier: string) {
  const db = createTenantDb(tenantId);
  if (isEmailLoginIdentifier(identifier)) {
    return db.client.findMany({
      where: { email: normalizeClientLoginIdentifier(identifier), emailVerifiedAt: { not: null } },
    });
  }
  const cleaned = cleanPhoneNumber(identifier);
  const key = phoneLoginKey(cleaned);
  return db.client.findMany({
    where: {
      OR: [
        { phone: cleaned },
        ...(cleaned !== identifier ? [{ phone: identifier }] : []),
        ...(key ? [{ phoneLoginKey: key }] : []),
      ],
    },
  });
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
    await tx.clientPasskey.updateMany({ where: { clientId: { in: duplicateIds } }, data: { clientId: primary.id } });
    await tx.clientSecurityToken.updateMany({ where: { clientId: { in: duplicateIds } }, data: { clientId: primary.id } });
    if (transferredPoints > 0) {
      await tx.client.update({ where: { id: primary.id }, data: { points: { increment: transferredPoints } } });
    }
    await tx.client.deleteMany({ where: { id: { in: duplicateIds } } });
  });
  return primary.id;
}

export async function registerClient(formData: FormData) {
  try {
    const ip = await getRequestIp();
    if (!(await consumeRateLimit("client-register", ip, 8, 60 * 60 * 1000))) {
      return { success: false, error: "Demasiados intentos. Probá más tarde." };
    }
    const rawPhone = String(formData.get("phone") || "");
    const cleanedPhone = cleanPhoneNumber(rawPhone);
    const parsed = z.object({
      phone: phoneSchema,
      password: passwordSchema,
      email: z.string().trim().toLowerCase().email().max(254),
      name: z.string().trim().max(80).optional(),
    }).safeParse({
      phone: cleanedPhone,
      password: formData.get("password"),
      email: formData.get("email"),
      name: formData.get("name") || undefined,
    });
    if (!parsed.success) return { success: false, error: "Ingresá teléfono, correo válido y clave de al menos 8 caracteres." };

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);

    const existingEmail = await db.client.findFirst({ where: { email: parsed.data.email } });
    if (existingEmail && existingEmail.phone !== parsed.data.phone) return { success: false, error: "Ese correo ya pertenece a otra cuenta del comercio." };
    const existing = await findClientsByIdentifier(tenant.id, parsed.data.phone);
    // No permitir apropiación de cuentas importadas con solo conocer el teléfono.
    // Para cuentas sin correo, el comercio debe verificar la identidad y emitir
    // un código personal de recuperación, de un solo uso.
    if (existing.length > 0) {
      return {
        success: false,
        error: "Este número de teléfono ya está registrado. Ingresá con tu contraseña o recuperala.",
        code: "PHONE_EXISTS",
      };
    }

    const client = await db.client.create({
      data: {
        phone: parsed.data.phone,
        phoneLoginKey: phoneLoginKey(parsed.data.phone),
        password: await hashPassword(parsed.data.password),
        name: parsed.data.name || undefined,
        email: parsed.data.email,
      },
    });
    await createSession(client.id, tenant.id);
    const verification = await sendEmailVerification(parsed.data.email);
    return { success: true, verificationSent: verification.success };
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
    const rawIdentifier = String(formData.get("identifier") || formData.get("phone") || "");
    const identifier = normalizeClientLoginIdentifier(rawIdentifier);
    const parsed = z.object({ phone: loginIdentifierSchema, password: z.string().min(1).max(128) }).safeParse({
      phone: identifier,
      password: formData.get("password"),
    });
    if (!parsed.success || (isEmailLoginIdentifier(parsed.data.phone) &&
      !z.string().email().safeParse(parsed.data.phone).success)) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);

    const clients = await findClientsByIdentifier(tenant.id, parsed.data.phone);
    if (clients.length === 0) return { success: false, error: "Credenciales incorrectas." };

    const activeClients = clients.filter((client) => !client.passwordSetupRequired);
    if (activeClients.length === 0) {
      return {
        success: false,
        error: "Esta cuenta requiere activación. Si no tenés correo, solicitá el reseteo al comercio desde «¿Olvidaste tu clave?».",
      };
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
    if (matchedClient.forcePasswordChange) {
      if (!matchedClient.temporaryPasswordExpiresAt ||
        matchedClient.temporaryPasswordExpiresAt <= new Date()) {
        return { success: false, error: "La clave temporal venció. Solicitá un nuevo reseteo al comercio." };
      }
      // No crear una sesión normal con contraseña temporal.
      // Este permiso sirve ÚNICAMENTE para definir email y clave definitiva.
      const setupToken = crypto.randomBytes(32).toString("hex");
      await prisma.clientRecoveryCode.deleteMany({
        where: { tenantId: tenant.id, clientId: matchedClient.id, phoneAtIssue: "PASSWORD_SETUP" },
      });
      await prisma.clientRecoveryCode.create({
        data: {
          tenantId: tenant.id, clientId: matchedClient.id, phoneAtIssue: "PASSWORD_SETUP",
          codeHash: crypto.createHash("sha256").update(setupToken).digest("hex"),
          expiresAt: new Date(Date.now() + 20 * 60_000),
        },
      });
      return { success: true, requiresSetup: true, setupToken };
    }
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
    email: client.email,
    emailVerified: Boolean(client.emailVerifiedAt),
    dniProvided: Boolean(client.dniProvidedAt),
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
