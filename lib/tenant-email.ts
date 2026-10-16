import "server-only";

import { ONLYPADEL_SMTP_DEFAULTS, type EmailTransportSettings, isEmailTransportReady, publicEmailTransportSettings } from "@/lib/email-configuration";
import { getTenantIntegration, type EmailCredentials } from "@/lib/tenant-integrations";

/**
 * Defaults visuales, no credenciales. Para correos de seguridad nunca usar
 * silenciosamente la casilla SMTP global ni la de otro comercio.
 */
export function getUnconfiguredTenantEmailDefaults(): EmailTransportSettings {
  return {
    provider: "SMTP",
    smtpHost: ONLYPADEL_SMTP_DEFAULTS.smtpHost,
    smtpPort: ONLYPADEL_SMTP_DEFAULTS.smtpPort,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    resendApiKey: "",
    brevoApiKey: "",
  };
}

export async function resolveTenantEmailSettings(tenantId: string): Promise<EmailTransportSettings> {
  if (!tenantId) throw new Error("EMAIL_TENANT_REQUIRED");
  const saved = await getTenantIntegration<EmailCredentials>(tenantId, "EMAIL");
  return saved ? { ...saved } : getUnconfiguredTenantEmailDefaults();
}

export async function isTenantEmailConfigured(tenantId: string): Promise<boolean> {
  return isEmailTransportReady(await resolveTenantEmailSettings(tenantId));
}

export async function getTenantEmailPublicSettings(tenantId: string) {
  return publicEmailTransportSettings(await resolveTenantEmailSettings(tenantId));
}
