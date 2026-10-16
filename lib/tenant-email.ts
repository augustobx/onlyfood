import "server-only";

import { ONLYPADEL_SMTP_DEFAULTS, type EmailTransportSettings, isEmailTransportReady, publicEmailTransportSettings } from "@/lib/email-configuration";
import { getTenantIntegration, type EmailCredentials } from "@/lib/tenant-integrations";

/** Env vars apply to all tenants when they have no own encrypted integration. */
export function getEnvironmentEmailSettings(): EmailTransportSettings {
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
  const provider = process.env.EMAIL_PROVIDER === "SMTP" || process.env.EMAIL_PROVIDER === "BREVO" || process.env.EMAIL_PROVIDER === "RESEND"
    ? process.env.EMAIL_PROVIDER
    : smtpPass && (process.env.SMTP_HOST || ONLYPADEL_SMTP_DEFAULTS.smtpHost)
      ? "SMTP"
      : process.env.RESEND_API_KEY ? "RESEND"
        : process.env.BREVO_API_KEY ? "BREVO" : "SMTP";

  return {
    provider,
    smtpHost: process.env.SMTP_HOST || ONLYPADEL_SMTP_DEFAULTS.smtpHost,
    smtpPort: Number(process.env.SMTP_PORT) || ONLYPADEL_SMTP_DEFAULTS.smtpPort,
    smtpUser: process.env.SMTP_USER || ONLYPADEL_SMTP_DEFAULTS.smtpUser,
    smtpPass,
    smtpFrom: process.env.SMTP_FROM || process.env.EMAIL_FROM || ONLYPADEL_SMTP_DEFAULTS.smtpFrom,
    resendApiKey: process.env.RESEND_API_KEY || "",
    brevoApiKey: process.env.BREVO_API_KEY || "",
  };
}

export async function resolveTenantEmailSettings(tenantId: string): Promise<EmailTransportSettings> {
  if (!tenantId) throw new Error("EMAIL_TENANT_REQUIRED");
  const saved = await getTenantIntegration<EmailCredentials>(tenantId, "EMAIL");
  return saved ? { ...saved } : getEnvironmentEmailSettings();
}

export async function isTenantEmailConfigured(tenantId: string): Promise<boolean> {
  return isEmailTransportReady(await resolveTenantEmailSettings(tenantId));
}

export async function getTenantEmailPublicSettings(tenantId: string) {
  return publicEmailTransportSettings(await resolveTenantEmailSettings(tenantId));
}
