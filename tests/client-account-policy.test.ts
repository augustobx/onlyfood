import { describe, expect, it } from "vitest";
import { canRecoverByEmail, pendingClientNeedsVerifiedEmailActivation } from "@/lib/client-account-policy";

describe("Circuito de identidad del cliente histórico", () => {
  it("no debe permitir alta de contraseña por teléfono si tiene email pendiente", () => {
    expect(pendingClientNeedsVerifiedEmailActivation([
      { passwordSetupRequired: true, email: "cliente@ejemplo.com" },
    ])).toBe(true);
  });
  it("el bloqueo no se evade usando una variante duplicada sin correo", () => {
    expect(pendingClientNeedsVerifiedEmailActivation([
      { passwordSetupRequired: true, email: null },
      { passwordSetupRequired: true, email: "cliente@ejemplo.com" },
    ])).toBe(true);
  });
  it("mantiene temporalmente la activación antigua para cuentas sin email", () => {
    expect(pendingClientNeedsVerifiedEmailActivation([
      { passwordSetupRequired: true, email: null },
    ])).toBe(false);
  });
  it("la recuperación necesita email verificado, incluso si fue cargado por admin", () => {
    expect(canRecoverByEmail({ email: null, emailVerifiedAt: null })).toBe(false);
    expect(canRecoverByEmail({ email: "a@ejemplo.com", emailVerifiedAt: null })).toBe(false);
    expect(canRecoverByEmail({ email: "a@ejemplo.com", emailVerifiedAt: new Date() })).toBe(true);
  });
});
