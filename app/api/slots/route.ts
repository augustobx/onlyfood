import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/tenant-db";

export async function GET() {
  try {
    const db = await getTenantDb();
    const slots = await db.deliveryTimeSlot.findMany({
      where: { isActive: true },
      orderBy: { sequence: 'asc' }
    });
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load slots" }, { status: 500 });
  }
}
