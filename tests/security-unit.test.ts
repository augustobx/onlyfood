import { describe, expect, it } from "vitest";
import { createOrderTrackingToken, isValidOrderTrackingToken } from "@/lib/order-tracking";
import { hashUserPassword, verifyUserPassword } from "@/lib/user-auth";
import { generateTenantObjectKey, validateMediaBuffer } from "@/lib/storage";
import { getPlatformHostname, isPlatformHostname } from "@/lib/platform-host";
import { ADMIN_GUIDES } from "@/lib/admin-guides";
import { FEATURE_KEYS } from "@/lib/feature-catalog";

describe("security primitives", () => {
  it("uses non-reversible order tracking tokens", () => {
    const first = createOrderTrackingToken();
    const second = createOrderTrackingToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toContain(first.token);
    expect(isValidOrderTrackingToken(first.token, first.tokenHash)).toBe(true);
    expect(isValidOrderTrackingToken(second.token, first.tokenHash)).toBe(false);
  });

  it("hashes and verifies administrator passwords with scrypt", async () => {
    const hash = await hashUserPassword("A-strong-local-password-2026");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyUserPassword("A-strong-local-password-2026", hash)).toBe(true);
    expect(await verifyUserPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects SVG and spoofed media, and namespaces object keys", () => {
    expect(validateMediaBuffer("image/svg+xml", Buffer.from("<svg><script/></svg>"))).toMatchObject({ valid: false });
    expect(validateMediaBuffer("image/png", Buffer.from("not a png"))).toMatchObject({ valid: false });
    expect(generateTenantObjectKey("tenant-a", "products", "Burger.png")).toMatch(/^tenants\/tenant-a\/products\//);
  });

  it("authorizes a dedicated platform host outside the tenant wildcard", () => {
    expect(getPlatformHostname("https://onlyfood.nanoapps.ar")).toBe("onlyfood.nanoapps.ar");
    expect(isPlatformHostname("onlyfood.nanoapps.ar", "nanoapps.ar", "https://onlyfood.nanoapps.ar")).toBe(true);
    expect(isPlatformHostname("comercio.nanoapps.ar", "nanoapps.ar", "https://onlyfood.nanoapps.ar")).toBe(false);
    expect(isPlatformHostname("attacker.example", "nanoapps.ar", "not-a-url")).toBe(false);
  });

  it("keeps the self-service guide catalog complete and internally valid", () => {
    expect(ADMIN_GUIDES.length).toBeGreaterThanOrEqual(18);
    expect(new Set(ADMIN_GUIDES.map((guide) => guide.id)).size).toBe(ADMIN_GUIDES.length);
    for (const guide of ADMIN_GUIDES) {
      expect(guide.href.startsWith("/admin/")).toBe(true);
      expect(guide.steps.length).toBeGreaterThanOrEqual(4);
      expect(guide.tips.length).toBeGreaterThanOrEqual(2);
      if (guide.feature) expect(FEATURE_KEYS).toContain(guide.feature);
    }
  });
});
