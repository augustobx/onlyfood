import { describe, expect, it } from "vitest";
import { countOrderBuns } from "@/lib/bun-count";
import { countOrderPatties } from "@/lib/patty-count";

const medallon = { ingredientId: "meat", quantity: 2, ingredient: { id: "meat", name: "Medallón smash" } };
const pan = { ingredientId: "bread", quantity: 1, ingredient: { id: "bread", name: "Pan de papa" } };
const doubleBurger = { name: "Pink Floyd", ingredients: [medallon, pan] };
const frenchFries = { name: "Papas fritas", ingredients: [{ ingredientId: "potato", ingredient: { id: "potato", name: "Papa" } }] };
const veggieBurger = { name: "Veggie", category: { name: "Hamburguesas" }, ingredients: [{ ingredientId: "bread", ingredient: { name: "Pan brioche" } }] };

describe("Conteo de panes en comandas", () => {
  it("cuenta 1 pan por hamburguesa aunque tenga 2 medallones", () => {
    const order = [{ quantity: 3, product: doubleBurger }];
    expect(countOrderPatties(order)).toBe(6);
    expect(countOrderBuns(order)).toBe(3);
  });
  it("multiplica las hamburguesas de combos por la cantidad de combos", () => {
    const order = [
      { quantity: 2, product: { name: "Combo 2 burgers", isCombo: true }, comboItems: [
        { quantity: 2, product: doubleBurger },
        { quantity: 1, product: frenchFries },
      ] },
    ];
    expect(countOrderBuns(order)).toBe(4);
    expect(countOrderPatties([{
      quantity: 2,
      product: { ingredients: [] },
      comboItems: [
        { quantity: 2, product: doubleBurger },
        { quantity: 1, product: frenchFries },
      ],
    }])).toBe(8);
  });
  it("mezcla productos sueltos y combos sin sumar papas, gaseosas o piezas sushi", () => {
    expect(countOrderBuns([
      { quantity: 2, product: { name: "Hamburguesa triple", ingredients: [] } },
      { quantity: 1, product: { name: "Combo familiar", isCombo: true }, comboItems: [
        { quantity: 3, pieces: 24, product: veggieBurger },
        { quantity: 2, product: frenchFries },
      ] },
      { quantity: 4, product: { name: "Sushi", ingredients: [] } },
    ])).toBe(5);
  });
  it("detecta hamburguesas con nombre de fantasía por sus ingredientes", () => {
    expect(countOrderBuns([{ quantity: 1, product: doubleBurger }])).toBe(1);
    expect(countOrderBuns([{ quantity: 1, product: { name: "AC/DC", ingredients: [pan, medallon] } }])).toBe(1);
  });
  it("no cuenta pan rallado ni sandwiches comunes como hamburguesas", () => {
    expect(countOrderBuns([
      { quantity: 2, product: { name: "Milanesa", ingredients: [
        { ingredientId: "breadcrumbs", ingredient: { name: "Pan rallado" } },
        medallon,
      ] } },
      { quantity: 1, product: { name: "Sándwich", ingredients: [pan] } },
    ])).toBe(0);
  });
  it("respeta el pan removido tanto de productos como de hamburguesas dentro de combos", () => {
    expect(countOrderBuns([
      { quantity: 2, product: doubleBurger, removedIngredients: [{ ingredientId: "bread" }] },
      { quantity: 1, product: { name: "Combo", isCombo: true }, comboItems: [
        { quantity: 2, product: doubleBurger, removedIngredients: [{ ingredientId: "bread" }] },
        { quantity: 1, product: doubleBurger },
      ] },
    ])).toBe(1);
  });
  it("una hamburguesa mitad y mitad ocupa 1 pan por unidad", () => {
    expect(countOrderBuns([
      { quantity: 2, isHalfAndHalf: true, product: doubleBurger, secondHalfProduct: veggieBurger },
    ])).toBe(2);
  });
  it("ignora combinaciones vacías y nunca devuelve cantidades negativas", () => {
    expect(countOrderBuns(null)).toBe(0);
    expect(countOrderBuns([{ quantity: -2, product: doubleBurger }, { quantity: 0, product: doubleBurger }])).toBe(0);
  });
});
