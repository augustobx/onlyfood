import { describe, expect, it } from "vitest";
import {
  ONLYPADEL_SMTP_DEFAULTS,
  isEmailTransportReady,
  publicEmailTransportSettings,
} from "@/lib/email-configuration";

const defaults = {
  provider: "SMTP" as const,
  ...ONLYPADEL_SMTP_DEFAULTS,
  smtpPass: "",
  resendApiKey: "",
  brevoApiKey: "",
};

describe("OnlyFood email: configuración compartida de interfaz con OnlyPadel", () => {
  it("usa los datos públicos del formulario de OnlyPadel, con branding OnlyFood", () => {
    expect(defaults.smtpHost).toBe("c2801249.ferozo.com");
    expect(defaults.smtpPort).toBe(465);
    expect(defaults.smtpUser).toBe("psp@nanolabs.online");
    expect(defaults.smtpFrom).toContain("OnlyFood");
  });

  it("no marca SMTP como configurado sin contraseña", () => {
    expect(isEmailTransportReady(defaults)).toBe(false);
    expect(isEmailTransportReady({ ...defaults, smtpPass: "una-clave-segura" })).toBe(true);
  });

  it("requiere llave de API para Resend y Brevo", () => {
    expect(isEmailTransportReady({ ...defaults, provider: "RESEND" })).toBe(false);
    expect(isEmailTransportReady({ ...defaults, provider: "BREVO" })).toBe(false);
    expect(isEmailTransportReady({ ...defaults, provider: "RESEND", resendApiKey: "re-example" })).toBe(true);
    expect(isEmailTransportReady({ ...defaults, provider: "BREVO", brevoApiKey: "xkeysib-example" })).toBe(true);
  });

  it("nunca incluye secretos al preparar datos para el formulario", () => {
    const publicSettings = publicEmailTransportSettings({
      ...defaults, smtpPass: "SECRETO_SMTP", resendApiKey: "SECRETO_RESEND",
    });
    expect(JSON.stringify(publicSettings)).not.toContain("SECRETO_");
    expect(publicSettings.hasSmtpPassword).toBe(true);
    expect(publicSettings.hasResendApiKey).toBe(true);
  });
});
