"use server";

import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";
import { calculateOrderRequirements, getInventoryIssues } from "@/lib/inventory";

export async function getCalendarOrders(startDateIso: string, endDateIso: string) {
  try {
    await requireAdmin();

    const start = new Date(startDateIso);
    const end = new Date(endDateIso);
    const db = await getTenantDb();

    const [orders, messengers] = await Promise.all([
      db.order.findMany({
        where: {
          OR: [
            // Scheduled orders in range
            {
              scheduledDate: {
                gte: start,
                lte: end,
              },
            },
            // Created orders in range (for immediate orders without scheduledDate)
            {
              createdAt: {
                gte: start,
                lte: end,
              },
            },
            // Active orders that are still pending
            {
              status: { in: ["NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED"] },
            },
          ],
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  ingredients: { include: { ingredient: true } },
                  extras: { include: { extra: true } },
                },
              },
              secondHalfProduct: {
                include: {
                  ingredients: { include: { ingredient: true } },
                },
              },
              comboItems: {
                include: {
                  removedIngredients: true,
                  product: {
                    include: {
                      ingredients: { include: { ingredient: true } },
                    },
                  },
                },
              },
              addedExtras: { include: { extra: true } },
              removedIngredients: { include: { ingredient: true } },
            },
          },
          messenger: true,
          client: true,
          deliverySlot: true,
          printDispatches: {
            select: { kind: true, status: true, error: true },
          },
        },
        orderBy: [
          { scheduledDate: "asc" },
          { createdAt: "asc" },
        ],
      }),
      db.messenger.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const enrichedOrders = orders.map((order) => ({
      ...order,
      stockIssues: order.stockCommitted ? [] : getInventoryIssues(calculateOrderRequirements(order.items)),
    }));

    return {
      success: true,
      orders: enrichedOrders,
      messengers,
    };
  } catch (error) {
    console.error("Error fetching calendar orders:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudieron obtener los pedidos del calendario",
      orders: [],
      messengers: [],
    };
  }
}
