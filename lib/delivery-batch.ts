/** Solo planificación logística: no cambia Order.status, orderHistory ni notificaciones. */
export type BatchCandidate = {
 id: string; needsDelivery: boolean; status: string; paymentMethod: string;
 paymentStatus: string; clientName: string; clientPhone: string;
 deliveryAddress: string | null; deliveryTime: string | null; total: number;
};
const allowed = new Set(["NEW","IN_PROCESS","PENDING_DELIVERY","FINISHED"]);
export function canPlanDelivery(order: Pick<BatchCandidate,"needsDelivery"|"status"|"paymentMethod"|"paymentStatus">) {
 return order.needsDelivery && allowed.has(order.status) &&
   !((order.paymentMethod === "MP" || order.paymentMethod === "TRANSFER") && order.paymentStatus !== "PAID");
}
export function composeDeliveryBatch(orders: BatchCandidate[], messengerName: string) {
 const heading = "🛵 PRE-RUTA PARA ORGANIZAR • " + messengerName;
 const detail = orders.map((order,index)=>[
   (index+1)+". Pedido #"+order.id.slice(-5).toUpperCase(),
   "📍 "+(order.deliveryAddress||"Sin dirección"),
   "👤 "+order.clientName+" • "+order.clientPhone,
   "🕒 "+(order.deliveryTime||"A coordinar"),
   order.paymentMethod==="CASH" && order.paymentStatus!=="PAID"
     ? "💵 A cobrar: $"+order.total.toLocaleString("es-AR") : "✅ Pago acreditado / coordinado",
 ].join("\n")).join("\n\n");
 return [heading,"Pedidos: "+orders.length,"⚠️ Planificación anticipada: los estados de los pedidos NO cambian. La salida a reparto se confirma desde OnlyFood.","",detail].join("\n");
}
