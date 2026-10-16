import { describe, expect, it } from "vitest";
import { getUnconfiguredTenantEmailDefaults, isEmailTransportReady } from "@/lib/email-configuration";

describe("Correo de seguridad: no usar credenciales de otro tenant", () => {
  it("el tenant sin configuración no usa usuario ni remitente de OnlyPadel", () => {
    const settings = getUnconfiguredTenantEmailDefaults();
    expect(settings.smtpHost).toBe("c2801249.ferozo.com");
    expect(settings.smtpPort).toBe(465);
    expect(settings.smtpUser).toBe("");
    expect(settings.smtpFrom).toBe("");
    expect(settings.smtpPass).toBe("");
    expect(isEmailTransportReady(settings)).toBe(false);
  });

  it("Raptor requiere su remitente y contraseña propios", () => {
    const settings = {
      ...getUnconfiguredTenantEmailDefaults(),
      smtpUser: "raptor@nanolabs.online",
      smtpFrom: "Raptor <raptor@nanolabs.online>",
      smtpPass: "valid-credential-configured-in-private-db",
    };
    expect(isEmailTransportReady(settings)).toBe(true);
  });
});
