import { describe, expect, it } from "vitest";
import { canQuickReorder, normalizedFavorites, orderHelpText } from "@/lib/pwa-order-helpers";
describe("PWA: safety in repeat purchases", () => {
  it("deduplicates favorites", () => {
    const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    expect(normalizedFavorites([id, id, "invalid"])).toEqual([id]);
  });
  it("blocks custom combinations from automatic reorder", () => {
    expect(canQuickReorder({ isActive: true, availableToday: true })).toBe(true);
    expect(canQuickReorder({ isActive: true, availableToday: true, hasExtras: true })).toBe(false);
    expect(canQuickReorder({ isActive: true, availableToday: true, hasRemovedIngredients: true })).toBe(false);
    expect(canQuickReorder({ isActive: false, availableToday: true })).toBe(false);
  });
  it("does not invent an ETA", () => {
    expect(orderHelpText("IN_PROCESS", true)).toMatch(/confirmará/);
    expect(orderHelpText("FINISHED", false)).toMatch(/retirar/);
  });
});
