import crypto from "crypto";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleIncomingMessage } from "@/lib/whatsapp-bot";
import { constantTimeEqual } from "@/lib/request-security";
import { resolveWhatsAppTenant, resolveWhatsAppVerificationToken } from "@/lib/tenant-integrations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && (await resolveWhatsAppVerificationToken(token))) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 256 * 1024) return new NextResponse("Payload too large", { status: 413 });
    const rawBody = await request.text();
    if (rawBody.length > 256 * 1024) return new NextResponse("Payload too large", { status: 413 });

    const appSecret = process.env.META_APP_SECRET;
    const providedSignature = request.headers.get("x-hub-signature-256");
    if (!appSecret || !providedSignature) return new NextResponse("Webhook signature not configured", { status: 503 });
    const expectedSignature = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    if (!constantTimeEqual(providedSignature, expectedSignature)) return new NextResponse("Invalid signature", { status: 401 });

    const body = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; messages?: Array<{ id?: string; from?: string; type?: string; [key: string]: unknown }> } }> }>;
    };
    if (body.object !== "whatsapp_business_account") return new NextResponse("Not Found", { status: 404 });

    const pending: Array<{ phone: string; message: Record<string, unknown>; tenantId: string }> = [];
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const tenantId = await resolveWhatsAppTenant(change.value?.metadata?.phone_number_id || "");
        if (!tenantId) continue;
        for (const message of change.value?.messages ?? []) {
          if (!message.id || !message.from || (message.type !== "text" && message.type !== "interactive")) continue;
          try {
            await prisma.webhookEvent.create({ data: { id: message.id, provider: "WHATSAPP" } });
            pending.push({ phone: message.from, message, tenantId });
          } catch {
            // Duplicate delivery: it was already accepted and must not create another order.
          }
        }
      }
    }

    after(async () => {
      await Promise.allSettled(pending.map(({ phone, message, tenantId }) => handleIncomingMessage(phone, message, tenantId)));
    });
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Webhook POST Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
