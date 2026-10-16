"use server";

import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { hashPassword, createSession } from "@/lib/auth";
import { getRequestIp, consumeRateLimit } from "@/lib/request-security";
import { revalidatePath } from "next/cache";

const digest = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function finishTemporaryPasswordSetup(input: {
  setupToken: string; email: string; password: string;
}) {
  const parsed = z.object({
    setupToken: z.string().regex(/^[a-f0-9]{64}$/),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
  }).safeParse(input);
  if (!parsed.success || parsed.data.password === "12345678") {
    return { success: false as const, error: "Ingresá correo válido y contraseña nueva distinta de la temporal." };
  }
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  if (!await consumeRateLimit("temporary-setup-ip", `${tenant.id}:${ip}`, 8, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados intentos." };
  }
  const record = await prisma.clientRecoveryCode.findFirst({
    where: { tenantId: tenant.id, codeHash: digest(parsed.data.setupToken),
      phoneAtIssue: "PASSWORD_SETUP", usedAt: null, expiresAt: { gt: new Date() } },
    include: { client: true },
  });
  if (!record || !record.client.forcePasswordChange || record.client.email
    || !record.client.temporaryPasswordExpiresAt
    || record.client.temporaryPasswordExpiresAt <= new Date()) {
    return { success: false as const, error: "Acceso temporal vencido. Pedí otro reseteo." };
  }
  const hashed = await hashPassword(parsed.data.password);
  try {
    const changed = await prisma.$transaction(async tx => {
      const duplicate = await tx.client.findFirst({
        where: { tenantId: tenant.id, email: parsed.data.email, id: { not: record.clientId } },
        select: { id: true },
      });
      if (duplicate) return false;
      const claimed = await tx.clientRecoveryCode.updateMany({
        where: { tenantId: tenant.id, id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) return false;
      const updated = await tx.client.updateMany({
        where: { tenantId: tenant.id, id: record.clientId, forcePasswordChange: true,
          email: null, temporaryPasswordExpiresAt: { gt: new Date() } },
        data: { password: hashed, email: parsed.data.email, emailVerifiedAt: null,
          forcePasswordChange: false, temporaryPasswordExpiresAt: null },
      });
      if (updated.count !== 1) throw new Error("RESET_STATE_CHANGED");
      await tx.clientRecoveryCode.deleteMany({ where: { tenantId: tenant.id, clientId: record.clientId } });
      await tx.session.deleteMany({ where: { tenantId: tenant.id, clientId: record.clientId } });
      return true;
    });
    if (!changed) return { success: false as const, error: "Correo ya registrado o acceso temporal vencido." };
    await createSession(record.clientId, tenant.id);
    const { sendEmailVerification } = await import("@/app/actions/client-security");
    const verification = await sendEmailVerification(parsed.data.email).catch(() => ({ success: false }));
    revalidatePath("/profile");
    return {
      success: true as const,
      verificationSent: Boolean(verification.success),
      message: verification.success
        ? "Datos guardados. Verificá el enlace de correo para habilitar la recuperación."
        : "Datos guardados. Podés solicitar la verificación desde Mi Perfil.",
    };
  } catch {
    return { success: false as const, error: "No se pudo completar la activación." };
  }
}
