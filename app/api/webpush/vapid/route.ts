import { NextResponse } from "next/server";

export async function GET() {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) return NextResponse.json({ error: "Web Push no configurado" }, { status: 503 });
    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error("VAPID config error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
