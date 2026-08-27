import { describe, expect, it } from "vitest";
import { buildTenantMetadata } from "@/lib/tenant-branding";
import type { ResolvedTenant } from "@/lib/tenant-context";

function tenantWithLogo(logoUrl: string | null): ResolvedTenant {
  return {
    id: "tenant-branding",
    slug: "branding",
    name: "Comercio de Prueba",
    status: "ACTIVE",
    isSuspended: false,
    plan: {
      code: "STARTER",
      name: "Starter",
      maxLocations: 1,
      maxProducts: 100,
      features: [],
    },
    features: new Set(),
    settings: {
      appName: "Mi Comercio",
      logoUrl,
      primaryColor: "#123456",
      secondaryColor: "#654321",
      storeTheme: "ORIGINAL",
      isStoreOpen: true,
    },
  };
}

describe("tenant branding metadata", () => {
  it("usa el logo configurado en todos los metadatos gráficos", () => {
    const metadata = buildTenantMetadata(tenantWithLogo("/uploads/logo.webp"));

    expect(metadata.icons).toEqual({
      icon: [{ url: "/uploads/logo.webp" }],
      shortcut: [{ url: "/uploads/logo.webp" }],
      apple: [{ url: "/uploads/logo.webp" }],
    });
    expect(metadata.openGraph?.images).toEqual([
      { url: "/uploads/logo.webp", alt: "Logo de Mi Comercio" },
    ]);
    expect(metadata.twitter?.images).toEqual(["/uploads/logo.webp"]);
  });

  it("no publica un icono alternativo cuando el comercio no tiene logo", () => {
    const metadata = buildTenantMetadata(tenantWithLogo(null));

    expect(metadata.icons).toBeNull();
    expect(metadata.openGraph?.images).toEqual([]);
    expect(metadata.twitter?.images).toEqual([]);
  });
});
