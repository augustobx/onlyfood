"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient, hashPassword } from "@/lib/auth";
import { getRequestIp, getRequestOrigin, consumeRateLimit } from "@/lib/request-security";
import { sendSecurityEmail } from "@/lib/security-email";
import { requireAdmin } from "@/lib/admin-session";
import { canRecoverByEmail } from "@/lib/client-account-policy";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const genericMessage = "Si existe una cuenta con ese correo verificado, recibirás un enlace para restablecer la contraseña.";

function tokenDigest(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

async function issueToken(tenantId: string, clientId: string, email: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD", ttlMinutes: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const row = await prisma.clientSecurityToken.create({
    data: {
      tenantId, clientId, purpose, email, tokenHash: tokenDigest(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return { token, id: row.id };
}

async function deliverClientVerification(tenantId: string, tenantName: string, clientId: string, email: string) {
  await prisma.clientSecurityToken.deleteMany({
    where: { tenantId, clientId, purpose: "VERIFY_EMAIL", usedAt: null },
  });
  const record = await issueToken(tenantId, clientId, email, "VERIFY_EMAIL", 60);
  try {
    const origin = await getRequestOrigin();
    const href = `${origin}/verify-email?token=${encodeURIComponent(record.token)}`;
    const ok = await sendSecurityEmail(email, `Verificá tu correo - ${tenantName}`,
      `<p>Confirmá tu correo para recuperar tu acceso a ${escapeHtml(tenantName)}.</p><p><a href="${href}">Verificar correo</a></p><p>El enlace vence en 60 minutos. Si no lo solicitaste, ignorá este mensaje.</p>`, tenantId);
    if (ok) return { success: true as const };
  } catch (error) {
    console.error("Client email verification delivery failed", { tenantId, error });
  }
  await prisma.clientSecurityToken.deleteMany({ where: { id: record.id, tenantId } });
  return { success: false as const, error: "No se pudo enviar el correo. Revisá SMTP o proveedor." };
}

/**
 * Permite invitar por email a los clientes históricos que no podían validar
 * el correo desde la tienda. El propietario del buzón confirma el enlace.
 * No se autentica al cliente ni se establece contraseña desde este endpoint.
 */
export async function sendAdminClientEmailVerification(clientIdInput: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const id = z.string().uuid().safeParse(clientIdInput);
  if (!id.success) return { success: false as const, error: "Cliente inválido." };
  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, id: id.data },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!client) return { success: false as const, error: "El cliente no pertenece al comercio." };
  if (!client.email) return { success: false as const, error: "Primero ingresá un correo en Editar cuenta." };
  if (client.emailVerifiedAt) return { success: true as const, message: "El correo ya está verificado." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("admin-email-verification", `${tenant.id}:${client.id}:${ip}`, 3, 60 * 60_000))
    return { success: false as const, error: "Límite de envíos para este cliente. Intentá más tarde." };
  const existing = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: client.email, id: { not: client.id } },
    select: { id: true },
  });
  if (existing) return { success: false as const, error: "Ese correo ya está asociado a otro cliente." };
  const result = await deliverClientVerification(tenant.id, tenant.name, client.id, client.email);
  return result.success
    ? { success: true as const, message: "Enlace de verificación enviado. El cliente debe confirmar el correo." }
    : { success: false as const, error: result.error };
}

export async function sendEmailVerification(emailInput?: string) {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false, error: "Iniciá sesión para verificar tu correo." };
  const email = emailSchema.safeParse(emailInput || client.email || "");
  if (!email.success) return { success: false, error: "Ingresá un correo válido." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-email-verification", `${tenant.id}:${client.id}:${ip}`, 3, 60 * 60_000))
    return { success: false, error: "Demasiados intentos. Probá más tarde." };

  const existing = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: email.data, id: { not: client.id } },
    select: { id: true },
  });
  if (existing) return { success: false, error: "Este correo ya está vinculado a otra cuenta." };
  if (client.email === email.data && client.emailVerifiedAt) {
    return { success: true, message: "Tu correo ya está verificado." };
  }

  const delivery = await deliverClientVerification(tenant.id, tenant.name, client.id, email.data);
  if (!delivery.success) return { success: false, error: delivery.error };

  // Para clientes históricos sin correo, registrar el email recibido como
  // PENDIENTE DE VERIFICACIÓN. El login por email y el reset requieren confirmar.
  // Si ya existe un correo verificado distinto, NO sustituirlo antes de la prueba.
  if (!client.emailVerifiedAt && client.email !== email.data) {
    try {
      const updated = await prisma.client.updateMany({
        where: { id: client.id, tenantId: tenant.id, emailVerifiedAt: null },
        data: { email: email.data, emailVerifiedAt: null },
      });
      if (updated.count !== 1) throw new Error("CLIENT_EMAIL_CHANGED");
    } catch {
      await prisma.clientSecurityToken.deleteMany({
        where: { tenantId: tenant.id, clientId: client.id, purpose: "VERIFY_EMAIL", usedAt: null },
      });
      return { success: false, error: "No se pudo asociar el correo. Comprobá que no esté registrado por otra cuenta." };
    }
  }
  return { success: true, message: "Guardamos tu correo como pendiente. Confirmá el enlace recibido para ingresar por email y recuperar tu contraseña." };
}

export async function confirmClientEmailToken(tokenInput: string) {
  const parsed = z.string().regex(/^[a-f0-9]{64}$/).safeParse(tokenInput);
  if (!parsed.success) return { success: false, error: "Enlace inválido." };
  const tenant = await getTenantContext();
  const record = await prisma.clientSecurityToken.findFirst({
    where: { tenantId: tenant.id, tokenHash: tokenDigest(parsed.data), purpose: "VERIFY_EMAIL", usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) return { success: false, error: "Enlace vencido o utilizado." };
  try {
    const applied = await prisma.$transaction(async tx => {
      const claimed = await tx.clientSecurityToken.updateMany({
        where: { id: record.id, tenantId: tenant.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) return false;
      const updated = await tx.client.updateMany({
        where: { id: record.clientId, tenantId: tenant.id },
        data: { email: record.email, emailVerifiedAt: new Date() },
      });
      if (updated.count === 1) {
        await tx.clientRecoveryCode.deleteMany({
          where: { tenantId: tenant.id, clientId: record.clientId },
        });
        // Nunca aceptar enlaces de recuperación destinados a un correo anterior.
        await tx.clientSecurityToken.deleteMany({
          where: { tenantId: tenant.id, clientId: record.clientId, id: { not: record.id } },
        });
      }
      return updated.count === 1;
    });
    return applied ? { success: true } : { success: false, error: "El enlace ya fue utilizado." };
  } catch {
    return { success: false, error: "No se pudo verificar este correo. Revisá que no esté vinculado a otra cuenta." };
  }
}

async function deliverClientPasswordReset(tenantId: string, tenantName: string, clientId: string, email: string) {
  const record = await issueToken(tenantId, clientId, email, "RESET_PASSWORD", 30);
  try {
    const href = `${await getRequestOrigin()}/reset-password?token=${encodeURIComponent(record.token)}`;
    const ok = await sendSecurityEmail(email, `Recuperá tu contraseña - ${tenantName}`,
      `<p>Recibimos una solicitud para restablecer tu contraseña de ${escapeHtml(tenantName)}.</p><p><a href="${href}">Crear nueva contraseña</a></p><p>Enlace válido por 30 minutos. Si no lo solicitaste, ignorá este correo.</p>`, tenantId);
    if (ok) return true;
  } catch (error) {
    console.error("Password reset email delivery failed", { tenantId, error });
  }
  await prisma.clientSecurityToken.deleteMany({ where: { id: record.id, tenantId } });
  return false;
}

/** El admin solicita la recuperación; nunca define ni restablece una clave en nombre del cliente. */
export async function sendAdminClientPasswordReset(clientIdInput: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const parsed = z.string().uuid().safeParse(clientIdInput);
  if (!parsed.success) return { success: false as const, error: "Cliente inválido." };
  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, id: parsed.data },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!client) return { success: false as const, error: "No existe el cliente en este comercio." };
  if (!canRecoverByEmail(client)) {
    return { success: false as const, error: "Primero cargá y verificá el correo de este cliente." };
  }
  const ip = await getRequestIp();
  if (!await consumeRateLimit("admin-client-password-recovery", `${tenant.id}:${client.id}:${ip}`, 3, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados correos para este cliente." };
  }
  const ok = await deliverClientPasswordReset(tenant.id, tenant.name, client.id, client.email!);
  return ok
    ? { success: true as const, message: "Correo de recuperación enviado al cliente. Solo él puede definir su nueva contraseña." }
    : { success: false as const, error: "No se pudo enviar el correo de recuperación." };
}

export async function requestClientPasswordReset(emailInput: string) {
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-password-reset", `${tenant.id}:${ip}`, 5, 60 * 60_000))
    return { success: true, message: genericMessage };
  const email = emailSchema.safeParse(emailInput);
  if (!email.success) return { success: true, message: genericMessage };
  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: email.data, emailVerifiedAt: { not: null } },
    select: { id: true, email: true },
  });
  if (!client?.email) return { success: true, message: genericMessage };

  await deliverClientPasswordReset(tenant.id, tenant.name, client.id, client.email);
  return { success: true, message: genericMessage };
}

export async function resetClientPasswordWithToken(tokenInput: string, passwordInput: string) {
  const token = z.string().regex(/^[a-f0-9]{64}$/).safeParse(tokenInput);
  const password = passwordSchema.safeParse(passwordInput);
  if (!token.success || !password.success) return { success: false, error: "Enlace inválido o clave menor a 8 caracteres." };
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-reset-consume", `${tenant.id}:${ip}`, 10, 15 * 60_000))
    return { success: false, error: "Demasiados intentos." };
  const digest = tokenDigest(token.data);
  const entry = await prisma.clientSecurityToken.findFirst({
    where: { tenantId: tenant.id, tokenHash: digest, purpose: "RESET_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!entry) return { success: false, error: "Enlace vencido o utilizado." };
  const hash = await hashPassword(password.data);
  const changed = await prisma.$transaction(async tx => {
    const claim = await tx.clientSecurityToken.updateMany({
      where: { id: entry.id, tenantId: tenant.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) return false;
    const changedAccount = await tx.client.updateMany({
      where: { id: entry.clientId, tenantId: tenant.id, email: entry.email, emailVerifiedAt: { not: null } },
      data: { password: hash, passwordSetupRequired: false },
    });
    if (changedAccount.count !== 1) throw new Error("ACCOUNT_CHANGED");
    await tx.session.deleteMany({ where: { tenantId: tenant.id, clientId: entry.clientId } });
    await tx.clientSecurityToken.deleteMany({
      where: { tenantId: tenant.id, clientId: entry.clientId, purpose: "RESET_PASSWORD", id: { not: entry.id } },
    });
    return true;
  });
  return changed ? { success: true } : { success: false, error: "Enlace vencido o utilizado." };
}
