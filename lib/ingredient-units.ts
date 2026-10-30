export const ingredientUnits = { UNIT: "un", G: "g", ML: "ml" } as const;
export type IngredientUnit = keyof typeof ingredientUnits;
export class InventoryInputError extends Error {}
export function unitLabel(unit: string = "UNIT") { return ingredientUnits[unit as IngredientUnit] || "un"; }
export function purchaseQuantity(quantity: number, unit: string, base: string) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new InventoryInputError("Ingresá una cantidad mayor a cero.");
  if (unit === base) return quantity;
  if ((unit === "KG" && base === "G") || (unit === "L" && base === "ML")) return quantity * 1000;
  throw new InventoryInputError("La unidad de compra no corresponde al ingrediente.");
}
export function weightedUnitCost(stock: number, currentCost: number, added: number, totalPrice: number) {
  return (Math.max(0, stock) * currentCost + totalPrice) / (Math.max(0, stock) + added);
}
export const movementLabels: Record<string, string> = { PURCHASE: "Compra", WASTE: "Merma", COUNT: "Conteo", RESERVE: "Reserva de pedido", RELEASE: "Devolución por cancelación", OPENING: "Saldo inicial" };
