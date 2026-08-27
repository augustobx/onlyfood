import { describe, expect, it } from "vitest";
import { calculateBestQuantityDiscount } from "@/lib/quantity-discounts";

const percentRule = { id: "percent", name: "5 bowls", minQuantity: 5, type: "PERCENT", value: 20, productIds: ["bowl"] };

describe("quantity discount calculation", () => {
  it("does not apply below the required quantity", () => {
    expect(calculateBestQuantityDiscount([{ productId: "bowl", quantity: 4, unitPrice: 1000 }], [percentRule])).toBeNull();
  });

  it("applies percentage only to complete bundles", () => {
    const result = calculateBestQuantityDiscount([{ productId: "bowl", quantity: 7, unitPrice: 1000 }], [percentRule]);
    expect(result).toMatchObject({ bundles: 1, qualifyingUnits: 5, amount: 1000 });
  });

  it("supports a final price for each complete bundle", () => {
    const result = calculateBestQuantityDiscount(
      [{ productId: "bowl", quantity: 10, unitPrice: 1200 }],
      [{ id: "fixed", name: "Pack", minQuantity: 5, type: "FINAL_PRICE", value: 5000, productIds: ["bowl"] }],
    );
    expect(result).toMatchObject({ bundles: 2, amount: 2000 });
  });

  it("combines eligible products and discounts the cheapest qualifying units", () => {
    const result = calculateBestQuantityDiscount(
      [{ productId: "a", quantity: 3, unitPrice: 1000 }, { productId: "b", quantity: 3, unitPrice: 2000 }],
      [{ id: "mixed", name: "Mixta", minQuantity: 5, type: "PERCENT", value: 10, productIds: ["a", "b"] }],
    );
    expect(result?.amount).toBe(700);
  });

  it("chooses the promotion with the largest saving", () => {
    const result = calculateBestQuantityDiscount(
      [{ productId: "bowl", quantity: 5, unitPrice: 1000 }],
      [percentRule, { id: "better", name: "Precio pack", minQuantity: 5, type: "FINAL_PRICE", value: 3500, productIds: ["bowl"] }],
    );
    expect(result).toMatchObject({ ruleId: "better", amount: 1500 });
  });
});
