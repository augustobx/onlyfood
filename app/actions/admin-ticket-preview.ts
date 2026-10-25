"use server";

import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db";

/**
 * Returns an order ID suitable for previewing a ticket.
 * Picks the latest non-cancelled order from the tenant.
 * If none exists, returns null so the UI can fall back to a message.
 */
export async function getPreviewOrderId(): Promise<{ orderId: string | null }> {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "STAFF"]);
  const tenant = await getTenantContext();
  const db = await getTenantDb();

  const order = await db.order.findFirst({
    where: { tenantId: tenant.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return { orderId: order?.id ?? null };
}
