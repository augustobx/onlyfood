"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, Plus, Minus, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeCartSchedule, isDailyProduct, getProductBadgeLabel } from "@/lib/weekly-menu";
import { useQuantityDiscountPreview } from "@/lib/use-quantity-discount";

function useStoreTheme() {
  const [theme, setTheme] = useState("ORIGINAL");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg?.storeTheme) setTheme(cfg.storeTheme);
      })
      .catch(() => {});
  }, []);
  return theme;
}

// Theme palettes
function getThemeClasses(theme: string) {
  switch (theme) {
    case "URBAN_DARK":
      return {
        page: "bg-[#080a0f] text-slate-100",
        card: "bg-white/[0.04] border-white/[0.06]",
        cardHover: "hover:bg-white/[0.07]",
        heading: "text-white",
        subtext: "text-slate-400",
        mutedText: "text-slate-500",
        accent: "text-orange-400",
        accentBg: "bg-orange-600",
        accentBgHover: "hover:bg-orange-500",
        summary: "bg-white/[0.04] border-white/[0.06]",
        backBtn: "bg-white/[0.06] border-white/[0.08] text-slate-300 hover:bg-white/[0.1]",
        qtyBg: "bg-white/[0.06] border-white/[0.08]",
        qtyBtn: "text-slate-300 hover:bg-white/[0.1]",
        removeBg: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
        imgBg: "bg-white/[0.03]",
        divider: "border-white/[0.06]",
        notesBg: "bg-white/[0.04] border-white/[0.06]",
        tag: { green: "bg-emerald-500/20 text-emerald-400", red: "bg-red-500/20 text-red-400", purple: "bg-purple-500/20 text-purple-400" },
        emptyBg: "bg-orange-500/10",
        emptyIcon: "text-orange-500",
        trustText: "text-slate-600",
      };
    case "FAST_NEO":
      return {
        page: "bg-slate-50 text-slate-900",
        card: "bg-white border-slate-200/80",
        cardHover: "hover:shadow-md",
        heading: "text-slate-900",
        subtext: "text-slate-500",
        mutedText: "text-slate-400",
        accent: "text-orange-600",
        accentBg: "bg-orange-600",
        accentBgHover: "hover:bg-orange-500",
        summary: "bg-white border-slate-200",
        backBtn: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
        qtyBg: "bg-slate-100 border-slate-200",
        qtyBtn: "text-slate-600 hover:bg-white",
        removeBg: "text-red-500 hover:text-red-600 hover:bg-red-50",
        imgBg: "bg-slate-100",
        divider: "border-slate-200",
        notesBg: "bg-slate-50 border-slate-200",
        tag: { green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-700" },
        emptyBg: "bg-orange-100",
        emptyIcon: "text-orange-500",
        trustText: "text-slate-400",
      };
    case "CLEAN_BOUTIQUE":
      return {
        page: "bg-[#f6f3ee] text-stone-900",
        card: "bg-white border-stone-300/50",
        cardHover: "hover:shadow-md",
        heading: "text-stone-900",
        subtext: "text-stone-500",
        mutedText: "text-stone-400",
        accent: "text-amber-800",
        accentBg: "bg-stone-900",
        accentBgHover: "hover:bg-stone-800",
        summary: "bg-white border-stone-300/50",
        backBtn: "bg-white border-stone-300/50 text-stone-600 hover:bg-stone-50",
        qtyBg: "bg-stone-100 border-stone-200",
        qtyBtn: "text-stone-600 hover:bg-white",
        removeBg: "text-red-600 hover:text-red-700 hover:bg-red-50",
        imgBg: "bg-stone-100",
        divider: "border-stone-200",
        notesBg: "bg-stone-50 border-stone-200",
        tag: { green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-700" },
        emptyBg: "bg-amber-100",
        emptyIcon: "text-amber-700",
        trustText: "text-stone-400",
      };
    default: // NEXO / ORIGINAL
      return {
        page: "text-slate-900",
        card: "bg-white border-slate-100",
        cardHover: "hover:shadow-md",
        heading: "text-slate-800",
        subtext: "text-slate-500",
        mutedText: "text-slate-400",
        accent: "text-orange-600",
        accentBg: "bg-orange-500",
        accentBgHover: "hover:bg-orange-600",
        summary: "bg-slate-50 border-slate-100",
        backBtn: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
        qtyBg: "bg-slate-50 border-slate-200",
        qtyBtn: "text-slate-600 hover:bg-white",
        removeBg: "text-red-500 hover:text-red-600 hover:bg-red-50",
        imgBg: "bg-slate-50",
        divider: "border-slate-200",
        notesBg: "bg-slate-50 border-slate-100",
        tag: { green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-700" },
        emptyBg: "bg-orange-100",
        emptyIcon: "text-orange-500",
        trustText: "text-slate-400",
      };
  }
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotal, dailyPrize } = useCartStore();
  const quantityDiscount = useQuantityDiscountPreview(items);
  const theme = useStoreTheme();
  const t = getThemeClasses(theme);

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4 max-w-sm mx-auto px-4 ${t.page}`}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${t.emptyBg} p-8 rounded-full mb-4`}>
          <ShoppingBag className={`h-14 w-14 ${t.emptyIcon}`} />
        </motion.div>
        <h1 className={`text-2xl font-black tracking-tight ${t.heading}`}>Carrito vacío</h1>
        <p className={`${t.subtext} text-sm`}>Todavía no agregaste nada. ¡Explorá nuestro menú!</p>
        <Button onClick={() => router.push("/")} size="lg" className={`mt-6 ${t.accentBg} ${t.accentBgHover} rounded-2xl h-12 px-8 text-sm font-bold w-full text-white shadow-md`}>
          Ver el Menú
        </Button>
      </div>
    );
  }

  const subtotal = getTotal();
  const totalItems = items.reduce((a, i) => a + i.quantity, 0);

  return (
    <div className={`cart-page max-w-2xl mx-auto px-3.5 sm:px-6 pb-28 pt-4 sm:pt-6 ${t.page}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push("/")} className={`w-9 h-9 border shadow-xs rounded-xl flex items-center justify-center transition-colors shrink-0 ${t.backBtn}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className={`text-xl font-black tracking-tight ${t.heading} leading-none`}>Tu Orden</h1>
          <p className={`${t.subtext} text-xs font-medium mt-0.5`}>{totalItems} {totalItems === 1 ? "producto" : "productos"} en el carrito</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={item.id}
              className={`p-3 sm:p-4 flex gap-3 border rounded-2xl shadow-xs transition-all ${t.card} ${t.cardHover}`}
            >
              {/* Image */}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 relative rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border ${t.imgBg} ${t.divider}`}>
                {item.product.imageUrl && item.product.showImage ? (
                  <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <ShoppingBag className={`w-5 h-5 ${t.mutedText}`} />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={`font-bold text-sm leading-tight ${t.heading} line-clamp-2`}>
                      {item.isHalfAndHalf ? `½ ${item.product.name} / ½ ${item.secondHalfProduct?.name}` : item.product.name}
                    </h3>
                    <p className={`font-black text-sm whitespace-nowrap ${t.accent}`}>${item.subtotal.toLocaleString('es-AR')}</p>
                  </div>

                  {item.quantity > 1 && (
                    <p className={`text-[10px] font-medium ${t.mutedText} mt-0.5`}>${item.unitPrice.toLocaleString('es-AR')} c/u</p>
                  )}

                  {/* Tags */}
                  {((item.product.availableDays && !isDailyProduct(item.product.availableDays)) || item.removedIngredients.length > 0 || item.addedExtras.length > 0 || (item.comboRemovedIngredients && Object.keys(item.comboRemovedIngredients).length > 0)) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.product.availableDays && !isDailyProduct(item.product.availableDays) && (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${t.tag.purple}`}>
                          <Calendar className="w-2.5 h-2.5" /> {getProductBadgeLabel(item.product.availableDays)}
                        </span>
                      )}
                      {item.addedExtras.map((ex: any) => (
                        <span key={ex.id} className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${t.tag.green}`}>+ {ex.name}</span>
                      ))}
                      {item.removedIngredients.length > 0 && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${t.tag.red}`}>Sin ingredientes</span>
                      )}
                      {item.comboRemovedIngredients && Object.keys(item.comboRemovedIngredients).some(k => item.comboRemovedIngredients![k].length > 0) && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${t.tag.purple}`}>Combo modif.</span>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <p className={`text-[10px] italic mt-1 p-1.5 rounded-lg border ${t.notesBg} ${t.mutedText} line-clamp-1`}>"{item.notes}"</p>
                  )}
                </div>

                {/* Quantity + Remove */}
                <div className="flex items-center justify-between pt-2 mt-1">
                  <div className={`flex items-center gap-0.5 border p-0.5 rounded-lg ${t.qtyBg}`}>
                    <button className={`w-7 h-7 flex items-center justify-center rounded-md ${t.qtyBtn}`} onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`w-5 text-center text-xs font-black ${t.heading}`}>{item.quantity}</span>
                    <button className={`w-7 h-7 flex items-center justify-center rounded-md ${t.qtyBtn}`} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${t.removeBg}`} onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-3 w-3" /> Quitar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {(() => {
        const schedule = analyzeCartSchedule(items);
        return (
          <div className={`mt-5 p-4 rounded-2xl border shadow-xs space-y-2.5 ${t.summary}`}>
            {schedule.hasScheduledProducts && schedule.targetDateInfo && (
              <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${t.tag.purple}`}>
                <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                <div className="min-w-0">
                  <p className="font-black">📅 Entrega/Retiro Programado: {schedule.targetDateInfo.formatted}</p>
                  <p className="opacity-90 mt-0.5 text-[11px]">
                    Tu pedido contiene productos del menú semanal que se elaboran exclusivamente para esta fecha.
                  </p>
                  {schedule.isMixedCart && (
                    <p className="mt-1 font-bold text-[10px] text-amber-700 dark:text-amber-300">
                      ⚠️ Atención: Se incluirán los productos del día junto con la entrega del {schedule.targetDateInfo.dayName}.
                    </p>
                  )}
                </div>
              </div>
            )}

            {dailyPrize && (
              <div className={`flex items-center justify-between font-bold text-[11px] p-2 rounded-xl ${t.tag.purple}`}>
                <span>✨ Premio Ganado:</span>
                <span>{dailyPrize.type === "PRODUCT" ? `+ ${dailyPrize.product?.name}` : dailyPrize.type === "PERCENT" ? `${dailyPrize.value}% OFF` : `-$${dailyPrize.value}`}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${t.subtext}`}>Subtotal</h3>
              <span className={`text-xl font-black ${t.accent}`}>${subtotal.toLocaleString('es-AR')}</span>
            </div>
            {quantityDiscount && <div className={`flex items-center justify-between rounded-xl p-2 text-xs font-black ${t.tag.green}`}><span>📦 {quantityDiscount.name}</span><span>−${quantityDiscount.amount.toLocaleString("es-AR")}</span></div>}
            {quantityDiscount && <div className="flex items-center justify-between border-t pt-2"><span className={`text-sm font-bold ${t.heading}`}>Total con promoción</span><span className={`text-xl font-black ${t.accent}`}>${Math.max(0, subtotal - quantityDiscount.amount).toLocaleString("es-AR")}</span></div>}
          </div>
        );
      })()}

      {/* CTA */}
      <div className="mt-5 space-y-2.5">
        <div className={`flex justify-center gap-4 text-[10px] font-medium ${t.trustText}`}>
          <span>Pedido protegido</span>
          <span>·</span>
          <span>Precios transparentes</span>
          <span>·</span>
          <span>Confirmación inmediata</span>
        </div>
        <Button
          onClick={() => router.push("/checkout")}
          className={`w-full h-13 rounded-2xl text-base font-bold text-white shadow-lg group transition-all ${t.accentBg} ${t.accentBgHover}`}
        >
          Ingresar Datos
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
