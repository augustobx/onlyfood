"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-context";
import { requireAdmin } from "@/lib/admin-session";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { sendSecurityEmail } from "@/lib/security-email";
import { saveTenantIntegration, getTenantIntegration, type EmailCredentials } from "@/lib/tenant-integrations";
import { isTenantEmailConfigured } from "@/lib/tenant-email";

const safeText = z.string().trim().min(1).max(254).refine(value => !/[\r\n]/.test(value));
const optionalText = z.string().trim().max(254).refine(value => !/[\r\n]/.test(value));
const emailAddress = z.string().trim().email().max(254);
const schema = z.object({
  provider: z.enum(["SMTP", "RESEND", "BREVO"]),
  smtpHost: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/).max(253),
  smtpPort: z.union([z.literal(465), z.literal(587)]),
  smtpUser: optionalText,
  smtpFrom: safeText.refine(value => {
    const address = value.match(/<([^<>]+)>$/)?.[1] || value;
    return emailAddress.safeParse(address).success;
  }, "Ingresá un remitente válido."),
  smtpPass: z.string().max(500).optional(),
  resendApiKey: z.string().max(500).optional(),
  brevoApiKey: z.string().max(500).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.provider === "SMTP" && !value.smtpUser) {
    ctx.addIssue({ code: "custom", path: ["smtpUser"], message: "Ingresá el usuario de la casilla SMTP del comercio." });
  }
});

export async function saveTenantEmailSettings(input: unknown) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Datos de correo inválidos." };
  const { smtpPass, resendApiKey, brevoApiKey, ...visible } = parsed.data;
  const tenant = await getTenantContext();
  const previous = await getTenantIntegration<EmailCredentials>(tenant.id, "EMAIL");
  const next: EmailCredentials = {
    ...visible,
    smtpPass: smtpPass?.trim() || previous?.smtpPass || "",
    resendApiKey: resendApiKey?.trim() || previous?.resendApiKey || "",
    brevoApiKey: brevoApiKey?.trim() || previous?.brevoApiKey || "",
  };

  await saveTenantIntegration(tenant.id, "EMAIL", next);
  revalidatePath("/admin/settings");
  return { success: true as const, configured: await isTenantEmailConfigured(tenant.id) };
}

export async function sendTenantEmailTest(toInput: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsed = emailAddress.safeParse(toInput);
  if (!parsed.success) return { success: false as const, error: "Ingresá un correo electrónico válido." };
  const tenant = await getTenantContext();
  const ip = await getRequestIp();
  if (!await consumeRateLimit("email-test", `${tenant.id}:${ip}`, 4, 60 * 60_000)) {
    return { success: false as const, error: "Demasiadas pruebas. Probá más tarde." };
  }
  if (!await isTenantEmailConfigured(tenant.id)) {
    return { success: false as const, error: "Completá primero la configuración y la contraseña o clave API." };
  }
  const ok = await sendSecurityEmail(parsed.data, "Prueba de correo - OnlyFood",
    `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;color:#1e293b">
      <h1>OnlyFood</h1><h2>¡Prueba de correo exitosa!</h2>
      <p>El sistema de email del comercio aceptó la solicitud de envío de este mensaje.</p>
      <p>Los correos de verificación y recuperación usan esta misma configuración.</p>
      <small>NanoLabs · OnlyFood</small></div>`, tenant.id);
  return ok
    ? { success: true as const, message: "El proveedor aceptó el correo. Revisá la bandeja de entrada." }
    : { success: false as const, error: "No se pudo enviar. Revisá servidor, certificado TLS y credenciales." };
}
