import { describe, expect, it } from "vitest";
import { allowsTierBenefit, calculateTierPaymentBenefits as benefits } from "@/lib/tier-payment-policy";

const tier = (sequence: number, paymentMode: string, discountPercent: number, pointsMultiplier: number) =>
  ({ sequence, paymentMode, discountPercent, pointsMultiplier });

describe("Tier payment restrictions", () => {
  it("defaults old tiers to both", () => {
    expect(allowsTierBenefit(undefined, "CASH")).toBe(true);
    expect(allowsTierBenefit(undefined, "MP")).toBe(true);
  });
  it("blocks the wrong method and ADMIN", () => {
    expect(allowsTierBenefit("CASH", "MP")).toBe(false);
    expect(allowsTierBenefit("MP", "CASH")).toBe(false);
    expect(allowsTierBenefit("BOTH", "ADMIN")).toBe(false);
  });
  it("inherits only benefits compatible with payment", () => {
    const all = [tier(1, "CASH", 5, 1.2), tier(2, "MP", 10, 1.5), tier(3, "BOTH", 3, 1.1)];
    expect(benefits(all[2], all, "CASH")).toEqual({ discountPercent: 5, pointsMultiplier: 1.2 });
    expect(benefits(all[2], all, "MP")).toEqual({ discountPercent: 10, pointsMultiplier: 1.5 });
    expect(benefits(all[2], all, "ADMIN")).toEqual({ discountPercent: 0, pointsMultiplier: 1 });
  });
  it("uses current custom tier even when it is outside active tiers", () => {
    const custom = tier(8, "CASH", 8, 2);
    expect(benefits(custom, [], "CASH")).toEqual({ discountPercent: 8, pointsMultiplier: 2 });
    expect(benefits(custom, [], "MP")).toEqual({ discountPercent: 0, pointsMultiplier: 1 });
  });
});
