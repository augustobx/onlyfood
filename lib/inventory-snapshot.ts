import { calculateOrderRequirements, type InventoryRequirement, type InventoryOrderItem } from "./inventory";
export type InventorySnapshot = { version: 1; missingRecipes: number; entries: Array<{ ingredientId: string; name: string; required: number; unit: string; unitCost: number }> };
export function makeInventorySnapshot(requirements: InventoryRequirement[], missingRecipes = 0): InventorySnapshot {
  const entries = new Map<string, InventorySnapshot["entries"][number]>();
  for (const r of requirements) {
    const previous = entries.get(r.ingredientId);
    entries.set(r.ingredientId, { ingredientId: r.ingredientId, name: r.name, required: Math.round(((previous?.required || 0) + r.required) * 1000) / 1000, unit: r.unit || "UNIT", unitCost: r.unitCost || 0 });
  }
  return { version: 1, missingRecipes, entries: [...entries.values()] };
}
export function readInventorySnapshot(value: unknown): InventorySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const s = value as InventorySnapshot;
  if (s.version !== 1 || !Number.isInteger(s.missingRecipes) || s.missingRecipes < 0 || !Array.isArray(s.entries)) return null;
  if (!s.entries.every(e => e && typeof e.ingredientId === "string" && typeof e.name === "string" && typeof e.unit === "string" && Number.isFinite(e.required) && e.required >= 0 && Number.isFinite(e.unitCost) && e.unitCost >= 0)) return null;
  return s;
}
export function orderRequirements(order: { inventorySnapshot?: unknown; items: InventoryOrderItem[] }) {
  const current = calculateOrderRequirements(order.items);
  const snapshot = readInventorySnapshot(order.inventorySnapshot);
  if (!snapshot) return current;
  return snapshot.entries.map(e => ({ ...e, available: current.find(c => c.ingredientId === e.ingredientId)?.available ?? 0 }));
}
