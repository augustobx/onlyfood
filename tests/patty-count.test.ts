import { describe, expect, it } from "vitest";
import { countOrderPatties, formatPattyCount } from "@/lib/patty-count";

describe("countOrderPatties", () => {
  it("cuenta receta, cantidad pedida, combos y extras", () => {
    const total = countOrderPatties([
      {
        quantity: 2,
        product: { ingredients: [{ ingredientId: "patty", quantity: 2, ingredient: { id: "patty", name: "Medallón 120 g" } }] },
        addedExtras: [{ extra: { name: "Medallón extra" } }],
        comboItems: [{
          quantity: 1,
          product: { ingredients: [{ ingredientId: "combo-patty", quantity: 1, ingredient: { id: "combo-patty", name: "Medallon smash" } }] },
          removedIngredients: [],
        }],
        removedIngredients: [],
      },
    ]);

    expect(total).toBe(8);
  });

  it("resta medallones quitados e ignora ingredientes sin coincidencia", () => {
    const total = countOrderPatties([
      {
        quantity: 3,
        product: {
          ingredients: [
            { ingredientId: "patty", quantity: 1, ingredient: { id: "patty", name: "Carne vacuna" } },
            { ingredientId: "bread", quantity: 1, ingredient: { id: "bread", name: "Pan" } },
          ],
        },
        removedIngredients: [{ ingredientId: "patty" }],
      },
    ], "carne");

    expect(total).toBe(0);
  });

  it("pondera productos mitad y mitad", () => {
    const total = countOrderPatties([{
      quantity: 1,
      isHalfAndHalf: true,
      product: { ingredients: [{ ingredientId: "a", quantity: 2, ingredient: { id: "a", name: "Medallón" } }] },
      secondHalfProduct: { ingredients: [{ ingredientId: "b", quantity: 4, ingredient: { id: "b", name: "Medallón" } }] },
    }]);

    expect(total).toBe(3);
    expect(formatPattyCount(2.5)).toBe("2,5");
  });
});
