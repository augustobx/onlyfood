"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient, hashPassword } from "@/lib/auth";
import { getRequestIp, getRequestOrigin, consumeRateLimit } from "@/lib/request-security";
import { sendSecurityEmail } from "@/lib/security-email";

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

  const record = await issueToken(tenant.id, client.id, email.data, "VERIFY_EMAIL", 60);
  const origin = await getRequestOrigin();
  const href = `${origin}/verify-email?token=${encodeURIComponent(record.token)}`;
  const ok = await sendSecurityEmail(email.data, `Verificá tu correo - ${tenant.name}`,
    `<p>Confirmá tu correo para recuperar tu acceso a ${escapeHtml(tenant.name)}.</p><p><a href="${href}">Verificar correo</a></p><p>El enlace vence en 60 minutos. Si no lo solicitaste, ignorá este mensaje.</p>`);
  if (!ok) {
    await prisma.clientSecurityToken.deleteMany({ where: { id: record.id, tenantId: tenant.id } });
    return { success: false, error: "No se pudo enviar el mensaje. El comercio debe configurar Resend o Brevo." };
  }
  return { success: true, message: "Revisá tu correo para confirmar la dirección." };
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
      return updated.count === 1;
    });
    return applied ? { success: true } : { success: false, error: "El enlace ya fue utilizado." };
  } catch {
    return { success: false, error: "No se pudo verificar este correo. Revisá que no esté vinculado a otra cuenta." };
  }
}

export async function requestClientPasswordReset(emailInput: string) {
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-password-reset", `${tenant.id}:${ip}`, 5, 60 * 60_000))
    return { success: true, message: genericMessage };
  const email = emailSchema.safeParse(emailInput);
  if (!email.success) return { success: true, message: genericMessage };
  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: email.data, emailVerifiedAt: { not: null }, passwordSetupRequired: false },
    select: { id: true, email: true },
  });
  if (!client?.email) return { success: true, message: genericMessage };

  const record = await issueToken(tenant.id, client.id, client.email, "RESET_PASSWORD", 30);
  const href = `${await getRequestOrigin()}/reset-password?token=${encodeURIComponent(record.token)}`;
  const ok = await sendSecurityEmail(client.email, `Recuperá tu contraseña - ${tenant.name}`,
    `<p>Recibimos una solicitud para restablecer tu contraseña de ${escapeHtml(tenant.name)}.</p><p><a href="${href}">Crear nueva contraseña</a></p><p>Enlace válido por 30 minutos. Si no lo solicitaste, ignorá este correo.</p>`);
  if (!ok) {
    await prisma.clientSecurityToken.deleteMany({ where: { id: record.id, tenantId: tenant.id } });
    console.error("Password reset email could not be delivered", tenant.id);
  }
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
