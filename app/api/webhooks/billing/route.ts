import { NextResponse } from "next/server";
import { saasBillingProvider } from "@/lib/billing/billing-provider";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  let claimedEventId: string | null = null;
  try {
    if (!(process.env.PLATFORM_MP_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET)) {
      return new NextResponse("Webhook not configured", { status: 503 });
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) return new NextResponse("Payload too large", { status: 413 });
    const rawBody = await request.text();
    if (rawBody.length > 64 * 1024) return new NextResponse("Payload too large", { status: 413 });
    const payload = JSON.parse(rawBody || "{}");
    const signature = request.headers.get("x-signature") || undefined;
    const requestId = request.headers.get("x-request-id") || undefined;

    if (!requestId) return new NextResponse("Invalid signature", { status: 401 });
    const eventId = crypto.createHash("sha256").update(`billing:${requestId}:${payload?.data?.id || payload?.id || ""}`).digest("hex");
    try {
      await prisma.webhookEvent.create({ data: { id: eventId, provider: "MP_BILLING" } });
      claimedEventId = eventId;
    } catch {
      return new NextResponse("OK", { status: 200 });
    }

    const result = await saasBillingProvider.handleWebhook(payload, signature, requestId);

    if (result.handled) {
      return new NextResponse("OK", { status: 200 });
    }

    await prisma.webhookEvent.deleteMany({ where: { id: eventId } });
    claimedEventId = null;
    return new NextResponse("Invalid webhook", { status: 401 });
  } catch (error) {
    if (claimedEventId) await prisma.webhookEvent.deleteMany({ where: { id: claimedEventId } }).catch(() => {});
    console.error("Billing Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
