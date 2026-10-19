"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquareHeart } from "lucide-react";
import { findPendingOrderReview, submitOrderReview } from "@/app/actions/order-reviews";
import { decodeGuestReviewReceipts, guestReviewKey, type GuestReviewReceipt } from "@/lib/order-review-policy";

type PendingReview={orderId:string;code:string;token:string|null};

export function OrderReviewPrompt({tenantId}:{tenantId:string}){
 const [pending,setPending]=useState<PendingReview|null>(null);
 const [stars,setStars]=useState(0);
 const [comment,setComment]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
   let mounted=true;
   const check=async()=>{
    try{
      const guests=decodeGuestReviewReceipts(localStorage.getItem(guestReviewKey(tenantId)))
        .map(x=>({id:x.id,token:x.token}));
      const result=await findPendingOrderReview(guests);
      if(mounted&&result&&!sessionStorage.getItem("onlyfood:review-dismissed:"+result.orderId))
        setPending(result);
    }catch{/* El local puede seguir operando si se bloquea el almacenamiento. */}
   };
   void check();
   const onAuth=()=>void check();
   window.addEventListener("onlyfood:client-auth-changed",onAuth);
   return ()=>{mounted=false;window.removeEventListener("onlyfood:client-auth-changed",onAuth)};
 },[tenantId]);

 const dismiss=()=>{
  if(pending){try{sessionStorage.setItem("onlyfood:review-dismissed:"+pending.orderId,"yes")}catch{}}
  setPending(null);
 };
 const send=async()=>{
  if(!pending||stars<1)return;
  setBusy(true);setError("");
  try{
    const res=await submitOrderReview({id:pending.orderId,token:pending.token||undefined,rating:stars,comment});
    if(!res.success){setError(res.error);return;}
    try{
      const key=guestReviewKey(tenantId);
      const keep=decodeGuestReviewReceipts(localStorage.getItem(key))
        .filter(o=>o.id!==pending.orderId);
      if(keep.length)localStorage.setItem(key,JSON.stringify(keep));
      else localStorage.removeItem(key);
    }catch{}
    setPending(null);setStars(0);setComment("");
  }catch{setError("No pudimos guardar tu valoración. Volvé a intentar.");}
  finally{setBusy(false);}
 };
 if(!pending)return null;
 return (
  <div role="presentation" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
   <section role="dialog" aria-modal="true" aria-labelledby="review-title"
    className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
      <MessageSquareHeart className="size-7"/>
    </div>
    <h2 id="review-title" className="mt-3 text-center text-2xl font-black">¿Qué te pareció tu pedido?</h2>
    <p className="mt-2 text-center text-sm text-slate-600">
      Tu compra #{pending.code} fue entregada. Tu opinión nos ayuda a mejorar.
    </p>
    <fieldset className="mt-5">
      <legend className="w-full text-center text-xs font-bold text-slate-700">Calificá de 1 a 5 estrellas</legend>
      <div className="mt-2 flex items-center justify-center gap-1" role="group" aria-label="Calificación del pedido">
        {[1,2,3,4,5].map(value=>(
          <button key={value} type="button" aria-label={value+" estrellas"}
           aria-pressed={stars===value} onClick={()=>setStars(value)}
           className="rounded-lg p-1.5 text-amber-500 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-orange-500">
            <Star className="size-9" fill={value<=stars?"currentColor":"none"}/>
          </button>
        ))}
      </div>
    </fieldset>
    <label htmlFor="order-review-comment" className="mt-4 block text-xs font-black">¿Querés contarnos algo? (opcional)</label>
    <textarea id="order-review-comment" rows={3} maxLength={600} value={comment}
      onChange={e=>setComment(e.target.value)}
      placeholder="¿Cómo estuvo la comida, la atención y la entrega?"
      className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:outline-orange-500"/>
    <div className="text-right text-[11px] text-slate-500">{comment.length}/600</div>
    {error&&<p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
    <button type="button" disabled={busy||stars<1} onClick={()=>void send()}
      className="mt-3 w-full rounded-xl bg-orange-600 p-3 font-black text-white disabled:opacity-40">
      {busy?"Enviando…":"Enviar valoración"}
    </button>
    <button type="button" onClick={dismiss} disabled={busy}
      className="mt-2 w-full rounded-xl p-3 text-sm font-bold text-slate-600 hover:bg-slate-100">
      Ahora no
    </button>
   </section>
  </div>
 );
}
