/** Transferencias manuales: nunca inferir acreditación de un comprobante de WhatsApp. */
export type TransferInstructions = { alias: string; cbu: string; holder: string; whatsapp: string };
export type TransferSettings = TransferInstructions & { enabled: boolean };

export function normalizeTransferWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}
export function transferSettingsValid(value: TransferSettings): boolean {
  if (!value.enabled) return false;
  const alias = value.alias.trim();
  const cbu = value.cbu.trim();
  return Boolean(value.holder.trim()) &&
    Boolean(normalizeTransferWhatsApp(value.whatsapp)) &&
    (/^[A-Za-z0-9._-]{4,60}$/.test(alias) || /^\d{22}$/.test(cbu));
}
export function isPendingTransfer(order: { paymentMethod: string; paymentStatus: string; status: string }): boolean {
  return order.paymentMethod === "TRANSFER" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED";
}
/** Enlace al comercio sin token de seguimiento, que funciona sin API de Meta. */
export function transferReceiptUrl(phone: string, orderId: string, amount: number): string | null {
  const recipient = normalizeTransferWhatsApp(phone);
  if (!recipient) return null;
  const amountLabel = Number.isFinite(amount) && amount >= 0 ? amount.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : "?";
  const message = `Hola, realicé una transferencia para el pedido #${orderId.slice(-6).toUpperCase()} por $${amountLabel}. Adjunto el comprobante para verificar el pago.`;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}
