import { isCurrentlyInBusinessHours, parseBusinessHours } from "@/lib/business-hours";
import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/public-config";
import { getTenantContext } from "@/lib/tenant-context";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    const config = await getPublicConfig(tenant.id);
    const schedule = config?.autoScheduleEnabled ? isCurrentlyInBusinessHours(parseBusinessHours(config.businessHours)) : {isOpen: true};
    const activeSlots = config ? await (await import("@/lib/tenant-db")).createTenantDb(tenant.id).deliveryTimeSlot.count({where:{isActive:true,available:{gt:0}}}) : 0;
    const reason = !config?.isStoreOpen ? "Recepción pausada manualmente" : !schedule.isOpen ? "Fuera del horario de atención" : !config.allowImmediateOrders ? "Pedidos de hoy desactivados" : activeSlots === 0 ? "Sin cupos disponibles para hoy" : "Recibiendo pedidos de hoy";
    return NextResponse.json(config
      ? {
          ...config,
          storeAvailabilityReason: reason,
          acceptingToday: Boolean(config.isStoreOpen && schedule.isOpen && config.allowImmediateOrders && activeSlots > 0),
          whatsappOptInEnabled: tenant.features.has("whatsapp") && config.whatsappNotificationsEnabled,
        }
      : { appName: "nfood", isStoreOpen: false, whatsappOptInEnabled: false });
  } catch {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}
