"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantIntegration, saveTenantIntegration, setTenantIntegrationActive, type WhatsAppCredentials } from "@/lib/tenant-integrations";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { sendOrderPush } from "@/lib/push-notifications";
import { dispatchWhatsAppNotification } from "@/lib/whatsapp-notifications";
import { hasTenantFeature, requireTenantFeature } from "@/lib/features";

const idSchema = z.string().min(1).max(100);
const optionalAssetUrl = z.union([z.literal(""), z.string().url().max(2048), z.string().regex(/^\/(?!\/)[^\s]{1,2047}$/)]).nullable().optional();
const configSchema = z.object({
  appName: z.string().trim().min(1).max(80),
  isStoreOpen: z.boolean(), closedMessage: z.string().trim().min(1).max(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  storeTheme: z.enum(["ORIGINAL", "NEXO", "URBAN_DARK", "FAST_NEO", "CLEAN_BOUTIQUE", "FRESH_MARKET", "RETRO_DINER", "COMIC_FOOD_POP", "ARCADE_KITCHEN", "SUSHI_ZEN"]),
  splashEnabled: z.boolean(), splashDuration: z.number().int().min(0).max(30),
  splashType: z.enum(["IMAGE", "VIDEO"]),
  welcomeBalloonEnabled: z.boolean(), welcomeBalloonText: z.string().max(500), welcomeBalloonDuration: z.number().int().min(0).max(60),
  noticeBoardEnabled: z.boolean(),
  noticeBoardTitle: z.string().trim().max(80),
  noticeBoardMessage: z.string().trim().max(2000),
  noticeBoardAutoClose: z.boolean(),
  noticeBoardDuration: z.number().int().min(3).max(120),
  deliveryCost: z.number().min(0).max(10_000_000), globalDiscount: z.number().min(0).max(100),
  splashUrl: optionalAssetUrl, splashVideoUrl: optionalAssetUrl, logoUrl: optionalAssetUrl, backgroundUrl: optionalAssetUrl, backgroundBlur: z.boolean(),
  paymentCash: z.boolean(), paymentMp: z.boolean(), autoPrintTickets: z.boolean(),
  kitchenPattyCountEnabled: z.boolean(),
  kitchenPattyKeywords: z.string().trim().min(1).max(250),
  printingMode: z.enum(["BROWSER", "PRINTNODE", "NANOLABS_AGENT"]),
  printNodeCounterPrinterId: z.number().int().positive().nullable(),
  printNodeKitchenPrinterId: z.number().int().positive().nullable(),
  mpAccessToken: z.string().trim().max(1000).nullable().optional(), mpPublicKey: z.string().trim().max(1000).nullable().optional(),
  printerCounterName: z.string().max(100).nullable().optional(), printerCounterSize: z.enum(["58mm", "80mm"]),
  printerKitchenName: z.string().max(100).nullable().optional(), printerKitchenSize: z.enum(["58mm", "80mm"]),
  whatsappNotificationsEnabled: z.boolean(),
  whatsappNotifyOrderConfirmed: z.boolean(),
  whatsappNotifyOrderPreparing: z.boolean(),
  whatsappNotifyOrderReady: z.boolean(),
  whatsappTemplateLanguage: z.string().trim().regex(/^[a-z]{2}_[A-Z]{2}$/).max(10),
  whatsappConfirmedTemplate: z.string().trim().regex(/^[a-z0-9_]+$/).max(100),
  whatsappPreparingTemplate: z.string().trim().regex(/^[a-z0-9_]+$/).max(100),
  whatsappReadyPickupTemplate: z.string().trim().regex(/^[a-z0-9_]+$/).max(100),
  whatsappReadyDeliveryTemplate: z.string().trim().regex(/^[a-z0-9_]+$/).max(100),
  whatsappDefaultCountryCode: z.string().trim().regex(/^\d{1,4}$/),
  metaApiToken: z.string().trim().max(4000).nullable().optional(),
  metaPhoneNumberId: z.union([z.literal(""), z.string().trim().regex(/^\d{5,30}$/).max(100)]).nullable().optional(),
  metaVerifyToken: z.union([z.literal(""), z.string().trim().min(16).max(500)]).nullable().optional(),
  metaApiVersion: z.string().trim().regex(/^v\d{1,2}\.\d$/).max(10),
  allowImmediateOrders: z.boolean().default(true),
  allowScheduledTomorrow: z.boolean().default(true),
  allowAdvanceOrders: z.boolean().default(true),
  advanceOrderMinDays: z.number().int().min(0).max(365).default(1),
  advanceOrderMaxDays: z.number().int().min(1).max(365).default(30),
  asapEstimatedMinutes: z.number().int().min(5).max(300).default(40),
  businessHours: z.string().nullable().optional(),
  autoScheduleEnabled: z.boolean().default(false),
}).strict()
  .refine((value) => !value.noticeBoardEnabled || (value.noticeBoardTitle.length > 0 && value.noticeBoardMessage.length > 0), {
    message: "Para activar el tablón completá el título y el mensaje.",
  })
  .refine((value) => value.paymentCash || value.paymentMp, { message: "Debe habilitar al menos un medio de pago." })
  .refine((value) => value.printingMode !== "PRINTNODE" || (value.printNodeCounterPrinterId && value.printNodeKitchenPrinterId), {
    message: "Para usar PrintNode completá los IDs de cocina y mostrador.",
  });

export async function updateConfig(id: string, data: unknown) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsedId = idSchema.safeParse(id);
  const parsed = configSchema.safeParse(data);
  if (!parsedId.success || !parsed.success) return { success: false, error: parsed.error?.issues[0]?.message || "Configuracion invalida." };
  try {
    const tenant = await getTenantContext();
    const [whatsappEnabled, printNodeEnabled] = await Promise.all([
      hasTenantFeature(tenant.id, "whatsapp"),
      hasTenantFeature(tenant.id, "printNode"),
    ]);
    if (parsed.data.whatsappNotificationsEnabled && !whatsappEnabled) {
      return { success: false, error: "WhatsApp está desactivado para este comercio." };
    }
    if (parsed.data.printingMode === "PRINTNODE" && !printNodeEnabled) {
      return { success: false, error: "PrintNode está desactivado para este comercio." };
    }
    const db = await getTenantDb();
    const existingWhatsApp = await getTenantIntegration<WhatsAppCredentials>(tenant.id, "WHATSAPP");

    // Guardar integraciones de forma cifrada si se modificaron
    if (parsed.data.mpAccessToken) {
      await saveTenantIntegration(tenant.id, "MERCADO_PAGO", {
        accessToken: parsed.data.mpAccessToken,
        publicKey: parsed.data.mpPublicKey || undefined,
      });
    }

    const nextWhatsApp: WhatsAppCredentials = {
      apiToken: parsed.data.metaApiToken || existingWhatsApp?.apiToken || "",
      phoneNumberId: parsed.data.metaPhoneNumberId || existingWhatsApp?.phoneNumberId || "",
      verifyToken: parsed.data.metaVerifyToken || existingWhatsApp?.verifyToken || "",
      apiVersion: parsed.data.metaApiVersion || existingWhatsApp?.apiVersion || "v23.0",
    };
    const whatsappCredentialsTouched = Boolean(parsed.data.metaApiToken || parsed.data.metaPhoneNumberId || parsed.data.metaVerifyToken);
    if ((parsed.data.whatsappNotificationsEnabled || whatsappCredentialsTouched) && (!nextWhatsApp.apiToken || !nextWhatsApp.phoneNumberId || !nextWhatsApp.verifyToken)) {
      return { success: false, error: "Para activar WhatsApp completá el token permanente, Phone Number ID y token de verificación." };
    }
    if (whatsappCredentialsTouched || existingWhatsApp) {
      await saveTenantIntegration(tenant.id, "WHATSAPP", {
        ...nextWhatsApp,
      });
    }

    const {
      mpAccessToken: _mpAccessToken,
      mpPublicKey: _mpPublicKey,
      metaApiToken: _metaApiToken,
      metaPhoneNumberId: _metaPhoneNumberId,
      metaVerifyToken: _metaVerifyToken,
      metaApiVersion: _metaApiVersion,
      ...configData
    } = parsed.data;
    const safeConfigData = {
      ...configData,
      mpAccessToken: null,
      mpPublicKey: null,
      metaApiToken: null,
      metaPhoneNumberId: null,
      metaVerifyToken: null,
      vapidPrivateKey: null,
    };

    await db.$transaction(async (tx) => {
      const config = await tx.systemConfig.findFirst();
      if (!config) {
        await tx.systemConfig.create({ data: { ...safeConfigData, tenantId: tenant.id } });
      } else {
        await tx.systemConfig.update({ where: { id: config.id }, data: safeConfigData });
      }
    });

    revalidatePath("/admin/settings"); revalidatePath("/admin/live"); revalidatePath("/");
    return { success: true, whatsappConfigured: Boolean(nextWhatsApp.apiToken && nextWhatsApp.phoneNumberId && nextWhatsApp.verifyToken) };
  } catch (error) {
    console.error("Config update failed", error);
    return { success: false, error: "No se pudo actualizar la configuracion." };
  }
}

export async function testWhatsAppConnection() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "whatsapp");
  const credentials = await getTenantIntegration<WhatsAppCredentials>(tenant.id, "WHATSAPP");
  if (!credentials?.apiToken || !credentials.phoneNumberId) return { success: false, error: "No hay credenciales activas de WhatsApp." };
  const apiVersion = credentials.apiVersion || process.env.META_GRAPH_API_VERSION || "v23.0";
  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${credentials.phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${credentials.apiToken}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({})) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
    if (!response.ok) return { success: false, error: body.error?.message || `Meta respondió HTTP ${response.status}.` };
    return { success: true, phone: body.display_phone_number || credentials.phoneNumberId, name: body.verified_name || "Cuenta verificada" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo conectar con Meta." };
  }
}

export async function disconnectWhatsAppIntegration() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "whatsapp");
  const db = await getTenantDb();
  await Promise.all([
    setTenantIntegrationActive(tenant.id, "WHATSAPP", false),
    db.systemConfig.updateMany({ where: {}, data: { whatsappNotificationsEnabled: false } }),
  ]);
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function retryWhatsAppNotification(notificationId: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsedId = z.string().uuid().safeParse(notificationId);
  if (!parsedId.success) return { success: false, error: "Notificación inválida." };
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "whatsapp");
  const db = await getTenantDb();
  const notification = await db.whatsAppNotification.findFirst({ where: { id: notificationId }, select: { status: true } });
  if (!notification || notification.status !== "FAILED") return { success: false, error: "Solo se pueden reintentar envíos fallidos." };
  const result = await dispatchWhatsAppNotification(notificationId, tenant.id);
  revalidatePath("/admin/settings");
  return result;
}

export async function setStoreOpen(isStoreOpen: boolean) {
  await requireAdmin();
  if (typeof isStoreOpen !== "boolean") return { success: false, error: "Estado invalido." };
  try {
    const db = await getTenantDb();
    const config = await db.systemConfig.findFirst({ select: { id: true } });
    if (!config) return { success: false, error: "No se encontro la configuracion del local." };
    const updated = await db.systemConfig.update({
      where: { id: config.id },
      data: { isStoreOpen },
      select: { isStoreOpen: true },
    });
    revalidatePath("/");
    revalidatePath("/admin/live");
    revalidatePath("/admin/settings");
    return { success: true, isStoreOpen: updated.isStoreOpen };
  } catch (error) {
    console.error("Store state update failed", error);
    return { success: false, error: "No se pudo cambiar el estado de la aplicacion." };
  }
}

export async function setModuleState(moduleName: "IMMEDIATE" | "TOMORROW" | "ADVANCE", enabled: boolean) {
  await requireAdmin();
  if (typeof enabled !== "boolean") return { success: false, error: "Estado inválido." };
  try {
    const db = await getTenantDb();
    const config = await db.systemConfig.findFirst({ select: { id: true } });
    if (!config) return { success: false, error: "No se encontró la configuración del local." };

    const updateData =
      moduleName === "IMMEDIATE"
        ? { allowImmediateOrders: enabled }
        : moduleName === "TOMORROW"
        ? { allowScheduledTomorrow: enabled }
        : { allowAdvanceOrders: enabled };

    const updated = await db.systemConfig.update({
      where: { id: config.id },
      data: updateData,
    });
    revalidatePath("/");
    revalidatePath("/admin/live");
    revalidatePath("/admin/settings");
    return { success: true, updated };
  } catch (error) {
    console.error("Module state update failed", error);
    return { success: false, error: "No se pudo cambiar el estado del módulo." };
  }
}

export async function addDeliverySlot(data: unknown) {
  await requireAdmin();
  const parsed = z.object({ time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), capacity: z.number().int().min(1).max(1000) }).strict().safeParse(data);
  if (!parsed.success) return { success: false, error: "Horario o capacidad invalidos." };
  try {
    const db = await getTenantDb();
    const slot = await db.deliveryTimeSlot.create({ data: { ...parsed.data, available: parsed.data.capacity, isActive: true } });
    revalidatePath("/admin/settings"); return { success: true, slot };
  } catch { return { success: false, error: "No se pudo agregar el horario." }; }
}

export async function toggleDeliverySlot(id: string, isActive: boolean) {
  await requireAdmin(); if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos invalidos." };
  try { const db = await getTenantDb(); await db.deliveryTimeSlot.update({ where: { id }, data: { isActive } }); revalidatePath("/admin/settings"); return { success: true }; }
  catch { return { success: false, error: "No se pudo actualizar el horario." }; }
}

export async function updateSlotAvailable(id: string, delta: number) {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, delta: z.number().int().min(-1000).max(1000) }).safeParse({ id, delta });
  if (!parsed.success) return { success: false, error: "Datos invalidos." };
  try {
    const db = await getTenantDb();
    const slot = await db.$transaction(async (tx) => {
      const slot = await tx.deliveryTimeSlot.findUnique({ where: { id } });
      if (!slot) throw new Error("NOT_FOUND");
      const appliedDelta = delta > 0
        ? Math.min(delta, Math.max(0, 1000 - slot.capacity))
        : Math.max(delta, -slot.available);
      return tx.deliveryTimeSlot.update({
        where: { id },
        data: {
          available: slot.available + appliedDelta,
          capacity: slot.capacity + appliedDelta,
        },
      });
    });
    revalidatePath("/admin/live"); return { success: true, slot };
  } catch { return { success: false, error: "No se pudieron modificar los cupos." }; }
}

export async function deleteDeliverySlot(id: string) {
  await requireAdmin(); if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido." };
  try { const db = await getTenantDb(); await db.deliveryTimeSlot.delete({ where: { id } }); revalidatePath("/admin/settings"); return { success: true }; }
  catch { return { success: false, error: "No se puede eliminar un horario asociado a pedidos." }; }
}

export async function addMessenger(data: unknown) {
  await requireAdmin();
  const parsed = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/) }).strict().safeParse(data);
  if (!parsed.success) return { success: false, error: "Nombre o telefono invalido." };
  try { const db = await getTenantDb(); const messenger = await db.messenger.create({ data: { ...parsed.data, isActive: true } }); revalidatePath("/admin/settings"); revalidatePath("/admin/live"); return { success: true, messenger }; }
  catch { return { success: false, error: "No se pudo agregar el mensajero." }; }
}

export async function toggleMessenger(id: string, isActive: boolean) {
  await requireAdmin(); if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos invalidos." };
  try { const db = await getTenantDb(); await db.messenger.update({ where: { id }, data: { isActive } }); revalidatePath("/admin/settings"); revalidatePath("/admin/live"); return { success: true }; }
  catch { return { success: false, error: "No se pudo actualizar el mensajero." }; }
}

export async function broadcastPushNotification(title: string, body: string, url = "/") {
  await requireAdmin();
  const parsed = z.object({ title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(500), url: z.string().regex(/^\/(?!\/)/).max(500) }).safeParse({ title, body, url });
  if (!parsed.success) return { success: false, error: "Notificacion invalida." };
  const db = await getTenantDb();
  const subscriptions = await db.pushSubscription.findMany({ select: { orderId: true } });
  const orderIds = [...new Set(subscriptions.map((sub) => sub.orderId).filter((id): id is string => Boolean(id)))];
  await Promise.allSettled(orderIds.map((orderId) => sendOrderPush(orderId, parsed.data.title, parsed.data.body, parsed.data.url)));
  return { success: true, message: `Notificacion procesada para ${subscriptions.length} dispositivos.` };
}
