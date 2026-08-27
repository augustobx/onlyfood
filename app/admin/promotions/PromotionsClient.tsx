"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, CalendarClock, Check, Loader2, PackagePlus, Pencil, Power } from "lucide-react";
import { toggleQuantityDiscountAction, upsertQuantityDiscountAction } from "@/app/actions/admin-promotions";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500";
const emptyDraft = { id: null, name: "", description: "", minQuantity: 5, type: "PERCENT", value: 10, priority: 0, startsAt: "", endsAt: "", isActive: true, productIds: [] as string[] };

function localDate(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PromotionsClient({ products, promotions }: { products: any[]; promotions: any[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const edit = (promotion: any) => setDraft({
    ...promotion,
    startsAt: localDate(promotion.startsAt),
    endsAt: localDate(promotion.endsAt),
    productIds: promotion.products.map((item: any) => item.productId),
  });
  const toggleProduct = (id: string) => setDraft((current: any) => ({ ...current, productIds: current.productIds.includes(id) ? current.productIds.filter((item: string) => item !== id) : [...current.productIds, id] }));

  const save = async () => {
    setBusy(true); setMessage(null);
    const result = await upsertQuantityDiscountAction({
      ...draft,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    });
    setBusy(false);
    if (!result.success) return setMessage(result.error || "No se pudo guardar.");
    setDraft(emptyDraft); router.refresh();
  };

  const changeStatus = async (promotion: any) => {
    setBusy(true); setMessage(null);
    const result = await toggleQuantityDiscountAction(promotion.id, !promotion.isActive);
    setBusy(false);
    if (!result.success) return setMessage(result.error || "No se pudo actualizar.");
    router.refresh();
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><h1 className="text-3xl font-black tracking-tight text-slate-950">Descuentos por cantidad</h1><p className="text-sm text-slate-500">Creá promociones automáticas por cantidad, con porcentaje o precio final por cada grupo completo.</p></div>
    {message && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        {promotions.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-white text-center text-slate-400"><div><BadgePercent className="mx-auto mb-3 size-10" /><p className="font-bold">Todavía no hay promociones.</p></div></div> : promotions.map((promotion) => {
          const productNames = products.filter((product) => promotion.products.some((item: any) => item.productId === product.id)).map((product) => product.name);
          return <article key={promotion.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">{promotion.name}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${promotion.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{promotion.isActive ? "ACTIVA" : "INACTIVA"}</span></div><p className="mt-1 text-sm text-slate-500">{promotion.description || "Sin descripción"}</p></div><div className="flex gap-2"><button onClick={() => edit(promotion)} className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50" title="Editar"><Pencil className="size-4" /></button><button onClick={() => changeStatus(promotion)} className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50" title={promotion.isActive ? "Desactivar" : "Activar"}><Power className="size-4" /></button></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-orange-50 p-3"><p className="text-[10px] font-bold uppercase text-orange-600">Condición</p><p className="font-black">Cada {promotion.minQuantity} unidades</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-600">Beneficio</p><p className="font-black">{promotion.type === "PERCENT" ? `${promotion.value}% OFF` : `$${promotion.value.toLocaleString("es-AR")} final`}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Prioridad</p><p className="font-black">{promotion.priority}</p></div></div>
            <div className="mt-4 flex flex-wrap gap-1.5">{productNames.map((name) => <span key={name} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{name}</span>)}</div>
            {(promotion.startsAt || promotion.endsAt) && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="size-3.5" />{promotion.startsAt ? `Desde ${new Date(promotion.startsAt).toLocaleString("es-AR")}` : "Desde ahora"} · {promotion.endsAt ? `hasta ${new Date(promotion.endsAt).toLocaleString("es-AR")}` : "sin vencimiento"}</p>}
          </article>;
        })}
      </section>

      <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-6">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black">{draft.id ? "Editar promoción" : "Nueva promoción"}</h2><p className="text-xs text-slate-500">Se aplicará la promoción válida que más ahorre.</p></div>{draft.id && <button onClick={() => setDraft(emptyDraft)} className="text-xs font-bold text-orange-600">Crear nueva</button>}</div>
        <div className="space-y-3">
          <input placeholder="Nombre (ej. 5 bowls semanales)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} />
          <textarea placeholder="Descripción visible para administración" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">Cantidad mínima<input type="number" min="2" value={draft.minQuantity} onChange={(e) => setDraft({ ...draft, minQuantity: Number(e.target.value) })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-500">Prioridad<input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} className={`${inputClass} mt-1`} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">Modalidad<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={`${inputClass} mt-1`}><option value="PERCENT">Porcentaje</option><option value="FINAL_PRICE">Precio final</option></select></label><label className="text-xs font-bold text-slate-500">{draft.type === "PERCENT" ? "Porcentaje" : "Precio por grupo"}<input type="number" min="0.01" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} className={`${inputClass} mt-1`} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">Comienza<input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-500">Finaliza<input type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} className={`${inputClass} mt-1`} /></label></div>
          <label className="flex items-center gap-2 rounded-xl border p-3 text-sm font-bold"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="size-4 accent-orange-600" />Promoción activa</label>
          <div><p className="mb-2 text-xs font-bold text-slate-500">Productos que suman para la cantidad</p><div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2">{products.map((product) => { const selected = draft.productIds.includes(product.id); return <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-sm ${selected ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50"}`}><span><strong className="block">{product.name}</strong><small className="text-slate-500">{product.category?.name || "Sin categoría"} · ${product.basePrice.toLocaleString("es-AR")}</small></span>{selected && <Check className="size-4" />}</button>; })}</div></div>
          <button disabled={busy || draft.productIds.length === 0} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}{draft.id ? "Guardar cambios" : "Crear promoción"}</button>
        </div>
      </aside>
    </div>
  </div>;
}
