export type WhatsAppNotificationEvent =
  | "ORDER_CONFIRMED"
  | "ORDER_PREPARING"
  | "ORDER_READY_PICKUP"
  | "ORDER_READY_DELIVERY";

type MessageOrderItem = {
  quantity: number;
  subtotal: number;
  notes?: string | null;
  isHalfAndHalf?: boolean;
  product: { name: string };
  secondHalfProduct?: { name: string } | null;
  addedExtras?: Array<{ extra: { name: string } }>;
  removedIngredients?: Array<{ ingredient: { name: string } }>;
  comboItems?: Array<{ quantity: number; product: { name: string } }>;
};

export function normalizeWhatsAppRecipient(phone: string, defaultCountryCode = "549"): string | null {
  let digits = phone.replace(/\D/g, "");
  const prefix = defaultCountryCode.replace(/\D/g, "");
  if (!digits || !prefix) return null;

  digits = digits.replace(/^00/, "").replace(/^0+/, "");
  if (digits.startsWith(prefix)) return digits.length >= 10 && digits.length <= 15 ? digits : null;

  // Argentina: Meta/WhatsApp utiliza 549 para celulares. Si llega 54..., inserta el 9.
  if (prefix.endsWith("9") && digits.startsWith(prefix.slice(0, -1))) {
    digits = `${prefix}${digits.slice(prefix.length - 1)}`;
  } else {
    digits = `${prefix}${digits}`;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function formatOrderDetailForWhatsApp(items: MessageOrderItem[], maxLength = 1500): string {
  const lines = items.flatMap((item) => {
    const result = [`• ${item.quantity}x ${item.product.name} — $${item.subtotal.toLocaleString("es-AR")}`];
    if (item.isHalfAndHalf && item.secondHalfProduct) result.push(`  Mitad y mitad con ${item.secondHalfProduct.name}`);
    if (item.comboItems?.length) result.push(`  Incluye: ${item.comboItems.map((part: any) => `${part.pieces && part.pieces > 0 ? `${part.pieces} piezas` : `${part.quantity}x`} ${part.product.name}`).join(", ")}`);
    if (item.addedExtras?.length) result.push(`  Extras: ${item.addedExtras.map((extra) => extra.extra.name).join(", ")}`);
    if (item.removedIngredients?.length) result.push(`  Sin: ${item.removedIngredients.map((ingredient) => ingredient.ingredient.name).join(", ")}`);
    if (item.notes?.trim()) result.push(`  Nota: ${item.notes.trim()}`);
    return result;
  });
  const detail = lines.join("\n") || "Pedido sin productos detallados";
  return detail.length <= maxLength ? detail : `${detail.slice(0, maxLength - 1)}…`;
}

export function notificationEventForStatus(status: string, needsDelivery: boolean): WhatsAppNotificationEvent | null {
  if (status === "IN_PROCESS") return "ORDER_PREPARING";
  if (status === "PENDING_DELIVERY" && needsDelivery) return "ORDER_READY_DELIVERY";
  if (status === "FINISHED" && !needsDelivery) return "ORDER_READY_PICKUP";
  return null;
}
