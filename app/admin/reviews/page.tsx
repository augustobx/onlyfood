import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";
import { createTenantDb } from "@/lib/tenant-db";
import { MessageSquareHeart, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage(){
 await requireAdmin(["OWNER","MANAGER","STAFF","CASHIER"]);
 const tenant=await getTenantContext();
 await requireTenantFeature(tenant.id,"orders");
 const db=createTenantDb(tenant.id);
 const [reviews,stats]=await Promise.all([
  db.orderReview.findMany({
    where:{tenantId:tenant.id},orderBy:{createdAt:"desc"},take:200,
    include:{order:{select:{id:true,clientName:true,createdAt:true,needsDelivery:true}}},
  }),
  db.orderReview.groupBy({by:["rating"],where:{tenantId:tenant.id},_count:{_all:true}}),
 ]);
 const count=stats.reduce((sum,s)=>sum+s._count._all,0);
 const average=count?stats.reduce((sum,s)=>sum+s.rating*s._count._all,0)/count:0;
 return <main className="mx-auto max-w-5xl space-y-6">
   <header className="space-y-2">
    <span className="inline-flex items-center gap-2 text-sm font-black text-orange-600">
      <MessageSquareHeart className="size-5"/> Opiniones de compradores
    </span>
    <h1 className="text-3xl font-black text-slate-900">Bandeja de valoraciones</h1>
    <p className="text-sm text-slate-600">Reseñas verificadas de pedidos entregados. Cada pedido se puede valorar una sola vez.</p>
   </header>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">Valoraciones</p><p className="mt-1 text-3xl font-black text-slate-900">{count}</p></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">Promedio</p><p className="mt-1 text-3xl font-black text-amber-600">{count?average.toFixed(1):"—"} ★</p></div>
    <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm sm:col-span-1"><p className="text-xs font-bold text-slate-500">5 estrellas</p><p className="mt-1 text-3xl font-black text-slate-900">{stats.find(s=>s.rating===5)?._count._all||0}</p></div>
   </div>
   {reviews.length===0?<section className="rounded-2xl bg-white p-10 text-center text-slate-600">Todavía no recibiste valoraciones.</section>:(
     <div className="grid gap-3 sm:grid-cols-2">
      {reviews.map(review=><article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div><p className="font-black text-slate-900">#{review.order.id.slice(-5).toUpperCase()} · {review.order.clientName}</p>
            <p className="mt-1 text-xs text-slate-500">{review.createdAt.toLocaleString("es-AR")}</p>
          </div>
          <div className="flex items-center text-amber-500" aria-label={review.rating+" de 5 estrellas"}>
            {Array.from({length:5},(_,i)=><Star key={i} className="size-4" fill={i<review.rating?"currentColor":"none"}/>)}
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{review.comment||"Sin comentario adicional."}</p>
      </article>)}
     </div>
   )}
 </main>;
}