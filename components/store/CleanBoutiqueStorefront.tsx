"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  Gift,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";

interface CleanBoutiqueStorefrontProps {
  categories: any[];
  combos: any[];
  config: any;
  loggedClient: any | null;
  currentPoints: number;
  onOpenAuth: () => void;
  onOpenPointsModal: () => void;
}

export function CleanBoutiqueStorefront({
  categories,
  combos,
  config,
  loggedClient,
  currentPoints,
  onOpenAuth,
  onOpenPointsModal,
}: CleanBoutiqueStorefrontProps) {
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
    <div className="min-h-[100dvh] bg-[#f6f3ee] text-stone-900 font-sans pb-28">

      {/* ═══ INTEGRATED NAVBAR ═══ */}
      <nav className="sticky top-0 z-50 w-full bg-[#f6f3ee]/95 backdrop-blur-xl border-b border-stone-300/50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3.5 sm:px-6 gap-2">
          {/* Logo / Estado Abierto (El título principal está destacado en el Hero) */}
          <Link href="/" className="flex items-center gap-2 min-w-0 shrink-0">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt={appName} className="h-8 w-8 object-cover rounded-xl shrink-0" />
            ) : null}
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden md:inline text-base font-serif font-black tracking-tight text-stone-900 truncate">
                {appName}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${config?.isStoreOpen !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"} shrink-0`}>
                {config?.isStoreOpen !== false ? "● Abierto" : "● Cerrado"}
              </span>
            </div>
          </Link>

          {/* Acciones Header (Espaciadas y con insignia brillante según el color del rank) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {loggedClient ? (
              <button
                type="button"
                onClick={onOpenPointsModal}
                className="relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-white text-[10.5px] sm:text-[11px] font-black transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap shadow-md"
                style={{
                  backgroundColor: loggedClient.tier?.color || "#f59e0b",
                  boxShadow: `0 0 16px ${(loggedClient.tier?.color || "#f59e0b")}90, 0 0 4px ${(loggedClient.tier?.color || "#f59e0b")}, inset 0 1px 1px rgba(255,255,255,0.6)`,
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
              aria-label="Mi Perfil"
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors shrink-0"
            >
              <UserRound className="w-4 h-4" />
            </Link>

            <Link
              href="/cart"
              className="relative flex h-8 items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 px-2.5 sm:px-3 text-white font-bold text-[11px] shadow-sm transition-all shrink-0 whitespace-nowrap"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Carrito</span>
              {totalItemsCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] font-black text-white">
                  {totalItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO EDITORIAL ═══ */}
      <header className="pt-6 sm:pt-10 pb-4 px-3.5 sm:px-6 max-w-5xl mx-auto text-center space-y-2.5">
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-stone-900">
          {appName}
        </h1>

        <p className="text-stone-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
          Ingredientes seleccionados y hamburguesas artesanales preparadas al momento.
        </p>

        {/* Club Puntos y Rangos */}
        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={onOpenPointsModal}
            className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 px-4 py-2 rounded-full text-xs font-bold text-stone-800 shadow-2xs transition-all"
          >
            <span>👑</span>
            <span>{loggedClient ? `Membresía ${loggedClient.tier?.name || "VIP"}: ${currentPoints} Pts acumulados` : "Club VIP: Sumate y accedé a beneficios exclusivos"}</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>

        {/* Buscador */}
        <div className="pt-2 max-w-md mx-auto relative">
          <Input
            placeholder="Buscar por plato o ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 bg-white border-stone-300/70 focus:border-stone-500 text-stone-900 pl-9 rounded-xl text-xs font-medium shadow-xs"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-[13px]" />
        </div>
      </header>

      {/* ═══ CATEGORY PILLS ═══ */}
      <div className="sticky top-14 z-30 bg-[#f6f3ee]/95 backdrop-blur-md py-2 px-3.5 border-y border-stone-300/40">
        <div className="max-w-5xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
              selectedCategory === "all"
                ? "bg-stone-900 text-stone-50 shadow-sm"
                : "bg-white border border-stone-300/70 text-stone-600 hover:bg-stone-100"
            }`}
          >
            Carta Completa
          </button>

          {combos.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory("combos")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                selectedCategory === "combos"
                  ? "bg-stone-900 text-stone-50 shadow-sm"
                  : "bg-white border border-stone-300/70 text-stone-600 hover:bg-stone-100"
              }`}
            >
              Combos
            </button>
          )}

          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                selectedCategory === c.id
                  ? "bg-stone-900 text-stone-50 shadow-sm"
                  : "bg-white border border-stone-300/70 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ LISTADO ═══ */}
      <main className="max-w-5xl mx-auto px-3.5 pt-5 space-y-6">
        {filteredProducts ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-stone-400">
              {filteredProducts.length} resultados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProducts.map((p) => (
                <BoutiqueCard key={p.id} product={p} onSelect={() => setSelectedProduct(p)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {(selectedCategory === "all" || selectedCategory === "combos") && combos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-serif font-black text-stone-900 border-b border-stone-300/50 pb-1.5">
                  Combos & Promociones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {combos.map((combo) => (
                    <BoutiqueCard key={combo.id} product={combo} onSelect={() => setSelectedProduct(combo)} isCombo />
                  ))}
                </div>
              </div>
            )}

            {categories
              .filter((c) => selectedCategory === "all" || selectedCategory === c.id)
              .map((cat) => (
                <div key={cat.id} className="space-y-3">
                  <div className="border-b border-stone-300/50 pb-1.5 flex items-baseline justify-between">
                    <h3 className="text-lg font-serif font-black text-stone-900">{cat.name}</h3>
                    <span className="text-[10px] text-stone-400 font-medium">{cat.products.length} platos</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cat.products.map((prod: any) => (
                      <BoutiqueCard key={prod.id} product={prod} onSelect={() => setSelectedProduct(prod)} />
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
        theme="CLEAN_BOUTIQUE"
      />

      {/* ═══ FLOATING BOTTOM BAR ═══ */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-bottom-5">
          <Link href="/cart">
            <div className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-stone-700 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-stone-700 text-stone-100 flex items-center justify-center font-black text-xs">
                  {totalItemsCount}
                </span>
                <span className="text-xs font-bold">Ver Pedido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black">${cartTotal.toLocaleString("es-AR")}</span>
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

import { isDailyProduct, getProductBadgeLabel } from "@/lib/weekly-menu";

function BoutiqueCard({
  product,
  onSelect,
  isCombo = false,
}: {
  product: any;
  onSelect: () => void;
  isCombo?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer p-3 sm:p-4 rounded-2xl bg-white border border-stone-300/50 shadow-xs hover:shadow-md transition-all flex gap-3 items-center justify-between active:scale-[0.98]"
    >
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-serif font-bold text-sm text-stone-900 leading-tight truncate">
              {product.name}
            </h4>
            {product.availableDays && !isDailyProduct(product.availableDays) && (
              <span className="text-[8px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded shrink-0">
                📅 {getProductBadgeLabel(product.availableDays)}
              </span>
            )}
            {product.points > 0 && (
              <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded shrink-0">
                +{product.points} pts
              </span>
            )}
            {isCombo && (
              <span className="text-[8px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded shrink-0">
                COMBO
              </span>
            )}
          </div>
          {product.description && (
            <p className="text-[11px] text-stone-500 line-clamp-1 leading-snug">{product.description}</p>
          )}
        </div>

        {/* Chips de Ingredientes */}
        {product.ingredients && product.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.ingredients.slice(0, 3).map((item: any) => (
              <span
                key={item.ingredientId || item.id}
                className="text-[9px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded"
              >
                {item.ingredient?.name || item.name}
              </span>
            ))}
            {product.ingredients.length > 3 && (
              <span className="text-[9px] text-stone-400">+{product.ingredients.length - 3}</span>
            )}
          </div>
        )}

        <div className="pt-1.5 flex items-center justify-between border-t border-stone-200/80">
          <span className="font-black text-sm text-stone-900">
            ${product.basePrice.toLocaleString("es-AR")}
          </span>
          <span className="text-[10px] font-bold text-amber-800 group-hover:underline">
            Pedir →
          </span>
        </div>
      </div>

      {/* Imagen */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200/80">
        {product.imageUrl && product.showImage ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="100px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-stone-300">🍔</div>
        )}
      </div>
    </div>
  );
}
