"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  Check,
  X,
  Star,
  Flame,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store";
import {
  isDailyProduct,
  getProductDaysLabel,
  getProductBadgeLabel,
  getNextAvailableDate,
} from "@/lib/weekly-menu";

interface ProductCustomizerModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  categoryProducts?: any[];
  theme?: "URBAN_DARK" | "FAST_NEO" | "CLEAN_BOUTIQUE" | "NEXO" | "ORIGINAL";
}

export function ProductCustomizerModal({
  product,
  isOpen,
  onClose,
  categoryProducts = [],
  theme = "URBAN_DARK",
}: ProductCustomizerModalProps) {
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [secondHalf, setSecondHalf] = useState<any>(null);
  const [comboRemovedIngredients, setComboRemovedIngredients] = useState<
    Record<string, string[]>
  >({});

  // Group extras by groupName (Hook unconditionally placed at top)
  const groupedExtras = useMemo(() => {
    if (!product?.extras) return [];
    const map: Record<string, { groupName: string; isSingle: boolean; items: any[] }> = {};
    for (const item of product.extras) {
      const ext = item.extra || item;
      if (ext.isActive === false) continue;
      const gName = ext.groupName || "Extras";
      const isSingle = ext.selectionType === "SINGLE";
      if (!map[gName]) {
        map[gName] = { groupName: gName, isSingle, items: [] };
      }
      map[gName].items.push({
        id: ext.id || item.extraId,
        extraId: ext.id || item.extraId,
        name: ext.name,
        price: item.price ?? ext.price ?? 0,
        groupName: gName,
        selectionType: ext.selectionType || "MULTIPLE",
      });
    }
    return Object.values(map);
  }, [product?.extras]);

  // Reset form when product changes
  useEffect(() => {
    if (product && isOpen) {
      setQuantity(1);
      setRemovedIngredients([]);
      setAddedExtras([]);
      setNotes("");
      setSecondHalf(null);
      setComboRemovedIngredients({});
    }
  }, [product, isOpen]);

  if (!product) return null;

  const isDark = theme === "URBAN_DARK";
  const isClean = theme === "CLEAN_BOUTIQUE";

  const halfSiblings = categoryProducts.filter(
    (p: any) => p.id !== product.id && p.allowHalf
  );

  const extrasTotal = addedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
  let basePrice = product.basePrice;
  if (product.allowHalf && secondHalf) {
    basePrice = product.basePrice / 2 + secondHalf.basePrice / 2;
  }
  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;

  // Toggle removal of an ingredient
  const toggleRemovedIngredient = (ingId: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ingId)
        ? prev.filter((id) => id !== ingId)
        : [...prev, ingId]
    );
  };

  // Handle Extra selection (Single vs Multiple)
  const handleSelectExtra = (extraObj: any, isSingle: boolean, groupName: string) => {
    setAddedExtras((prev) => {
      const id = extraObj.extraId || extraObj.id;
      const isAlreadySelected = prev.some((e) => (e.extraId || e.id) === id);

      if (isSingle) {
        // Selección única (ej: Papas):
        // Si ya está seleccionado, lo deselecciona
        if (isAlreadySelected) {
          return prev.filter((e) => (e.extraId || e.id) !== id);
        }
        // Reemplaza cualquier otro seleccionado en este mismo grupo
        const filtered = prev.filter((e) => (e.groupName || "Extras") !== groupName);
        return [...filtered, { ...extraObj, groupName }];
      } else {
        // Selección múltiple (ej: Toppings/Salsas)
        if (isAlreadySelected) {
          return prev.filter((e) => (e.extraId || e.id) !== id);
        }
        return [...prev, { ...extraObj, groupName }];
      }
    });
  };

  const handleAddToCart = () => {
    if (product.onlyHalf && !secondHalf) {
      toast.error("Por favor seleccioná la otra mitad");
      return;
    }

    addItem({
      product,
      quantity,
      removedIngredients,
      addedExtras,
      unitPrice,
      notes,
      isHalfAndHalf: !!secondHalf,
      secondHalfProduct: secondHalf,
      comboRemovedIngredients,
    });

    toast.success(`¡Agregado al pedido!`, {
      description: `${quantity}x ${product.name} ($${totalPrice.toLocaleString("es-AR")})`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`w-[94vw] sm:max-w-lg max-h-[88dvh] p-0 rounded-3xl border shadow-2xl flex flex-col overflow-hidden outline-none ${
          isDark
            ? "bg-[#11141c] text-white border-slate-800"
            : isClean
            ? "bg-[#faf8f5] text-slate-900 border-stone-200"
            : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        {/* Imagen Cabecera */}
        <div className="relative w-full h-44 sm:h-52 bg-slate-950 shrink-0 overflow-hidden">
          {product.imageUrl && product.showImage ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, 500px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-950/60 to-slate-900">
              <ShoppingBag className="w-12 h-12 text-orange-500/40" />
            </div>
          )}

          {/* Gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Botón Cerrar X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badges superiores */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20">
            {product.availableDays && !isDailyProduct(product.availableDays) && (
              <Badge className="bg-purple-700 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1 border border-purple-500/50">
                <Calendar className="w-3 h-3" /> {getProductBadgeLabel(product.availableDays)}
              </Badge>
            )}
            {product.isCombo && (
              <Badge className="bg-purple-600 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shadow-md">
                COMBO
              </Badge>
            )}
            {product.points > 0 && (
              <Badge className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" /> +{product.points * quantity} pts
              </Badge>
            )}
          </div>

          {/* Nombre y Precio sobre imagen */}
          <div className="absolute bottom-3 left-3 right-3 text-white z-20">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-md">
              {product.name}
            </h3>
            <span className="text-lg sm:text-xl font-black text-orange-400 drop-shadow-md">
              ${unitPrice.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 overscroll-contain">
          {/* Banner de fecha de elaboración para menú semanal */}
          {product.availableDays && !isDailyProduct(product.availableDays) && (() => {
            const nextAvail = getNextAvailableDate(product.availableDays);
            return (
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                isDark
                  ? "bg-purple-950/40 border-purple-500/40 text-purple-200"
                  : isClean
                  ? "bg-stone-100 border-stone-300 text-stone-900 font-serif"
                  : "bg-purple-50 border-purple-200 text-purple-950"
              }`}>
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed min-w-0">
                  <p className="font-black text-sm">📅 Menú Semanal / Encargo</p>
                  <p className="opacity-90 mt-0.5">
                    Este producto se elabora exclusivamente los días <strong>{getProductDaysLabel(product.availableDays)}</strong>.
                    {nextAvail && (
                      <> Tu pedido se programará automáticamente para el <strong>{nextAvail.formatted}</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            );
          })()}

          {product.description && (
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {product.description}
            </p>
          )}

          {/* 1. Selector de Mitades */}
          {product.allowHalf && halfSiblings.length > 0 && (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <h4 className="font-black text-xs uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {product.onlyHalf ? "Completá con otra mitad *" : "Combinar con otra mitad (Opcional)"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {!product.onlyHalf && (
                  <button
                    type="button"
                    onClick={() => setSecondHalf(null)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all ${
                      secondHalf === null
                        ? isDark
                          ? "border-orange-500 bg-orange-500/20 text-orange-300"
                          : "border-orange-500 bg-orange-50 text-orange-900"
                        : isDark
                        ? "border-slate-800 bg-slate-950 text-slate-400"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    Entera ({product.name})
                  </button>
                )}
                {halfSiblings.map((half: any) => (
                  <button
                    key={half.id}
                    type="button"
                    onClick={() => setSecondHalf(half)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all flex items-center justify-between ${
                      secondHalf?.id === half.id
                        ? isDark
                          ? "border-orange-500 bg-orange-500/20 text-orange-300 ring-2 ring-orange-500/30"
                          : "border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20"
                        : isDark
                        ? "border-slate-800 bg-slate-950 text-slate-400"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span className="truncate">{half.name}</span>
                    {secondHalf?.id === half.id && <Check className="w-3.5 h-3.5 text-orange-500 ml-1 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Quitar Ingredientes */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  Personalizar Receta
                </h4>
                <span className="text-[10px] text-slate-400">Toca para quitar</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((item: any) => {
                  const ing = item.ingredient || item;
                  const isRemoved = removedIngredients.includes(item.ingredientId || ing.id);

                  return (
                    <button
                      key={item.ingredientId || ing.id}
                      type="button"
                      onClick={() => toggleRemovedIngredient(item.ingredientId || ing.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                        isRemoved
                          ? "bg-red-500/20 border-red-500 text-red-400 line-through"
                          : isDark
                          ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500"
                          : "bg-white border-slate-200 text-slate-800 hover:border-slate-400"
                      }`}
                    >
                      {isRemoved ? (
                        <X className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      )}
                      <span>{isRemoved ? `Sin ${ing.name}` : ing.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Grupos de Extras y Opciones */}
          {groupedExtras.length > 0 && (
            <div className="space-y-4 border-t pt-3.5 border-slate-800/40">
              {groupedExtras.map((group) => {
                return (
                  <div key={group.groupName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-orange-500" />
                        {group.groupName}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        group.isSingle
                          ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {group.isSingle ? "🔘 Elegí 1 opción" : "☑️ Podés elegir varios"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((extra: any) => {
                        const isSelected = addedExtras.some(
                          (e) => (e.extraId || e.id) === extra.id
                        );

                        return (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => handleSelectExtra(extra, group.isSingle, group.groupName)}
                            className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                              isSelected
                                ? group.isSingle
                                  ? "border-purple-500 bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/40"
                                  : "border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                                : isDark
                                ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Indicator icon */}
                              <div
                                className={`w-4 h-4 shrink-0 flex items-center justify-center transition-colors ${
                                  group.isSingle ? "rounded-full" : "rounded-md"
                                } border ${
                                  isSelected
                                    ? group.isSingle
                                      ? "bg-purple-600 border-purple-600 text-white"
                                      : "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-500 bg-transparent"
                                }`}
                              >
                                {isSelected && (
                                  group.isSingle ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  ) : (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  )
                                )}
                              </div>
                              <span className="truncate">{extra.name}</span>
                            </div>
                            <span
                              className={`font-black text-xs ml-2 shrink-0 ${
                                isSelected ? (group.isSingle ? "text-purple-300" : "text-emerald-300") : "text-orange-400"
                              }`}
                            >
                              {extra.price > 0 ? `+$${extra.price.toLocaleString("es-AR")}` : "Gratis"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Notas especiales */}
          <div className="space-y-1.5 border-t pt-3.5 border-slate-800/40">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              Aclaración para la cocina (Opcional)
            </label>
            <Textarea
              placeholder="Ej: bien cocida, aderezo aparte..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`rounded-xl text-xs h-14 ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-orange-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500"
              }`}
            />
          </div>
        </div>

        {/* Barra Fija Inferior */}
        <div
          className={`p-3.5 sm:p-4 border-t shrink-0 flex items-center gap-2.5 ${
            isDark ? "bg-[#0d1017] border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          {/* Selector de Cantidad */}
          <div
            className={`flex items-center gap-1 p-1 rounded-2xl border shrink-0 ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            <Button
              size="icon"
              variant="ghost"
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded-xl text-slate-400 hover:text-white"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="font-black text-sm w-6 text-center">{quantity}</span>
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-9 w-9 rounded-xl text-slate-400 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Botón Agregar */}
          <Button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-12 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98]"
          >
            <span>Agregar al Pedido</span>
            <span className="mx-1">•</span>
            <span>${totalPrice.toLocaleString("es-AR")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
