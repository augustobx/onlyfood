"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { cleanPhoneNumber, getCanonicalPhone } from "@/lib/phone";
import { getTenantIntegration, type WhatsAppCredentials } from "@/lib/tenant-integrations";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp-message-utils";
import {
  RECOVERY_CODE_TTL_MINUTES,
  isAssistedRecoveryValid,
  normalizeRecoveryCode,
} from "@/lib/client-recovery-policy";

const idSchema = z.string().uuid();
const recoverSchema = z.object({
  phone: z.string().trim().min(8).max(32),
  code: z.string().trim().min(8).max(24),
}).strict();
const INVALID = "Teléfono o código incorrecto, vencido o ya utilizado.";

/**
 * Solo administrador; el código no es una contraseña ni se guarda en claro.
 * El comercio DEBE validar la identidad del titular por un canal confiable
 * antes de entregarlo. Nunca se publica para cualquier usuario.
 */
export async function issueAssistedClientRecoveryCode(clientIdInput: string, identityChecked: boolean) {
  await requireAdmin(["OWNER", "MANAGER"]);
  if (identityChecked !== true) {
    return { success: false as const, error: "Confirmá primero que verificaste la identidad del cliente." };
  }
  const tenant = await getTenantContext();
  const parsed = idSchema.safeParse(clientIdInput);
  if (!parsed.success) return { success: false as const, error: "Cliente inválido." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("admin-assisted-recovery", `${tenant.id}:${parsed.data}:${ip}`, 3, 60 * 60_000)) {
    return { success: false as const, error: "Límite de 3 códigos por hora para este cliente." };
  }
  const client = await prisma.client.findFirst({
    where: { id: parsed.data, tenantId: tenant.id, email: null },
    select: { id: true, phone: true },
  });
  if (!client) return {
    success: false as const,
    error: "Esta recuperación solo está disponible para clientes sin correo. Con correo usá el enlace de email.",
  };
  const code = crypto.randomBytes(8).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + RECOVERY_CODE_TTL_MINUTES * 60_000);
  await prisma.$transaction(async tx => {
    await tx.clientRecoveryCode.deleteMany({
      where: { tenantId: tenant.id, clientId: client.id },
    });
    await tx.clientRecoveryCode.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        phoneAtIssue: client.phone,
        codeHash: crypto.createHash("sha256").update(code).digest("hex"),
        expiresAt,
      },
    });
  });
  return { success: true as const, code, expiresAt: expiresAt.toISOString() };
}

/** Para el cliente: ingresar celular + código personal para iniciar sesión UNA sola vez. */
/**
 * Recovery sin intervención humana: genera un OTP y lo entrega al WhatsApp
 * registrado del cliente mediante plantilla AUTHENTICATION aprobada.
 * JAMÁS entrega el secreto al navegador ni acepta un token sin envío externo.
 */
export async function requestAutomaticClientRecovery(phoneInput: string, consent: boolean) {
  const tenant = await getTenantContext();
  if (consent !== true) {
    return { success: false as const, error: "Confirmá que aceptás recibir el código por WhatsApp." };
  }
  const normalized = cleanPhoneNumber(phoneInput);
  if (!/^\+?[0-9]{8,15}$/.test(normalized)) {
    return { success: false as const, error: "Ingresá un teléfono válido." };
  }
  const ip = await getRequestIp();
  if (!await consumeRateLimit("wa-otp-ip", `${tenant.id}:${ip}`, 12, 60 * 60_000)
    || !await consumeRateLimit("wa-otp-phone", `${tenant.id}:${getCanonicalPhone(normalized)}`, 3, 60 * 60_000)) {
    return { success: false as const, error: "Demasiadas solicitudes. Intentá más tarde." };
  }
  const creds = await getTenantIntegration<WhatsAppCredentials>(tenant.id, "WHATSAPP");
  if (!creds?.apiToken || !creds.phoneNumberId) {
    return { success: false as const, error: "La recuperación por WhatsApp aún no está configurada en este comercio." };
  }
  const generic = {
    success: true as const,
    message: "Si existe una cuenta sin correo con ese número, recibirás un código por WhatsApp.",
  };
  // El teléfono debe identificar UN SOLO cliente. Nunca elegir ambiguamente
  // entre cuentas duplicadas, ya que podría vincular pedidos de otras personas.
  const digits = normalized.replace(/\D/g, "");
  const lastSix = digits.slice(-6);
  const candidates = await prisma.client.findMany({
    where: {
      tenantId: tenant.id,
      email: null,
      OR: [
        { phone: normalized },
        { phoneLoginKey: lastSix },
      ],
    },
    select: { id: true, phone: true, email: true },
  });
  const canonical = getCanonicalPhone(normalized);
  const matching = candidates.filter(c => getCanonicalPhone(c.phone) === canonical);
  if (matching.length !== 1) return generic;

  const config = await prisma.systemConfig.findFirst({
    where: { tenantId: tenant.id },
    select: { whatsappDefaultCountryCode: true, whatsappTemplateLanguage: true },
  });
  const to = normalizeWhatsAppRecipient(matching[0].phone, config?.whatsappDefaultCountryCode || "549");
  if (!to) return generic;

  const code = crypto.randomInt(0, 100_000_000).toString().padStart(8, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const record = await prisma.clientRecoveryCode.create({
    data: {
      tenantId: tenant.id, clientId: matching[0].id, phoneAtIssue: matching[0].phone, codeHash,
      expiresAt: new Date(Date.now() + RECOVERY_CODE_TTL_MINUTES * 60_000),
    },
  });
  try {
    const apiVersion = /^v\d{1,2}\.\d$/.test(creds.apiVersion || "")
      ? creds.apiVersion!
      : "v23.0";
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "onlyfood_login_code",
          language: { code: config?.whatsappTemplateLanguage || "es_AR" },
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({})) as { messages?: Array<{id?: string}> };
    if (!response.ok || !result.messages?.[0]?.id) throw new Error("AUTH_TEMPLATE_SEND_FAILED");
    // Invalidar anteriores solo tras confirmar que Meta aceptó el mensaje.
    await prisma.clientRecoveryCode.deleteMany({
      where: { tenantId: tenant.id, clientId: matching[0].id, id: { not: record.id } },
    });
    return generic;
  } catch (error) {
    await prisma.clientRecoveryCode.deleteMany({ where: { id: record.id, tenantId: tenant.id } });
    console.error("Automatic recovery delivery error", { tenantId: tenant.id, error: error instanceof Error ? error.message : "unknown" });
    return { success: false as const, error: "No pudimos enviar el código por WhatsApp. Revisá que el comercio tenga activa la plantilla de autenticación." };
  }
}

export async function loginWithAssistedRecoveryCode(input: unknown) {
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: INVALID };
  const tenant = await getTenantContext();
  const phone = cleanPhoneNumber(parsed.data.phone);
  const code = normalizeRecoveryCode(parsed.data.code);
  if (!/^\+?[0-9]{8,15}$/.test(phone) || !/^([0-9]{8}|[A-F0-9]{16})$/.test(code)) {
    return { success: false as const, error: INVALID };
  }
  const ip = await getRequestIp();
  if (!await consumeRateLimit("assisted-recovery-ip", `${tenant.id}:${ip}`, 8, 15 * 60_000)
      || !await consumeRateLimit("assisted-recovery-phone", `${tenant.id}:${phone}`, 8, 15 * 60_000)) {
    return { success: false as const, error: "Demasiados intentos. Probá más tarde." };
  }
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const record = await prisma.clientRecoveryCode.findFirst({
    where: { tenantId: tenant.id, codeHash },
    include: { client: true },
  });
  if (!record || !isAssistedRecoveryValid(record.client, record, new Date())
      || cleanPhoneNumber(record.phoneAtIssue) !== phone) {
    return { success: false as const, error: INVALID };
  }
  // Consume una sola vez, atómicamente, antes de emitir la sesión.
  const redeemed = await prisma.$transaction(async tx => {
    const client = await tx.client.findFirst({
      where: { id: record.clientId, tenantId: tenant.id, email: null, phone: record.phoneAtIssue },
      select: { id: true },
    });
    if (!client) return false;
    const claim = await tx.clientRecoveryCode.updateMany({
      where: { id: record.id, tenantId: tenant.id, codeHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return claim.count === 1;
  });
  if (!redeemed) return { success: false as const, error: INVALID };
  await createSession(record.clientId, tenant.id);
  return { success: true as const };
}
