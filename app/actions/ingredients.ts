"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { requireAdmin } from "@/lib/admin-session";
import { requireTenantFeature } from "@/lib/features";
import { purchaseQuantity, weightedUnitCost, InventoryInputError } from "@/lib/ingredient-units";
import { changeIngredientStock } from "@/lib/inventory-ledger";

async function context() {
  const session = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(session.tenant.id, "orders");
  return { ...session, db: await getTenantDb() };
}
function refresh() { for (const path of ["/admin/stock", "/admin/catalog", "/admin/metricas", "/admin/live", "/"]) revalidatePath(path); }
const id = z.string().min(1).max(128);
const amount = z.number().finite().min(0).max(1_000_000_000);
const ingredientSchema = z.object({ name: z.string().trim().min(1).max(250), unit: z.enum(["UNIT", "G", "ML"]), minimumStock: amount, categoryIds: z.array(id).max(100) }).strict();
export async function createIngredient(input: z.infer<typeof ingredientSchema>) {
  const { db, tenant } = await context();
  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Revisá nombre, unidad y mínimo del ingrediente." };
  try {
    const categories = await db.category.count({ where: { id: { in: parsed.data.categoryIds } } });
    if (categories !== new Set(parsed.data.categoryIds).size) return { success: false, error: "Seleccioná categorías de este comercio." };
    await db.ingredient.create({ data: { name: parsed.data.name, unit: parsed.data.unit, minimumStock: parsed.data.minimumStock, tenantId: tenant.id, categories: { create: [...new Set(parsed.data.categoryIds)].map(categoryId => ({ categoryId })) } } });
    refresh(); return { success: true };
  } catch { return { success: false, error: "No se pudo crear el ingrediente." }; }
}
const movementSchema = z.object({ ingredientId: id, type: z.enum(["PURCHASE", "WASTE", "COUNT"]), quantity: amount, purchaseUnit: z.enum(["UNIT", "G", "KG", "ML", "L"]), price: amount, reason: z.string().trim().min(3).max(250), expectedStock: amount }).strict();
export async function recordIngredientMovement(input: z.infer<typeof movementSchema>) {
  const { db, tenant, user } = await context();
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Revisá cantidad, importe y motivo." };
  const data = parsed.data;
  try {
    await db.$transaction(async tx => {
      const ingredient = await tx.ingredient.findFirst({ where: { id: data.ingredientId, tenantId: tenant.id } });
      if (!ingredient || !ingredient.isActive) throw new InventoryInputError("El ingrediente está pausado o no está disponible.");
      // A count is expressed as available stock, excluding quantities already reserved.
      const qty = data.type === "COUNT" && data.quantity === 0 ? 0 : purchaseQuantity(data.quantity, data.purchaseUnit, ingredient.unit);
      if (qty > 1_000_000_000 || Math.abs(qty * 1000 - Math.round(qty * 1000)) > 0.0001) throw new InventoryInputError("Usá cantidades con hasta tres decimales en la unidad de la receta.");
      const delta = data.type === "COUNT" ? qty - ingredient.stock : data.type === "WASTE" ? -qty : qty;
      await changeIngredientStock(tx as never, { tenantId: tenant.id, ingredientId: ingredient.id, type: data.type, quantity: delta, reason: data.reason, actorId: user.id,
        ...(data.type === "COUNT" && { expectedStock: data.expectedStock }),
        ...(data.type === "PURCHASE" && { unitCost: weightedUnitCost(ingredient.stock, ingredient.costPerUnit, qty, data.price), purchasePrice: data.price, yieldUnits: qty, purchaseVolume: `${data.quantity} ${data.purchaseUnit}` }),
      });
    });
    refresh(); return { success: true };
  } catch (error) { return { success: false, error: error instanceof InventoryInputError ? error.message : "No se pudo registrar el movimiento. Actualizá e intentá nuevamente." }; }
}
export async function setIngredientMinimum(ingredientId: string, minimumStock: number) {
  const { db } = await context();
  if (!id.safeParse(ingredientId).success || !amount.safeParse(minimumStock).success) return { success: false, error: "Mínimo inválido." };
  try { await db.ingredient.update({ where: { id: ingredientId }, data: { minimumStock } }); refresh(); return { success: true }; }
  catch { return { success: false, error: "No se pudo guardar el mínimo." }; }
}
export async function ingredientHistory(ingredientId: string, page = 1) {
  const { db } = await context();
  if (!id.safeParse(ingredientId).success || !z.number().int().min(1).max(100000).safeParse(page).success) return { items: [], more: false };
  const rows = await db.ingredientMovement.findMany({ where: { ingredientId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 31 });
  return { items: rows.slice(0,30).map(row => ({ ...row, createdAt: row.createdAt.toISOString() })), more: rows.length > 30 };
}
