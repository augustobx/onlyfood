import "server-only";

import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";
import { getTenantIntegration, type WhatsAppCredentials } from "@/lib/tenant-integrations";
import { hasTenantFeature } from "@/lib/features";
import {
  formatOrderDetailForWhatsApp,
  normalizeWhatsAppRecipient,
  type WhatsAppNotificationEvent,
} from "@/lib/whatsapp-message-utils";

const graphVersionPattern = /^v\d{1,2}\.\d$/;

const orderInclude = {
  items: {
    include: {
      product: { select: { name: true } },
      secondHalfProduct: { select: { name: true } },
      addedExtras: { include: { extra: { select: { name: true } } } },
      removedIngredients: { include: { ingredient: { select: { name: true } } } },
      comboItems: { include: { product: { select: { name: true } } } },
    },
  },
} as const;

function eventEnabled(config: any, event: WhatsAppNotificationEvent) {
  if (!config.whatsappNotificationsEnabled) return false;
  if (event === "ORDER_CONFIRMED") return config.whatsappNotifyOrderConfirmed;
  if (event === "ORDER_PREPARING") return config.whatsappNotifyOrderPreparing;
  return config.whatsappNotifyOrderReady;
}

function templateForEvent(config: any, event: WhatsAppNotificationEvent) {
  if (event === "ORDER_CONFIRMED") return config.whatsappConfirmedTemplate;
  if (event === "ORDER_PREPARING") return config.whatsappPreparingTemplate;
  if (event === "ORDER_READY_PICKUP") return config.whatsappReadyPickupTemplate;
  return config.whatsappReadyDeliveryTemplate;
}

function parametersForEvent(order: any, appName: string, event: WhatsAppNotificationEvent) {
  const shortId = order.id.slice(-6).toUpperCase();
  if (event === "ORDER_CONFIRMED") {
    const delivery = order.needsDelivery
      ? `Envío a ${order.deliveryAddress || "domicilio"}${order.deliveryTime ? ` — ${order.deliveryTime}` : ""}`
      : `Retiro en el local${order.deliveryTime ? ` — ${order.deliveryTime}` : ""}`;
    return [
      order.clientName,
      shortId,
      appName,
      formatOrderDetailForWhatsApp(order.items),
      `$${order.total.toLocaleString("es-AR")}`,
      delivery,
    ];
  }
  if (event === "ORDER_PREPARING") return [order.clientName, shortId, appName];
  if (event === "ORDER_READY_PICKUP") return [order.clientName, shortId, appName];
  return [order.clientName, shortId, order.deliveryAddress || "tu domicilio", appName];
}

function templatePayload(to: string, templateName: string, language: string, parameters: string[]) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [{
        type: "body",
        parameters: parameters.map((text) => ({ type: "text", text })),
      }],
    },
  };
}

async function markFailed(notificationId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Error desconocido");
  await prisma.whatsAppNotification.update({
    where: { id: notificationId },
    data: { status: "FAILED", error: message.slice(0, 4000) },
  }).catch(() => undefined);
}

export async function queueOrderWhatsAppNotification(
  orderId: string,
  event: WhatsAppNotificationEvent,
  tenantId: string,
): Promise<string | null> {
  if (!(await hasTenantFeature(tenantId, "whatsapp"))) return null;
  const db = createTenantDb(tenantId);
  const [config, order] = await Promise.all([
    db.systemConfig.findFirst(),
    db.order.findFirst({ where: { id: orderId }, include: orderInclude }),
  ]);
  if (!config || !order || !order.whatsappOptIn || !eventEnabled(config, event)) return null;

  const normalizedRecipient = normalizeWhatsAppRecipient(order.clientPhone, config.whatsappDefaultCountryCode);
  const recipient = normalizedRecipient || order.clientPhone.replace(/\s/g, "").slice(0, 30) || "INVALID";

  const existing = await db.whatsAppNotification.findFirst({ where: { orderId, event }, select: { id: true } });
  if (existing) return null;

  try {
    const notification = await db.whatsAppNotification.create({
      data: {
        tenantId,
        orderId,
        event,
        recipient,
        templateName: templateForEvent(config, event),
        status: normalizedRecipient ? "PENDING" : "FAILED",
        error: normalizedRecipient ? null : "El teléfono del pedido no se puede convertir al formato internacional de WhatsApp.",
      },
      select: { id: true },
    });
    return normalizedRecipient ? notification.id : null;
  } catch (error) {
    // La combinación pedido/evento es única: un cambio repetido nunca duplica el aviso.
    if ((error as { code?: string })?.code === "P2002") return null;
    throw error;
  }
}

export async function dispatchWhatsAppNotification(notificationId: string, tenantId: string) {
  const claimed = await prisma.whatsAppNotification.updateMany({
    where: { id: notificationId, tenantId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, error: null },
  });
  if (claimed.count !== 1) return { success: false, error: "La notificación ya fue procesada." };

  try {
    const [notification, config, credentials] = await Promise.all([
      prisma.whatsAppNotification.findFirst({
        where: { id: notificationId, tenantId },
        include: { order: { include: orderInclude } },
      }),
      prisma.systemConfig.findFirst({ where: { tenantId } }),
      getTenantIntegration<WhatsAppCredentials>(tenantId, "WHATSAPP"),
    ]);
    if (!notification || !config) throw new Error("No se encontró la configuración o el pedido.");
    if (!credentials?.apiToken || !credentials.phoneNumberId) throw new Error("La integración de WhatsApp no tiene credenciales activas.");

    const apiVersion = graphVersionPattern.test(credentials.apiVersion || "")
      ? credentials.apiVersion!
      : (process.env.META_GRAPH_API_VERSION || "v23.0");
    if (!graphVersionPattern.test(apiVersion)) throw new Error("La versión configurada de Meta Graph API no es válida.");

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${credentials.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload(
        notification.recipient,
        notification.templateName,
        config.whatsappTemplateLanguage,
        parametersForEvent(notification.order, config.appName, notification.event as WhatsAppNotificationEvent),
      )),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } };
    if (!response.ok || !body.messages?.[0]?.id) {
      throw new Error(body.error?.message || `Meta respondió HTTP ${response.status}.`);
    }

    await prisma.whatsAppNotification.update({
      where: { id: notification.id },
      data: { status: "SENT", providerMessageId: body.messages[0].id, sentAt: new Date(), error: null },
    });
    return { success: true };
  } catch (error) {
    await markFailed(notificationId, error);
    console.error("[WhatsApp notification failed]", { notificationId, tenantId, error });
    return { success: false, error: error instanceof Error ? error.message : "No se pudo enviar la notificación." };
  }
}

export async function queueRelatedOrderConfirmationNotifications(orderId: string, tenantId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true, mpPreferenceId: true } });
  if (!order) return [];
  const orders = order.mpPreferenceId
    ? await prisma.order.findMany({ where: { tenantId, mpPreferenceId: order.mpPreferenceId }, select: { id: true } })
    : [order];
  return (await Promise.all(orders.map((item) => queueOrderWhatsAppNotification(item.id, "ORDER_CONFIRMED", tenantId)))).filter((id): id is string => Boolean(id));
}

export async function applyWhatsAppDeliveryStatuses(
  tenantId: string,
  statuses: Array<{ id?: string; status?: string; errors?: unknown }>,
) {
  for (const receipt of statuses) {
    if (!receipt.id || !receipt.status) continue;
    const status = receipt.status.toLowerCase();
    const data = status === "read"
      ? { status: "READ", readAt: new Date(), deliveredAt: new Date() }
      : status === "delivered"
        ? { status: "DELIVERED", deliveredAt: new Date() }
        : status === "sent"
          ? { status: "SENT" }
          : status === "failed"
            ? { status: "FAILED", error: JSON.stringify(receipt.errors || "Meta informó un fallo.").slice(0, 4000) }
            : null;
    if (data) await prisma.whatsAppNotification.updateMany({ where: { tenantId, providerMessageId: receipt.id }, data });
  }
}
