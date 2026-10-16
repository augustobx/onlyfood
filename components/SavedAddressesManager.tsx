"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Home, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteClientSavedAddress, getClientSavedAddresses,
  setDefaultClientSavedAddress, upsertClientSavedAddress,
} from "@/app/actions/client-addresses";

type Address = Awaited<ReturnType<typeof getClientSavedAddresses>>[number];
type Draft = {
  id?: string; label: string; street: string; unit: string;
  reference: string; makeDefault: boolean;
};
const blank: Draft = {
  label: "Casa", street: "", unit: "", reference: "", makeDefault: false,
};

export function SavedAddressesManager({
  initialAddresses,
  dark = false,
}: {
  initialAddresses: Address[];
  dark?: boolean;
}) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const panel = dark
    ? "border-white/15 bg-[#20172a] text-white"
    : "border-slate-200 bg-white text-slate-900";
  const muted = dark ? "text-slate-300" : "text-slate-600";
  const input = dark ? "border-white/20 bg-[#140f1e] text-white placeholder:text-slate-500" : "bg-white";

  async function refresh() {
    setAddresses(await getClientSavedAddresses());
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const result = await upsertClientSavedAddress(draft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await refresh();
      setDraft(null);
      toast.success("Dirección guardada.");
    } catch {
      toast.error("No se pudo guardar. Probá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await setDefaultClientSavedAddress(id);
      if (!r.success) toast.error(r.error);
      else { await refresh(); toast.success("Dirección principal actualizada."); }
    } catch {
      toast.error("No se pudo cambiar la dirección principal.");
    } finally { setBusy(false); }
  }

  async function remove(address: Address) {
    if (busy || !window.confirm(`¿Eliminar la dirección "${address.label}"? Los pedidos anteriores se conservan.`)) return;
    setBusy(true);
    try {
      const r = await deleteClientSavedAddress(address.id);
      if (!r.success) toast.error(r.error);
      else { await refresh(); toast.success("Dirección eliminada."); }
    } catch {
      toast.error("No se pudo eliminar la dirección.");
    } finally { setBusy(false); }
  }

  return (
    <section className={`mb-8 rounded-3xl border p-4 shadow-sm sm:p-5 ${panel}`}
      aria-labelledby="saved-addresses-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="saved-addresses-title" className="flex items-center gap-2 text-lg font-black">
            <MapPin className="h-5 w-5 text-orange-500" aria-hidden="true"/>
            Mis direcciones
          </h2>
          <p className={`mt-1 text-xs ${muted}`}>
            Elegí tu dirección principal para completar el delivery automáticamente.
            Hasta 5 por comercio.
          </p>
        </div>
        {!draft && addresses.length < 5 && (
          <Button type="button" size="sm" variant="outline"
            onClick={() => setDraft({ ...blank, makeDefault: addresses.length === 0 })}
            className={`rounded-xl ${input}`}>
            <Plus className="mr-1 h-4 w-4"/> Agregar
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map(address => (
          <article key={address.id}
            className={`min-w-0 space-y-2 rounded-2xl border p-3 ${dark ? "border-white/15 bg-black/20" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 font-bold">
                {address.label.toLowerCase() === "casa"
                  ? <Home className="h-4 w-4 shrink-0 text-orange-500"/>
                  : <MapPin className="h-4 w-4 shrink-0 text-orange-500"/>}
                <span className="break-words">{address.label}</span>
              </span>
              {address.isDefault && (
                <span className="shrink-0 rounded-lg bg-orange-500/15 px-2 py-1 text-[10px] font-black text-orange-500">
                  Principal
                </span>
              )}
            </div>
            <p className={`break-words text-xs leading-relaxed ${muted}`}>
              {address.street}
              {address.unit && `, ${address.unit}`}
              {address.reference && <span className="block">Referencia: {address.reference}</span>}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!address.isDefault && (
                <Button size="sm" type="button" variant="outline" disabled={busy}
                  onClick={() => void makeDefault(address.id)}
                  className={`h-8 rounded-lg text-[11px] ${input}`}>
                  <Star className="mr-1 h-3.5 w-3.5"/> Principal
                </Button>
              )}
              <Button size="sm" type="button" variant="outline" disabled={busy}
                onClick={() => setDraft({
                  id: address.id, label: address.label, street: address.street,
                  unit: address.unit, reference: address.reference, makeDefault: address.isDefault,
                })}
                className={`h-8 rounded-lg text-[11px] ${input}`}>
                <Pencil className="mr-1 h-3.5 w-3.5"/> Editar
              </Button>
              <Button size="sm" type="button" variant="outline" disabled={busy}
                onClick={() => void remove(address)}
                className="h-8 rounded-lg border-rose-500/40 text-[11px] text-rose-500">
                <Trash2 className="mr-1 h-3.5 w-3.5"/> Eliminar
              </Button>
            </div>
          </article>
        ))}
      </div>
      {addresses.length === 0 && !draft && (
        <p className={`rounded-xl border border-dashed p-4 text-center text-xs ${muted}`}>
          Todavía no guardaste direcciones. Agregá Casa o Trabajo para acelerar tus próximos pedidos.
        </p>
      )}

      {draft && (
        <form onSubmit={save} className={`mt-4 space-y-3 rounded-2xl border p-4 ${dark ? "border-white/15 bg-black/15" : "border-orange-200 bg-orange-50/40"}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black">{draft.id ? "Editar dirección" : "Nueva dirección"}</h3>
            <button type="button" disabled={busy} onClick={() => setDraft(null)}
              aria-label="Cancelar edición" className="rounded-lg p-2"><X className="h-4 w-4"/></button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="saved-address-label">Nombre (Casa, Trabajo u otro)</Label>
            <Input id="saved-address-label" list="address-label-suggestions"
              required maxLength={40} className={input}
              value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })}/>
            <datalist id="address-label-suggestions">
              <option value="Casa"/><option value="Trabajo"/><option value="Otra"/>
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="saved-address-street">Calle y número</Label>
            <Input id="saved-address-street" required minLength={5} maxLength={180}
              autoComplete="street-address" className={input} value={draft.street}
              onChange={e => setDraft({ ...draft, street: e.target.value })}
              placeholder="Ej.: Mitre 1234"/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="saved-address-unit">Piso o departamento (opcional)</Label>
            <Input id="saved-address-unit" maxLength={60} className={input} value={draft.unit}
              onChange={e => setDraft({ ...draft, unit: e.target.value })}/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="saved-address-ref">Referencias (opcional)</Label>
            <Input id="saved-address-ref" maxLength={80} className={input} value={draft.reference}
              onChange={e => setDraft({ ...draft, reference: e.target.value })}/>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-orange-500"
              checked={draft.makeDefault} onChange={e => setDraft({ ...draft, makeDefault: e.target.checked })}/>
            Usar como dirección principal
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="rounded-xl bg-orange-600 text-white hover:bg-orange-500">
              {busy ? "Guardando…" : "Guardar dirección"}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}
              className={`rounded-xl ${input}`}>Cancelar</Button>
          </div>
        </form>
      )}
    </section>
  );
}
