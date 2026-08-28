"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Search,
  Gift,
  User,
  Utensils,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";

interface FastNeoStorefrontProps {
  categories: any[];
  combos: any[];
  config: any;
  loggedClient: any | null;
  currentPoints: number;
  onOpenAuth: () => void;
  onOpenPointsModal: () => void;
  loyaltyEnabled: boolean;
}

export function FastNeoStorefront({
  categories,
  combos,
  config,
  loggedClient,
  currentPoints,
  onOpenAuth,
  onOpenPointsModal,
  loyaltyEnabled,
}: FastNeoStorefrontProps) {
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
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans pb-20">

      {/* ═══ INTEGRATED TOP BAR ═══ */}
      <header className="bg-white sticky top-0 z-50 px-3.5 pt-2.5 pb-2 shadow-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {config?.logoUrl && (
              <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <img src={config.logoUrl} alt={appName} className="h-full w-full object-cover rounded-xl" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-black text-slate-900 truncate tracking-tight leading-none">
                {appName}
              </h1>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${config?.isStoreOpen !== false ? "text-emerald-600" : "text-rose-500"}`}>
                {config?.isStoreOpen !== false ? "● Abierto" : "● Cerrado"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {loggedClient ? (
              <button
                type="button"
                hidden={!loyaltyEnabled}
                onClick={onOpenPointsModal}
                className="relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-white text-[10.5px] sm:text-[11px] font-black transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap shadow-md"
                style={{
                  backgroundColor: loggedClient.tier?.color || "#9333ea",
                  boxShadow: `0 0 16px ${(loggedClient.tier?.color || "#9333ea")}95, 0 0 4px ${(loggedClient.tier?.color || "#9333ea")}, inset 0 1px 1px rgba(255,255,255,0.6)`,
                  border: "1.5px solid rgba(255,255,255,0.45)",
                }}
              >
                <span className="text-xs drop-shadow-sm">👑</span>
                <span className="tracking-tight drop-shadow-sm font-black text-white">
                  {loggedClient.tier?.name || "Beaters Club"}
                </span>
                <span className="bg-black/35 px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] text-yellow-200 font-black border border-white/20">
                  {currentPoints}
                </span>
              </button>
            ) : (
              <button
                type="button"
                hidden={!loyaltyEnabled}
                onClick={onOpenAuth}
                className="relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-white text-[10.5px] sm:text-[11px] font-black transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap shadow-md"
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <UserRound className="w-4 h-4" />
            </Link>

            <Link
              href="/cart"
              className="relative flex h-8 items-center gap-1 rounded-full bg-slate-900 hover:bg-slate-800 px-3 text-white text-[10px] font-bold shadow-sm transition-all shrink-0 whitespace-nowrap"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {totalItemsCount > 0 ? (
                <span>${cartTotal.toLocaleString("es-AR")}</span>
              ) : (
                <span className="hidden sm:inline">Carrito</span>
              )}
              {totalItemsCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-black text-white">
                  {totalItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Buscador */}
        <div className="max-w-6xl mx-auto mt-2 relative">
          <Input
            placeholder="¿Qué vas a pedir hoy?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 bg-slate-100 border-transparent focus:border-orange-400 focus:bg-white text-slate-900 pl-8 rounded-xl text-xs font-medium transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-[11px]" />
        </div>
      </header>

      {/* Banner Ranking VIP */}
      <div className="max-w-6xl mx-auto px-3.5 pt-3">
        <div
          hidden={!loyaltyEnabled}
          onClick={onOpenPointsModal}
          className="cursor-pointer bg-gradient-to-r from-purple-900 via-slate-900 to-purple-950 text-white p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm border border-purple-800/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <div className="leading-tight">
              <span className="font-black text-xs block text-white">
                {loggedClient
                  ? `Membresía ${loggedClient.tier?.name || "Club"}: Multiplicás ${loggedClient.tier?.pointsMultiplier || 1}x puntos`
                  : "Club Beats: Sumá puntos, subí de rango y ganá premios"}
              </span>
              <span className="text-[10px] text-purple-200">
                🥉 Club ➔ 🥈 Gold (5% OFF) ➔ 👑 Select (10% OFF + VIP)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black text-yellow-300 bg-white/10 px-2 py-0.5 rounded-lg shrink-0">
            Canjear ➔
          </span>
        </div>
      </div>

      {/* ═══ STORIES / DESTACADOS ═══ */}
      <section className="px-3.5 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button type="button" hidden={!loyaltyEnabled} onClick={onOpenPointsModal} className="flex flex-col items-center gap-1 shrink-0 group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-[2.5px] shadow-sm group-active:scale-95 transition-transform">
              <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center text-2xl">🎁</div>
            </div>
            <span className="text-[10px] font-bold text-slate-600">Canjes</span>
          </button>

          {combos.length > 0 && (
            <button type="button" onClick={() => setSelectedCategory("combos")} className="flex flex-col items-center gap-1 shrink-0 group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 p-[2.5px] shadow-sm group-active:scale-95 transition-transform">
                <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center text-2xl">⚡</div>
              </div>
              <span className="text-[10px] font-bold text-slate-600">Combos</span>
            </button>
          )}

          {categories.map((cat, idx) => (
            <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className="flex flex-col items-center gap-1 shrink-0 group">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 p-[2.5px] group-active:scale-95 transition-transform">
                <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center text-2xl">
                  {idx === 0 ? "🍔" : idx === 1 ? "🍟" : idx === 2 ? "🥗" : idx === 3 ? "🥤" : "🍽️"}
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-600 max-w-[60px] truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ CATEGORÍAS PÍLDORAS ═══ */}
      <div className="sticky top-[108px] z-30 bg-slate-50/95 backdrop-blur-md py-2 px-3.5 border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todo ({allProducts.length})
          </button>

          {combos.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("combos")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                selectedCategory === "combos"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Combos ({combos.length})
            </button>
          )}

          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                selectedCategory === c.id
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ GRILLA ═══ */}
      <main className="max-w-6xl mx-auto px-3.5 pt-4 space-y-6">
        {filteredProducts ? (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase text-slate-400">
              {filteredProducts.length} resultados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredProducts.map((p) => (
                <FastNeoCard key={p.id} product={p} onSelect={() => setSelectedProduct(p)} loyaltyEnabled={loyaltyEnabled} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {(selectedCategory === "all" || selectedCategory === "combos") && combos.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="font-black text-base text-slate-900">⚡ Combos Especiales</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {combos.map((combo) => (
                    <FastNeoCard key={combo.id} product={combo} onSelect={() => setSelectedProduct(combo)} isCombo loyaltyEnabled={loyaltyEnabled} />
                  ))}
                </div>
              </div>
            )}

            {categories
              .filter((c) => selectedCategory === "all" || selectedCategory === c.id)
              .map((cat) => (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-black text-base text-slate-900">{cat.name}</h3>
                    <span className="text-[10px] font-medium text-slate-400">{cat.products.length} platos</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cat.products.map((prod: any) => (
                      <FastNeoCard key={prod.id} product={prod} onSelect={() => setSelectedProduct(prod)} loyaltyEnabled={loyaltyEnabled} />
                    ))}
                  </div>
                </div>
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
        theme="FAST_NEO"
        loyaltyEnabled={loyaltyEnabled}
      />

      {/* ═══ BOTTOM DOCK FLOTANTE ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-1 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex items-center justify-around py-1.5">
          <button type="button" onClick={() => setSelectedCategory("all")} className="flex flex-col items-center gap-0.5 py-1 px-3 text-orange-600">
            <Utensils className="w-5 h-5" />
            <span className="text-[9px] font-bold">Menú</span>
          </button>

          <button type="button" hidden={!loyaltyEnabled} onClick={onOpenPointsModal} className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400">
            <Gift className="w-5 h-5" />
            <span className="text-[9px] font-bold">Puntos</span>
          </button>

          <Link href="/profile" className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400">
            <UserRound className="w-5 h-5" />
            <span className="text-[9px] font-bold">Pedidos</span>
          </Link>

          <Link
            href="/cart"
            className="relative flex flex-col items-center gap-0.5 py-1 px-4 rounded-2xl bg-orange-600 text-white shadow-sm"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[9px] font-bold">
              {totalItemsCount > 0 ? `$${cartTotal.toLocaleString("es-AR")}` : "Carrito"}
            </span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-0.5 bg-slate-900 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {totalItemsCount}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </div>
  );
}

import { isDailyProduct, getProductBadgeLabel } from "@/lib/weekly-menu";

function FastNeoCard({
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
      className="bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-xs active:scale-[0.97] transition-all cursor-pointer flex flex-col justify-between group"
    >
      <div className="space-y-1.5">
        <div className="relative w-full aspect-square rounded-xl bg-slate-100 overflow-hidden">
          {product.imageUrl && product.showImage ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 640px) 50vw, 250px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">🍔</div>
          )}

          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
            {product.availableDays && !isDailyProduct(product.availableDays) && (
              <span className="bg-purple-700 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md shadow-xs">
                📅 {getProductBadgeLabel(product.availableDays)}
              </span>
            )}
            {loyaltyEnabled && product.points > 0 && (
              <span className="bg-amber-400 text-slate-900 font-black text-[8px] px-1.5 py-0.5 rounded-md shadow-xs">
                +{product.points} pts
              </span>
            )}
          </div>
          {isCombo && (
            <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md shadow-xs">
              COMBO
            </span>
          )}
        </div>

        <div>
          <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">{product.name}</h4>
          {product.description && (
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
          )}
        </div>
      </div>

      <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 mt-1.5">
        <span className="font-black text-sm text-slate-900">${product.basePrice.toLocaleString("es-AR")}</span>
        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
