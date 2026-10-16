import { describe, expect, it } from "vitest";
import { requiresClientLogin } from "@/lib/checkout-auth-policy";

describe("OnlyFood: compra autenticada configurable por comercio", () => {
  it("permite invitados cuando el comercio mantiene desactivada la opción", () => {
    expect(requiresClientLogin(false, false, false)).toBe(false);
  });

  it("exige sesión al habilitar la opción y nunca confía solo en el checkout visual", () => {
    expect(requiresClientLogin(true, false, false)).toBe(true);
  });

  it("permite continuar a un cliente autenticado", () => {
    expect(requiresClientLogin(true, true, false)).toBe(false);
  });

  it("no bloquea pedidos hechos por un administrador", () => {
    expect(requiresClientLogin(true, false, true)).toBe(false);
  });

  it("evalúa la política de cada comercio de manera independiente", () => {
    const tenants = { a: true, b: false };
    expect(requiresClientLogin(tenants.a, false, false)).toBe(true);
    expect(requiresClientLogin(tenants.b, false, false)).toBe(false);
  });
});
