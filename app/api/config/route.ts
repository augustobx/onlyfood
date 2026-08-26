import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/public-config";

export async function GET() {
  try {
    const config = await getPublicConfig();
    return NextResponse.json(config ?? { appName: "nfood", isStoreOpen: false });
  } catch {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}
