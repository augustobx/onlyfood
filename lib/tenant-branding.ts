import type { Metadata } from "next";
import type { ResolvedTenant } from "@/lib/tenant-context";

export type TenantBranding = {
  appName?: string | null;
  logoUrl?: string | null;
};

export function getTenantBrandName(
  tenant: ResolvedTenant,
  branding: TenantBranding | null = tenant.settings || null,
): string {
  return branding?.appName?.trim() || tenant.name;
}

export function getTenantLogoUrl(
  tenant: ResolvedTenant,
  branding: TenantBranding | null = tenant.settings || null,
): string | null {
  return branding?.logoUrl?.trim() || null;
}

export function buildTenantMetadata(
  tenant: ResolvedTenant,
  title?: string,
  branding?: TenantBranding | null,
): Metadata {
  const brandName = getTenantBrandName(tenant, branding);
  const logoUrl = getTenantLogoUrl(tenant, branding);
  const resolvedTitle = title ? `${title} | ${brandName}` : brandName;

  return {
    title: resolvedTitle,
    applicationName: brandName,
    manifest: "/manifest.webmanifest",
    icons: logoUrl
      ? {
          icon: [{ url: logoUrl }],
          shortcut: [{ url: logoUrl }],
          apple: [{ url: logoUrl }],
        }
      : null,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: brandName,
    },
    openGraph: {
      title: resolvedTitle,
      siteName: brandName,
      type: "website",
      images: logoUrl ? [{ url: logoUrl, alt: `Logo de ${brandName}` }] : [],
    },
    twitter: {
      card: "summary",
      title: resolvedTitle,
      images: logoUrl ? [logoUrl] : [],
    },
  };
}
