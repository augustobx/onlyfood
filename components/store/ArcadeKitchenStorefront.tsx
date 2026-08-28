"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Crown, Gamepad2, Search, ShoppingBag, ShoppingCart, Star, Trophy, UserRound, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";
import styles from "./ArcadeKitchenStorefront.module.css";

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

export function ArcadeKitchenStorefront({ categories, combos, config, loggedClient, currentPoints, onOpenAuth, onOpenPointsModal, loyaltyEnabled }: Props) {
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
    <div className={`${styles.root} min-h-[100dvh] pb-32 text-white`}>
      <nav className="sticky top-0 z-50 border-b-2 border-cyan-300/70 bg-[#090625]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {config?.logoUrl ? <Image src={config.logoUrl} alt={appName} width={42} height={42} className={`${styles.pixels} size-10 rounded-md border-2 border-cyan-300 object-cover shadow-[3px_3px_0_#ec4899]`} /> : <span className="grid size-10 place-items-center border-2 border-cyan-300 bg-violet-700 shadow-[3px_3px_0_#ec4899]"><Gamepad2 className="size-5" /></span>}
            <div className="min-w-0"><span className="block truncate text-sm font-black uppercase tracking-wider text-cyan-200 sm:text-base">{appName}</span><span className={`text-[9px] font-black uppercase ${config?.isStoreOpen !== false ? "text-emerald-300" : "text-rose-300"}`}>{config?.isStoreOpen !== false ? "● SERVER ONLINE" : "● SERVER OFFLINE"}</span></div>
          </Link>
          <div className="flex items-center gap-2">
            {loyaltyEnabled && <button type="button" onClick={loggedClient ? onOpenPointsModal : onOpenAuth} className="hidden h-10 items-center gap-2 border-2 border-fuchsia-400 bg-[#15113b] px-3 text-[10px] font-black uppercase text-yellow-200 shadow-[3px_3px_0_#ec4899] sm:flex"><Trophy className="size-4" />{loggedClient ? `${currentPoints} XP` : "VIP PLAYER"}</button>}
            <Link href="/profile" aria-label="Mis pedidos" className="grid size-10 place-items-center border-2 border-cyan-300 bg-[#15113b] text-cyan-200 shadow-[3px_3px_0_#2563eb]"><UserRound className="size-4" /></Link>
            <Link href="/cart" className="relative flex h-10 items-center gap-2 border-2 border-yellow-200 bg-fuchsia-600 px-3 text-[10px] font-black uppercase shadow-[3px_3px_0_#32f5ff]"><ShoppingCart className="size-4" /><span className="hidden sm:inline">${getTotal().toLocaleString("es-AR")}</span>{itemCount > 0 && <span className="bg-yellow-200 px-1.5 text-[#090625]">{itemCount}</span>}</Link>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-7xl px-4 pb-9 pt-8 sm:pt-12">
        <div className={`${styles.screen} rounded-xl px-5 py-10 sm:px-10 sm:py-14`}>
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_340px]">
            <div><span className={`${styles.blink} inline-flex items-center gap-2 border border-cyan-300 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.24em] text-cyan-200`}><Gamepad2 className="size-3" /> Press start to order</span><h1 className={`${styles.title} mt-5 text-5xl font-black uppercase leading-[.88] tracking-[-.055em] sm:text-7xl lg:text-8xl`}>Tu antojo.<br /><span className="text-yellow-200">Tu misión.</span></h1><p className="mt-5 max-w-xl text-sm font-bold text-violet-100/75">Elegí tu nivel, personalizá el pedido y desbloqueá sabor. Sin filas. Sin perder vidas.</p></div>
            <div className={`${styles.float} relative mx-auto grid aspect-square w-56 place-items-center rounded-full border-4 border-dashed border-cyan-300 bg-fuchsia-500/15 sm:w-64`}><div className="grid size-36 place-items-center rounded-2xl border-4 border-yellow-200 bg-violet-700 shadow-[10px_10px_0_#ec4899]"><ShoppingBag className="size-16 text-yellow-200" /></div><span className="absolute -bottom-3 bg-yellow-200 px-4 py-2 text-xs font-black uppercase text-[#090625] shadow-[4px_4px_0_#ec4899]">{config?.isStoreOpen !== false ? "Nueva partida" : "Pausa"}</span></div>
          </div>
        </div>
      </header>

      {loyaltyEnabled && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <button type="button" onClick={loggedClient ? onOpenPointsModal : onOpenAuth} className="grid w-full gap-4 border-2 border-fuchsia-400 bg-[#15113b] p-4 text-left shadow-[6px_6px_0_#32f5ff] transition hover:-translate-y-1 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="grid size-12 place-items-center border-2 border-yellow-200 bg-fuchsia-600"><Crown className="size-6 text-yellow-200" /></div>
            <div><p className="text-[9px] font-black uppercase tracking-[.3em] text-cyan-300">Player profile · club VIP</p><h2 className="mt-1 text-lg font-black uppercase text-white">{loggedClient ? `${loggedClient.tier?.name || "Player"} · ${currentPoints} XP` : "Creá tu jugador y empezá a sumar XP"}</h2>{loggedClient && <div className="mt-2 h-2 max-w-sm overflow-hidden border border-cyan-200 bg-[#090625]"><div className={`${styles.progress} h-full bg-gradient-to-r from-cyan-300 to-fuchsia-500`} style={{ width: `${Math.max(12, Math.min(100, currentPoints % 100))}%` }} /></div>}<p className="mt-1 text-[10px] font-bold text-violet-200/65">{loggedClient ? `Bonus de puntos ${loggedClient.tier?.pointsMultiplier || 1}x` : "Premios, niveles y beneficios exclusivos"}</p></div>
            <span className="border-2 border-yellow-200 bg-yellow-200 px-4 py-2 text-[10px] font-black uppercase text-[#090625] shadow-[3px_3px_0_#ec4899]">{loggedClient ? "Abrir premios" : "Crear player"}</span>
          </button>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4">
        <div className="mb-7 space-y-4">
          <div className="relative"><Search className="absolute left-4 top-3.5 size-5 text-cyan-300" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="BUSCAR ÍTEM..." className="h-12 rounded-none border-2 border-cyan-300 bg-[#15113b] pl-12 font-mono text-sm font-black uppercase text-white shadow-[4px_4px_0_#ec4899] placeholder:text-violet-300/45" /></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[{ id: "all", name: "Mapa completo" }, ...(combos.length ? [{ id: "combos", name: "Power ups" }] : []), ...categories].map((category, index) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`whitespace-nowrap border-2 px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${categoryId === category.id ? "border-yellow-200 bg-yellow-200 text-[#090625] shadow-[4px_4px_0_#ec4899]" : "border-violet-400/70 bg-[#15113b] text-violet-100 hover:border-cyan-300"}`}><span className="mr-2 text-cyan-300">{String(index + 1).padStart(2, "0")}</span>{category.name}</button>)}
          </div>
        </div>

        <div className="mb-5 flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.3em] text-cyan-300">Seleccioná tu recompensa</p><h2 className="text-2xl font-black uppercase">Items disponibles</h2></div><span className="font-mono text-xs text-violet-300">{products.length} FOUND</span></div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any, index: number) => (
            <button key={product.id} type="button" onClick={() => setSelectedProduct(product)} className={`${styles.card} group overflow-hidden bg-[#15113b] text-left`}>
              <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-cyan-300/70 bg-[#0d092e]">
                {product.imageUrl && product.showImage !== false ? <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition duration-300 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-12 text-violet-300/30" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090625]/80 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 border border-yellow-200 bg-[#090625]/90 px-2 py-1 font-mono text-[9px] font-black uppercase text-yellow-200">{product.isCombo ? "POWER UP" : `ITEM ${String(index + 1).padStart(2, "0")}`}</span>
                {loyaltyEnabled && product.points > 0 && <span className="absolute bottom-3 right-3 flex items-center gap-1 border border-cyan-300 bg-[#090625]/90 px-2 py-1 text-[9px] font-black text-cyan-200"><Star className="size-3 fill-current" /> +{product.points} XP</span>}
              </div>
              <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black uppercase leading-tight text-white">{product.name}</h3><span className="shrink-0 bg-fuchsia-600 px-2.5 py-1 font-mono text-sm font-black text-white">${Number(product.basePrice).toLocaleString("es-AR")}</span></div><p className="mt-2 line-clamp-2 text-xs font-medium text-violet-200/60">{product.description || "Configurá este item y sumalo a tu misión."}</p><span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-yellow-200"><Zap className="size-3 fill-current" /> Seleccionar item</span></div>
            </button>
          ))}
        </div>
        {products.length === 0 && <div className="border-2 border-cyan-300 bg-[#15113b] py-16 text-center font-mono text-sm font-black uppercase text-cyan-200 shadow-[6px_6px_0_#ec4899]">0 items found · probá otro nivel</div>}
      </main>

      <ProductCustomizerModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} categoryProducts={categoryProducts} theme="ARCADE_KITCHEN" loyaltyEnabled={loyaltyEnabled} />
    </div>
  );
}
