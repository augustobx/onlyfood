/** Referencia técnica del SMTP de OnlyPadel: solo host y puerto se precargan por comercio. */
export const ONLYPADEL_SMTP_DEFAULTS = Object.freeze({
  smtpHost: "c2801249.ferozo.com",
  smtpPort: 465,
  smtpUser: "psp@nanolabs.online",
  smtpFrom: "OnlyFood <psp@nanolabs.online>",
});

export type EmailProvider = "SMTP" | "RESEND" | "BREVO";

export interface EmailTransportSettings {
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  smtpFrom: string;
  resendApiKey?: string;
  brevoApiKey?: string;
}

export function isEmailTransportReady(settings: EmailTransportSettings): boolean {
  if (!settings.smtpFrom?.trim()) return false;
  if (settings.provider === "SMTP") {
    return Boolean(
      settings.smtpHost?.trim() &&
      settings.smtpUser?.trim() &&
      settings.smtpPass?.trim() &&
      (settings.smtpPort === 465 || settings.smtpPort === 587)
    );
  }
  if (settings.provider === "RESEND") return Boolean(settings.resendApiKey?.trim());
  if (settings.provider === "BREVO") return Boolean(settings.brevoApiKey?.trim());
  return false;
}

export function publicEmailTransportSettings(settings: EmailTransportSettings) {
  return {
    provider: settings.provider,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpFrom: settings.smtpFrom,
    hasSmtpPassword: Boolean(settings.smtpPass),
    hasResendApiKey: Boolean(settings.resendApiKey),
    hasBrevoApiKey: Boolean(settings.brevoApiKey),
    configured: isEmailTransportReady(settings),
  };
}
