/** El teléfono de contacto nunca identifica propiedad sobre un pedido. */
export function relatedOrdersAccessScope(order: { id: string; trackingTokenHash: string | null }, owningClientId: string | null) {
  if (owningClientId) return { clientId: owningClientId };
  if (order.trackingTokenHash) return { trackingTokenHash: order.trackingTokenHash };
  return { id: order.id };
}
