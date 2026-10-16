import { describe, expect, it } from "vitest";
import { blockedStatusTransition, canDispatchPaidOrder } from "@/lib/order-integrity-policy";
import { relatedOrdersAccessScope } from "@/lib/order-visibility";
const state = (paymentMethod: string, paymentStatus: string, status = "NEW") => ({ paymentMethod, paymentStatus, status });
describe("Critical operational payment gates", () => {
  it.each(["MP", "TRANSFER"])("does not prepare or print unpaid %s", method => {
    expect(canDispatchPaidOrder(state(method, "PENDING"))).toBe(false);
    expect(canDispatchPaidOrder(state(method, "FAILED"))).toBe(false);
    expect(blockedStatusTransition(state(method, "PENDING"), "IN_PROCESS")).toBe("PAYMENT_PENDING");
    expect(blockedStatusTransition(state(method, "REFUNDED"), "DELIVERED")).toBe("PAYMENT_PENDING");
    expect(blockedStatusTransition(state(method, "PENDING"), "CANCELLED")).toBeNull();
    expect(canDispatchPaidOrder(state(method, "PAID"))).toBe(true);
  });
  it("prevents cancelling a charged Mercado Pago purchase without refund", () => {
    expect(blockedStatusTransition(state("MP", "PAID"), "CANCELLED")).toBe("REFUND_REQUIRED");
    expect(blockedStatusTransition(state("CASH", "PENDING"), "CANCELLED")).toBeNull();
  });
  it("makes delivered and cancelled terminal and prevents reopening", () => {
    expect(blockedStatusTransition(state("CASH", "PENDING", "CANCELLED"), "DELIVERED")).toBe("CANCELLED_TERMINAL");
    expect(blockedStatusTransition(state("CASH", "PENDING", "DELIVERED"), "IN_PROCESS")).toBe("DELIVERED_TERMINAL");
    expect(canDispatchPaidOrder(state("TRANSFER", "PAID", "CANCELLED"))).toBe(false);
  });
});
describe("Tracking and customer data access", () => {
  const order = { id: "order-A", trackingTokenHash: "hash-A" };
  it("restricts signed-in customer to orders they own, not shared telephone", () => {
    expect(relatedOrdersAccessScope(order, "client-A")).toEqual({ clientId: "client-A" });
    expect(relatedOrdersAccessScope(order, "client-A")).not.toHaveProperty("clientPhone");
  });
  it("restricts guest to same cryptographic tracking token group", () => {
    expect(relatedOrdersAccessScope(order, null)).toEqual({ trackingTokenHash: "hash-A" });
    expect(relatedOrdersAccessScope({id:"order-A",trackingTokenHash:null},null)).toEqual({ id: "order-A" });
  });
});
