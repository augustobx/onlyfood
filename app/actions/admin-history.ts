"use server";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantDb } from "@/lib/tenant-db";
import { historyQuerySchema, historyWhere } from "@/lib/history-query";
import { requireTenantFeature } from "@/lib/features";
export async function getHistoryPage(input: unknown) {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER", "STAFF", "CASHIER"]);
  await requireTenantFeature(tenant.id, "orders");
  const query = historyQuerySchema.parse(input);
  const db = await getTenantDb(), where = historyWhere(query);
  const total = await db.order.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / 50)));
  const nonCancelled = { AND: [where, { status: { not: "CANCELLED" } }] };
  const [orders, sum, completedCount, cancelledCount] = await Promise.all([
    db.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50,
      include: { items: { include: { product: true, secondHalfProduct: true, addedExtras: { include: { extra: true } }, removedIngredients: { include: { ingredient: true } }, comboItems: { include: { product: true, removedIngredients: { include: { ingredient: true } } } } } }, messenger: true, client: { select: { id: true, name: true, phone: true, points: true } }, payments: true } }),
    db.order.aggregate({ where: nonCancelled, _sum: { total: true }, _count: true }),
    db.order.count({ where: { AND: [where, { status: "DELIVERED" }] } }),
    db.order.count({ where: { AND: [where, { status: "CANCELLED" }] } }),
  ]);
  return { orders, total, page, stats: { totalRevenue: sum._sum.total || 0, averageTicket: sum._count ? (sum._sum.total || 0) / sum._count : 0, completedCount, cancelledCount } };
}
