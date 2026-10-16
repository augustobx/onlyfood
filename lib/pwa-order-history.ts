export type OrderHistoryEvent = { status: string; createdAt: Date | string };
export type CustomerOrderEvent = { status: string; label: string; createdAt: string };

export function customerOrderStatusLabel(status: string, needsDelivery: boolean): string {
  const labels: Record<string,string> = {
    NEW: "Pedido recibido",
    IN_PROCESS: "Comenzó la preparación",
    PENDING_DELIVERY: "Preparado para el reparto",
    OUT_FOR_DELIVERY: "Salió para entrega",
    FINISHED: needsDelivery ? "Pedido listo" : "Listo para retirar",
    DELIVERED: "Pedido entregado",
    CANCELLED: "Pedido cancelado",
  };
  return labels[status] || "Actualización del pedido";
}

/** Se construye exclusivamente con los eventos registrados en DB; nunca inventa estados o tiempos. */
export function realOrderEvents(
  createdAt: Date | string,
  history: OrderHistoryEvent[],
  needsDelivery: boolean,
): CustomerOrderEvent[] {
  const events = history.filter(e => Number.isFinite(new Date(e.createdAt).getTime()))
    .map(e => ({ status: e.status, createdAt: new Date(e.createdAt).toISOString() }));
  if (!events.some(e => e.status === "NEW") && Number.isFinite(new Date(createdAt).getTime())) {
    events.push({ status: "NEW", createdAt: new Date(createdAt).toISOString() });
  }
  events.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  return events.slice(-30).map(e => ({ ...e, label: customerOrderStatusLabel(e.status, needsDelivery) }));
}
