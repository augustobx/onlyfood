"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";
import { createTenantDb } from "@/lib/tenant-db";
import { canPlanDelivery, composeDeliveryBatch } from "@/lib/delivery-batch";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp-message-utils";

const inputSchema = z.object({
  messengerId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1).max(15).refine(ids=>new Set(ids).size===ids.length,"Pedidos repetidos"),
});

/** Read-only. Nunca llama updateOrderStatus ni dispatchMessengerRoadmap. */
export async function prepareDeliveryBatch(input: unknown) {
  await requireAdmin(["OWNER","MANAGER","CASHIER","DELIVERY","STAFF"]);
  const tenant=await getTenantContext();
  await requireTenantFeature(tenant.id,"orders");
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success) return {success:false as const,error:"Seleccioná entre 1 y 15 pedidos válidos y un mensajero."};
  const db=createTenantDb(tenant.id);
  const messenger=await db.messenger.findFirst({where:{id:parsed.data.messengerId,tenantId:tenant.id,isActive:true},
    select:{id:true,name:true,phone:true}});
  if(!messenger) return {success:false as const,error:"Mensajero no disponible."};
  const orders=await db.order.findMany({where:{tenantId:tenant.id,id:{in:parsed.data.orderIds}},
    select:{id:true,needsDelivery:true,status:true,paymentMethod:true,paymentStatus:true,
      clientName:true,clientPhone:true,deliveryAddress:true,deliveryTime:true,total:true}});
  if(orders.length!==parsed.data.orderIds.length || orders.some(o=>!canPlanDelivery(o)))
    return {success:false as const,error:"Algún pedido cambió de estado o tiene el pago pendiente. Actualizá la lista."};
  const ordered=parsed.data.orderIds.map(id=>orders.find(order=>order.id===id)!);
  const phone=normalizeWhatsAppRecipient(messenger.phone,"549");
  if(!phone) return {success:false as const,error:"El mensajero necesita un WhatsApp válido."};
  const message=composeDeliveryBatch(ordered,messenger.name);
  if(message.length>3500) return {success:false as const,error:"Demasiados datos para WhatsApp; dividí la tanda."};
  return {success:true as const,phone,message,count:ordered.length};
}
