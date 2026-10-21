"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db";
import { dispatchOrderPrint, testPrintNode } from "@/lib/printnode";
import { canDispatchPaidOrder } from "@/lib/order-integrity-policy";
import { requireTenantFeature } from "@/lib/features";

const idSchema = z.string().uuid();

export async function printOrderNow(orderId: string, kind?: "KITCHEN" | "COUNTER" | "ASSEMBLY") {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "STAFF"]);
  if (!idSchema.safeParse(orderId).success || (kind && !["KITCHEN","COUNTER","ASSEMBLY"].includes(kind))) return { success: false, error: "Pedido o tipo de ticket inválido." };
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "orders");
  const db = await getTenantDb();
  const order = await db.order.findFirst({ where: { id: orderId }, select: { paymentMethod: true, paymentStatus: true, status: true } });
  if (!order || order.status === "CANCELLED") return { success: false, error: "Pedido no disponible." };
  if (!canDispatchPaidOrder(order)) return { success: false, error: "Confirmá primero el pago electrónico antes de imprimir." };
  const config = await db.systemConfig.findFirst({ select: { printingMode: true, assemblyPrintEnabled: true } });
  if (kind === "ASSEMBLY" && !config?.assemblyPrintEnabled) return { success: false, error: "Habilitá primero el ticket de armado." };
  if (!config || config.printingMode === "BROWSER") {
    return { success: true, mode: "BROWSER" as const, url: `/admin/live/print/${orderId}${kind ? `?kind=${kind}` : ""}` };
  }
  if (config.printingMode === "PRINTNODE") await requireTenantFeature(tenant.id, "printNode");
  const result = await dispatchOrderPrint(orderId, { force: true, tenantId: tenant.id, kind });
  if (!result.success) {
    return { success: false, mode: config.printingMode as "PRINTNODE" | "NANOLABS_AGENT", error: result.jobs.filter((job) => !job.success).map((job) => job.error).join(" ") || result.error };
  }
  return { success: true, mode: config.printingMode as "PRINTNODE" | "NANOLABS_AGENT" };
}

export async function testConfiguredPrinter(kind: "KITCHEN" | "COUNTER", printerId: number, rollSize: "58mm" | "80mm") {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "STAFF"]);
  const parsed = z.object({
    kind: z.enum(["KITCHEN", "COUNTER"]),
    printerId: z.number().int().positive(),
    rollSize: z.enum(["58mm", "80mm"]),
  }).safeParse({ kind, printerId, rollSize });
  if (!parsed.success) return { success: false, error: "Impresora inválida." };
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "printNode");
  return testPrintNode(parsed.data.kind, parsed.data.printerId, parsed.data.rollSize, tenant.id);
}
