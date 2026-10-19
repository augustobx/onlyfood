/** Política compartida por modal, acciones y tests. */
export function canReviewOrder(order: {status:string;createdAt:Date|string;review?:object|null}, now=Date.now()) {
  const age=now-new Date(order.createdAt).getTime();
  return order.status==="DELIVERED" && !order.review
    && Number.isFinite(age) && age>=0 && age<=45*24*60*60*1000;
}
export type GuestReviewReceipt={id:string;token:string;createdAt:number};
export const guestReviewKey=(tenantId:string)=>"onlyfood:review-receipts:"+tenantId;
export function decodeGuestReviewReceipts(raw:string|null, now=Date.now()):GuestReviewReceipt[]{
  try {
    const arr:unknown=JSON.parse(raw||"[]");
    if(!Array.isArray(arr))return [];
    const unique=new Set<string>();
    return arr.filter((v):v is GuestReviewReceipt=>{
      if(!v||typeof v!=="object")return false;
      const o=v as Partial<GuestReviewReceipt>;
      if(!o.id||!(/^[a-f0-9-]{36}$/i).test(o.id)||!o.token||!(/^[A-Za-z0-9_-]{32,200}$/).test(o.token)
        ||!Number.isFinite(o.createdAt)||!o.createdAt||o.createdAt>now+60_000
        ||now-o.createdAt>45*24*60*60*1000||unique.has(o.id)) return false;
      unique.add(o.id);return true;
    }).slice(0,6);
  } catch{return [];}
}
