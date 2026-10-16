"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { cleanPhoneNumber } from "@/lib/phone";
import {
  RECOVERY_CODE_TTL_MINUTES,
  isAssistedRecoveryValid,
  normalizeRecoveryCode,
} from "@/lib/client-recovery-policy";

const idSchema = z.string().uuid();
const recoverSchema = z.object({
  phone: z.string().trim().min(8).max(32),
  code: z.string().trim().min(16).max(24),
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
export async function loginWithAssistedRecoveryCode(input: unknown) {
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: INVALID };
  const tenant = await getTenantContext();
  const phone = cleanPhoneNumber(parsed.data.phone);
  const code = normalizeRecoveryCode(parsed.data.code);
  if (!/^\+?[0-9]{8,15}$/.test(phone) || !/^[A-F0-9]{16}$/.test(code)) {
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
