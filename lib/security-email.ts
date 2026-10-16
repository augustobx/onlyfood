import "server-only";

export async function sendSecurityEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim();
  if (!from) {
    console.error("Security email disabled: EMAIL_FROM not configured");
    return false;
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Resend mail failed", response.status);
      return response.ok;
    }
    if (process.env.BREVO_API_KEY) {
      const address = from.match(/<([^>]+)>/)?.[1] || from;
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ sender: { email: address, name: "OnlyFood" }, to: [{ email: to }], subject, htmlContent: html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Brevo mail failed", response.status);
      return response.ok;
    }
  } catch (error) {
    console.error("Security email delivery error", error);
  }
  return false; // No simulated success: the provider must accept the message.
}
