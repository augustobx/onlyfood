import crypto from "crypto";
import { after, NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/request-security";
import { dispatchOrderPrint } from "@/lib/printnode";
import { reconcileMercadoPagoPayment } from "@/lib/mercadopago-payments";

function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!secret || !signature || !requestId) return false;

  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
  if (!parts.ts || !parts.v1) return false;
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
    const topic = body.type || body.topic || requestUrl.searchParams.get("type") || requestUrl.searchParams.get("topic");
    if (topic !== "payment") return NextResponse.json({ success: true });

    const bodyDataId = body.data?.id === undefined ? null : String(body.data.id);
    const queryDataId = requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("id");
    const dataId = queryDataId || bodyDataId;
    if (!dataId || !/^\d{1,32}$/.test(dataId) || (queryDataId && bodyDataId && queryDataId !== bodyDataId)) {
      return NextResponse.json({ error: "Invalid payment notification" }, { status: 400 });
    }

    // La firma es una capa adicional opcional. Cuando no hay secreto configurado,
    // el pago igual se valida consultando la API oficial con el Access Token.
    const webhookSecretConfigured = Boolean(process.env.MP_WEBHOOK_SECRET?.trim());
    if (webhookSecretConfigured && (!queryDataId || !verifySignature(request, queryDataId))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const result = await reconcileMercadoPagoPayment(dataId);
    if (result.transitionedToPaid) {
      after(() => dispatchOrderPrint(result.orderId).catch((error) => console.error("Mercado Pago automatic print failed", { orderId: result.orderId, error })));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MP Webhook Error]", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }
}
