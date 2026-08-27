import { describe, expect, it } from "vitest";
import { createOrderTrackingToken, isValidOrderTrackingToken } from "@/lib/order-tracking";
import { hashUserPassword, verifyUserPassword } from "@/lib/user-auth";
import { generateTenantObjectKey, validateMediaBuffer } from "@/lib/storage";

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
});
