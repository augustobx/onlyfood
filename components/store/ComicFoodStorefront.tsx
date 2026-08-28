"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Crown, Search, ShoppingBag, ShoppingCart, Sparkles, Star, UserRound, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";
import styles from "./ComicFoodStorefront.module.css";

type Props = {
  categories: any[];
  combos: any[];
  config: any;
  loggedClient: any | null;
  currentPoints: number;
  onOpenAuth: () => void;
  onOpenPointsModal: () => void;
  loyaltyEnabled: boolean;
};

export function ComicFoodStorefront({ categories, combos, config, loggedClient, currentPoints, onOpenAuth, onOpenPointsModal, loyaltyEnabled }: Props) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { items, getTotal } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const appName = config?.appName || "Mi comercio";
  const categoryProducts = selectedProduct?.isCombo
    ? combos
    : categories.find((category) => category.products?.some((product: any) => product.id === selectedProduct?.id))?.products || [];

  const products = useMemo(() => {
    const source = categoryId === "combos"
      ? combos
      : categoryId === "all"
        ? [...combos, ...categories.flatMap((category) => category.products)]
        : categories.find((category) => category.id === categoryId)?.products || [];
    const normalized = query.trim().toLowerCase();
    return normalized ? source.filter((product: any) => `${product.name} ${product.description || ""}`.toLowerCase().includes(normalized)) : source;
  }, [categories, categoryId, combos, query]);

  return (
    <div className={`${styles.root} min-h-[100dvh] pb-32 text-[#17121f]`}>
      <nav className="sticky top-0 z-50 border-b-[3px] border-[#17121f] bg-[#fff7db]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-black uppercase">
            {config?.logoUrl && <Image src={config.logoUrl} alt={appName} width={42} height={42} className="size-10 rotate-[-3deg] rounded-xl border-2 border-[#17121f] bg-white object-cover shadow-[3px_3px_0_#17121f]" />}
            <span className="truncate text-base sm:text-xl">{appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            {loyaltyEnabled && (
              <button type="button" onClick={loggedClient ? onOpenPointsModal : onOpenAuth} className="hidden items-center gap-2 rounded-xl border-2 border-[#17121f] bg-[#ffe45e] px-3 py-2 text-xs font-black shadow-[3px_3px_0_#17121f] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:flex">
                <Crown className="size-4" /> {loggedClient ? `${currentPoints} PTS` : "CLUB VIP"}
              </button>
            )}
            <Link href="/profile" aria-label="Mis pedidos" className="grid size-10 place-items-center rounded-xl border-2 border-[#17121f] bg-white shadow-[3px_3px_0_#17121f]"><UserRound className="size-4" /></Link>
            <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-xl border-2 border-[#17121f] px-3 text-xs font-black text-white shadow-[3px_3px_0_#17121f]" style={{ backgroundColor: "var(--brand-primary)" }}>
              <ShoppingCart className="size-4" /><span className="hidden sm:inline">${getTotal().toLocaleString("es-AR")}</span>{itemCount > 0 && <span className="rounded-md bg-white px-1.5 text-[#17121f]">{itemCount}</span>}
            </Link>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:pt-10">
        <div className={`${styles.hero} relative overflow-hidden rounded-[2rem] border-[3px] border-[#17121f] px-5 py-9 sm:px-10 sm:py-14`}>
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex -rotate-2 items-center gap-2 border-2 border-[#17121f] bg-white px-3 py-1 text-[10px] font-black uppercase shadow-[3px_3px_0_#17121f]"><Sparkles className="size-3" /> Sabor protagonista</span>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[.84] tracking-[-.065em] text-white drop-shadow-[4px_4px_0_#17121f] sm:text-7xl lg:text-8xl">Elegí.<br />Pedí.<br /><span className="text-[#ffe45e]">¡Disfrutá!</span></h1>
            <p className="mt-5 max-w-lg rounded-xl border-2 border-[#17121f] bg-white/95 p-3 text-sm font-bold shadow-[4px_4px_0_#17121f]">Personalizá tus favoritos, descubrí combos y recibí tu pedido sin vueltas.</p>
          </div>
          <div className={`${styles.burst} absolute -right-2 top-5 grid size-24 place-items-center bg-[#ffe45e] p-5 text-center text-[10px] font-black uppercase sm:right-8 sm:size-44 sm:p-7 sm:text-xl`}><span>{config?.isStoreOpen !== false ? "¡Estamos abiertos!" : "Volvemos pronto"}</span></div>
        </div>
      </header>

      {loyaltyEnabled && (
        <section className="mx-auto max-w-7xl px-4 pb-7">
          <button type="button" onClick={loggedClient ? onOpenPointsModal : onOpenAuth} className="flex w-full flex-col items-start justify-between gap-4 rounded-2xl border-[3px] border-[#17121f] bg-[#8ef0d0] p-4 text-left shadow-[6px_6px_0_#17121f] transition hover:-translate-y-1 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full border-2 border-[#17121f] bg-[#ffe45e]"><Crown className="size-6" /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em]">Club VIP</p><h2 className="text-xl font-black">{loggedClient ? `${loggedClient.tier?.name || "Miembro"} · ${currentPoints} puntos` : "Entrá, sumá puntos y desbloqueá premios"}</h2>{loggedClient && <p className="text-xs font-bold opacity-70">Multiplicador actual: {loggedClient.tier?.pointsMultiplier || 1}x</p>}</div></div>
            <span className="rounded-xl border-2 border-[#17121f] bg-white px-4 py-2 text-xs font-black shadow-[3px_3px_0_#17121f]">{loggedClient ? "VER PREMIOS" : "QUIERO SER VIP"}</span>
          </button>
        </section>
      )}

      <div className="overflow-hidden border-y-[3px] border-[#17121f] bg-[#17121f] py-2 text-[#ffe45e]" aria-hidden="true"><div className={`${styles.marqueeTrack} flex w-max gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[.22em]`}><span>COMBOS · PREMIOS · SABOR · PERSONALIZÁ · PEDÍ ONLINE · </span><span>COMBOS · PREMIOS · SABOR · PERSONALIZÁ · PEDÍ ONLINE · </span></div></div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-7 flex flex-col gap-3">
          <div className="relative"><Search className="absolute left-4 top-3.5 size-5" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿QUÉ ANTOJO BUSCAMOS?" className="h-12 rounded-xl border-[3px] border-[#17121f] bg-white pl-12 text-sm font-black shadow-[4px_4px_0_#17121f]" /></div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[{ id: "all", name: "Todo" }, ...(combos.length ? [{ id: "combos", name: "Combos" }] : []), ...categories].map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`whitespace-nowrap rounded-xl border-2 border-[#17121f] px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#17121f] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${categoryId === category.id ? "bg-[#ffe45e]" : "bg-white"}`}>{category.name}</button>)}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any, index: number) => (
            <button key={product.id} type="button" onClick={() => setSelectedProduct(product)} className={`${styles.card} group overflow-hidden rounded-2xl border-[3px] border-[#17121f] bg-white text-left transition`}>
              <div className="relative aspect-[16/10] overflow-hidden border-b-[3px] border-[#17121f] bg-[#f4ebff]">
                {product.imageUrl && product.showImage !== false ? <Image src={product.imageUrl} alt={product.name} fill className={`${styles.image} object-cover`} sizes="(max-width: 640px) 100vw, 33vw" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-12 opacity-25" /></div>}
                <span className={`${styles.sticker} absolute left-3 top-3 rounded-lg border-2 border-[#17121f] px-3 py-1 text-[10px] font-black uppercase text-white shadow-[2px_2px_0_#17121f]`} style={{ backgroundColor: index % 2 ? "var(--brand-secondary)" : "var(--brand-primary)" }}>{product.isCombo ? "¡SUPER COMBO!" : "¡QUÉ RICO!"}</span>
                {loyaltyEnabled && product.points > 0 && <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border-2 border-[#17121f] bg-[#ffe45e] px-2 py-1 text-[10px] font-black"><Star className="size-3 fill-current" /> +{product.points} PTS</span>}
              </div>
              <div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black uppercase leading-none">{product.name}</h2><span className="shrink-0 rounded-lg border-2 border-[#17121f] bg-[#8ef0d0] px-2.5 py-1 text-sm font-black">${Number(product.basePrice).toLocaleString("es-AR")}</span></div><p className="mt-3 line-clamp-2 text-xs font-semibold opacity-65">{product.description || "Personalizalo exactamente como te gusta."}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase"><Zap className="size-3 fill-current" /> Elegir y personalizar</span></div>
            </button>
          ))}
        </div>
        {products.length === 0 && <div className="rounded-2xl border-[3px] border-[#17121f] bg-white py-16 text-center font-black shadow-[6px_6px_0_#17121f]">No encontramos productos con ese filtro.</div>}
      </main>

      <ProductCustomizerModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} categoryProducts={categoryProducts} theme="COMIC_FOOD_POP" loyaltyEnabled={loyaltyEnabled} />
    </div>
  );
}
