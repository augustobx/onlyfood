"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Search,
  Star,
  Flame,
  Gift,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";

interface UrbanDarkStorefrontProps {
  categories: any[];
  combos: any[];
  config: any;
  loggedClient: any | null;
  currentPoints: number;
  onOpenAuth: () => void;
  onOpenPointsModal: () => void;
  loyaltyEnabled: boolean;
}

export function UrbanDarkStorefront({
  categories,
  combos,
  config,
  loggedClient,
  currentPoints,
  onOpenAuth,
  onOpenPointsModal,
  loyaltyEnabled,
}: UrbanDarkStorefrontProps) {
  const { items, getTotal } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = getTotal();

  const allProducts = [
    ...combos,
    ...categories.flatMap((c) => c.products),
  ];

  const filteredProducts = searchTerm.trim().length > 1
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : null;

  const appName = config?.appName || "BeatsBurgers";

  return (
    <div className="min-h-[100dvh] bg-[#080a0f] text-slate-100 font-sans pb-28 selection:bg-orange-500 selection:text-white">

      {/* ═══ INTEGRATED NAVBAR ═══ */}
      <nav className="sticky top-0 z-50 w-full bg-[#080a0f]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {config?.logoUrl && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-600/25">
                <img src={config.logoUrl} alt={appName} className="h-full w-full object-cover rounded-xl" />
              </span>
            )}
            <div className="min-w-0">
              <span className="block text-sm font-black tracking-tight text-white truncate leading-none">{appName}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${config?.isStoreOpen !== false ? "text-emerald-400" : "text-rose-400"}`}>
                {config?.isStoreOpen !== false ? "● Abierto" : "● Cerrado"}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {loggedClient ? (
              <button
                type="button"
                hidden={!loyaltyEnabled}
                onClick={onOpenPointsModal}
                className="relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-white text-[10.5px] sm:text-[11px] font-black transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap shadow-md"
                style={{
                  backgroundColor: loggedClient.tier?.color || "#f97316",
                  boxShadow: `0 0 16px ${(loggedClient.tier?.color || "#f97316")}95, 0 0 4px ${(loggedClient.tier?.color || "#f97316")}, inset 0 1px 1px rgba(255,255,255,0.6)`,
                  border: "1.5px solid rgba(255,255,255,0.45)",
                }}
              >
                <span className="text-xs drop-shadow-sm">👑</span>
                <span className="tracking-tight drop-shadow-sm font-black text-white">
                  {loggedClient.tier?.name || "Beaters Club"}
                </span>
                <span className="bg-black/35 px-1.5 py-0.2 rounded-lg text-[9.5px] sm:text-[10px] text-yellow-200 font-black border border-white/20">
                  {currentPoints}
                </span>
              </button>
            ) : (
              <button
                type="button"
                hidden={!loyaltyEnabled}
                onClick={onOpenAuth}
                className="relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-white text-[10.5px] sm:text-[11px] font-black transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap shadow-md"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #ec4899, #f97316)",
                  boxShadow: "0 0 14px rgba(168, 85, 247, 0.7), 0 0 4px rgba(236, 72, 153, 0.9), inset 0 1px 1px rgba(255,255,255,0.5)",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                }}
              >
                <span className="text-xs drop-shadow-sm">👑</span>
                <span className="tracking-tight drop-shadow-sm font-black text-white">Club VIP</span>
              </button>
            )}

            <Link
              href="/profile"
              aria-label="Mis Pedidos"
              className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
            >
              <UserRound className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/cart"
              className="relative flex h-9 items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3 text-white font-black text-[11px] shadow-md shadow-orange-600/25 transition-all"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Carrito</span>
              {totalItemsCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-orange-700 px-1 text-[10px] font-black">
                  {totalItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-5 sm:pt-8 pb-4 sm:pb-6 px-3.5 sm:px-6 max-w-7xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                {appName}
                <span className="text-orange-500">.</span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-md">
                Hamburguesas smash artesanales, bowls premium y combos cargados de sabor.
              </p>
            </div>

            {/* Puntos Compacta */}
            <button
              type="button"
              hidden={!loyaltyEnabled}
              onClick={onOpenPointsModal}
              className="flex items-center gap-2.5 bg-gradient-to-r from-purple-950/60 to-slate-900/80 border border-purple-500/30 p-2.5 rounded-2xl backdrop-blur-md self-start sm:self-auto hover:border-purple-500/60 transition-all group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-md text-white font-black"
                style={{ backgroundColor: loggedClient?.tier?.color || "#a855f7" }}
              >
                👑
              </div>
              <div className="leading-tight text-left">
                <span className="text-[9px] font-black uppercase text-purple-300 block">
                  {loggedClient?.tier?.name || "Club VIP Beats"}
                </span>
                <span className="text-xs font-black text-white">
                  {loggedClient ? `🪙 ${currentPoints} Pts · Beneficios` : "Sumate y Ganá Premios"}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform ml-1" />
            </button>
          </div>

          {/* Banner de Membresía y Ranking VIP */}
          <div
            hidden={!loyaltyEnabled}
            onClick={onOpenPointsModal}
            className="cursor-pointer bg-gradient-to-r from-slate-950 via-purple-950/60 to-slate-950 border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏆</span>
              <div>
                <span className="font-black text-xs text-white block">
                  {loggedClient
                    ? `Membresía ${loggedClient.tier?.name || "Club"}: Multiplicás ${loggedClient.tier?.pointsMultiplier || 1}x puntos en tus compras`
                    : "Escalera de Rangos VIP: Comprá, subí a Gold/Select y desbloqueá premios exclusivos"}
                </span>
                <span className="text-[10px] text-purple-300 font-medium">
                  🥉 Beaters Club ➔ 🥈 Beaters Gold (5% OFF) ➔ 👑 Beaters Select (10% OFF + VIP)
                </span>
              </div>
            </div>
            <span className="text-[11px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-xl shrink-0">
              Ver Tienda de Canjes ➔
            </span>
          </div>

          {/* Buscador */}
          <div className="relative max-w-xl">
            <Input
              placeholder="Buscar hamburguesa, bowl, papas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 sm:h-11 bg-white/[0.06] border border-white/[0.08] focus:border-orange-500/60 text-white placeholder:text-slate-500 pl-9 rounded-xl text-xs sm:text-sm font-medium"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 sm:top-3.5" />
          </div>
        </div>
      </section>

      {/* ═══ CATEGORÍAS STICKY ═══ */}
      <section className="sticky top-14 z-30 bg-[#080a0f]/95 backdrop-blur-lg border-b border-white/[0.04] py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === "all"
                ? "bg-orange-600 text-white shadow-md shadow-orange-600/25"
                : "bg-white/[0.06] text-slate-400 hover:text-white"
            }`}
          >
            Todo el Menú
          </button>

          {combos.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("combos")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === "combos"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "bg-white/[0.06] text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Combos
            </button>
          )}

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-orange-600 text-white shadow-md shadow-orange-600/25"
                  : "bg-white/[0.06] text-slate-400 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* ═══ GRILLA PRINCIPAL ═══ */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 space-y-8">
        {filteredProducts ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-400">
              {filteredProducts.length} resultados para "{searchTerm}"
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {filteredProducts.map((prod) => (
                <UrbanProductCard key={prod.id} product={prod} onSelect={() => setSelectedProduct(prod)} loyaltyEnabled={loyaltyEnabled} />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="py-16 text-center text-slate-600 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                <p className="font-bold text-sm">No encontramos productos con ese nombre.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {(selectedCategory === "all" || selectedCategory === "combos") && combos.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg sm:text-xl font-black text-white">⚡ Combos Beats</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {combos.map((combo) => (
                    <UrbanProductCard key={combo.id} product={combo} onSelect={() => setSelectedProduct(combo)} isCombo loyaltyEnabled={loyaltyEnabled} />
                  ))}
                </div>
              </section>
            )}

            {categories
              .filter((c) => selectedCategory === "all" || selectedCategory === c.id)
              .map((cat) => (
                <section key={cat.id} className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg sm:text-xl font-black text-white">{cat.name}</h2>
                    <span className="text-[11px] font-medium text-slate-600">{cat.products.length} platos</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {cat.products.map((prod: any) => (
                      <UrbanProductCard key={prod.id} product={prod} onSelect={() => setSelectedProduct(prod)} loyaltyEnabled={loyaltyEnabled} />
                    ))}
                  </div>
                </section>
              ))}
          </>
        )}
      </main>

      {/* ═══ MODAL ═══ */}
      <ProductCustomizerModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        categoryProducts={
          selectedProduct
            ? categories.find((c) => c.id === selectedProduct.categoryId)?.products || []
            : []
        }
        theme="URBAN_DARK"
        loyaltyEnabled={loyaltyEnabled}
      />

      {/* ═══ MOBILE BOTTOM DOCK ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0e14]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-center justify-around py-1.5">
          <Link href="/" className="flex flex-col items-center gap-0.5 py-1 text-orange-500">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[9px] font-bold">Menú</span>
          </Link>
          <button type="button" hidden={!loyaltyEnabled} onClick={onOpenPointsModal} className="flex flex-col items-center gap-0.5 py-1 text-slate-500">
            <Gift className="w-5 h-5" />
            <span className="text-[9px] font-bold">Puntos</span>
          </button>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 py-1 text-slate-500">
            <UserRound className="w-5 h-5" />
            <span className="text-[9px] font-bold">Pedidos</span>
          </Link>
          <Link href="/cart" className="relative flex flex-col items-center gap-0.5 py-1 text-slate-500">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[9px] font-bold">Carrito</span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-0.5 right-0.5 bg-orange-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {totalItemsCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* ═══ DESKTOP FLOATING CART ═══ */}
      {totalItemsCount > 0 && (
        <div className="hidden sm:block fixed bottom-4 right-6 z-50 animate-in slide-in-from-bottom-5">
          <Link href="/cart">
            <div className="bg-orange-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-orange-600/30 flex items-center gap-3 border border-orange-400/30 hover:bg-orange-500 transition-all">
              <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">{totalItemsCount}</span>
              <span className="text-sm font-black">Ver Carrito</span>
              <span className="text-sm font-black">${cartTotal.toLocaleString("es-AR")}</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

import { isDailyProduct, getProductBadgeLabel } from "@/lib/weekly-menu";

function UrbanProductCard({
  product,
  onSelect,
  isCombo = false,
  loyaltyEnabled,
}: {
  product: any;
  onSelect: () => void;
  isCombo?: boolean;
  loyaltyEnabled: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-200 flex flex-col justify-between overflow-hidden active:scale-[0.97]"
    >
      <div className="relative w-full aspect-square bg-[#0e1018] overflow-hidden">
        {product.imageUrl && product.showImage ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 300px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-slate-800" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#080a0f] via-transparent to-transparent opacity-80" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.availableDays && !isDailyProduct(product.availableDays) && (
            <span className="bg-purple-700/90 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md shadow-md">
              📅 {getProductBadgeLabel(product.availableDays)}
            </span>
          )}
          {isCombo && (
            <span className="bg-purple-600/90 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md">COMBO</span>
          )}
          {loyaltyEnabled && product.points > 0 && (
            <span className="bg-amber-500/90 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <Star className="w-2 h-2 fill-slate-950" /> +{product.points}
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 space-y-1.5">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-100 leading-tight line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>
          )}
        </div>

        <div className="pt-1.5 flex items-center justify-between border-t border-white/[0.06]">
          <span className="font-black text-sm text-orange-400">
            ${product.basePrice.toLocaleString("es-AR")}
          </span>
          <div className="h-7 w-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
