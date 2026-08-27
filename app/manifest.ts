import type { MetadataRoute } from "next";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantBrandName, getTenantLogoUrl } from "@/lib/tenant-branding";
import { createTenantDb } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  try {
    const tenant = await getTenantContext();
    const branding = await createTenantDb(tenant.id).systemConfig.findFirst({
      select: { appName: true, logoUrl: true, primaryColor: true },
    });
    const name = getTenantBrandName(tenant, branding);
    const logoUrl = getTenantLogoUrl(tenant, branding);

    return {
      name,
      short_name: name,
      description: `Tienda online de ${name}.`,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: branding?.primaryColor || "#ffffff",
      icons: logoUrl ? [{ src: logoUrl, sizes: "any" }] : [],
    };
  } catch {
    return {
      name: "OnlyFood",
      short_name: "OnlyFood",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [],
    };
  }
}
