import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    await requireTenantFeature(tenant.id, "orders");
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
