import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { isValidOrderTrackingToken } from "@/lib/order-tracking";

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(4096).refine((url) => url.startsWith("https://")),
    keys: z.object({ p256dh: z.string().min(20).max(1024), auth: z.string().min(8).max(512) }),
  }),
  orderId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  trackingToken: z.string().min(32).max(200).optional().nullable(),
}).strict();

export async function POST(req: Request) {
  try {
    const ip = await getRequestIp();
    if (!(await consumeRateLimit("push-subscribe", ip, 20, 60 * 60 * 1000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    if (Number(req.headers.get("content-length") || 0) > 10_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);
    const currentClient = await getLoggedClient(tenant.id);
    const { subscription, orderId } = parsed.data;

    if (parsed.data.clientId && parsed.data.clientId !== currentClient?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, select: { clientId: true, trackingTokenHash: true } });
      const ownsOrder = Boolean(currentClient && order?.clientId === currentClient.id);
      const hasTrackingToken = Boolean(order && isValidOrderTrackingToken(parsed.data.trackingToken || undefined, order.trackingTokenHash));
      if (!order || (!ownsOrder && !hasTrackingToken)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const endpointHash = crypto.createHash("sha256").update(subscription.endpoint).digest("hex");
    const existingSub = await db.pushSubscription.findFirst({ where: { endpointHash } });
    if (existingSub) {
      await db.pushSubscription.update({
        where: { id: existingSub.id },
        data: { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, orderId: orderId || null, clientId: currentClient?.id || null },
      });
    } else {
      await db.pushSubscription.create({
        data: { endpointHash, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, orderId: orderId || null, clientId: currentClient?.id || null, tenantId: tenant.id },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
