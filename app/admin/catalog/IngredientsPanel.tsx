"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createIngredient, recordIngredientMovement, ingredientHistory, setIngredientMinimum } from "@/app/actions/ingredients";
import { toggleIngredient } from "@/app/actions/admin-catalog";
import { unitLabel, movementLabels, purchaseQuantity } from "@/lib/ingredient-units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Ingredient = { id: string; name: string; unit: string; stock: number; minimumStock: number; costPerUnit: number; isActive: boolean };
type Movement = Awaited<ReturnType<typeof ingredientHistory>>["items"][number];
const number = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 3 });
const money = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
const field = "w-full rounded-lg border bg-white p-2.5 text-sm";
export function IngredientsPanel({ ingredients, categories, reserved = {}, initialRestockId }: { ingredients: Ingredient[]; categories: { id: string; name: string }[]; reserved?: Record<string, number>; initialRestockId?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", unit: "UNIT" as "UNIT" | "G" | "ML", minimumStock: "0", categoryIds: [] as string[] });
  const [selected, setSelected] = useState<Ingredient | null>(() => ingredients.find(i => i.id === initialRestockId) || null);
  const [type, setType] = useState<"PURCHASE" | "WASTE" | "COUNT">("PURCHASE");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState(() => ingredients.find(i => i.id === initialRestockId)?.unit || "UNIT");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ ingredient: Ingredient; items: Movement[]; page: number; more: boolean } | null>(null);
  const [minimum, setMinimum] = useState<Ingredient | null>(null);
  const [minimumValue, setMinimumValue] = useState("");
  function open(ingredient: Ingredient, next: typeof type) { setSelected(ingredient); setType(next); setQuantity(""); setPrice(""); setPurchaseUnit(ingredient.unit); setReason(""); }
  async function showHistory(ingredient: Ingredient, page = 1) {
    setBusy(true);
    try { const result = await ingredientHistory(ingredient.id, page); setHistory({ ingredient, ...result, page }); }
    catch { toast.error("No se pudo abrir el historial."); } finally { setBusy(false); }
  }
  async function submitMovement(e: React.FormEvent) {
    e.preventDefault(); if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await recordIngredientMovement({ ingredientId: selected.id, type, quantity: Number(quantity), purchaseUnit: purchaseUnit as "UNIT" | "G" | "KG" | "ML" | "L", price: Number(price), reason: reason.trim() || (type === "PURCHASE" ? "Compra de ingredientes" : ""), expectedStock: selected.stock });
      if (!result.success) { toast.error(result.error); return; }
      toast.success("Movimiento registrado"); setSelected(null); router.refresh();
    } catch { toast.error("No se pudo confirmar el movimiento. Revisá el historial antes de reintentar."); }
    finally { setBusy(false); }
  }
  let converted: number | null = null;
  try { if (selected && quantity) converted = purchaseQuantity(Number(quantity), purchaseUnit, selected.unit); } catch { /* Invalid drafts are explained by form constraints/server. */ }
  const visible = ingredients.filter(i => i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!onlyLow || (i.isActive && i.stock <= i.minimumStock)));
  return <div className="space-y-5">
    <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-950">Creá tus ingredientes, registrá las compras y usalos en las recetas. Los pedidos reservan stock automáticamente. Las cantidades existentes conservan su unidad original.</div>
    <div className="flex flex-wrap items-center gap-3"><Input aria-label="Buscar ingrediente" placeholder="Buscar ingrediente…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48"/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyLow} onChange={e => setOnlyLow(e.target.checked)}/>Necesitan reposición</label><Button onClick={() => setCreating(true)}>Nuevo ingrediente</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(i => <article key={i.id} className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex justify-between gap-2"><h3 className="font-bold break-words">{i.name}</h3><span className={`text-xs rounded px-2 py-1 ${!i.isActive ? "bg-slate-100" : i.stock <= i.minimumStock ? "bg-amber-100 text-amber-900" : "bg-green-50 text-green-800"}`}>{!i.isActive ? "Pausado" : i.stock <= i.minimumStock ? "Reponer" : "Disponible"}</span></div>
      <div><strong className="text-2xl">{number(i.stock)} {unitLabel(i.unit)}</strong><span className="block text-xs text-slate-500">Disponibles para nuevos pedidos</span></div>
      <p className="text-sm text-slate-600">Reservados: {number(reserved[i.id] || 0)} {unitLabel(i.unit)}<br/>Costo promedio: {money(i.costPerUnit)} / {unitLabel(i.unit)}</p>
      <button className="text-sm underline text-slate-700" onClick={() => { setMinimum(i); setMinimumValue(String(i.minimumStock)); }}>Avisar al llegar a {number(i.minimumStock)} {unitLabel(i.unit)}</button>
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy || !i.isActive} onClick={() => open(i,"PURCHASE")}>Registrar compra</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void showHistory(i)}>Historial</Button></div>
      <details><summary className="cursor-pointer text-sm text-slate-600">Más acciones</summary><div className="flex flex-wrap gap-2 pt-3"><Button size="sm" variant="outline" disabled={busy || !i.isActive} onClick={() => open(i,"WASTE")}>Registrar merma</Button><Button size="sm" variant="outline" disabled={busy || !i.isActive} onClick={() => open(i,"COUNT")}>Corregir conteo</Button><Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); try { const r = await toggleIngredient(i.id, !i.isActive); if (!r.success) toast.error(r.error); else router.refresh(); } finally { setBusy(false); } }}>{i.isActive ? "Pausar" : "Activar"}</Button></div></details>
    </article>)}</div>
    {!visible.length && <p className="rounded-xl border p-8 text-center text-slate-500">{ingredients.length ? "No hay ingredientes para este filtro." : "Creá el primer ingrediente. Después registrá una compra para sumar existencias."}</p>}
    <Dialog open={creating} onOpenChange={v => !busy && setCreating(v)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo ingrediente</DialogTitle><DialogDescription>Elegí cómo lo medís en las recetas. La compra se registra después.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { const r = await createIngredient({ ...draft, minimumStock: Number(draft.minimumStock) }); if (!r.success) { toast.error(r.error); return; } setCreating(false); setDraft({ name:"", unit:"UNIT", minimumStock:"0", categoryIds:[] }); toast.success("Ingrediente creado. Registrá su primera compra."); router.refresh(); } catch { toast.error("No se pudo crear el ingrediente."); } finally { setBusy(false); } }}>
      <label className="block text-sm font-medium">Nombre<Input required maxLength={250} value={draft.name} onChange={e => setDraft({ ...draft, name:e.target.value })} placeholder="Ej. Queso cheddar"/></label>
      <label className="block text-sm font-medium">Unidad en recetas<select className={field} value={draft.unit} onChange={e => setDraft({ ...draft, unit:e.target.value as typeof draft.unit })}><option value="UNIT">Unidades (panes, medallones…)</option><option value="G">Gramos (queso, harina…)</option><option value="ML">Mililitros (aceite, salsas…)</option></select></label>
      <p className="text-xs text-slate-500">La unidad queda fija para proteger las recetas y el historial. Podrás cargar compras en kilos o litros cuando corresponda.</p>
      <details><summary className="cursor-pointer text-sm">Avisos y categorías (opcional)</summary><div className="space-y-3 pt-3"><label className="block text-sm">Mínimo para avisar ({unitLabel(draft.unit)})<Input type="number" min="0" step="0.001" required value={draft.minimumStock} onChange={e => setDraft({ ...draft, minimumStock:e.target.value })}/></label><p className="text-xs">Sin categorías queda disponible para todas las recetas.</p><div className="flex flex-wrap gap-3">{categories.map(c => <label key={c.id} className="text-sm"><input type="checkbox" checked={draft.categoryIds.includes(c.id)} onChange={e => setDraft({ ...draft, categoryIds:e.target.checked ? [...draft.categoryIds,c.id] : draft.categoryIds.filter(id => id !== c.id) })}/> {c.name}</label>)}</div></div></details>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Guardando…" : "Crear ingrediente"}</Button>
    </form></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={v => !v && !busy && setSelected(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{type === "PURCHASE" ? "Registrar compra" : type === "WASTE" ? "Registrar merma" : "Corregir conteo"} · {selected?.name}</DialogTitle><DialogDescription>{type === "COUNT" ? "Ingresá lo que queda disponible, sin incluir lo separado para pedidos. Se registrará la diferencia." : type === "WASTE" ? "Descuenta lo descartado. El motivo quedará en el historial." : "Suma existencias y actualiza el costo promedio del stock disponible."}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submitMovement}>
      <p className="text-sm">Disponible: {number(selected?.stock || 0)} {unitLabel(selected?.unit)} · Reservado: {number(reserved[selected?.id || ""] || 0)} {unitLabel(selected?.unit)}</p>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">{type === "COUNT" ? "Cantidad disponible contada" : "Cantidad"}<Input required type="number" min={type === "COUNT" ? "0" : "0.001"} max="1000000000" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label className="text-sm">Unidad<select className={field} value={purchaseUnit} onChange={e => setPurchaseUnit(e.target.value)}><option value={selected?.unit}>{unitLabel(selected?.unit)}</option>{selected?.unit === "G" && <option value="KG">kg</option>}{selected?.unit === "ML" && <option value="L">litros</option>}</select></label></div>
      {type === "PURCHASE" && <label className="block text-sm">Precio total pagado ($)<Input required type="number" min="0" max="1000000000" step="0.01" value={price} onChange={e => setPrice(e.target.value)}/></label>}
      {converted !== null && <p className="rounded-lg bg-blue-50 p-3 text-sm">{type === "PURCHASE" ? `Se suman ${number(converted)} ${unitLabel(selected?.unit)}${price !== "" ? ` · Costo de esta compra: ${money(Number(price) / converted)} / ${unitLabel(selected?.unit)}` : ""}` : type === "WASTE" ? `Se descuentan ${number(converted)} ${unitLabel(selected?.unit)}` : `El disponible quedará en ${number(converted)} ${unitLabel(selected?.unit)}`}</p>}
      <label className="block text-sm">{type === "PURCHASE" ? "Referencia o proveedor (opcional)" : "Motivo"}<Input required={type !== "PURCHASE"} minLength={type !== "PURCHASE" ? 3 : undefined} maxLength={250} value={reason} onChange={e => setReason(e.target.value)} placeholder={type === "WASTE" ? "Ej. Producto vencido" : type === "COUNT" ? "Ej. Conteo de cierre" : "Ej. Factura 123"}/></label>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Registrando…" : "Confirmar movimiento"}</Button>
    </form></DialogContent></Dialog>
    <Dialog open={!!history} onOpenChange={v => !v && setHistory(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Historial · {history?.ingredient.name}</DialogTitle><DialogDescription>Movimientos registrados desde la actualización. Las existencias anteriores se conservan; no se inventan compras pasadas.</DialogDescription></DialogHeader><div className="divide-y">{history?.items.map(m => <div key={m.id} className="py-3 text-sm"><div className="flex justify-between gap-2"><strong>{movementLabels[m.type] || m.type}</strong><strong>{m.quantity > 0 ? "+" : ""}{number(m.quantity)} {unitLabel(history.ingredient.unit)}</strong></div><p>{m.reason}</p>{m.type === "PURCHASE" && <p className="text-xs text-slate-600">Importe de compra: {money(m.quantity * m.unitCost)}</p>}<p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("es-AR", { timeZone:"America/Argentina/Buenos_Aires" })} · Saldo disponible: {number(m.balance)} {unitLabel(history.ingredient.unit)}{m.orderId ? ` · Pedido #${m.orderId.slice(-6)}` : ""}</p></div>)}{history?.items.length === 0 && <p className="py-6 text-sm text-slate-500">Todavía no hay movimientos registrados.</p>}</div><div className="flex justify-between"><Button variant="outline" disabled={busy || history?.page === 1} onClick={() => history && void showHistory(history.ingredient, history.page - 1)}>Anterior</Button><span className="text-sm">Página {history?.page}</span><Button variant="outline" disabled={busy || !history?.more} onClick={() => history && void showHistory(history.ingredient, history.page + 1)}>Siguiente</Button></div></DialogContent></Dialog>
    <Dialog open={!!minimum} onOpenChange={v => !v && !busy && setMinimum(null)}><DialogContent><DialogHeader><DialogTitle>Aviso de reposición · {minimum?.name}</DialogTitle><DialogDescription>Se avisa cuando el disponible llega a este mínimo.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (!minimum || busy) return; setBusy(true); try { const r = await setIngredientMinimum(minimum.id, Number(minimumValue)); if (!r.success) toast.error(r.error); else { setMinimum(null); router.refresh(); } } finally { setBusy(false); } }}><label className="block text-sm">Mínimo ({unitLabel(minimum?.unit)})<Input required type="number" min="0" step="0.001" value={minimumValue} onChange={e => setMinimumValue(e.target.value)}/></label><Button type="submit" disabled={busy}>Guardar mínimo</Button></form></DialogContent></Dialog>
  </div>;
}
