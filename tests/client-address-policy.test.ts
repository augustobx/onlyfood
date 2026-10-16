import { describe, expect, it } from "vitest";
import { addressLabel, isSavedAddressValid, normalizedAddress } from "@/lib/client-address-policy";
import { buildDeliveryAddress } from "@/lib/checkout-presentation";

describe("saved addresses: safety and backward compatibility", () => {
  const home = { label: "Casa", street: "  San Martín  123 ", unit: "2B", reference: "Timbre rojo" };
  it("normalizes an existing address", () => {
    expect(normalizedAddress(home).street).toBe("San Martín 123");
    expect(buildDeliveryAddress(normalizedAddress(home))).toBe("San Martín 123, Piso/Depto: 2B, Referencia: Timbre rojo");
  });
  it("requires an address the backend accepts", () => {
    expect(isSavedAddressValid(home)).toBe(true);
    expect(isSavedAddressValid({ ...home, street: "a" })).toBe(false);
    expect(isSavedAddressValid({ ...home, reference: "X".repeat(80), unit: "X".repeat(60), street: "X".repeat(150) })).toBe(false);
    expect(isSavedAddressValid({ ...home, label: "" })).toBe(false);
  });
  it("supports custom labels", () => {
    expect(addressLabel("CASA")).toBe("Casa");
    expect(addressLabel("TRABAJO")).toBe("Trabajo");
    expect(addressLabel("Otro lugar")).toBe("Otro lugar");
  });
});
