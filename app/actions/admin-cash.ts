"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { recordAuditLog } from "@/lib/audit";
import { currentBusinessDate, getCashDashboard } from "@/lib/cash-register";
import { getTenantDb } from "@/lib/tenant-db";
import { requireTenantFeature } from "@/lib/features";

const idSchema = z.string().uuid();
const moneySchema = z.coerce.number().finite().min(0).max(100_000_000);

export async function openCashSessionAction(input: unknown) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER", "CASHIER"]);
  await requireTenantFeature(tenant.id, "cashRegister");
  const parsed = z.object({ locationId: idSchema, openingBalance: moneySchema, notes: z.string().trim().max(2000).optional().default("") }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos de apertura inválidos." };
  try {
    const db = await getTenantDb();
    const location = await db.location.findFirst({ where: { id: parsed.data.locationId, isActive: true }, select: { id: true } });
    if (!location) return { success: false, error: "La sucursal no pertenece al comercio." };
    const businessDate = currentBusinessDate();
    const existing = await db.cashSession.findFirst({ where: { locationId: location.id, businessDate } });
    if (existing) return { success: false, error: existing.status === "OPEN" ? "La caja de hoy ya está abierta." : "La caja de hoy ya fue cerrada. Podés reabrirla desde el historial." };
    const session = await db.cashSession.create({ data: {
      tenantId: tenant.id,
      locationId: location.id,
      businessDate,
      openingBalance: parsed.data.openingBalance,
      openingNotes: parsed.data.notes || null,
      openedByUserId: user.id,
      openedByName: user.name || user.email,
    } });
    await recordAuditLog({ tenantId: tenant.id, userId: user.id, action: "CASH_SESSION_OPENED", resource: "CashSession", details: { id: session.id, locationId: location.id, openingBalance: parsed.data.openingBalance } });
    revalidatePath("/admin/cash");
    return { success: true };
  } catch (error) {
    console.error("Cash open error:", error);
    return { success: false, error: "No se pudo abrir la caja." };
  }
}

export async function addCashMovementAction(input: unknown) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER", "CASHIER"]);
  await requireTenantFeature(tenant.id, "cashRegister");
  const parsed = z.object({
    cashSessionId: idSchema,
    type: z.enum(["INCOME", "EXPENSE"]),
    category: z.string().trim().min(2).max(100),
    description: z.string().trim().min(2).max(2000),
    amount: moneySchema.refine((amount) => amount > 0),
  }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Completá tipo, categoría, detalle e importe." };
  try {
    const db = await getTenantDb();
    const session = await db.cashSession.findFirst({ where: { id: parsed.data.cashSessionId, status: "OPEN" }, select: { id: true } });
    if (!session) return { success: false, error: "La caja está cerrada o no existe." };
    const movement = await db.cashMovement.create({ data: {
      tenantId: tenant.id,
      cashSessionId: session.id,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      createdByUserId: user.id,
      createdByName: user.name || user.email,
    } });
    await recordAuditLog({ tenantId: tenant.id, userId: user.id, action: `CASH_${parsed.data.type}_RECORDED`, resource: "CashMovement", details: { id: movement.id, cashSessionId: session.id, amount: parsed.data.amount, category: parsed.data.category } });
    revalidatePath("/admin/cash");
    return { success: true };
  } catch (error) {
    console.error("Cash movement error:", error);
    return { success: false, error: "No se pudo registrar el movimiento." };
  }
}

export async function closeCashSessionAction(input: unknown) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER", "CASHIER"]);
  await requireTenantFeature(tenant.id, "cashRegister");
  const parsed = z.object({ cashSessionId: idSchema, countedBalance: moneySchema, notes: z.string().trim().max(2000).optional().default("") }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos de cierre inválidos." };
  try {
    const db = await getTenantDb();
    const session = await db.cashSession.findFirst({ where: { id: parsed.data.cashSessionId, status: "OPEN" }, select: { id: true, businessDate: true } });
    if (!session) return { success: false, error: "La caja ya está cerrada o no existe." };
    const snapshot = (await getCashDashboard(session.businessDate, session.businessDate)).sessions.find((item) => item.id === session.id);
    if (!snapshot) return { success: false, error: "No se pudo calcular el balance." };
    const expected = snapshot.calculatedExpectedBalance;
    const difference = Math.round((parsed.data.countedBalance - expected) * 100) / 100;
    const updated = await db.cashSession.updateMany({ where: { id: session.id, status: "OPEN" }, data: {
      status: "CLOSED",
      expectedBalance: expected,
      closingBalance: parsed.data.countedBalance,
      difference,
      closingNotes: parsed.data.notes || null,
      closedByUserId: user.id,
      closedByName: user.name || user.email,
      closedAt: new Date(),
    } });
    if (updated.count !== 1) return { success: false, error: "La caja fue modificada por otro usuario." };
    await recordAuditLog({ tenantId: tenant.id, userId: user.id, action: "CASH_SESSION_CLOSED", resource: "CashSession", details: { id: session.id, expectedBalance: expected, closingBalance: parsed.data.countedBalance, difference } });
    revalidatePath("/admin/cash");
    return { success: true };
  } catch (error) {
    console.error("Cash close error:", error);
    return { success: false, error: "No se pudo cerrar la caja." };
  }
}

export async function reopenCashSessionAction(id: string) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "cashRegister");
  if (!idSchema.safeParse(id).success) return { success: false, error: "Caja inválida." };
  try {
    const db = await getTenantDb();
    const updated = await db.cashSession.updateMany({ where: { id, status: "CLOSED" }, data: { status: "OPEN", expectedBalance: null, closingBalance: null, difference: null, closingNotes: null, closedByUserId: null, closedByName: null, closedAt: null } });
    if (updated.count !== 1) return { success: false, error: "La caja no está cerrada o no existe." };
    await recordAuditLog({ tenantId: tenant.id, userId: user.id, action: "CASH_SESSION_REOPENED", resource: "CashSession", details: { id } });
    revalidatePath("/admin/cash");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo reabrir la caja." };
  }
}
