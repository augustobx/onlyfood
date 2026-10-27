import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenantByHostname, normalizeHostname } from "@/lib/tenant-context";
import { isAdminAuthenticated } from "@/lib/admin-session";
import AdminLoginForm from "@/app/admin/AdminLoginForm";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") || "");
  const resolved = await resolveTenantByHostname(host);
  const tenantName = resolved.success
    ? resolved.tenant.settings?.appName || resolved.tenant.name
    : "OnlyFood";

  return {
    title: `${tenantName} | Iniciar Sesión`,
    description: `Ingreso al sistema de gestión gastronómica de ${tenantName}`,
  };
}

export default async function LoginPage() {
  const isAdmin = await isAdminAuthenticated();
  if (isAdmin) {
    redirect("/admin");
  }

  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") || "");
  const resolved = await resolveTenantByHostname(host);
  const tenantName = resolved.success
    ? resolved.tenant.settings?.appName || resolved.tenant.name
    : "OnlyFood";
  const tenantLogo = resolved.success ? resolved.tenant.settings?.logoUrl || null : null;

  return (
    <AdminLoginForm
      tenantName={tenantName}
      tenantArea={`${tenantName} · Gestión Gastronómica`}
      tenantBajada={`Sistema de gestión integral para ${tenantName}.`}
      tenantLogo={tenantLogo}
    />
  );
}
