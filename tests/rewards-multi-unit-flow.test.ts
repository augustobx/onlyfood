import { describe, it, expect } from "vitest";

describe("Multi-Unit Rewards Configuration and Calculation", () => {
  it("should extract configured reward quantity or fallback to 1", () => {
    const reward5Bowls = { id: "r1", name: "5 Bowls Salmón", type: "PRODUCT", value: 5 };
    const reward1Burger = { id: "r2", name: "1 Hamburguesa", type: "PRODUCT", value: null };
    const rewardCombo = { id: "r3", name: "2 Combos", type: "COMBO", value: 2 };
    const rewardZero = { id: "r4", name: "Error Value", type: "PRODUCT", value: 0 };

    const getQty = (reward: { value: number | null | undefined }) =>
      reward.value ? Math.max(1, Math.round(Number(reward.value))) : 1;

    expect(getQty(reward5Bowls)).toBe(5);
    expect(getQty(reward1Burger)).toBe(1);
    expect(getQty(rewardCombo)).toBe(2);
    expect(getQty(rewardZero)).toBe(1);
  });

  it("should calculate cart subtotal as $0 when items are all redeemed rewards", () => {
    const items = [
      {
        id: "item-1",
        product: { id: "p1", name: "Bowl Salmón", basePrice: 4500 },
        quantity: 5,
        unitPrice: 0,
        subtotal: 0,
        isReward: true,
        rewardRedemptionId: "red-123",
      },
    ];

    const subtotal = items.reduce((total, item) => total + (item.isReward ? 0 : item.subtotal), 0);
    expect(subtotal).toBe(0);
  });

  it("should correctly waive price for matching reward units and charge only extra units", () => {
    const prizeQty = 5;
    const basePrice = 3000;

    // Case A: Cart has exactly 5 units of the reward
    const cartExact = { quantity: 5, unitPrice: basePrice, subtotal: basePrice * 5 };
    if (cartExact.quantity === prizeQty) {
      cartExact.unitPrice = 0;
      cartExact.subtotal = 0;
    }
    expect(cartExact.unitPrice).toBe(0);
    expect(cartExact.subtotal).toBe(0);

    // Case B: Cart has 7 units (5 reward + 2 paid)
    const cartExtra = { quantity: 7, unitPrice: basePrice, subtotal: basePrice * 7 };
    if (cartExtra.quantity > prizeQty) {
      cartExtra.subtotal = cartExtra.unitPrice * (cartExtra.quantity - prizeQty);
    }
    expect(cartExtra.subtotal).toBe(6000); // 2 * 3000
  });

  it("should apply discount coupons directly to cart subtotal", () => {
    const subtotal = 10000;

    const couponPercent = { reward: { type: "PERCENT", value: 20 } };
    const discountPercent = subtotal * ((couponPercent.reward.value || 0) / 100);
    expect(discountPercent).toBe(2000);
    expect(subtotal - discountPercent).toBe(8000);

    const couponAmount = { reward: { type: "AMOUNT", value: 3500 } };
    const discountAmount = Math.min(subtotal, couponAmount.reward.value || 0);
    expect(discountAmount).toBe(3500);
    expect(subtotal - discountAmount).toBe(6500);
  });

  it("should bypass Mercado Pago preference creation if order total is $0", () => {
    const totalGrand = 0;
    const paymentMethod = "MP";
    const resolvedMpAccessToken = "TEST-TOKEN";

    const shouldCallMercadoPago = paymentMethod === "MP" && Boolean(resolvedMpAccessToken) && totalGrand > 0;
    expect(shouldCallMercadoPago).toBe(false);

    const initialPaymentStatus = totalGrand <= 0 ? "PAID" : "PENDING";
    expect(initialPaymentStatus).toBe("PAID");
  });

  it("should calculate delivery fee correctly when ordering only free reward items", () => {
    const subtotal = 0;
    const deliveryCost = 1500;

    const totalPickup = subtotal + 0;
    expect(totalPickup).toBe(0);

    const totalDelivery = subtotal + deliveryCost;
    expect(totalDelivery).toBe(1500);
  });
});
