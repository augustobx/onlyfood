import { calculateOrderRequirements } from "./inventory";
import { readInventorySnapshot } from "./inventory-snapshot";
import { startOfBusinessDayUtc } from "./time";
export function resultsWindow(range: string, now = new Date()) {
  const days = ["7", "30", "90"].includes(range) ? Number(range) : range === "all" ? null : 30;
  const today = startOfBusinessDayUtc(now);
  return { range: days === null ? "all" : String(days), gte: days === null ? undefined : new Date(today.getTime() - (days - 1) * 86400000), lt: new Date(today.getTime() + 86400000) };
}
export function summarizeResults(orders: any[]) {
  let value = 0, paid = 0, pending = 0, cost = 0, legacy = 0, incomplete = 0;
  const top = new Map<string, { name: string; quantity: number }>();
  const usage = new Map<string, { id: string; name: string; unit: string; quantity: number; cost: number }>();
  const daily = new Map<string, { day: string; value: number; paid: number }>();
  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    value += order.total;
    if (order.paymentStatus === "PAID") paid += order.total;
    if (order.paymentStatus === "PENDING") pending += order.total;
    const date = new Date(new Date(order.createdAt).getTime() - 3 * 3600000).toISOString().slice(0,10);
    const day = daily.get(date) || { day: date, value: 0, paid: 0 };
    day.value += order.total; if (order.paymentStatus === "PAID") day.paid += order.total; daily.set(date,day);
    const snapshot = readInventorySnapshot(order.inventorySnapshot);
    if (!snapshot) legacy++;
    const entries = snapshot?.entries || calculateOrderRequirements(order.items || []);
    const missing = snapshot ? snapshot.missingRecipes > 0 : !(order.items || []).length || (order.items || []).some((item: any) => !calculateOrderRequirements([item]).length);
    if (missing || entries.some(e => !e.unitCost)) incomplete++;
    for (const e of entries) {
      const expense = e.required * (e.unitCost || 0); cost += expense;
      const row = usage.get(e.ingredientId) || { id: e.ingredientId, name: e.name, unit: e.unit || "UNIT", quantity: 0, cost: 0 };
      row.quantity += e.required; row.cost += expense; usage.set(e.ingredientId, row);
    }
    for (const item of order.items || []) {
      const row = top.get(item.productId) || { name: item.product?.name || "Producto archivado", quantity: 0 };
      row.quantity += item.quantity; top.set(item.productId,row);
    }
  }
  return { value, paid, pending, cost, legacy, incomplete, count: orders.filter(o => o.status !== "CANCELLED").length,
    top: [...top.values()].sort((a,b) => b.quantity - a.quantity).slice(0,10),
    usage: [...usage.values()].sort((a,b) => b.cost - a.cost), daily: [...daily.values()].sort((a,b) => a.day.localeCompare(b.day)),
  };
}
