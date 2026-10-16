/** Invariantes de circuito: la UI no puede sustituir las comprobaciones del servidor. */
export type PaymentState = { status: string; paymentMethod: string; paymentStatus: string };
export function hasVerifiedElectronicPayment(order: PaymentState): boolean {
  return (order.paymentMethod !== "MP" && order.paymentMethod !== "TRANSFER")
    || order.paymentStatus === "PAID";
}
export function canDispatchPaidOrder(order: PaymentState): boolean {
  return order.status !== "CANCELLED" && hasVerifiedElectronicPayment(order);
}
export type ChangeBlock = "CANCELLED_TERMINAL" | "DELIVERED_TERMINAL" | "REFUND_REQUIRED" | "PAYMENT_PENDING" | null;
export function blockedStatusTransition(order: PaymentState, toStatus: string): ChangeBlock {
  if (toStatus === order.status) return null;
  if (order.status === "CANCELLED") return "CANCELLED_TERMINAL";
  if (order.status === "DELIVERED") return "DELIVERED_TERMINAL";
  if (toStatus === "CANCELLED" && order.paymentMethod === "MP" && order.paymentStatus === "PAID") return "REFUND_REQUIRED";
  if (toStatus !== "CANCELLED" && !hasVerifiedElectronicPayment(order)) return "PAYMENT_PENDING";
  return null;
}
