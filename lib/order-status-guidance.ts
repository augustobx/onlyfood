export function orderHelpText(status: string, needsDelivery: boolean): string {
  switch (status) {
    case "NEW": return "El comercio recibió tu pedido. Te avisaremos cuando comience a prepararlo.";
    case "IN_PROCESS": return "Tu pedido está en preparación. El comercio confirmará cuándo estará listo.";
    case "PENDING_DELIVERY": return "Tu pedido está listo y espera la salida del repartidor.";
    case "OUT_FOR_DELIVERY": return "Tu pedido salió del local. Esperá al repartidor en la dirección indicada.";
    case "FINISHED": return needsDelivery ? "El pedido está listo y espera reparto." : "Tu pedido está listo para retirar en el local.";
    case "DELIVERED": return "El pedido fue entregado. ¡Gracias por comprar!";
    case "CANCELLED": return "Este pedido fue cancelado. Podés consultar al comercio si tenés dudas.";
    default: return "Seguí tu pedido acá. Los cambios aparecerán cuando el comercio los confirme.";
  }
}
