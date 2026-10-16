/** Política de presentación del checkout. El servidor sigue siendo la autoridad. */
export type FulfillmentChoice = "DELIVERY" | "PICKUP";
export type DeliveryAddressParts = { street: string; unit: string; reference: string };
export type CheckoutPayment = "CASH" | "MP";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Preserva el campo deliveryAddress existente, sin migrar ni cambiar el contrato del pedido. */
export function buildDeliveryAddress(parts: DeliveryAddressParts): string {
  const street = normalize(parts.street);
  if (!street) return "";
  const unit = normalize(parts.unit);
  const reference = normalize(parts.reference);
  return [
    street,
    ...(unit ? [`Piso/Depto: ${unit}`] : []),
    ...(reference ? [`Referencia: ${reference}`] : []),
  ].join(", ");
}

export function isDeliveryAddressValid(address: string): boolean {
  return address.trim().length >= 5 && address.length <= 250;
}

export function isSlotSelectable(available: number): boolean {
  return Number.isFinite(available) && available > 0;
}

export function checkoutPaymentLabel(payment: CheckoutPayment): string {
  return payment === "MP" ? "Mercado Pago" : "Efectivo";
}

export function checkoutActionLabel(payment: CheckoutPayment, total: number): string {
  return payment === "MP" && total > 0
    ? "Ir a pagar con Mercado Pago"
    : "Confirmar pedido";
}
