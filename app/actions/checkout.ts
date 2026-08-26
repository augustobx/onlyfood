"use server";

import { z } from "zod";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getTenantIntegration, type MercadoPagoCredentials } from "@/lib/tenant-integrations";
import { getLoggedClient } from "@/lib/auth";
import { getPublicConfig } from "@/lib/public-config";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { calculateOrderRequirements, formatInventoryIssue, getInventoryIssues, type InventoryIssue, type InventoryRequirement } from "@/lib/inventory";
import { dispatchOrderPrint } from "@/lib/printnode";
import { reconcileMercadoPagoPayment } from "@/lib/mercadopago-payments";
import { requireAdmin } from "@/lib/admin-session";

import { parseBusinessHours, isCurrentlyInBusinessHours } from "@/lib/business-hours";
import { isDailyProduct, isDateValidForProduct, getProductDaysLabel, getNextAvailableDate, WEEK_DAYS } from "@/lib/weekly-menu";

const idField = z.string().min(1).max(100);

const cartItemSchema = z.object({
  product: z.object({ id: idField }),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(500).optional().nullable(),
  removedIngredients: z.array(idField).max(50).default([]),
  addedExtras: z.array(z.object({ id: idField.optional(), extraId: idField.optional() }).passthrough()).max(30).default([]),
  secondHalfProduct: z.object({ id: idField }).optional().nullable(),
  comboRemovedIngredients: z.record(z.string(), z.array(idField).max(30)).optional(),
});

const orderSchema = z.object({
  clientName: z.string().trim().min(2).max(100),
  clientPhone: z.string().trim().min(6).max(35),
  needsDelivery: z.boolean(),
  deliveryAddress: z.string().trim().max(250).optional().nullable(),
  deliverySlotId: idField.optional().nullable(),
  orderType: z.enum(["IMMEDIATE", "SCHEDULED_TOMORROW", "CUSTOM_DATE"]).default("IMMEDIATE"),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().max(80).optional().nullable(),
  paymentMethod: z.enum(["CASH", "MP"]),
  items: z.array(cartItemSchema).min(1).max(40),
  rouletteWinId: idField.optional().nullable(),
  redemptionId: idField.optional().nullable(),
});

type PreparedItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  isHalfAndHalf: boolean;
  secondHalfProductId: string | null;
  removedIngredientIds: string[];
  extras: { id: string; price: number }[];
  comboItems: { productId: string; quantity: number; removedIngredientIds: string[] }[];
  stockRequirements: InventoryRequirement[];
  points: number;
  targetDateStr: string;
  targetScheduledDate: Date;
  targetOrderType: "IMMEDIATE" | "SCHEDULED_TOMORROW" | "CUSTOM_DATE";
  dayName: string;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function fetchConfig() {
  return getPublicConfig();
}

export async function confirmMercadoPagoReturn(orderId: string, paymentId: string) {
  try {
    const tenant = await getTenantContext();
    const result = await reconcileMercadoPagoPayment(paymentId, orderId, tenant.id);
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/admin/live");
    return { success: true, paymentStatus: result.paymentStatus };
  } catch (error) {
    console.error("confirmMercadoPagoReturn error:", error);
    return { success: false, error: "No se pudo confirmar el pago." };
  }
}

export async function createOrder(input: unknown) {
  return createOrderInternal(input, false);
}

export async function createAdminOrder(input: unknown) {
  await requireAdmin();
  return createOrderInternal(input, true);
}

async function createOrderInternal(input: unknown, adminDirectPaid: boolean) {
  try {
    if (!adminDirectPaid) {
      const ip = await getRequestIp();
      if (!(await consumeRateLimit("create-order", ip, 12, 10 * 60 * 1000))) {
        return { success: false, error: "Demasiados pedidos. Esperá unos minutos." };
      }
    }

    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error?.issues[0]?.message || "Los datos del pedido no son válidos." };
    }
    const data = parsed.data;
    if (data.needsDelivery && (!data.deliveryAddress || data.deliveryAddress.length < 5)) {
      return { success: false, error: "Ingresá una dirección de entrega válida." };
    }

    const tenant = await getTenantContext();
    const db = createTenantDb(tenant.id);
    const loggedClient = adminDirectPaid ? null : await getLoggedClient(tenant.id);

    const result = await db.$transaction(async (tx) => {
      const config = (await tx.systemConfig.findFirst()) || {
        appName: tenant.name,
        isStoreOpen: true,
        allowImmediateOrders: true,
        allowScheduledTomorrow: true,
        allowAdvanceOrders: true,
        paymentCash: true,
        paymentMp: true,
        globalDiscount: 0,
        deliveryCost: 0,
        asapEstimatedMinutes: 40,
        mpAccessToken: null,
      };
      if (!config) throw new Error("STORE_UNAVAILABLE");

      if (!adminDirectPaid) {
        if (data.orderType === "IMMEDIATE") {
          if (config.allowImmediateOrders === false) throw new Error("IMMEDIATE_ORDERS_DISABLED");
          let openNow = config.isStoreOpen;
          if (config.autoScheduleEnabled && config.businessHours) {
            const check = isCurrentlyInBusinessHours(parseBusinessHours(config.businessHours));
            openNow = openNow && check.isOpen;
          }
          if (!openNow) throw new Error("STORE_CLOSED");
        } else if (data.orderType === "SCHEDULED_TOMORROW") {
          if (!config.allowScheduledTomorrow) throw new Error("SCHEDULED_TOMORROW_DISABLED");
        } else if (data.orderType === "CUSTOM_DATE") {
          if (!config.allowAdvanceOrders) throw new Error("ADVANCE_ORDERS_DISABLED");
        }

        if (data.paymentMethod === "CASH" && !config.paymentCash) throw new Error("PAYMENT_DISABLED");
        if (data.paymentMethod === "MP" && (!config.paymentMp || !config.mpAccessToken)) throw new Error("PAYMENT_DISABLED");
      }

      let deliveryTimeDisplay = data.scheduledTime || "ASAP";
      let finalSlotId: string | null = null;

      if (data.deliverySlotId) {
        const slot = await tx.deliveryTimeSlot.findFirst({
          where: { id: data.deliverySlotId, isActive: true },
        });
        if (slot) {
          if (data.orderType === "IMMEDIATE") {
            const reserved = await tx.deliveryTimeSlot.updateMany({
              where: { id: slot.id, isActive: true, available: { gt: 0 } },
              data: { available: { decrement: 1 } },
            });
            if (reserved.count === 1) {
              finalSlotId = slot.id;
              deliveryTimeDisplay = slot.time;
            }
          } else {
            finalSlotId = slot.id;
            deliveryTimeDisplay = slot.time;
          }
        }
      } else if (data.orderType === "IMMEDIATE" && !data.scheduledTime) {
        deliveryTimeDisplay = `Inmediato (~${config.asapEstimatedMinutes || 40} min)`;
      }

      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formatIsoDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatIsoDate(now);
      const tomorrowStr = formatIsoDate(tomorrow);

      const productIds = [...new Set(data.items.flatMap((item) => [item.product.id, item.secondHalfProduct?.id].filter(Boolean) as string[]))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          ingredients: { include: { ingredient: true } },
          extras: { include: { extra: true } },
          comboItemsConfig: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } },
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));
      if (productMap.size !== productIds.length) throw new Error("PRODUCT_UNAVAILABLE");

      // Prepare items and calculate individual target delivery dates
      const prepared: PreparedItem[] = data.items.map((item) => {
        const product = productMap.get(item.product.id)!;
        const secondHalf = item.secondHalfProduct ? productMap.get(item.secondHalfProduct.id) : null;
        if (secondHalf && (!product.allowHalf || !secondHalf.allowHalf || product.categoryId !== secondHalf.categoryId)) {
          throw new Error("INVALID_HALF");
        }
        if (product.onlyHalf && !secondHalf) throw new Error("INVALID_HALF");

        const allowedExtras = new Map(
          product.extras.filter((entry) => entry.extra.isActive).map((entry) => [entry.extra.id, entry.extra]),
        );
        const extraIds = [...new Set(item.addedExtras.map((extra) => (extra.id || (extra as any).extraId) as string).filter(Boolean))];
        const extras = extraIds.map((id) => {
          const extra = allowedExtras.get(id);
          if (!extra) throw new Error("INVALID_EXTRA");
          return { id: extra.id, price: roundMoney(extra.price) };
        });

        const removable = new Set(product.ingredients.filter((entry) => entry.isRemovable).map((entry) => entry.ingredientId));
        const secondRemovable = new Set(secondHalf?.ingredients.filter((entry) => entry.isRemovable).map((entry) => entry.ingredientId) ?? []);
        const removedIngredientIds = [...new Set(item.removedIngredients)];
        if (removedIngredientIds.some((id) => !removable.has(id) && !secondRemovable.has(id))) throw new Error("INVALID_INGREDIENT");

        const comboItems = product.comboItemsConfig.map((comboItem) => {
          const allowedRemoved = new Set(comboItem.product.ingredients.filter((entry) => entry.isRemovable).map((entry) => entry.ingredientId));
          const requested = [...new Set(item.comboRemovedIngredients?.[comboItem.id] ?? [])];
          if (requested.some((id) => !allowedRemoved.has(id))) throw new Error("INVALID_INGREDIENT");
          return { productId: comboItem.productId, quantity: comboItem.quantity, removedIngredientIds: requested };
        });

        const stockRequirements: InventoryRequirement[] = [];
        const addStock = (usage: (typeof product.ingredients)[number], amount: number) => {
          if (amount > 0) stockRequirements.push({
            ingredientId: usage.ingredientId,
            name: usage.ingredient.name,
            required: amount,
            available: usage.ingredient.stock,
          });
        };
        if (product.isCombo) {
          product.comboItemsConfig.forEach((comboItem, index) => {
            const removed = new Set(comboItems[index]?.removedIngredientIds ?? []);
            for (const usage of comboItem.product.ingredients) {
              if (!removed.has(usage.ingredientId)) addStock(usage, usage.quantity * comboItem.quantity * item.quantity);
            }
          });
        } else if (secondHalf) {
          const removed = new Set(removedIngredientIds);
          for (const usage of product.ingredients) {
            if (!removed.has(usage.ingredientId)) addStock(usage, usage.quantity * item.quantity / 2);
          }
          for (const usage of secondHalf.ingredients) {
            if (!removed.has(usage.ingredientId)) addStock(usage, usage.quantity * item.quantity / 2);
          }
        } else {
          const removed = new Set(removedIngredientIds);
          for (const usage of product.ingredients) {
            if (!removed.has(usage.ingredientId)) addStock(usage, usage.quantity * item.quantity);
          }
        }

        const basePrice = secondHalf
          ? product.basePrice / 2 + secondHalf.basePrice / 2
          : product.basePrice;
        const unitPrice = roundMoney(basePrice + extras.reduce((sum, extra) => sum + extra.price, 0));

        // Determine target delivery date and type
        let targetDateStr = todayStr;
        let targetScheduledDate = now;
        let targetOrderType: "IMMEDIATE" | "SCHEDULED_TOMORROW" | "CUSTOM_DATE" = data.orderType;
        let dayName = "Hoy";

        if (!isDailyProduct(product.availableDays)) {
          const nextDate = getNextAvailableDate(product.availableDays, now);
          if (nextDate) {
            targetDateStr = nextDate.dateStr;
            targetScheduledDate = new Date(`${nextDate.dateStr}T12:00:00Z`);
            targetOrderType = nextDate.dateStr === todayStr ? "IMMEDIATE" : nextDate.dateStr === tomorrowStr ? "SCHEDULED_TOMORROW" : "CUSTOM_DATE";
            dayName = nextDate.dayName;
          }
        } else {
          if (data.orderType === "IMMEDIATE") {
            targetDateStr = todayStr;
            targetScheduledDate = now;
            targetOrderType = "IMMEDIATE";
            dayName = "Hoy";
          } else if (data.orderType === "SCHEDULED_TOMORROW") {
            targetDateStr = tomorrowStr;
            targetScheduledDate = tomorrow;
            targetOrderType = "SCHEDULED_TOMORROW";
            dayName = "Mañana";
          } else if (data.scheduledDate) {
            targetDateStr = data.scheduledDate;
            targetScheduledDate = new Date(`${data.scheduledDate}T12:00:00Z`);
            targetOrderType = "CUSTOM_DATE";
            const [y, m, d] = data.scheduledDate.split("-").map(Number);
            const parsed = new Date(y, m - 1, d, 12, 0, 0);
            const dayObj = WEEK_DAYS.find(w => w.dayIndex === parsed.getDay());
            dayName = dayObj?.name || "";
          }
        }

        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          subtotal: roundMoney(unitPrice * item.quantity),
          notes: item.notes || null,
          isHalfAndHalf: Boolean(secondHalf),
          secondHalfProductId: secondHalf?.id ?? null,
          removedIngredientIds,
          extras,
          comboItems,
          stockRequirements,
          points: product.points * item.quantity,
          targetDateStr,
          targetScheduledDate,
          targetOrderType,
          dayName,
        };
      });

      // Stock check and reservation
      const stockMap = new Map<string, InventoryRequirement>();
      for (const item of prepared) {
        for (const requirement of item.stockRequirements) {
          const current = stockMap.get(requirement.ingredientId);
          stockMap.set(requirement.ingredientId, {
            ...requirement,
            required: (current?.required ?? 0) + requirement.required,
          });
        }
      }
      const stockRequirements = [...stockMap.values()];

      const legacyPendingOrders = await tx.order.findMany({
        where: { status: "NEW", stockCommitted: false },
        include: {
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
      const legacyDemand = new Map<string, number>();
      for (const pendingOrder of legacyPendingOrders) {
        for (const requirement of calculateOrderRequirements(pendingOrder.items)) {
          legacyDemand.set(requirement.ingredientId, (legacyDemand.get(requirement.ingredientId) ?? 0) + requirement.required);
        }
      }
      const effectiveRequirements = stockRequirements.map((requirement) => ({
        ...requirement,
        available: Math.max(0, requirement.available - (legacyDemand.get(requirement.ingredientId) ?? 0)),
      }));
      const stockIssues = getInventoryIssues(effectiveRequirements);
      if (stockIssues.length) throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify(stockIssues))}`);

      for (const requirement of stockRequirements) {
        const reservedStock = await tx.ingredient.updateMany({
          where: { id: requirement.ingredientId, stock: { gte: requirement.required } },
          data: { stock: { decrement: requirement.required } },
        });
        if (reservedStock.count !== 1) {
          const issue: InventoryIssue = { ...requirement, missing: requirement.required };
          throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify([issue]))}`);
        }
      }

      // Group items by target delivery date
      const dateGroupsMap = new Map<string, { dateStr: string; scheduledDate: Date; orderType: string; dayName: string; items: PreparedItem[] }>();
      for (const item of prepared) {
        if (!dateGroupsMap.has(item.targetDateStr)) {
          dateGroupsMap.set(item.targetDateStr, {
            dateStr: item.targetDateStr,
            scheduledDate: item.targetScheduledDate,
            orderType: item.targetOrderType,
            dayName: item.dayName,
            items: [],
          });
        }
        dateGroupsMap.get(item.targetDateStr)!.items.push(item);
      }

      const dateGroups = Array.from(dateGroupsMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      // Global and coupon discounts
      const globalDiscount = Math.min(100, Math.max(0, config.globalDiscount));
      const totalRawSubtotal = prepared.reduce((sum, item) => sum + item.subtotal, 0);

      // Handle coupon / redemption
      let couponRewardProduct: any = null;
      if (data.redemptionId) {
        if (!loggedClient) throw new Error("INVALID_PRIZE");
        const redemption = await tx.pointRedemption.findUnique({
          where: { id: data.redemptionId },
          include: {
            reward: {
              include: { product: { include: { ingredients: { include: { ingredient: true } } } } },
            },
          },
        });
        if (
          !redemption ||
          redemption.clientId !== loggedClient.id ||
          redemption.status !== "AVAILABLE" ||
          (redemption.expiresAt && redemption.expiresAt <= new Date())
        ) {
          throw new Error("INVALID_PRIZE");
        }

        await tx.pointRedemption.update({
          where: { id: redemption.id },
          data: { status: "USED", usedAt: new Date() },
        });
        if (redemption.reward.type === "PRODUCT" && redemption.reward.product) {
          couponRewardProduct = redemption.reward.product;
        }
      }

      const adminPhoneKey = adminDirectPaid ? data.clientPhone.replace(/\D/g, "").slice(-6) : null;
      const adminClient = adminDirectPaid
        ? await tx.client.findFirst({
            where: {
              OR: [
                { phone: data.clientPhone },
                ...(adminPhoneKey?.length === 6 ? [{ phoneLoginKey: adminPhoneKey }] : []),
              ],
            },
            orderBy: [{ points: "desc" }, { createdAt: "asc" }],
            select: { id: true },
          })
        : null;

      const targetClientId = adminClient?.id ?? loggedClient?.id ?? null;
      let tierMultiplier = 1.0;
      if (targetClientId) {
        const [dbClient, tiers] = await Promise.all([
          tx.client.findUnique({
            where: { id: targetClientId },
            include: {
              orders: { where: { status: { not: "CANCELLED" } }, select: { id: true, total: true } },
              customTier: true,
            },
          }),
          tx.customerTier.findMany({ where: { isActive: true }, orderBy: { sequence: "desc" } }),
        ]);

        if (dbClient?.customTier) {
          tierMultiplier = dbClient.customTier.pointsMultiplier || 1.0;
        } else if (dbClient && tiers.length > 0) {
          const ordersCount = dbClient.orders.length;
          const totalSpent = dbClient.orders.reduce((sum, o) => sum + (o.total || 0), 0);
          const activeTier = tiers.find((t) => {
            const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
            const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
            const meetsPoints = t.minPoints === 0 || dbClient.points >= t.minPoints;
            return meetsOrders && meetsSpent && meetsPoints;
          }) || tiers[tiers.length - 1];
          tierMultiplier = activeTier?.pointsMultiplier || 1.0;
        }
      }

      const createdOrders = [];
      const numGroups = dateGroups.length;
      const deliveryPerGroup = data.needsDelivery ? Math.max(0, config.deliveryCost) : 0;

      for (let i = 0; i < numGroups; i++) {
        const group = dateGroups[i];
        let groupSubtotal = roundMoney(group.items.reduce((sum, item) => sum + item.subtotal, 0));
        groupSubtotal = roundMoney(groupSubtotal * (1 - globalDiscount / 100));

        const baseEarnedPoints = group.items.reduce((sum, item) => sum + item.points, 0);
        const groupEarnedPoints = Math.round(baseEarnedPoints * tierMultiplier);
        const groupTotal = roundMoney(groupSubtotal + deliveryPerGroup);

        const groupDeliveryTime =
          group.dateStr === todayStr && data.orderType === "IMMEDIATE"
            ? deliveryTimeDisplay
            : data.scheduledTime || (data.needsDelivery ? "Almuerzo / Vianda" : "Retiro");

        const order = await tx.order.create({
          data: {
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            needsDelivery: data.needsDelivery,
            deliveryAddress: data.needsDelivery ? data.deliveryAddress : null,
            deliveryTime: groupDeliveryTime,
            deliverySlotId: group.dateStr === todayStr ? finalSlotId : null,
            orderType: group.orderType,
            scheduledDate: group.scheduledDate,
            scheduledTime: groupDeliveryTime,
            paymentMethod: adminDirectPaid ? "ADMIN" : data.paymentMethod,
            total: groupTotal,
            status: "NEW",
            paymentStatus: adminDirectPaid ? "PAID" : "PENDING",
            clientId: adminClient?.id ?? loggedClient?.id ?? null,
            earnedPoints: groupEarnedPoints,
            stockCommitted: true,
            tenantId: tenant.id,
            locationId: tenant.primaryLocationId || null,
            items: {
              create: group.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                notes: item.notes,
                isHalfAndHalf: item.isHalfAndHalf,
                secondHalfProductId: item.secondHalfProductId,
                removedIngredients: { create: item.removedIngredientIds.map((ingredientId) => ({ ingredientId })) },
                addedExtras: { create: item.extras.map((extra) => ({ extraId: extra.id, price: extra.price })) },
                comboItems: {
                  create: item.comboItems.map((comboItem) => ({
                    productId: comboItem.productId,
                    quantity: comboItem.quantity,
                    removedIngredients: { create: comboItem.removedIngredientIds.map((ingredientId) => ({ ingredientId })) },
                  })),
                },
              })),
            },
            history: { create: { status: "NEW" } },
          },
        });

        createdOrders.push(order);
      }

      return {
        orders: createdOrders,
        primaryOrder: createdOrders[0],
        mpAccessToken: config.mpAccessToken,
        stockRequirements,
        totalGrand: roundMoney(createdOrders.reduce((sum, o) => sum + o.total, 0)),
      };
    });

    const primaryOrder = result.primaryOrder;
    let mpInitPoint: string | undefined;

    const mpCreds = await getTenantIntegration<MercadoPagoCredentials>(tenant.id, "MERCADO_PAGO");
    const resolvedMpAccessToken = mpCreds?.accessToken || result.mpAccessToken;

    if (primaryOrder.paymentMethod === "MP" && resolvedMpAccessToken) {
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl || (!baseUrl.startsWith("https://") && process.env.NODE_ENV === "production")) {
        throw new Error("BASE_URL_INVALID");
      }
      try {
        const preference = new Preference(new MercadoPagoConfig({ accessToken: resolvedMpAccessToken, options: { timeout: 8000 } }));
        const created = await preference.create({
          body: {
            items: [{
              id: primaryOrder.id,
              title: result.orders.length > 1 ? `Plan Semanal (${result.orders.length} pedidos)` : `Pedido ${tenant.name || "OnlyFood"}`,
              quantity: 1,
              unit_price: result.totalGrand,
              currency_id: "ARS"
            }],
            external_reference: primaryOrder.id,
            back_urls: {
              success: `${baseUrl}/track/${primaryOrder.id}?status=approved`,
              failure: `${baseUrl}/track/${primaryOrder.id}?status=failure`,
              pending: `${baseUrl}/track/${primaryOrder.id}?status=pending`,
            },
            auto_return: "approved",
            notification_url: `${baseUrl}/api/webhooks/mercadopago`,
          },
        });

        if (!created.id || !created.init_point) throw new Error("MP_PREFERENCE_FAILED");

        // Associate preference ID with all orders in the batch
        for (const ord of result.orders) {
          await db.order.update({ where: { id: ord.id }, data: { mpPreferenceId: created.id } });
        }

        mpInitPoint = created.init_point;
      } catch (error) {
        await db.$transaction(async (tx) => {
          for (const ord of result.orders) {
            await tx.order.update({ where: { id: ord.id }, data: { status: "CANCELLED", stockCommitted: false, history: { create: { status: "CANCELLED" } } } });
          }
          for (const requirement of result.stockRequirements) {
            await tx.ingredient.update({
              where: { id: requirement.ingredientId },
              data: { stock: { increment: requirement.required } },
            });
          }
        });
        console.error("MP Preference Error:", error);
        return { success: false, error: "No se pudo iniciar el pago. El pedido fue cancelado sin cargo." };
      }
    }

    if (primaryOrder.paymentMethod === "CASH" || primaryOrder.paymentMethod === "ADMIN") {
      for (const ord of result.orders) {
        after(() => dispatchOrderPrint(ord.id, { tenantId: tenant.id }).catch((error) => console.error("Automatic print failed", { orderId: ord.id, error })));
      }
    }

    revalidatePath("/admin/live");
    return {
      success: true,
      orderId: primaryOrder.id,
      allOrderIds: result.orders.map(o => o.id),
      isMultiDay: result.orders.length > 1,
      mpInitPoint
    };
  } catch (error) {
    console.error("Order creation failed:", error);
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("SCHEDULED_DAY_MISMATCH:")) {
      const parts = code.split(":");
      const prodName = decodeURIComponent(parts[1] || "Producto");
      const daysLabel = decodeURIComponent(parts[2] || "otros días");
      return {
        success: false,
        error: `El producto "${prodName}" solo se elabora los días ${daysLabel}. Por favor programá tu pedido para esa fecha.`
      };
    }
    if (code.startsWith("STOCK_SHORTAGE:")) {
      try {
        const issues = JSON.parse(decodeURIComponent(code.slice("STOCK_SHORTAGE:".length))) as InventoryIssue[];
        return { success: false, error: `No hay stock suficiente para completar el pedido. ${issues.map(formatInventoryIssue).join(". ")}` };
      } catch {
        return { success: false, error: "Uno de los productos se quedó sin stock." };
      }
    }
    const messages: Record<string, string> = {
      STORE_CLOSED: "El local está cerrado en este momento para pedidos inmediatos.",
      IMMEDIATE_ORDERS_DISABLED: "Los pedidos para el momento están desactivados. Podés programar tu pedido para mañana o por encargo.",
      SCHEDULED_TOMORROW_DISABLED: "Los pedidos programados para mañana no están habilitados actualmente.",
      ADVANCE_ORDERS_DISABLED: "Los pedidos por encargo no están habilitados actualmente.",
      PAYMENT_DISABLED: "Ese medio de pago no está disponible.",
      SLOT_UNAVAILABLE: "El horario seleccionado acaba de agotarse.",
      PRODUCT_UNAVAILABLE: "Uno de los productos ya no está disponible.",
      INVALID_HALF: "Combinación de mitades no permitida.",
      INVALID_EXTRA: "Uno de los agregados seleccionados no es válido.",
      INVALID_INGREDIENT: "Uno de los ingredientes seleccionados no es válido.",
      INVALID_TOTAL: "El total del pedido no es válido.",
      BASE_URL_INVALID: "La URL base del sitio no está configurada correctamente.",
      STORE_UNAVAILABLE: "El local no está disponible.",
    };
    return { success: false, error: messages[code] || "No se pudo procesar el pedido. Revisá los datos ingresados." };
  }
}
