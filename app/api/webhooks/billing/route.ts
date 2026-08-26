import { NextResponse } from "next/server";
import { saasBillingProvider } from "@/lib/billing/billing-provider";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody || "{}");
    const signature = request.headers.get("x-signature") || undefined;

    const result = await saasBillingProvider.handleWebhook(payload, signature);

    if (result.handled) {
      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("IGNORED", { status: 200 });
  } catch (error) {
    console.error("Billing Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
