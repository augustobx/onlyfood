import { getTenantDb } from "@/lib/tenant-db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

export async function GET() {
  try {
    await requireAdmin(["OWNER", "MANAGER", "CASHIER", "DELIVERY", "STAFF", "KITCHEN"]);
    const tenant = await getTenantContext();
    await requireTenantFeature(tenant.id, "orders");
    const db = await getTenantDb();
    const messengers = await db.messenger.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(messengers);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Failed to fetch messengers" }, { status });
  }
}
