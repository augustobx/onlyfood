import { describe, expect, it } from "vitest";
import { isEmailLoginIdentifier, normalizeClientLoginIdentifier } from "@/lib/client-login-identifier";

describe("Ingreso por teléfono o correo", () => {
  it("normaliza correo ignorando espacios y mayúsculas", () => {
    expect(normalizeClientLoginIdentifier("  Juan@Ejemplo.COM  ")).toBe("juan@ejemplo.com");
    expect(isEmailLoginIdentifier("usuario@mail.com")).toBe(true);
  });
  it("conserva la normalización histórica del teléfono", () => {
    expect(normalizeClientLoginIdentifier("11 2345-6789")).toBe("1123456789");
    expect(isEmailLoginIdentifier("1123456789")).toBe(false);
  });
});
