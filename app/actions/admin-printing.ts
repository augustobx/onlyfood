"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db";
import { dispatchOrderPrint, testPrintNode } from "@/lib/printnode";

const idSchema = z.string().uuid();

export async function printOrderNow(orderId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(orderId).success) return { success: false, error: "Pedido inválido." };
  const tenant = await getTenantContext();
  const db = await getTenantDb();
  const config = await db.systemConfig.findFirst({ select: { printingMode: true } });
  if (config?.printingMode !== "PRINTNODE") {
    return { success: true, mode: "BROWSER" as const, url: `/admin/live/print/${orderId}` };
  }
  const result = await dispatchOrderPrint(orderId, { force: true, tenantId: tenant.id });
  if (!result.success) {
    return { success: false, mode: "PRINTNODE" as const, error: result.jobs.filter((job) => !job.success).map((job) => job.error).join(" ") || result.error };
  }
  return { success: true, mode: "PRINTNODE" as const };
}

export async function testConfiguredPrinter(kind: "KITCHEN" | "COUNTER", printerId: number, rollSize: "58mm" | "80mm") {
  await requireAdmin();
  const parsed = z.object({
    kind: z.enum(["KITCHEN", "COUNTER"]),
    printerId: z.number().int().positive(),
    rollSize: z.enum(["58mm", "80mm"]),
  }).safeParse({ kind, printerId, rollSize });
  if (!parsed.success) return { success: false, error: "Impresora inválida." };
  const tenant = await getTenantContext();
  return testPrintNode(parsed.data.kind, parsed.data.printerId, parsed.data.rollSize, tenant.id);
}
