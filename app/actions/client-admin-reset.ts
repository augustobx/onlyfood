"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant-context";
import { requireAdmin } from "@/lib/admin-session";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { cleanPhoneNumber, getCanonicalPhone } from "@/lib/phone";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp-message-utils";
import { revalidatePath } from "next/cache";

const TEMP_PASSWORD = "12345678";


/** Conteo para la campanita global. Solo OWNER/MANAGER del tenant actual. */
export async function getPendingClientPasswordResetCount() {
  try {
    await requireAdmin(["OWNER", "MANAGER"]);
    const tenant = await getTenantContext();
    return await prisma.clientPasswordResetRequest.count({
      where: { tenantId: tenant.id, status: "PENDING" },
    });
  } catch {
    return 0;
  }
}

export async function requestClientAdminPasswordReset(input: { name: string; phone: string }) {
  const data = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(8).max(32),
  }).safeParse(input);
  if (!data.success) return { success: false as const, error: "Ingresá nombre y teléfono registrados." };
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  const phone = cleanPhoneNumber(data.data.phone);
  if (!/^\+?[0-9]{8,15}$/.test(phone))
    return { success: false as const, error: "Teléfono inválido." };
  if (!await consumeRateLimit("client-admin-reset-ip", `${tenant.id}:${ip}`, 8, 60 * 60_000)
    || !await consumeRateLimit("client-admin-reset-phone", `${tenant.id}:${getCanonicalPhone(phone)}`, 3, 60 * 60_000))
    return { success: false as const, error: "Demasiados intentos." };

  const candidates = await prisma.client.findMany({
    where: {
      tenantId: tenant.id,
      OR: [{ phone }, { phoneLoginKey: phone.replace(/\D/g, "").slice(-6) }],
    },
    select: { id: true, phone: true, email: true },
  });
  const matches = candidates.filter(c => getCanonicalPhone(c.phone) === getCanonicalPhone(phone));
  let requestId: string | null = null;
  if (matches.length === 1 && !matches[0].email) {
    const prior = await prisma.clientPasswordResetRequest.findFirst({
      where: { tenantId: tenant.id, clientId: matches[0].id, status: "PENDING" },
      select: { id: true },
    });
    if (prior) requestId = prior.id;
    else requestId = (await prisma.clientPasswordResetRequest.create({
      data: { tenantId: tenant.id, clientId: matches[0].id, claimedName: data.data.name },
      select: { id: true },
    })).id;
  }
  const config = await prisma.systemConfig.findFirst({
    where: { tenantId: tenant.id },
    select: { passwordResetWhatsAppPhone: true, whatsappDefaultCountryCode: true },
  });
  const location = await prisma.location.findFirst({
    where: { tenantId: tenant.id, isActive: true, phone: { not: null } },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    select: { phone: true },
  });
  const phoneDestination = config?.passwordResetWhatsAppPhone?.trim() || location?.phone || "";
  const destination = phoneDestination
    ? normalizeWhatsAppRecipient(phoneDestination, config?.whatsappDefaultCountryCode || "549")
    : null;
  const message = [
    `Hola ${tenant.name}, solicito recuperar mi clave de la tienda.`,
    `Nombre: ${data.data.name}`,
    `Teléfono: ${phone}`,
    ...(requestId ? [`Solicitud: ${requestId.slice(0, 8).toUpperCase()}`] : []),
    "Por favor, avísenme cuando puedan restablecer mi acceso.",
  ].join("\n");
  revalidatePath("/admin/users");
  return {
    success: true as const,
    message: "Registramos tu solicitud si tu cuenta no tiene correo. Contactá al comercio.",
    whatsappUrl: destination ? `https://wa.me/${destination}?text=${encodeURIComponent(message)}` : null,
  };
}

export async function approveClientPasswordResetRequest(input: string, identityChecked: boolean) {
  if (identityChecked !== true) return { success: false as const, error: "Confirmá que verificaste la identidad del solicitante." };
  await requireAdmin(["OWNER", "MANAGER"]);
  const id = z.string().uuid().safeParse(input);
  if (!id.success) return { success: false as const, error: "Solicitud inválida." };
  const tenant = await getTenantContext();
  const hash = await hashPassword(TEMP_PASSWORD);
  try {
    const approved = await prisma.$transaction(async tx => {
      const request = await tx.clientPasswordResetRequest.findFirst({
        where: { tenantId: tenant.id, id: id.data, status: "PENDING" },
        include: { client: { select: { email: true, phone: true, name: true } } },
      });
      if (!request || request.client.email) return false;
      const claim = await tx.clientPasswordResetRequest.updateMany({
        where: { id: request.id, tenantId: tenant.id, status: "PENDING" },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      if (claim.count !== 1) return false;
      const changed = await tx.client.updateMany({
        where: { id: request.clientId, tenantId: tenant.id, email: null },
        data: {
          password: hash, forcePasswordChange: true, passwordSetupRequired: false,
          temporaryPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        },
      });
      if (changed.count !== 1) throw new Error("ACCOUNT_CHANGED");
      await tx.session.deleteMany({ where: { tenantId: tenant.id, clientId: request.clientId } });
      await tx.clientRecoveryCode.deleteMany({ where: { tenantId: tenant.id, clientId: request.clientId } });
      await tx.clientPasskey.deleteMany({ where: { tenantId: tenant.id, clientId: request.clientId } });
      await tx.clientSecurityToken.deleteMany({ where: { tenantId: tenant.id, clientId: request.clientId } });
      return { phone: request.client.phone, name: request.client.name };
    });
    revalidatePath("/admin/users");
    if (!approved) {
      return { success: false as const, error: "Solicitud ya procesada o cuenta con correo." };
    }
    const config = await prisma.systemConfig.findFirst({
      where: { tenantId: tenant.id },
      select: { whatsappDefaultCountryCode: true },
    });
    const recipient = normalizeWhatsAppRecipient(
      approved.phone, config?.whatsappDefaultCountryCode || "549",
    );
    const text = [
      `Hola ${approved.name || "cliente"}, reseteamos tu clave de ${tenant.name}.`,
      "Ingresá con tu teléfono y la clave temporal: 12345678.",
      "Recordá agregar tu correo y crear una contraseña nueva para gestionar",
      "la recuperación automática de tu cuenta.",
      "La clave temporal vence en 24 horas y se desactiva al crear tu nueva contraseña.",
    ].join(" ");
    const whatsappUrl = recipient
      ? `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`
      : null;
    return {
      success: true as const,
      message: "Clave 12345678 habilitada por 24 horas. El cliente debe registrar correo y contraseña nueva.",
      whatsappUrl,
    };
  } catch {
    return { success: false as const, error: "No se pudo aprobar la solicitud." };
  }
}

export async function rejectClientPasswordResetRequest(input: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const id = z.string().uuid().safeParse(input);
  if (!id.success) return { success: false as const, error: "Solicitud inválida." };
  const tenant = await getTenantContext();
  const updated = await prisma.clientPasswordResetRequest.updateMany({
    where: { id: id.data, tenantId: tenant.id, status: "PENDING" },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });
  revalidatePath("/admin/users");
  return updated.count === 1
    ? { success: true as const }
    : { success: false as const, error: "Solicitud ya procesada." };
}
