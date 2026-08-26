import { prisma } from "@/lib/prisma";
import { HistoryClient } from "./HistoryClient";
import { requireAdmin } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
          secondHalfProduct: true,
          addedExtras: { include: { extra: true } },
          removedIngredients: { include: { ingredient: true } },
          comboItems: {
            include: {
              product: true,
              removedIngredients: { include: { ingredient: true } },
            },
          },
        },
      },
      messenger: true,
      client: {
        select: { id: true, name: true, phone: true, points: true },
      },
      payments: true,
    },
    take: 1000,
  });

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto">
      <HistoryClient initialOrders={orders} />
    </div>
  );
}
