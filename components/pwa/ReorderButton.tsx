"use client";

import { useState } from "react";
import Link from "next/link";
import { Repeat2, ArrowRight, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { getReorderPreview } from "@/app/actions/client-pwa";
import { toast } from "sonner";

type Preview = Awaited<ReturnType<typeof getReorderPreview>>;
export function ReorderButton({ orderId }: { orderId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const router = useRouter();
  async function load() {
    setBusy(true);
    try {
      const result = await getReorderPreview(orderId);
      if (!result.success) toast.error(result.error);
      else setPreview(result);
    } catch { toast.error("No pudimos consultar los productos actuales."); }
    finally { setBusy(false); }
  }
  function add() {
    if (!preview?.success) return;
    const simple = preview.items.filter(item => item.quick && item.product);
    for (const item of simple) {
      if (!item.product) continue;
      addItem({
        product: item.product, quantity: item.quantity,
        removedIngredients: [], addedExtras: [],
        unitPrice: item.product.basePrice,
        notes: "",
        isHalfAndHalf: false, secondHalfProduct: null,
        comboRemovedIngredients: {},
      });
    }
    setPreview(null);
    if (simple.length) {
      toast.success(`${simple.length} producto(s) agregado(s) al carrito con precios actuales.`);
      router.push("/cart");
    } else toast.info("Elegí Personalizar para revisar los productos.");
  }
  return (
    <>
      <button type="button" disabled={busy} onClick={() => void load()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/40 px-3 py-2 text-xs font-extrabold text-orange-500 hover:bg-orange-500/10 disabled:opacity-50">
        <Repeat2 className="h-4 w-4"/>{busy ? "Consultando…" : "Volver a pedir"}
      </button>
      {preview?.success && (
        <div role="dialog" aria-modal="true" aria-label="Repetir pedido"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-slate-950 shadow-2xl">
            <h2 className="text-lg font-black">Repetir pedido</h2>
            <p className="mt-1 text-xs text-slate-600">
              Usamos precios y disponibilidad actuales. Los productos con ingredientes cambiados,
              extras, combos o menús programados deben revisarse antes de agregar.
            </p>
            <ul className="my-4 space-y-2">
              {preview.items.map(item => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl border p-3">
                  {item.quick ? <Check className="h-4 w-4 shrink-0 text-emerald-600"/> :
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600"/>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.quantity}× {item.name}</p>
                    <p className="text-[11px] text-slate-600">
                      {item.quick ? `Precio actual: $${item.product?.basePrice.toLocaleString("es-AR")} cada uno` : item.reason}
                    </p>
                  </div>
                  {!item.quick && <Link href={`/product/${item.productId}`} onClick={() => setPreview(null)}
                    className="text-xs font-black text-orange-700">Revisar</Link>}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={add} disabled={!preview.items.some(i => i.quick)}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">
                Agregar disponibles <ArrowRight className="ml-1 inline h-4 w-4"/>
              </button>
              <button type="button" onClick={() => setPreview(null)}
                className="rounded-xl border px-4 py-3 text-xs font-black">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
