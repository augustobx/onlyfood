export type QuantityDiscountRule = {
  id: string;
  name: string;
  minQuantity: number;
  type: "PERCENT" | "FINAL_PRICE" | string;
  value: number;
  priority?: number;
  productIds: string[];
};

export type DiscountableCartItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type AppliedQuantityDiscount = {
  ruleId: string;
  name: string;
  type: "PERCENT" | "FINAL_PRICE";
  value: number;
  bundleSize: number;
  bundles: number;
  qualifyingUnits: number;
  amount: number;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Calculates every eligible promotion and returns the one that saves the
 * customer the most. Only complete bundles qualify and units are valued from
 * cheapest to most expensive, which keeps mixed-product promotions predictable.
 */
export function calculateBestQuantityDiscount(
  items: DiscountableCartItem[],
  rules: QuantityDiscountRule[],
): AppliedQuantityDiscount | null {
  const candidates = rules.flatMap((rule): AppliedQuantityDiscount[] => {
    if (!Number.isInteger(rule.minQuantity) || rule.minQuantity < 2 || rule.value <= 0) return [];
    if (rule.type !== "PERCENT" && rule.type !== "FINAL_PRICE") return [];
    if (rule.type === "PERCENT" && rule.value > 100) return [];

    const eligibleProducts = new Set(rule.productIds);
    const unitPrices = items
      .filter((item) => eligibleProducts.has(item.productId) && item.quantity > 0 && item.unitPrice >= 0)
      .flatMap((item) => Array.from({ length: item.quantity }, () => item.unitPrice))
      .sort((a, b) => a - b);
    const bundles = Math.floor(unitPrices.length / rule.minQuantity);
    if (bundles < 1) return [];

    const qualifyingUnits = bundles * rule.minQuantity;
    const qualifyingSubtotal = unitPrices.slice(0, qualifyingUnits).reduce((sum, price) => sum + price, 0);
    const amount = rule.type === "PERCENT"
      ? qualifyingSubtotal * (rule.value / 100)
      : qualifyingSubtotal - bundles * rule.value;
    if (amount <= 0) return [];

    return [{
      ruleId: rule.id,
      name: rule.name,
      type: rule.type,
      value: rule.value,
      bundleSize: rule.minQuantity,
      bundles,
      qualifyingUnits,
      amount: roundMoney(Math.min(amount, qualifyingSubtotal)),
    }];
  });

  return candidates.sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    const priorityA = rules.find((rule) => rule.id === a.ruleId)?.priority ?? 0;
    const priorityB = rules.find((rule) => rule.id === b.ruleId)?.priority ?? 0;
    return priorityB - priorityA;
  })[0] ?? null;
}
