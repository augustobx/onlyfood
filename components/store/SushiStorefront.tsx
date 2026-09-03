"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Search,
  Star,
  Sparkles,
  ChevronRight,
  UserRound,
  Flame,
  UtensilsCrossed,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { ProductCustomizerModal } from "./ProductCustomizerModal";
import { isDailyProduct, getProductBadgeLabel } from "@/lib/weekly-menu";

interface SushiStorefrontProps {
  categories: any[];
  combos: any[];
  config: any;
  loggedClient: any | null;
  currentPoints: number;
  onOpenAuth: () => void;
  onOpenPointsModal: () => void;
  loyaltyEnabled: boolean;
}

// Extrae el conteo de piezas si está especificado en el nombre o descripción (ej: "15 piezas", "30 pcs", "12u")
function extractPieceCount(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:piezas?|piez|pcs?|piez\.|u\b)/i);
  if (match && match[1]) {
    return `${match[1]} PIEZAS`;
  }
  return null;
}

export function SushiStorefront({
  categories,
  combos,
  config,
  loggedClient,
  currentPoints,
  onOpenAuth,
  onOpenPointsModal,
  loyaltyEnabled,
}: SushiStorefrontProps) {
  const { items, getTotal } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = getTotal();

  const allProducts = useMemo(() => {
    return [
      ...combos.map((c) => ({ ...c, isCombo: true })),
      ...categories.flatMap((c) =>
        (c.products || []).map((p: any) => ({ ...p, categoryName: c.name }))
      ),
    ];
  }, [categories, combos]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
    );
  }, [allProducts, searchTerm]);

  const appName = config?.appName || "Sushi House";

  return (
    <div className="min-h-[100dvh] bg-[#0b0e14] text-slate-100 font-sans pb-32 selection:bg-rose-600 selection:text-white">
      {/* ═══ ZEN TOPBAR ═══ */}
      <nav className="sticky top-0 z-50 w-full bg-[#0b0e14]/90 backdrop-blur-xl border-b border-amber-500/15 transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 gap-3">
          {/* Logo y Nombre con estética japonesa */}
          <Link href="/" className="flex items-center gap-3 min-w-0 shrink-0 group">
            {config?.logoUrl ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-amber-500/30 p-0.5 bg-gradient-to-br from-amber-500/20 to-rose-500/10 shadow-lg shadow-black/60">
                <img
                  src={config.logoUrl}
                  alt={appName}
                  className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 text-white font-black text-lg shadow-md shadow-rose-950">
                鮨
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors truncate">
                {appName}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    config?.isStoreOpen !== false
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-rose-500"
                  }`}
                />
                {config?.isStoreOpen !== false ? "Barra Abierta" : "Cerrado"}
              </span>
            </div>
          </Link>

          {/* Acciones del Header */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Club VIP / Puntos */}
            {loggedClient ? (
              <button
                type="button"
                hidden={!loyaltyEnabled}
                onClick={onOpenPointsModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all hover:scale-105 border border-amber-500/40 bg-gradient-to-r from-amber-950/60 to-[#161b26] text-amber-300 shadow-md shadow-amber-950/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[90px] sm:max-w-none">
                  {loggedClient.tier?.name || "Sushi Club"}
                </span>
                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-amber-500/30">
                  {currentPoints} pts
                </span>
              </button>
            ) : loyaltyEnabled ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Club VIP</span>
              </button>
            ) : null}

            {/* Mis Pedidos */}
            <Link
              href="/profile"
              aria-label="Mis pedidos"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <UserRound className="h-4 w-4" />
            </Link>

            {/* Carrito en Nav */}
            <Link
              href="/cart"
              className="relative flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-3.5 text-xs font-black text-white shadow-lg shadow-rose-950/50 hover:brightness-110 active:scale-95 transition-all"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden md:inline">Orden</span>
              {totalItemsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-rose-950 shadow-sm">
                  {totalItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SUSHI & OMAKASE ═══ */}
      <div className="relative overflow-hidden border-b border-amber-500/15 bg-gradient-to-b from-[#111622] via-[#0e121a] to-[#0b0e14] py-8 sm:py-12">
        {/* Marca de agua Kanji decorativa */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-8 select-none text-[120px] sm:text-[180px] font-serif font-black text-white/[0.025] leading-none"
        >
          寿司
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-6 bottom-0 select-none text-[90px] font-serif font-black text-rose-500/[0.02] leading-none"
        >
          職人
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-300 mb-3 shadow-inner">
            <span className="text-rose-400">●</span> Experiencia Nikkei & Tradicional
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-2xl leading-[1.1]">
            El arte del roll perfecto, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-rose-500">fresco en tu mesa.</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
            Pesca fresca seleccionada, combinaciones de autor y tablas preparadas pieza a pieza por nuestros itamaes.
          </p>

          {/* Buscador minimalista integrado en el Hero */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar rolls, tablas, niguiris, combos..."
              className="h-11 rounded-xl border border-white/10 bg-[#141923] pl-10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CATEGORÍAS ZEN (RAIL HORIZONTAL) ═══ */}
      <div className="sticky top-16 z-40 bg-[#0b0e14]/95 backdrop-blur-md border-b border-white/[0.06] py-3">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md shadow-rose-950/40 scale-105"
                  : "border border-white/10 bg-[#121722] text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              🥢 Toda la Carta
            </button>

            {combos.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory("combos")}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === "combos"
                    ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-950/40 scale-105"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                }`}
              >
                🍱 Tablas & Barcos
              </button>
            )}

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md shadow-rose-950/40 scale-105"
                    : "border border-white/10 bg-[#121722] text-slate-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENIDO DEL MENÚ ═══ */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 mt-6">
        {/* Si hay búsqueda activa */}
        {filteredProducts !== null ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Resultados de búsqueda</span>
                <span className="text-xs font-normal text-slate-400">
                  ({filteredProducts.length} encontrados)
                </span>
              </h2>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#121722] p-8 text-center">
                <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="font-bold text-slate-300 text-sm">No encontramos piezas con ese nombre.</p>
                <p className="text-xs text-slate-500 mt-1">Probá buscando por salmón, rolls, tabla o niguiri.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((p) => (
                  <SushiProductCard
                    key={p.id}
                    product={p}
                    onSelect={() => setSelectedProduct(p)}
                    isCombo={Boolean(p.isCombo)}
                    loyaltyEnabled={loyaltyEnabled}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Navegación por Categorías Normal */
          <div className="space-y-10">
            {/* SECCIÓN ESPECIAL: TABLAS & BARCOS (COMBOS) */}
            {(selectedCategory === "all" || selectedCategory === "combos") && combos.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        OMAKASE & SHARING
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      🍱 Tablas & Barcos de Autor
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Ideales para compartir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {combos.map((combo) => (
                    <SushiComboCard
                      key={combo.id}
                      combo={combo}
                      onSelect={() => setSelectedProduct({ ...combo, isCombo: true })}
                      loyaltyEnabled={loyaltyEnabled}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* PRODUCTOS POR CATEGORÍA */}
            {categories
              .filter((c) => selectedCategory === "all" || selectedCategory === c.id)
              .map((cat) => {
                const prods = cat.products || [];
                if (prods.length === 0) return null;

                return (
                  <section key={cat.id}>
                    <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-2">
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                          {cat.name}
                        </h2>
                        {cat.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        {prods.length} opciones
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {prods.map((product: any) => (
                        <SushiProductCard
                          key={product.id}
                          product={product}
                          onSelect={() => setSelectedProduct(product)}
                          loyaltyEnabled={loyaltyEnabled}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </main>

      {/* ═══ FLOATING BARRA DE PEDIDO (MOBILE & DESKTOP) ═══ */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Link
            href="/cart"
            className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 p-3.5 sm:p-4 text-white shadow-2xl shadow-rose-950 border border-amber-400/30 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 border border-white/20 font-black text-sm">
                🥢 {totalItemsCount}
              </div>
              <div className="min-w-0">
                <span className="block text-xs uppercase tracking-wider text-amber-200 font-bold">
                  Tu Selección Sushi
                </span>
                <span className="block text-sm sm:text-base font-black truncate">
                  ${cartTotal.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-rose-950 shadow-md shrink-0">
              <span>Continuar</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN */}
      <ProductCustomizerModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        theme="SUSHI_ZEN"
        loyaltyEnabled={loyaltyEnabled}
      />
    </div>
  );
}

// ═══ TARJETA DE PRODUCTO SUSHI ═══
function SushiProductCard({
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
  const pieceBadge = extractPieceCount(product.name) || extractPieceCount(product.description);

  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-[#121722] hover:border-amber-500/40 hover:bg-[#151b28] transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg shadow-black/40 active:scale-[0.98]"
    >
      {/* Imagen & Badges */}
      <div className="relative w-full aspect-square bg-[#0c1017] overflow-hidden">
        {product.imageUrl && product.showImage !== false ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 300px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121722] to-[#0c1017]">
            <UtensilsCrossed className="w-8 h-8 text-amber-500/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#121722] via-transparent to-transparent opacity-75" />

        {/* Badges superiores */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 pointer-events-none">
          {pieceBadge ? (
            <span className="rounded-md border border-amber-400/40 bg-black/75 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-sm shadow-md">
              🥢 {pieceBadge}
            </span>
          ) : isCombo ? (
            <span className="rounded-md border border-rose-500/50 bg-rose-600/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-md">
              TABLA
            </span>
          ) : <span />}

          {loyaltyEnabled && product.points > 0 && (
            <span className="flex items-center gap-0.5 rounded-md border border-amber-500/40 bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-amber-300 backdrop-blur-sm">
              <Star className="h-2 w-2 fill-amber-300 text-amber-300" />
              +{product.points}
            </span>
          )}
        </div>

        {product.availableDays && !isDailyProduct(product.availableDays) && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-md bg-purple-900/90 px-1.5 py-0.5 text-[8px] font-black text-purple-200 border border-purple-500/30 shadow-md">
              📅 {getProductBadgeLabel(product.availableDays)}
            </span>
          </div>
        )}
      </div>

      {/* Info & Precio */}
      <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[10.5px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
          <span className="font-black text-sm sm:text-base text-amber-300 tracking-tight">
            ${Number(product.basePrice).toLocaleString("es-AR")}
          </span>
          <div className="h-7 w-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ TARJETA DESTACADA DE TABLAS & BARCOS (COMBOS) ═══
function SushiComboCard({
  combo,
  onSelect,
  loyaltyEnabled,
}: {
  combo: any;
  onSelect: () => void;
  loyaltyEnabled: boolean;
}) {
  const pieceBadge = extractPieceCount(combo.name) || extractPieceCount(combo.description);

  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#161c28] to-[#10141d] p-3.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-rose-950/20 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
    >
      <div className="flex gap-3">
        {/* Imagen del barco/tabla */}
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-black/50 border border-amber-500/20">
          {combo.imageUrl && combo.showImage !== false ? (
            <Image
              src={combo.imageUrl}
              alt={combo.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="100px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-amber-500/40" />
            </div>
          )}
        </div>

        {/* Datos del combo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded bg-rose-600/90 text-white font-black text-[9px] px-1.5 py-0.5 tracking-wider uppercase">
              TABLA VIP
            </span>
            {pieceBadge && (
              <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[9px] px-1.5 py-0.5">
                {pieceBadge}
              </span>
            )}
          </div>
          <h3 className="font-black text-sm sm:text-base text-white truncate group-hover:text-amber-300 transition-colors">
            {combo.name}
          </h3>
          {combo.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
              {combo.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer de precio y botón */}
      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-amber-500/15">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Total combo</span>
          <span className="font-black text-base text-amber-300">
            ${Number(combo.basePrice).toLocaleString("es-AR")}
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3 py-1.5 text-xs font-black text-white shadow-md group-hover:brightness-110 transition-all"
        >
          <span>Elegir tabla</span>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
