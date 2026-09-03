"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";
import { sendOrderPush } from "@/lib/push-notifications";
import { calculateOrderRequirements, formatInventoryIssue, getInventoryIssues, type InventoryIssue } from "@/lib/inventory";
import { findAndReconcileMercadoPagoOrder } from "@/lib/mercadopago-payments";
import { dispatchOrderPrint } from "@/lib/printnode";
import { startOfBusinessDayUtc } from "@/lib/time";
import { dispatchWhatsAppNotification, queueRelatedOrderConfirmationNotifications, queueOrderWhatsAppNotification } from "@/lib/whatsapp-notifications";
import { notificationEventForStatus } from "@/lib/whatsapp-message-utils";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

async function requireOrdersModule() {
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "orders");
}

const statusSchema = z.enum(["NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"]);
const transitions: Record<string, string[]> = {
  NEW: ["IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"],
  IN_PROCESS: ["NEW", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"],
  PENDING_DELIVERY: ["NEW", "IN_PROCESS", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["NEW", "IN_PROCESS", "PENDING_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"],
  FINISHED: ["NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  DELIVERED: ["NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "CANCELLED"],
  CANCELLED: ["NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED"],
};

const adminOrderProductSelect = {
  id: true,
  name: true,
  description: true,
  basePrice: true,
  isCombo: true,
  allowHalf: true,
  onlyHalf: true,
  allowRemoveIngredients: true,
  categoryId: true,
  ingredients: {
    select: {
      ingredientId: true,
      isRemovable: true,
      ingredient: { select: { id: true, name: true, stock: true } },
    },
  },
  extras: {
    where: { extra: { isActive: true } },
    select: { extra: { select: { id: true, name: true, price: true } } },
  },
  comboItemsConfig: {
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          allowRemoveIngredients: true,
          ingredients: {
            select: {
              ingredientId: true,
              isRemovable: true,
              ingredient: { select: { id: true, name: true, stock: true } },
            },
          },
        },
      },
    },
  },
} as const;

export async function getAdminOrderCatalog() {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  await requireOrdersModule();
  const tenant = await getTenantContext();
  const db = await getTenantDb();
  const [categories, combos, slots, config] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        name: true,
        products: {
          where: { isActive: true, isCombo: false },
          orderBy: { name: "asc" },
          select: adminOrderProductSelect,
        },
      },
    }),
    db.product.findMany({
      where: { isActive: true, isCombo: true },
      orderBy: [{ sequence: "asc" }, { name: "asc" }],
      select: adminOrderProductSelect,
    }),
    db.deliveryTimeSlot.findMany({
      where: { isActive: true, available: { gt: 0 } },
      orderBy: { sequence: "asc" },
      select: { id: true, time: true, available: true },
    }),
    db.systemConfig.findFirst({ select: {
      deliveryCost: true,
      globalDiscount: true,
      allowImmediateOrders: true,
      allowScheduledTomorrow: true,
      allowAdvanceOrders: true,
      whatsappNotificationsEnabled: true,
    } }),
  ]);

  return {
    categories,
    combos,
    slots,
    deliveryCost: Math.max(0, config?.deliveryCost ?? 0),
    globalDiscount: Math.min(100, Math.max(0, config?.globalDiscount ?? 0)),
    allowImmediateOrders: config?.allowImmediateOrders !== false,
    allowScheduledTomorrow: config?.allowScheduledTomorrow !== false,
    allowAdvanceOrders: config?.allowAdvanceOrders !== false,
    whatsappOptInEnabled: tenant.features.has("whatsapp") && Boolean(config?.whatsappNotificationsEnabled),
  };
}

export async function searchAdminClients(query: string) {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  const db = await getTenantDb();
  const q = query.trim();
  if (q.length < 2) return [];

  const phoneDigits = q.replace(/\D/g, "");
  const clients = await db.client.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        ...(phoneDigits.length >= 4 ? [{ phone: { contains: phoneDigits } }] : []),
      ],
    },
    take: 10,
    orderBy: [{ points: "desc" }, { createdAt: "desc" }],
    include: {
      customTier: { select: { id: true, name: true, badgeText: true, color: true } },
      orders: { where: { status: { not: "CANCELLED" } }, select: { id: true, total: true } },
    },
  });

  const tiers = await db.customerTier.findMany({
    where: { isActive: true },
    orderBy: { sequence: "desc" },
  });

  return clients.map((c) => {
    const ordersCount = c.orders.length;
    const totalSpent = c.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    let activeTier = c.customTier;
    if (!activeTier && tiers.length > 0) {
      activeTier = tiers.find((t) => {
        const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
        const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
        const meetsPoints = t.minPoints === 0 || c.points >= t.minPoints;
        return meetsOrders && meetsSpent && meetsPoints;
      }) || tiers[tiers.length - 1];
    }

    return {
      id: c.id,
      name: c.name || "Cliente sin nombre",
      phone: c.phone,
      points: c.points,
      ordersCount,
      totalSpent,
      tier: activeTier ? { name: activeTier.name, badgeText: activeTier.badgeText, color: activeTier.color } : null,
    };
  });
}

export async function reconcilePendingMercadoPagoOrders() {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  await requireOrdersModule();
  const db = await getTenantDb();
  const pending = await db.order.findMany({
    where: { paymentMethod: "MP", paymentStatus: "PENDING", status: { not: "CANCELLED" }, createdAt: { gte: startOfBusinessDayUtc() } },
    select: { id: true, tenantId: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const results = await Promise.allSettled(pending.map((order) => findAndReconcileMercadoPagoOrder(order.id, order.tenantId || undefined)));
  const newlyPaid = results.flatMap((result) => result.status === "fulfilled" && result.value.transitionedToPaid ? [result.value.orderId] : []);
  if (newlyPaid.length) {
    const notificationIds = (await Promise.all(newlyPaid.map((orderId) => queueRelatedOrderConfirmationNotifications(orderId, pending.find((order) => order.id === orderId)?.tenantId || "")))).flat();
    after(async () => {
      for (const orderId of newlyPaid) await dispatchOrderPrint(orderId).catch((error) => console.error("Mercado Pago reconciliation print failed", { orderId, error }));
      await Promise.allSettled(notificationIds.map(async (id) => {
        const notification = await db.whatsAppNotification.findFirst({ where: { id }, select: { tenantId: true } });
        if (notification) await dispatchWhatsAppNotification(id, notification.tenantId);
      }));
    });
    revalidatePath("/admin/live");
  }
  return { success: true, updated: newlyPaid.length };
}

async function reserveStock(tx: any, requirements: ReturnType<typeof calculateOrderRequirements>) {
  const issues = getInventoryIssues(requirements);
  if (issues.length) throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify(issues))}`);

  for (const requirement of requirements) {
    const updated = await tx.ingredient.updateMany({
      where: { id: requirement.ingredientId, stock: { gte: requirement.required } },
      data: { stock: { decrement: requirement.required } },
    });
    if (updated.count !== 1) {
      const issue: InventoryIssue = { ...requirement, missing: requirement.required };
      throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify([issue]))}`);
    }
  }
}

async function releaseStock(tx: any, requirements: ReturnType<typeof calculateOrderRequirements>) {
  for (const requirement of requirements) {
    if (requirement.required > 0) {
      await tx.ingredient.update({
        where: { id: requirement.ingredientId },
        data: { stock: { increment: requirement.required } },
      });
    }
  }
}

export async function updateOrderStatus(orderId: string, requestedStatus: string) {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  await requireOrdersModule();
  const parsedId = z.string().uuid().safeParse(orderId);
  const parsedStatus = statusSchema.safeParse(requestedStatus);
  if (!parsedId.success || !parsedStatus.success) return { success: false, error: "Datos inválidos" };

  try {
    const db = await getTenantDb();
    const order = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          deliverySlot: true,
          items: {
            include: {
              removedIngredients: true,
              product: { include: { ingredients: { include: { ingredient: true } } } },
              secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
              comboItems: { include: { removedIngredients: true, product: { include: { ingredients: { include: { ingredient: true } } } } } },
            },
          },
        },
      });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      if (parsedStatus.data === current.status) return current;
      if (!transitions[current.status]?.includes(parsedStatus.data)) throw new Error("INVALID_TRANSITION");

      const requirements = calculateOrderRequirements(current.items);

      const shouldAwardPointsOnDelivered = parsedStatus.data === "DELIVERED" && current.clientId !== null && current.earnedPoints > 0 && !current.pointsAwarded;
      const shouldRevokePointsOnCancelled = parsedStatus.data === "CANCELLED" && current.clientId !== null && current.earnedPoints > 0 && current.pointsAwarded;

      const transitioned = await tx.order.updateMany({
        where: {
          id: orderId,
          status: current.status,
        },
        data: {
          status: parsedStatus.data,
          pointsAwarded: shouldAwardPointsOnDelivered ? true : shouldRevokePointsOnCancelled ? false : current.pointsAwarded,
          stockCommitted: parsedStatus.data === "CANCELLED"
            ? false
            : (parsedStatus.data === "IN_PROCESS" || parsedStatus.data === "DELIVERED" || parsedStatus.data === "FINISHED" || parsedStatus.data === "OUT_FOR_DELIVERY")
              ? true
              : current.stockCommitted,
        },
      });
      if (transitioned.count !== 1) throw new Error("CONCURRENT_TRANSITION");

      if (current.status === "NEW" && parsedStatus.data !== "CANCELLED" && !current.stockCommitted) {
        try {
          await reserveStock(tx, requirements);
        } catch (e) {
          console.warn("Could not reserve stock on admin status change:", e);
        }
      }

      if (parsedStatus.data === "CANCELLED" && current.deliverySlot) {
        await tx.deliveryTimeSlot.update({
          where: { id: current.deliverySlot.id },
          data: { available: Math.min(current.deliverySlot.capacity, current.deliverySlot.available + 1) },
        });
      }

      if (parsedStatus.data === "CANCELLED" && current.stockCommitted) {
        await releaseStock(tx, requirements);
      }

      if (shouldAwardPointsOnDelivered && current.clientId) {
        await tx.client.update({ where: { id: current.clientId }, data: { points: { increment: current.earnedPoints } } });
      }

      if (shouldRevokePointsOnCancelled && current.clientId) {
        await tx.client.update({ where: { id: current.clientId }, data: { points: { decrement: current.earnedPoints } } });
      }

      await tx.orderHistory.create({ data: { orderId, status: parsedStatus.data } });
      return tx.order.findUniqueOrThrow({ where: { id: orderId } });
    });

    const messages: Record<string, string> = {
      IN_PROCESS: "🔥 ¡Tu pedido ya se está preparando!",
      PENDING_DELIVERY: "✅ Tu pedido está listo y espera al repartidor.",
      OUT_FOR_DELIVERY: "🛵 ¡Tu pedido está en camino!",
      FINISHED: "✅ Tu pedido está listo para retirar.",
      DELIVERED: "🎉 Pedido entregado. ¡Gracias por elegirnos!",
      CANCELLED: "❌ Tu pedido fue cancelado.",
    };
    await sendOrderPush(order.id, "Actualización de tu pedido", messages[order.status] || "Tu pedido cambió de estado.");
    const whatsappEvent = notificationEventForStatus(order.status, order.needsDelivery);
    if (whatsappEvent) {
      const notificationId = await queueOrderWhatsAppNotification(order.id, whatsappEvent, order.tenantId);
      if (notificationId) after(() => dispatchWhatsAppNotification(notificationId, order.tenantId));
    }
    revalidatePath("/admin/live");
    revalidatePath("/admin/history");
    revalidatePath("/admin/calendar");
    revalidatePath(`/track/${order.id}`);
    return { success: true, order };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("STOCK_SHORTAGE:")) {
      try {
        const stockIssues = JSON.parse(decodeURIComponent(code.slice("STOCK_SHORTAGE:".length))) as InventoryIssue[];
        return { success: false, error: `No alcanza el stock. ${stockIssues.map(formatInventoryIssue).join(". ")}`, stockIssues };
      } catch {
        return { success: false, error: "No alcanza el stock para preparar este pedido." };
      }
    }
    return { success: false, error: code === "PAYMENT_PENDING" ? "El pago de Mercado Pago todavía no está acreditado" : code === "REFUND_REQUIRED" ? "Reembolsá primero el pago en Mercado Pago y esperá la confirmación" : "No se puede aplicar ese cambio de estado" };
  }
}

export async function assignMessenger(orderId: string, messengerId: string | null) {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  await requireOrdersModule();
  const normalizedMessengerId = (!messengerId || messengerId === "none" || messengerId.trim() === "") ? null : messengerId.trim();
  if (!z.string().uuid().safeParse(orderId).success || (normalizedMessengerId && !z.string().uuid().safeParse(normalizedMessengerId).success)) {
    return { success: false, error: "Datos inválidos" };
  }
  try {
    const db = await getTenantDb();
    if (normalizedMessengerId) {
      const messenger = await db.messenger.findFirst({ where: { id: normalizedMessengerId } });
      if (!messenger) return { success: false, error: "Repartidor no disponible" };
    }
    const order = await db.order.update({
      where: { id: orderId },
      data: { messengerId: normalizedMessengerId },
      include: { messenger: true },
    });
    revalidatePath("/admin/live");
    revalidatePath("/admin/history");
    revalidatePath("/admin/calendar");
    revalidatePath(`/track/${order.id}`);
    return { success: true, order };
  } catch {
    return { success: false, error: "Error asignando mensajero" };
  }
}

export async function dispatchMessengerRoadmap(messengerId: string) {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);
  await requireOrdersModule();
  if (!z.string().uuid().safeParse(messengerId).success) return { success: false, error: "Repartidor inválido" };
  try {
    const db = await getTenantDb();
    const orders = await db.$transaction(async (tx) => {
      const pending = await tx.order.findMany({
        where: { messengerId, status: "PENDING_DELIVERY" },
        orderBy: { createdAt: "asc" },
      });
      if (!pending.length) return [];
      await tx.order.updateMany({ where: { id: { in: pending.map((order) => order.id) }, status: "PENDING_DELIVERY" }, data: { status: "OUT_FOR_DELIVERY" } });
      await tx.orderHistory.createMany({ data: pending.map((order) => ({ orderId: order.id, status: "OUT_FOR_DELIVERY" })) });
      return pending;
    });
    if (!orders.length) return { success: false, error: "No hay pedidos pendientes para este repartidor" };

    const text = [
      `[ Hoja de Ruta - ${orders.length} pedidos ]`,
      "",
      ...orders.flatMap((order) => [
        `> Pedido #${order.id.slice(-5).toUpperCase()}`,
        `  Direc: ${order.deliveryAddress || "Sin dirección"}`,
        `  Cliente: ${order.clientName} (${order.clientPhone})`,
        `  === ${order.paymentMethod === "CASH" ? `A COBRAR: $${order.total.toLocaleString("es-AR")}` : order.paymentMethod === "ADMIN" ? "PAGADO EN MOSTRADOR" : order.paymentStatus === "PAID" ? "PAGADO (MP)" : "PAGO MP PENDIENTE"} ===`,
        "----------------------",
      ]),
    ].join("\n");
    await Promise.allSettled(orders.map((order) => sendOrderPush(order.id, "¡Tu pedido está en camino!", "🛵 En breve llega a tu domicilio.")));
    revalidatePath("/admin/live");
    return { success: true, text };
  } catch {
    return { success: false, error: "Error al despachar hoja de ruta" };
  }
}
