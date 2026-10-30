import "server-only";
import type { Prisma } from "@prisma/client";
import { InventoryInputError, weightedUnitCost } from "./ingredient-units";
// All callers provide the transaction and the server-resolved tenant. CAS protects
// simultaneous purchases, counts and checkout reservations; errors roll back all effects.
export async function changeIngredientStock(tx: Prisma.TransactionClient, input: {
  tenantId: string; ingredientId: string; quantity: number; type: string; reason: string;
  actorId?: string; orderId?: string; expectedStock?: number; unitCost?: number;
  returnUnitCost?: number;
  purchasePrice?: number; purchaseVolume?: string; yieldUnits?: number;
}) {
  const ingredient = await tx.ingredient.findFirst({ where: { id: input.ingredientId, tenantId: input.tenantId } });
  if (!ingredient) throw new InventoryInputError("Ingrediente no disponible.");
  if (input.expectedStock !== undefined && ingredient.stock !== input.expectedStock) throw new InventoryInputError("El stock cambió. Actualizá la pantalla antes de confirmar el conteo.");
  const balance = Math.round((ingredient.stock + input.quantity) * 1000) / 1000;
  const unitCost = input.type === "RELEASE" && input.quantity > 0 && input.returnUnitCost !== undefined
    ? weightedUnitCost(ingredient.stock, ingredient.costPerUnit, input.quantity, input.quantity * input.returnUnitCost)
    : input.unitCost;
  if (!Number.isFinite(input.quantity) || !Number.isFinite(balance) || balance < 0 || balance > 1_000_000_000) throw new InventoryInputError("La cantidad supera el stock disponible o el límite permitido. Actualizá y revisá las cantidades.");
  const updated = await tx.ingredient.updateMany({
    where: { id: ingredient.id, tenantId: input.tenantId, stock: ingredient.stock, costPerUnit: ingredient.costPerUnit },
    data: { stock: balance, ...(unitCost !== undefined && { costPerUnit: unitCost }),
      ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice, purchaseVolume: input.purchaseVolume, yieldUnits: input.yieldUnits }) },
  });
  if (updated.count !== 1) throw new InventoryInputError("Otro usuario modificó el ingrediente. Actualizá e intentá nuevamente.");
  await tx.ingredientMovement.create({ data: {
    tenantId: input.tenantId, ingredientId: ingredient.id, type: input.type, quantity: input.quantity,
    balance, unitCost: input.type === "PURCHASE" && input.purchasePrice !== undefined && input.quantity > 0
      ? input.purchasePrice / input.quantity : input.returnUnitCost ?? ingredient.costPerUnit,
    reason: input.reason,
    actorId: input.actorId, orderId: input.orderId,
  } });
  return { balance };
}
