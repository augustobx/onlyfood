"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { unitLabel } from "@/lib/ingredient-units";
import type { summarizeResults } from "@/lib/business-results";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
const money = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
export function MetricsClient({ results: r, range, productCosts }: { results: ReturnType<typeof summarizeResults>; range: string; productCosts: { id: string; name: string; price: number; cost: number; incomplete: boolean }[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  return <div className="space-y-6" aria-busy={pending}>
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">Período<select value={range} disabled={pending} className="rounded-lg border bg-white p-3" onChange={e => startTransition(() => router.push(`/admin/metricas?range=${e.target.value}`))}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="all">Todo el historial</option></select>{pending && <span role="status">Actualizando…</span>}</label>
    <p className="text-sm text-slate-600">Pedidos creados en el período, por día de Argentina. Excluye cancelados. Los importes incluyen descuentos y envío.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Valor de pedidos",money(r.value),`${r.count} pedidos no cancelados`],
      ["Pagado de estos pedidos",money(r.paid),"Estado de pago actual; puede haberse cobrado en otra fecha"],
      ["Pendiente de pago",money(r.pending),"Todavía no figura como pagado"],
      ["Ticket promedio",money(r.count ? r.value / r.count : 0),"Valor de pedidos dividido por cantidad"],
    ].map(([title,value,detail]) => <article key={title} className="rounded-xl border bg-white p-5"><h3 className="text-sm text-slate-600">{title}</h3><p className="mt-2 text-2xl font-bold break-words">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>)}</div>
    {!r.count ? <div className="rounded-xl border p-8 text-center text-slate-500">No hay pedidos en este período. Podés elegir otro rango.</div> : <>
    <section className="rounded-xl border bg-white p-4 sm:p-6"><h3 className="font-bold mb-4">Pedidos y pagos por día de creación</h3><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={r.daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day" tickFormatter={s => s.slice(5)}/><YAxis width={60}/><Tooltip formatter={value => money(Number(value))}/><Legend/><Line dataKey="value" name="Valor de pedidos" stroke="#2563eb" dot={false}/><Line dataKey="paid" name="Actualmente pagado" stroke="#16a34a" dot={false}/></LineChart></ResponsiveContainer></div></section>
    <section className="rounded-xl border bg-white p-5"><h3 className="font-bold mb-3">Productos más vendidos</h3><p className="text-xs text-slate-500 mb-3">Unidades en pedidos no cancelados. Incluye pendientes de pago y productos bonificados; los combos cuentan como producto.</p>{r.top.map((p,i) => <div key={i} className="flex justify-between gap-3 border-t py-3 text-sm"><span>{p.name}</span><strong>{p.quantity.toLocaleString("es-AR")} un</strong></div>)}</section>
    </>}
    <details className="rounded-xl border bg-white p-4 sm:p-6"><summary className="cursor-pointer font-bold">Costos y margen estimado</summary><div className="space-y-5 pt-4">
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Es una estimación de ingredientes, no ganancia neta. No descuenta sueldos, impuestos, comisiones, alquiler ni otros gastos. Los extras sin receta no tienen costo de ingredientes registrado.</p>
      {!!r.legacy && <p className="text-sm text-amber-900">{r.legacy} pedidos anteriores no tienen costos guardados: se estiman con sus recetas y costos actuales. Esa parte puede cambiar al editar el catálogo.</p>}
      {!!r.incomplete && <p className="text-sm text-amber-900">{r.incomplete} pedidos tienen recetas o costos incompletos. El costo está subestimado y el margen no es confiable. <Link href="/admin/catalog?tab=products" className="underline">Revisar recetas</Link></p>}
      <div className="grid gap-4 sm:grid-cols-3">{[["Ingredientes estimados",money(r.cost)],["Diferencia antes de otros gastos",r.incomplete ? "Datos incompletos" : money(r.value-r.cost)],["Costo de ingredientes / pedidos",r.incomplete || !r.value ? "Sin datos suficientes" : `${(r.cost/r.value*100).toFixed(1)}%`]].map(([title,value]) => <div key={title} className="rounded-lg bg-slate-50 p-4"><h4 className="text-sm">{title}</h4><strong className="block mt-2 text-xl">{value}</strong></div>)}</div>
      <p className="text-xs text-slate-500">Los pedidos nuevos guardan receta y costo al crearse, incluso si se modifica el ingrediente después. Los costos sin registrar siguen marcados como incompletos.</p>
      <details><summary className="cursor-pointer font-semibold">Consumo previsto de ingredientes</summary><p className="py-3 text-xs text-slate-500">Cantidades de las recetas de estos pedidos, incluidos los pendientes. No equivale a merma ni consumo físico medido.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-2">Ingrediente</th><th className="p-2">Cantidad</th><th className="p-2">Costo estimado</th></tr></thead><tbody>{r.usage.map(i => <tr key={i.id} className="border-t"><td className="p-2">{i.name}</td><td className="p-2 whitespace-nowrap">{i.quantity.toLocaleString("es-AR", { maximumFractionDigits:3 })} {unitLabel(i.unit)}</td><td className="p-2 whitespace-nowrap">{money(i.cost)}</td></tr>)}</tbody></table>{!r.usage.length && <p className="p-4">No hay cantidades de ingredientes registradas.</p>}</div></details>
    </div></details>
    <details className="rounded-xl border bg-white p-4 sm:p-6"><summary className="cursor-pointer font-bold">Costo actual por producto</summary><p className="py-3 text-sm text-slate-600">Simulación con recetas y precios actuales. No modifica pedidos anteriores. Revisá los datos antes de decidir precios.</p><div className="divide-y">{productCosts.map(p => <div key={p.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold">{p.name}</span><span>{p.incomplete ? "Falta receta o costo" : `Ingredientes: ${money(p.cost)} · Precio base: ${money(p.price)}`}</span></div>)}</div><Link href="/admin/catalog?tab=products" className="inline-block mt-3 text-sm underline">Editar productos y recetas</Link></details>
  </div>;
}
