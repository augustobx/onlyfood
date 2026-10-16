"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { getOptionalCartSuggestions } from "@/app/actions/store-suggestions";

type Suggestion = {id:string;name:string;basePrice:number};
export function CartSuggestions() {
  const items = useCartStore(s => s.items);
  const key = useMemo(()=>[...new Set(items.map(item => item.product.id))].sort().join(","),[items]);
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (!key) { setSuggestions([]); return; }
    let current=true;
    void getOptionalCartSuggestions(key.split(",")).then(result => {
      if (current) setSuggestions(result);
    }).catch(()=>{if(current)setSuggestions([])});
    return ()=>{current=false};
  },[key]);
  if(!suggestions.length)return null;
  return <section aria-labelledby="cart-suggestions-heading" className="mt-5 space-y-3">
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-orange-500"/>
      <h2 id="cart-suggestions-heading" className="text-sm font-black">¿Querés sumar algo más?</h2>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {suggestions.map(p=><article key={p.id} className="min-w-0 rounded-xl border border-orange-500/20 p-3">
        <p className="line-clamp-2 text-xs font-bold">{p.name}</p>
        <p className="mt-1 text-xs font-extrabold text-orange-500">
          $${p.basePrice.toLocaleString("es-AR")}
        </p>
        <Link href={`/product/${p.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-orange-500">
          <Plus className="h-3.5 w-3.5"/> Personalizar
        </Link>
      </article>)}
    </div>
  </section>;
}
