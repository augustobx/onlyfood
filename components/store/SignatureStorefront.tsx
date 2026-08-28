"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";

type SignatureTheme = "FRESH_MARKET" | "RETRO_DINER";

export function SignatureStorefront({ categories, combos, config, theme, loyaltyEnabled }: {
  categories: any[];
  combos: any[];
  config: any;
  theme: SignatureTheme;
  loyaltyEnabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const items = useCartStore((state) => state.items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const isFresh = theme === "FRESH_MARKET";
  const products = useMemo(() => {
    const source = categoryId === "combos"
      ? combos
      : categoryId === "all"
        ? [...combos, ...categories.flatMap((category) => category.products)]
        : categories.find((category) => category.id === categoryId)?.products || [];
    const normalized = query.trim().toLowerCase();
    return normalized ? source.filter((product: any) => `${product.name} ${product.description || ""}`.toLowerCase().includes(normalized)) : source;
  }, [categories, categoryId, combos, query]);

  const palette = isFresh
    ? { page: "bg-[#f4f0e6] text-[#173b2c]", nav: "bg-[#f4f0e6]/95 border-[#173b2c]/15", ink: "text-[#173b2c]", button: "bg-[#173b2c] text-[#fff9ea]", card: "bg-[#fffaf0] border-[#173b2c]/20", accent: "bg-[#ef6a4b] text-white" }
    : { page: "bg-[#f8d84a] text-[#251a32]", nav: "bg-[#f8d84a]/95 border-[#251a32]", ink: "text-[#251a32]", button: "bg-[#e43d30] text-white", card: "bg-[#fff6dc] border-[#251a32]", accent: "bg-[#42a6a1] text-white" };

  return (
    <div className={`min-h-[100dvh] pb-28 ${palette.page}`}>
      <nav className={`sticky top-0 z-50 border-b-2 backdrop-blur ${palette.nav}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className={`flex items-center gap-3 font-black ${palette.ink}`}>
            {config?.logoUrl ? <Image src={config.logoUrl} alt={config.appName} width={38} height={38} className="size-10 rounded-full object-cover" /> : null}
            <span className={isFresh ? "font-serif text-xl" : "text-xl uppercase tracking-tight"}>{config?.appName || "Mi comercio"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile" aria-label="Mis pedidos" className="grid size-10 place-items-center rounded-full border-2 border-current"><UserRound className="size-4" /></Link>
            <Link href="/cart" className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-xs font-black ${palette.button}`}><ShoppingCart className="size-4" /> Carrito {count > 0 && <span className="rounded-full bg-white px-1.5 text-slate-900">{count}</span>}</Link>
          </div>
        </div>
      </nav>

      <header className={`mx-auto max-w-7xl px-4 py-10 sm:py-16 ${isFresh ? "text-left" : "text-center"}`}>
        {!isFresh && <div className="mx-auto mb-5 h-3 max-w-xl border-y-2 border-[#251a32]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#251a32 0 12px,transparent 12px 24px)" }} />}
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em]">{isFresh ? "Hecho fresco · pedido simple" : "Sabores grandes · cero vueltas"}</p>
        <h1 className={`max-w-4xl text-5xl font-black leading-[0.92] sm:text-7xl ${isFresh ? "font-serif" : "mx-auto uppercase"}`}>
          {isFresh ? "Comida real, elegida a tu manera." : "Tu favorito está a un click."}
        </h1>
        <p className={`mt-5 max-w-xl text-sm font-semibold opacity-75 ${isFresh ? "" : "mx-auto"}`}>Explorá el menú, personalizá cada producto y pedí directo al comercio.</p>
      </header>

      <main className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="absolute left-4 top-3.5 size-4 opacity-50" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el menú" className={`h-11 rounded-full border-2 bg-white/70 pl-11 ${isFresh ? "border-[#173b2c]/25" : "border-[#251a32]"}`} /></div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[{ id: "all", name: "Todo" }, ...(combos.length ? [{ id: "combos", name: "Combos" }] : []), ...categories].map((category) => <button key={category.id} onClick={() => setCategoryId(category.id)} className={`whitespace-nowrap rounded-full border-2 px-4 py-2 text-xs font-black ${categoryId === category.id ? palette.button : "border-current bg-transparent"}`}>{category.name}</button>)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any) => (
            <button key={product.id} onClick={() => setSelectedProduct(product)} className={`group overflow-hidden rounded-[2rem] border-2 text-left transition hover:-translate-y-1 hover:shadow-xl ${palette.card}`}>
              <div className="relative aspect-[16/10] overflow-hidden bg-black/5">
                {product.imageUrl && product.showImage !== false ? <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-10 opacity-25" /></div>}
                {product.isCombo && <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase ${palette.accent}`}>Combo</span>}
              </div>
              <div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className={`text-xl font-black ${isFresh ? "font-serif" : "uppercase"}`}>{product.name}</h2><span className={`rounded-full px-3 py-1 text-sm font-black ${palette.button}`}>${Number(product.basePrice).toLocaleString("es-AR")}</span></div><p className="mt-2 line-clamp-2 text-xs font-medium opacity-65">{product.description || "Personalizalo y agregalo a tu pedido."}</p></div>
            </button>
          ))}
        </div>
        {products.length === 0 && <div className="py-20 text-center font-bold opacity-60">No encontramos productos con ese filtro.</div>}
      </main>

      <ProductCustomizerModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} theme={theme} loyaltyEnabled={loyaltyEnabled} />
    </div>
  );
}
