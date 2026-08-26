import { getTenantDb } from "@/lib/tenant-db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { startOfBusinessDayUtc } from "@/lib/time";
import { calculateOrderRequirements, getInventoryIssues } from "@/lib/inventory";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getTenantDb();
    const orders = await db.order.findMany({
      where: {
        OR: [
          { createdAt: { gte: startOfBusinessDayUtc() } },
          { status: { in: ["NEW", "IN_PROCESS", "FINISHED"] } },
          { orderType: { in: ["SCHEDULED_TOMORROW", "CUSTOM_DATE"] }, status: { not: "CANCELLED" } }
        ]
      },
      include: {
        items: {
          include: {
            product: { include: { ingredients: { include: { ingredient: true } } } },
            secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
            comboItems: {
              include: {
                removedIngredients: true,
                product: { include: { ingredients: { include: { ingredient: true } } } },
              },
            },
            addedExtras: { include: { extra: true } },
            removedIngredients: { include: { ingredient: true } },
          },
        },
        messenger: true,
        printDispatches: {
          select: { kind: true, status: true, error: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders.map((order) => ({
      ...order,
      stockIssues: order.stockCommitted ? [] : getInventoryIssues(calculateOrderRequirements(order.items)),
    })));
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Failed to fetch orders" }, { status });
  }
}
