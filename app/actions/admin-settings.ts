"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { saveTenantIntegration } from "@/lib/tenant-integrations";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { sendOrderPush } from "@/lib/push-notifications";

const idSchema = z.string().min(1).max(100);
const optionalAssetUrl = z.union([z.literal(""), z.string().url().max(2048), z.string().regex(/^\/(?!\/)[^\s]{1,2047}$/)]).nullable().optional();
const configSchema = z.object({
  appName: z.string().trim().min(1).max(80),
  isStoreOpen: z.boolean(), closedMessage: z.string().trim().min(1).max(500),
  whatsappMessage: z.string().trim().min(1).max(1000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  storeTheme: z.enum(["ORIGINAL", "NEXO", "URBAN_DARK", "FAST_NEO", "CLEAN_BOUTIQUE"]),
  splashEnabled: z.boolean(), splashDuration: z.number().int().min(0).max(30),
  splashType: z.enum(["IMAGE", "VIDEO"]),
  welcomeBalloonEnabled: z.boolean(), welcomeBalloonText: z.string().max(500), welcomeBalloonDuration: z.number().int().min(0).max(60),
  deliveryCost: z.number().min(0).max(10_000_000), globalDiscount: z.number().min(0).max(100),
  splashUrl: optionalAssetUrl, splashVideoUrl: optionalAssetUrl, logoUrl: optionalAssetUrl, backgroundUrl: optionalAssetUrl, backgroundBlur: z.boolean(),
  paymentCash: z.boolean(), paymentMp: z.boolean(), autoPrintTickets: z.boolean(),
  printingMode: z.enum(["BROWSER", "PRINTNODE"]),
  printNodeCounterPrinterId: z.number().int().positive().nullable(),
  printNodeKitchenPrinterId: z.number().int().positive().nullable(),
  mpAccessToken: z.string().trim().max(1000).nullable().optional(), mpPublicKey: z.string().trim().max(1000).nullable().optional(),
  printerCounterName: z.string().max(100).nullable().optional(), printerCounterSize: z.enum(["58mm", "80mm"]),
  printerKitchenName: z.string().max(100).nullable().optional(), printerKitchenSize: z.enum(["58mm", "80mm"]),
  whatsappBotEnabled: z.boolean(), metaApiToken: z.string().trim().max(4000).nullable().optional(),
  metaPhoneNumberId: z.string().trim().max(100).nullable().optional(), metaVerifyToken: z.string().trim().max(500).nullable().optional(),
  allowImmediateOrders: z.boolean().default(true),
  allowScheduledTomorrow: z.boolean().default(true),
  allowAdvanceOrders: z.boolean().default(true),
  advanceOrderMinDays: z.number().int().min(1).max(365).default(1),
  advanceOrderMaxDays: z.number().int().min(1).max(365).default(30),
  asapEstimatedMinutes: z.number().int().min(5).max(300).default(40),
  businessHours: z.string().nullable().optional(),
  autoScheduleEnabled: z.boolean().default(false),
}).strict()
  .refine((value) => value.paymentCash || value.paymentMp, { message: "Debe habilitar al menos un medio de pago." })
  .refine((value) => value.printingMode !== "PRINTNODE" || (value.printNodeCounterPrinterId && value.printNodeKitchenPrinterId), {
    message: "Para usar PrintNode completá los IDs de cocina y mostrador.",
  });

export async function updateConfig(id: string, data: unknown) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = configSchema.safeParse(data);
  if (!parsedId.success || !parsed.success) return { success: false, error: parsed.error?.issues[0]?.message || "Configuracion invalida." };
  try {
    const tenant = await getTenantContext();
    const db = await getTenantDb();

    // Guardar integraciones de forma cifrada si se modificaron
    if (parsed.data.mpAccessToken) {
      await saveTenantIntegration(tenant.id, "MERCADO_PAGO", {
        accessToken: parsed.data.mpAccessToken,
        publicKey: parsed.data.mpPublicKey || undefined,
      });
    }

    if (parsed.data.metaApiToken && parsed.data.metaPhoneNumberId) {
      await saveTenantIntegration(tenant.id, "WHATSAPP", {
        apiToken: parsed.data.metaApiToken,
        phoneNumberId: parsed.data.metaPhoneNumberId,
        verifyToken: parsed.data.metaVerifyToken || "",
      });
    }

    await db.$transaction(async (tx) => {
      const config = await tx.systemConfig.findFirst();
      if (!config) {
        await tx.systemConfig.create({ data: { ...parsed.data, tenantId: tenant.id } });
      } else {
        await tx.systemConfig.update({ where: { id: config.id }, data: parsed.data });
      }
    });

    revalidatePath("/admin/settings"); revalidatePath("/admin/live"); revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Config update failed", error);
    return { success: false, error: "No se pudo actualizar la configuracion." };
  }
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
