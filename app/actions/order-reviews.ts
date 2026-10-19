"use server";

import { z } from "zod";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { getLoggedClient } from "@/lib/auth";
import { isValidOrderTrackingToken } from "@/lib/order-tracking";
import { canReviewOrder } from "@/lib/order-review-policy";

const guestSchema=z.object({id:z.string().uuid(),token:z.string().min(32).max(200)});
const reviewSchema=guestSchema.partial({token:true}).extend({
 rating:z.number().int().min(1).max(5),
 comment:z.string().trim().max(600).optional().default(""),
});

/** Devuelve únicamente el código del pedido; jamás expone listas de terceros. */
export async function findPendingOrderReview(rawGuests:unknown) {
 const tenant=await getTenantContext();
 const db=createTenantDb(tenant.id);
 const client=await getLoggedClient(tenant.id);
 if(client){
   const order=await db.order.findFirst({
     where:{tenantId:tenant.id,clientId:client.id,status:"DELIVERED",review:null,
       createdAt:{gte:new Date(Date.now()-45*86400000)}},
     orderBy:{createdAt:"desc"},select:{id:true,createdAt:true,status:true},
   });
   if(order&&canReviewOrder(order))return {orderId:order.id,code:order.id.slice(-5).toUpperCase(),token:null as string|null};
 }
 const guests=z.array(guestSchema).max(6).safeParse(rawGuests);
 if(!guests.success)return null;
 for(const guest of guests.data){
  const order=await db.order.findFirst({where:{id:guest.id,tenantId:tenant.id},
   select:{id:true,status:true,createdAt:true,trackingTokenHash:true,review:{select:{id:true}}}});
  if(order&&canReviewOrder(order)&&isValidOrderTrackingToken(guest.token,order.trackingTokenHash)){
    return {orderId:order.id,code:order.id.slice(-5).toUpperCase(),token:guest.token};
  }
 }
 return null;
}

export async function submitOrderReview(input:unknown){
 const parsed=reviewSchema.safeParse(input);
 if(!parsed.success)return {success:false as const,error:"Elegí de 1 a 5 estrellas y escribí un comentario de hasta 600 caracteres."};
 const tenant=await getTenantContext();
 const db=createTenantDb(tenant.id);
 const client=await getLoggedClient(tenant.id);
 const order=await db.order.findFirst({
   where:{id:parsed.data.id,tenantId:tenant.id},
   select:{id:true,clientId:true,status:true,createdAt:true,trackingTokenHash:true,review:{select:{id:true}}},
 });
 if(!order||!canReviewOrder(order))return {success:false as const,error:"La valoración ya se registró o el pedido todavía no fue entregado."};
 const owned=Boolean(client&&order.clientId===client.id);
 if(!owned && !isValidOrderTrackingToken(parsed.data.token,order.trackingTokenHash))
   return {success:false as const,error:"No tenés permiso para valorar este pedido."};
 try{
  await db.orderReview.create({data:{
    id:crypto.randomUUID(),tenantId:tenant.id,orderId:order.id,
    rating:parsed.data.rating,comment:parsed.data.comment||null,
  }});
  return {success:true as const};
 }catch(e){
  if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")
    return {success:false as const,error:"Este pedido ya fue valorado."};
  return {success:false as const,error:"No pudimos guardar la valoración. Probá nuevamente."};
 }
}
