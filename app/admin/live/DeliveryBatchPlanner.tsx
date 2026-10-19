"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, MessageCircle, CheckCircle2 } from "lucide-react";
import { prepareDeliveryBatch } from "@/app/actions/admin-delivery-batches";
import { canPlanDelivery } from "@/lib/delivery-batch";
import { toast } from "sonner";

type PlannerOrder = { id: string; needsDelivery: boolean; status: string; paymentMethod: string; paymentStatus: string;
 clientName: string; deliveryAddress: string | null; deliveryTime: string | null };
type PlannerMessenger = { id: string; name: string; isActive: boolean };

export function DeliveryBatchPlanner({orders,messengers}:{orders:PlannerOrder[],messengers:PlannerMessenger[]}) {
 const eligible=useMemo(()=>orders.filter(canPlanDelivery),[orders]);
 const [selected,setSelected]=useState<string[]>([]);
 const [messengerId,setMessengerId]=useState("");
 const [busy,setBusy]=useState(false);
 const [prepared,setPrepared]=useState<{message:string;phone:string;count:number}|null>(null);
 useEffect(()=>{
   const ids=new Set(eligible.map(o=>o.id));
   setSelected(prev=>prev.filter(id=>ids.has(id)));
   setPrepared(null);
 },[eligible]);
 const toggle=(id:string)=>{setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id].slice(0,15));setPrepared(null)};
 const prepare=async()=>{
   if(!messengerId || !selected.length){toast.error("Elegí un cadete y al menos un pedido.");return;}
   setBusy(true);
   try{
    const res=await prepareDeliveryBatch({messengerId,orderIds:selected});
    if(!res.success){setPrepared(null);toast.error(res.error);return;}
    setPrepared({phone:res.phone,message:res.message,count:res.count});
   }catch{toast.error("No pudimos preparar el mensaje. Volvé a intentar.");}
   finally{setBusy(false);}
 };
 return (
   <section aria-labelledby="delivery-batch-title" className="rounded-3xl border border-sky-200 bg-sky-50/70 p-4 text-slate-900 shadow-sm">
    <div className="flex items-start gap-3">
      <Truck className="mt-0.5 h-6 w-6 shrink-0 text-sky-700"/>
      <div>
       <h2 id="delivery-batch-title" className="text-base font-black">🛵 Planificar tanda de envíos</h2>
       <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Elegí pedidos y compartí una pre-ruta por WhatsApp para que el cadete organice las entregas.
        <strong> No marca pedidos en camino ni cambia lo que ve el cliente.</strong>
       </p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <label className="space-y-1 text-xs font-black">
        Mensajería
        <select value={messengerId} onChange={e=>{setMessengerId(e.target.value);setPrepared(null)}}
          className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-900">
          <option value="">Seleccionar cadete</option>
          {messengers.filter(m=>m.isActive).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <div>
        <div className="mb-1 flex justify-between gap-3">
          <span className="text-xs font-black">Pedidos ({selected.length}/15)</span>
          <button type="button" className="text-xs font-bold text-sky-800 underline"
            onClick={()=>{setSelected([]);setPrepared(null)}}>Limpiar</button>
        </div>
        <div className="max-h-56 space-y-1.5 overflow-auto rounded-xl border border-sky-200 bg-white p-2">
          {eligible.length===0&&<p className="p-3 text-xs text-slate-500">Sin pedidos de envío aptos para planificar.</p>}
          {eligible.map(order=>(
            <label key={order.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 px-2 py-2 hover:bg-sky-50">
              <input type="checkbox" checked={selected.includes(order.id)} disabled={!selected.includes(order.id)&&selected.length>=15}
               onChange={()=>toggle(order.id)} className="mt-1 size-4 accent-sky-700"/>
              <span className="min-w-0">
                <span className="block text-xs font-black">#{order.id.slice(-5).toUpperCase()} · {order.clientName} · {order.deliveryTime||"Horario a coordinar"}</span>
                <span className="block break-words text-xs text-slate-600">{order.deliveryAddress||"Sin dirección"}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy||!messengerId||!selected.length}
        onClick={()=>void prepare()} className="rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
        {busy?"Preparando…":"Preparar mensaje de WhatsApp"}
      </button>
      {prepared && (
        <a href={`https://wa.me/${prepared.phone}?text=${encodeURIComponent(prepared.message)}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">
          <MessageCircle className="size-4"/> Abrir WhatsApp ({prepared.count})
        </a>
      )}
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <CheckCircle2 className="size-4 text-emerald-700"/> Sin actualizar estados
      </span>
    </div>
   </section>
 );
}
