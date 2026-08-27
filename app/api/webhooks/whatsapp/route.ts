import crypto from "crypto";
import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/request-security";
import { resolveWhatsAppTenant, resolveWhatsAppVerificationToken } from "@/lib/tenant-integrations";
import { applyWhatsAppDeliveryStatuses } from "@/lib/whatsapp-notifications";

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
      entry?: Array<{ changes?: Array<{ value?: {
        metadata?: { phone_number_id?: string };
        statuses?: Array<{ id?: string; status?: string; errors?: unknown }>;
      } }> }>;
    };
    if (body.object !== "whatsapp_business_account") return new NextResponse("Not Found", { status: 404 });

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const tenantId = await resolveWhatsAppTenant(change.value?.metadata?.phone_number_id || "");
        if (!tenantId) continue;
        await applyWhatsAppDeliveryStatuses(tenantId, change.value?.statuses ?? []);
      }
    }
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Webhook POST Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
