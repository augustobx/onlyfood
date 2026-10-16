import "server-only";

import { resolveTenantEmailSettings } from "@/lib/tenant-email";
import { isEmailTransportReady } from "@/lib/email-configuration";
import { sendSmtpEmail } from "@/lib/smtp-mail";

export async function sendSecurityEmail(
  to: string,
  subject: string,
  html: string,
  tenantId: string,
): Promise<boolean> {
  if (!tenantId) return false;

  try {
    const config = await resolveTenantEmailSettings(tenantId);
    if (!isEmailTransportReady(config)) {
      console.error("Email not configured for tenant", tenantId);
      return false;
    }

    if (config.provider === "SMTP") {
      return await sendSmtpEmail({
        host: config.smtpHost, port: config.smtpPort as 465 | 587,
        username: config.smtpUser, password: config.smtpPass || "",
        from: config.smtpFrom, to, subject, html,
      });
    }

    const from = config.smtpFrom;
    if (config.provider === "RESEND") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Resend email rejected", { tenantId, status: response.status });
      return response.ok;
    }

    if (config.provider === "BREVO") {
      const address = from.match(/<([^>]+)>/)?.[1] || from;
      const name = from.match(/^([^<>]+)</)?.[1]?.trim() || "OnlyFood";
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.brevoApiKey || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sender: { email: address, name }, to: [{ email: to }], subject, htmlContent: html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Brevo email rejected", { tenantId, status: response.status });
      return response.ok;
    }
  } catch (error) {
    console.error("Email delivery failed", { tenantId, error });
  }
  return false;
}
