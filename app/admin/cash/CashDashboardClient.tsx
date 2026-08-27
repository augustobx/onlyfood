"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Banknote, CalendarRange, CheckCircle2, Loader2, LockKeyhole, RotateCcw } from "lucide-react";
import { addCashMovementAction, closeCashSessionAction, openCashSessionAction, reopenCashSessionAction } from "@/app/actions/admin-cash";

const money = (value: number) => `$${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500";

export function CashDashboardClient({ dashboard, from, to }: { dashboard: any; from: string; to: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(dashboard.sessions.find((item: any) => item.status === "OPEN")?.id || dashboard.sessions[0]?.id || "");
  const selected = dashboard.sessions.find((item: any) => item.id === selectedId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState({ locationId: dashboard.locations[0]?.id || "", openingBalance: 0, notes: "" });
  const [movement, setMovement] = useState({ type: "EXPENSE", category: "", description: "", amount: 0 });
  const [closing, setClosing] = useState({ countedBalance: 0, notes: "" });

  const run = async (operation: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(true); setMessage(null);
    const result = await operation();
    setBusy(false);
    if (!result.success) return setMessage(result.error || "No se pudo completar la operación.");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-3xl font-black tracking-tight text-slate-950">Caja diaria</h1><p className="text-sm text-slate-500">Aperturas, ventas cobradas, movimientos, cierres y balances por sucursal.</p></div>
        <form className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-3 shadow-sm">
          <label className="text-xs font-bold text-slate-500">Desde<input name="from" type="date" defaultValue={from} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-bold text-slate-500">Hasta<input name="to" type="date" defaultValue={to} className={`${inputClass} mt-1`} /></label>
          <button className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"><CalendarRange className="size-4" />Ver período</button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Ventas en efectivo", dashboard.totals.sales, "text-emerald-700"],
          ["Otros ingresos", dashboard.totals.income, "text-blue-700"],
          ["Egresos", dashboard.totals.expenses, "text-rose-700"],
          ["Saldo esperado", dashboard.totals.expected, "text-slate-950"],
          ["Diferencias", dashboard.totals.difference, dashboard.totals.difference === 0 ? "text-slate-700" : "text-amber-700"],
        ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${color}`}>{money(Number(value))}</p></div>)}
      </div>

      {message && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-black"><Banknote className="size-5 text-orange-600" />Abrir caja de hoy</h2>
            <div className="space-y-3">
              <select value={openForm.locationId} onChange={(e) => setOpenForm({ ...openForm, locationId: e.target.value })} className={inputClass}>{dashboard.locations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
              <input type="number" min="0" step="0.01" placeholder="Saldo inicial" value={openForm.openingBalance} onChange={(e) => setOpenForm({ ...openForm, openingBalance: Number(e.target.value) })} className={inputClass} />
              <textarea placeholder="Observaciones de apertura" value={openForm.notes} onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })} className={inputClass} />
              <button disabled={busy || !openForm.locationId} onClick={() => run(() => openCashSessionAction(openForm))} className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Abrir caja</button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-4"><h2 className="font-black">Historial</h2><p className="text-xs text-slate-500">{dashboard.sessions.length} cajas en el período</p></div>
            <div className="max-h-[520px] overflow-y-auto p-2">
              {dashboard.sessions.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No hay cajas registradas.</p> : dashboard.sessions.map((session: any) => (
                <button key={session.id} onClick={() => setSelectedId(session.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${selectedId === session.id ? "border-orange-400 bg-orange-50" : "border-slate-100 hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between"><strong>{new Date(session.businessDate).toLocaleDateString("es-AR", { timeZone: "UTC" })}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${session.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{session.status === "OPEN" ? "ABIERTA" : "CERRADA"}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{session.location.name}</p><p className="mt-2 text-sm font-black">Esperado: {money(session.calculatedExpectedBalance)}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          {!selected ? <div className="grid min-h-72 place-items-center text-slate-400">Seleccioná o abrí una caja.</div> : <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"><div><h2 className="text-xl font-black">{selected.location.name} · {new Date(selected.businessDate).toLocaleDateString("es-AR", { timeZone: "UTC" })}</h2><p className="text-xs text-slate-500">Abierta por {selected.openedByName || "Administrador"}</p></div>{selected.status === "CLOSED" && <button disabled={busy} onClick={() => run(() => reopenCashSessionAction(selected.id))} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RotateCcw className="size-4" />Reabrir</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Balance label="Inicial" value={selected.openingBalance} />
              <Balance label={`Ventas (${selected.cashOrders})`} value={selected.cashSales} positive />
              <Balance label="Ingresos" value={selected.manualIncome} positive />
              <Balance label="Egresos" value={selected.expenses} negative />
              <Balance label="Esperado" value={selected.calculatedExpectedBalance} />
            </div>
            {selected.status === "OPEN" ? <>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border bg-slate-50 p-4"><h3 className="mb-3 font-black">Nuevo movimiento</h3><div className="space-y-3"><select value={movement.type} onChange={(e) => setMovement({ ...movement, type: e.target.value })} className={inputClass}><option value="INCOME">Ingreso</option><option value="EXPENSE">Egreso</option></select><input placeholder="Categoría (ej. Proveedores)" value={movement.category} onChange={(e) => setMovement({ ...movement, category: e.target.value })} className={inputClass} /><textarea placeholder="Detalle del movimiento" value={movement.description} onChange={(e) => setMovement({ ...movement, description: e.target.value })} className={inputClass} /><input type="number" min="0.01" step="0.01" placeholder="Importe" value={movement.amount || ""} onChange={(e) => setMovement({ ...movement, amount: Number(e.target.value) })} className={inputClass} /><button disabled={busy} onClick={() => run(() => addCashMovementAction({ ...movement, cashSessionId: selected.id }))} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white ${movement.type === "INCOME" ? "bg-emerald-600" : "bg-rose-600"}`}>{movement.type === "INCOME" ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}Registrar</button></div></div>
                <div className="rounded-2xl border border-slate-900 bg-slate-900 p-4 text-white"><h3 className="mb-1 flex items-center gap-2 font-black"><LockKeyhole className="size-4" />Cerrar caja</h3><p className="mb-4 text-xs text-slate-400">Contá el efectivo físico. El sistema calculará automáticamente la diferencia.</p><div className="space-y-3"><input type="number" min="0" step="0.01" placeholder="Efectivo contado" value={closing.countedBalance || ""} onChange={(e) => setClosing({ ...closing, countedBalance: Number(e.target.value) })} className={inputClass} /><textarea placeholder="Observaciones del cierre" value={closing.notes} onChange={(e) => setClosing({ ...closing, notes: e.target.value })} className={inputClass} /><button disabled={busy} onClick={() => run(() => closeCashSessionAction({ ...closing, cashSessionId: selected.id }))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"><CheckCircle2 className="size-4" />Cerrar y guardar balance</button></div></div>
              </div>
            </> : <div className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-3"><Balance label="Efectivo contado" value={selected.closingBalance} dark /><Balance label="Esperado al cierre" value={selected.expectedBalance} dark /><Balance label="Diferencia" value={selected.difference} dark /></div>}
            <div><h3 className="mb-3 font-black">Movimientos detallados</h3><div className="overflow-hidden rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Hora</th><th className="p-3">Tipo</th><th className="p-3">Categoría y detalle</th><th className="p-3 text-right">Importe</th></tr></thead><tbody className="divide-y">{selected.movements.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin movimientos manuales.</td></tr> : selected.movements.map((item: any) => <tr key={item.id}><td className="p-3 text-xs text-slate-500">{new Date(item.occurredAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td><td className={`p-3 text-xs font-black ${item.type === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>{item.type === "INCOME" ? "INGRESO" : "EGRESO"}</td><td className="p-3"><strong className="block">{item.category}</strong><span className="text-xs text-slate-500">{item.description}</span></td><td className="p-3 text-right font-black">{item.type === "EXPENSE" ? "−" : "+"}{money(item.amount)}</td></tr>)}</tbody></table></div></div>
          </div>}
        </section>
      </div>
      {busy && <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-xl"><Loader2 className="size-4 animate-spin" />Guardando</div>}
    </div>
  );
}

function Balance({ label, value, positive, negative, dark }: { label: string; value: number; positive?: boolean; negative?: boolean; dark?: boolean }) {
  return <div className={`rounded-xl p-3 ${dark ? "bg-white/5" : "bg-slate-50"}`}><p className={`text-[10px] font-bold uppercase ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p><p className={`mt-1 text-lg font-black ${positive ? "text-emerald-600" : negative ? "text-rose-600" : dark ? "text-white" : "text-slate-950"}`}>{money(value)}</p></div>;
}
