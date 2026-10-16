import "server-only";

import { getUnconfiguredTenantEmailDefaults, isEmailTransportReady, publicEmailTransportSettings, type EmailTransportSettings } from "@/lib/email-configuration";
import { getTenantIntegration, type EmailCredentials } from "@/lib/tenant-integrations";

/** No se comparten credenciales de correo entre tenants ni se usa fallback global. */
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
