import { describe, expect, it } from "vitest";
import { purchaseQuantity, weightedUnitCost } from "@/lib/ingredient-units";
import { calculateOrderRequirements } from "@/lib/inventory";
import { makeInventorySnapshot, orderRequirements, readInventorySnapshot } from "@/lib/inventory-snapshot";
import { resultsWindow, summarizeResults } from "@/lib/business-results";
const ingredient = { name:"Cheddar", stock:3000, unit:"G", costPerUnit:8 };
const component = { ingredients:[{ ingredientId:"cheddar", quantity:30, ingredient }] };
const item = { productId:"burger", quantity:2, isHalfAndHalf:false, removedIngredients:[], product:{ name:"Combo", isCombo:true, ingredients:[] }, comboItems:[{ product:component, quantity:3, removedIngredients:[] }] };
const order = { total:12000, status:"NEW", paymentStatus:"PENDING", createdAt:"2026-10-30T01:00:00Z", items:[item] };
describe("ingredient units and purchase costs", () => {
  it("converts packages without changing recipe units", () => {
    expect(purchaseQuantity(3,"KG","G")).toBe(3000);
    expect(purchaseQuantity(0.5,"L","ML")).toBe(500);
    expect(purchaseQuantity(12,"UNIT","UNIT")).toBe(12);
    expect(24000 / purchaseQuantity(3,"KG","G") * 30).toBe(240);
  });
  it("rejects incompatible units and invalid quantities", () => {
    for (const q of [0,-1,NaN,Infinity]) expect(() => purchaseQuantity(q,"G","G")).toThrow();
    expect(() => purchaseQuantity(1,"KG","ML")).toThrow();
  });
  it("weights an incoming purchase against remaining stock", () => {
    expect(weightedUnitCost(100,2,100,600)).toBe(4);
    expect(weightedUnitCost(0,2,100,600)).toBe(6);
  });
});
describe("one recipe calculation for results and reservations", () => {
  it("multiplies combo component quantities and outer quantity", () => {
    const requirements = calculateOrderRequirements([item]);
    expect(requirements[0]).toMatchObject({ required:180, unitCost:8, unit:"G" });
    expect(summarizeResults([order]).cost).toBe(1440);
  });
  it("honors removed ingredients and half portions", () => {
    expect(calculateOrderRequirements([{ ...item, comboItems:[{...item.comboItems[0], removedIngredients:[{ingredientId:"cheddar"}]}] }])).toHaveLength(0);
    const half = { ...item, quantity:1, product:{...component,isCombo:false}, comboItems:[], isHalfAndHalf:true, secondHalfProduct:{ingredients:[{ ingredientId:"cheddar",quantity:10,ingredient }]} };
    expect(calculateOrderRequirements([half])[0].required).toBe(20);
  });
  it("freezes costs and cancellation quantities across later recipe edits", () => {
    const snapshot = makeInventorySnapshot(calculateOrderRequirements([item]));
    const changed = { ...order, inventorySnapshot:snapshot, items:[{...item, comboItems:[{...item.comboItems[0], product:{ingredients:[{ingredientId:"cheddar", quantity:200, ingredient:{...ingredient,costPerUnit:99}}]}}]}] };
    expect(summarizeResults([changed]).cost).toBe(1440);
    expect(orderRequirements(changed)[0].required).toBe(180);
    expect(summarizeResults([changed]).legacy).toBe(0);
  });
  it("labels legacy and incomplete costs instead of claiming a profit", () => {
    expect(summarizeResults([order])).toMatchObject({legacy:1,incomplete:0});
    expect(summarizeResults([{...order,inventorySnapshot:makeInventorySnapshot([],1)}])).toMatchObject({legacy:0,incomplete:1});
    expect(readInventorySnapshot({version:1,missingRecipes:0,entries:[{ingredientId:"x",name:"x",required:-1,unit:"G",unitCost:1}]})).toBeNull();
  });
  it("separates paid and pending orders and excludes cancellations", () => {
    expect(summarizeResults([order,{...order,paymentStatus:"PAID",total:2000},{...order,status:"CANCELLED",total:90000}])).toMatchObject({value:14000,paid:2000,pending:12000,count:2});
  });
  it("uses Argentina dates including the UTC midnight boundary", () => {
    expect(summarizeResults([order]).daily[0].day).toBe("2026-10-29");
    expect(resultsWindow("7",new Date("2026-10-30T01:00:00Z"))).toMatchObject({gte:new Date("2026-10-23T03:00:00Z"),lt:new Date("2026-10-30T03:00:00Z")});
    expect(resultsWindow("invalid").range).toBe("30");
    expect(resultsWindow("all").gte).toBeUndefined();
  });
});
