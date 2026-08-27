import crypto from "crypto";
import { after, NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/request-security";
import { dispatchOrderPrint } from "@/lib/printnode";
import { reconcileMercadoPagoPayment } from "@/lib/mercadopago-payments";
import { getTenantIntegration, type MercadoPagoCredentials } from "@/lib/tenant-integrations";

async function verifySignature(request: Request, dataId: string, tenantId: string): Promise<boolean> {
  const credentials = await getTenantIntegration<MercadoPagoCredentials>(tenantId, "MERCADO_PAGO");
  const secret = credentials?.webhookSecret || process.env.MP_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!secret || !signature || !requestId) return false;

  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
  if (!parts.ts || !parts.v1) return false;
  const timestampMs = Number(parts.ts) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return constantTimeEqual(parts.v1, expected);
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const rawBody = await request.text();
    if (rawBody.length > 64 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = JSON.parse(rawBody || "{}") as { type?: string; topic?: string; data?: { id?: string | number } };
    const requestUrl = new URL(request.url);
    const tenantId = requestUrl.searchParams.get("tenant");
    const topic = body.type || body.topic || requestUrl.searchParams.get("type") || requestUrl.searchParams.get("topic");
    if (topic !== "payment") return NextResponse.json({ success: true });

    const bodyDataId = body.data?.id === undefined ? null : String(body.data.id);
    const queryDataId = requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("id");
    const dataId = queryDataId || bodyDataId;
    if (!tenantId || !/^[0-9a-f-]{20,64}$/i.test(tenantId) || !dataId || !/^\d{1,32}$/.test(dataId) || (queryDataId && bodyDataId && queryDataId !== bodyDataId)) {
      return NextResponse.json({ error: "Invalid payment notification" }, { status: 400 });
    }

    // La firma y su timestamp son obligatorios antes de consultar o mutar pagos.
    if (!queryDataId || !(await verifySignature(request, queryDataId, tenantId))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const result = await reconcileMercadoPagoPayment(dataId, undefined, tenantId);
    if (result.transitionedToPaid) {
      after(() => dispatchOrderPrint(result.orderId, { tenantId }).catch((error) => console.error("Mercado Pago automatic print failed", { orderId: result.orderId, error })));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MP Webhook Error]", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }
}
