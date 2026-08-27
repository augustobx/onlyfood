import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "onlyfood-saas",
        version: "1.0.0-rc",
        database: "connected",
        storage: (process.env.STORAGE_PROVIDER || "local").toLowerCase(),
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Healthcheck error:", error);
    return NextResponse.json(
      {
        status: "unavailable",
        service: "onlyfood-saas",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
