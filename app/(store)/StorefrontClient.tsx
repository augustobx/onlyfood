"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ChevronDown, Search, Layers, Star, User, ReceiptText, Gift, Calendar, Dices } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { PointsCatalogModal } from "@/components/PointsCatalogModal";
import { RouletteModal } from "@/components/RouletteModal";
import { UrbanDarkStorefront } from "@/components/store/UrbanDarkStorefront";
import { FastNeoStorefront } from "@/components/store/FastNeoStorefront";
import { CleanBoutiqueStorefront } from "@/components/store/CleanBoutiqueStorefront";
import { SignatureStorefront } from "@/components/store/SignatureStorefront";
import { ComicFoodStorefront } from "@/components/store/ComicFoodStorefront";
import { ArcadeKitchenStorefront } from "@/components/store/ArcadeKitchenStorefront";
import { StoreNoticeBoard } from "@/components/store/StoreNoticeBoard";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isDailyProduct, getProductBadgeLabel, getProductDaysLabel, getNextAvailableDate } from "@/lib/weekly-menu";

function getAvailableQuantity(product: any, secondHalf: any, removedIngredients: string[], comboRemovedIngredients: Record<string, string[]>) {
  const required = new Map<string, { amount: number; stock: number }>();
  const add = (usage: any, multiplier: number) => {
    const current = required.get(usage.ingredientId);
    required.set(usage.ingredientId, {
      amount: (current?.amount ?? 0) + usage.quantity * multiplier,
      stock: Number(usage.ingredient?.stock ?? 0),
    });
  };

  if (product.isCombo) {
    for (const comboItem of product.comboItemsConfig ?? []) {
      const removed = new Set(comboRemovedIngredients[comboItem.id] ?? []);
      for (const usage of comboItem.product.ingredients ?? []) {
        if (!removed.has(usage.ingredientId)) add(usage, comboItem.quantity);
      }
    }
  } else if (secondHalf) {
    const removed = new Set(removedIngredients);
    for (const usage of product.ingredients ?? []) if (!removed.has(usage.ingredientId)) add(usage, 0.5);
    for (const usage of secondHalf.ingredients ?? []) if (!removed.has(usage.ingredientId)) add(usage, 0.5);
  } else {
    const removed = new Set(removedIngredients);
    for (const usage of product.ingredients ?? []) if (!removed.has(usage.ingredientId)) add(usage, 1);
  }

  if (required.size === 0) return 50;
  return Math.max(0, Math.min(50, ...[...required.values()].map((entry) => Math.floor((entry.stock + 0.0001) / entry.amount))));
}

// Componente ExpandableProductCard (sin cambios)
function ExpandableProductCard({ product, categoryProducts = [], loyaltyEnabled = false }: { product: any, categoryProducts?: any[], loyaltyEnabled?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [secondHalf, setSecondHalf] = useState<any>(null);
  const [comboRemovedIngredients, setComboRemovedIngredients] = useState<Record<string, string[]>>({});

  const halfSiblings = categoryProducts.filter((p: any) => p.id !== product.id && p.allowHalf);

  const extrasTotal = addedExtras.reduce((sum, extra) => sum + extra.price, 0);
  let basePrice = product.basePrice;
  if (product.allowHalf && secondHalf) {
    basePrice = (product.basePrice / 2) + (secondHalf.basePrice / 2);
  }
  const unitPrice = basePrice + extrasTotal;
  const totalPrice = unitPrice * quantity;
  const availableQuantity = getAvailableQuantity(product, secondHalf, removedIngredients, comboRemovedIngredients);
  const isUnavailable = availableQuantity < 1;

  const resetForm = () => {
    setQuantity(1);
    setRemovedIngredients([]);
    setAddedExtras([]);
    setNotes("");
    setSecondHalf(null);
    setComboRemovedIngredients({});
    setIsExpanded(false);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.onlyHalf && !secondHalf) {
      toast.error("Seleccioná la otra mitad");
      return;
    }
    if (quantity > availableQuantity) {
      toast.error(availableQuantity === 0 ? "Producto agotado" : `Solo quedan ${availableQuantity} unidades disponibles`);
      return;
    }
    addItem({
      product: product,
      quantity,
      removedIngredients,
      addedExtras,
      unitPrice,
      notes,
      isHalfAndHalf: !!secondHalf,
      secondHalfProduct: secondHalf,
      comboRemovedIngredients
    });
    toast.success("¡Agregado al carrito!", {
      description: `${quantity}x ${product.name}`,
    });
    resetForm();
  };

  const handleToggleExpand = () => {
    if (!isExpanded && isUnavailable) {
      toast.error("Este producto está temporalmente agotado");
      return;
    }
    if (!isExpanded) setIsExpanded(true);
    else resetForm();
  }

  const expandVariants: Variants = {
    hidden: { height: 0, opacity: 0, overflow: 'hidden' },
    visible: {
      height: 'auto',
      opacity: 1,
      overflow: 'hidden',
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  };

  return (
    <div className={`product-card overflow-hidden transition-colors duration-300 border-b last:border-0 ${isExpanded ? 'product-card-expanded bg-slate-50 border-orange-200' : 'bg-white hover:bg-slate-50'}`}>
      {/* Closed Header (Preview) */}
      <div
        className="p-4 flex gap-4 cursor-pointer relative items-center"
        onClick={handleToggleExpand}
      >
        <div className={`product-image w-24 h-24 relative rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden transition-[box-shadow] duration-300 ${isExpanded ? 'shadow-md ring-2 ring-orange-500 ring-offset-2' : ''} ${product.isCombo ? 'bg-purple-100' : 'bg-orange-100'}`}>
          {product.imageUrl && product.showImage ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="96px" />
          ) : (
            <ShoppingBag className={`w-8 h-8 ${product.isCombo ? 'text-purple-300' : 'text-orange-300'}`} />
          )}
          {product.onlyHalf && <span className="absolute bottom-0 w-full text-center bg-black/60 text-white text-[10px] font-bold py-0.5">MEDIAS</span>}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {product.availableDays && !isDailyProduct(product.availableDays) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700 border border-purple-200">
                <Calendar className="w-3 h-3" /> {getProductBadgeLabel(product.availableDays)}
              </span>
            )}
            {product.isCombo && <span className="product-badge bg-purple-100 text-purple-700">Combo</span>}
            {loyaltyEnabled && product.points > 0 && <span className="product-badge bg-yellow-100 text-yellow-700"><Star className="h-3 w-3 fill-current" /> +{product.points} pts</span>}
            {isUnavailable && <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">Agotado</span>}
          </div>
          <h3 className="product-title font-bold text-lg leading-tight text-slate-800">{product.name}</h3>
          {!isExpanded && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description || "Toca para personalizar."}</p>}
          <span className={`font-bold mt-1.5 inline-flex items-center gap-2 ${product.isCombo ? 'text-purple-700' : 'text-orange-600'}`}>
            ${product.basePrice.toLocaleString('es-AR')}
            {product.allowHalf && <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-1 rounded">Mitades disp.</span>}
            {loyaltyEnabled && product.points > 0 && <span className="original-product-points text-[10px] font-black bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> +{product.points} Pts</span>}
          </span>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center bg-white shadow-sm text-slate-400">
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={expandVariants}
            style={{ willChange: "height, opacity" }}
          >
            <div className="px-4 pb-6 pt-2 space-y-6">
              {product.availableDays && !isDailyProduct(product.availableDays) && (() => {
                const nextAvail = getNextAvailableDate(product.availableDays);
                return (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 leading-relaxed flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">📅 Menú Semanal ({getProductDaysLabel(product.availableDays)})</p>
                      {nextAvail && (
                        <p className="mt-0.5 opacity-90">
                          Este plato se elabora para entrega/retiro el <strong>{nextAvail.formatted}</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <p className="text-sm text-slate-600 bg-white p-3 border rounded-xl shadow-sm">{product.description || "Añade a tu pedido directamente desde aquí."}</p>

              {/* Selector de Mitades (sin cambios) */}
              {product.allowHalf && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-tight">{product.onlyHalf ? "Completá tu pizza con otra mitad" : "Elegí la otra mitad"}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {halfSiblings.map((sibling: any) => (
                      <div
                        key={sibling.id}
                        className={`p-2 border rounded-xl text-center cursor-pointer transition-all ${secondHalf?.id === sibling.id ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-500/50' : 'bg-white hover:bg-slate-50'}`}
                        onClick={() => setSecondHalf(sibling)}
                      >
                        <span className="block text-xs font-bold truncate">{sibling.name}</span>
                        <span className="block text-[10px] text-muted-foreground">+${(sibling.basePrice / 2).toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Config de Ingredientes (sin cambios) */}
              {!product.isCombo && product.ingredients?.length > 0 && product.allowRemoveIngredients !== false && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-tight">Ingredientes</h4>
                  <div className="grid gap-2 bg-white p-3 border rounded-xl">
                    {product.ingredients.map((pi: any) => (
                      <div key={pi.ingredient.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`ing-${product.id}-${pi.ingredient.id}`}
                          defaultChecked={true}
                          disabled={!pi.isRemovable}
                          className={!pi.isRemovable ? 'opacity-50' : 'data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500'}
                          onCheckedChange={(c) => {
                            if (!c) setRemovedIngredients(v => [...v, pi.ingredient.id]);
                            else setRemovedIngredients(v => v.filter(x => x !== pi.ingredient.id));
                          }}
                        />
                        <Label htmlFor={`ing-${product.id}-${pi.ingredient.id}`} className="text-sm cursor-pointer flex-1 py-1">
                          {pi.ingredient.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalización de Combo (sin cambios) */}
              {product.isCombo && product.comboItemsConfig?.some((ci: any) => ci.product.ingredients?.length > 0 && ci.product.allowRemoveIngredients !== false) && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-purple-800 uppercase tracking-tight">Personalizar por dentro</h4>
                  {product.comboItemsConfig.filter((ci: any) => ci.product.ingredients?.length > 0 && ci.product.allowRemoveIngredients !== false).map((ci: any) => {
                    return (
                      <div key={ci.id} className="bg-white p-3 border-l-4 border-purple-400 rounded-lg shadow-sm">
                        <span className="font-bold text-xs uppercase text-slate-500 block mb-2">{ci.product.name} (x{ci.quantity})</span>
                        <div className="grid gap-2 pl-1">
                          {ci.product.ingredients.map((pi: any) => (
                            <div key={pi.ingredient.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cing-${ci.id}-${pi.ingredient.id}`}
                                defaultChecked={true}
                                disabled={!pi.isRemovable}
                                className="w-4 h-4 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                onCheckedChange={(c) => {
                                  setComboRemovedIngredients(prev => {
                                    const arr = prev[ci.id] || [];
                                    if (!c) return { ...prev, [ci.id]: [...arr, pi.ingredient.id] };
                                    return { ...prev, [ci.id]: arr.filter(x => x !== pi.ingredient.id) };
                                  })
                                }}
                              />
                              <Label htmlFor={`cing-${ci.id}-${pi.ingredient.id}`} className="text-xs cursor-pointer"><span className="text-muted-foreground mr-1">Con</span>{pi.ingredient.name}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Extras organizados por grupos */}
              {product.extras?.length > 0 && (
                <div className="space-y-4">
                  {Object.entries(
                    product.extras.reduce((acc: any, pe: any) => {
                      const ext = pe.extra || pe;
                      const g = ext.groupName || "Extras";
                      if (!acc[g]) acc[g] = { groupName: g, isSingle: ext.selectionType === "SINGLE", items: [] };
                      acc[g].items.push(ext);
                      return acc;
                    }, {})
                  ).map(([groupName, groupData]: any) => {
                    const isSingle = groupData.isSingle;
                    return (
                      <div key={groupName} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-tight">
                            {groupName}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isSingle ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}>
                            {isSingle ? "🔘 Solo 1 opción" : "☑️ Varios"}
                          </span>
                        </div>
                        <div className="grid gap-1.5 bg-white p-3 border rounded-xl shadow-xs">
                          {groupData.items.map((ext: any) => {
                            const isAdded = addedExtras.some((e: any) => e.id === ext.id || e.extraId === ext.id);
                            return (
                              <div
                                key={ext.id}
                                onClick={() => {
                                  if (isSingle) {
                                    if (isAdded) {
                                      setAddedExtras((v: any[]) => v.filter((x: any) => (x.id || x.extraId) !== ext.id));
                                    } else {
                                      const filtered = addedExtras.filter((x: any) => (x.groupName || "Extras") !== groupName);
                                      setAddedExtras([...filtered, { ...ext, groupName }]);
                                    }
                                  } else {
                                    if (isAdded) {
                                      setAddedExtras((v: any[]) => v.filter((x: any) => (x.id || x.extraId) !== ext.id));
                                    } else {
                                      setAddedExtras((v: any[]) => [...v, { ...ext, groupName }]);
                                    }
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${isAdded ? (isSingle ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold') : 'border-transparent hover:bg-slate-50 text-slate-700'}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center ${isAdded ? (isSingle ? 'bg-purple-600 border-purple-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white') : 'border-slate-300'}`}>
                                    {isAdded && (isSingle ? <div className="w-1.5 h-1.5 rounded-full bg-white" /> : <span className="text-[10px] leading-none">✓</span>)}
                                  </div>
                                  <span className="text-xs">{ext.name}</span>
                                </div>
                                <span className="text-xs font-black text-orange-600">{ext.price > 0 ? `+$${ext.price}` : 'Gratis'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2">
                <Textarea
                  placeholder="Aclaraciones para la cocina (sin sal, bien cocido, etc)..."
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="bg-white border-dashed text-sm"
                />
              </div>

              {/* Checkout Strip (sin cambios) */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2 bg-white border shadow-sm rounded-full p-1 border-slate-200">
                  <button onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)) }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600">-</button>
                  <span className="w-4 text-center font-bold text-lg">{quantity}</span>
                  <button disabled={quantity >= availableQuantity} onClick={(e) => { e.stopPropagation(); setQuantity(Math.min(availableQuantity, quantity + 1)) }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">+</button>
                </div>

                <Button
                  disabled={isUnavailable}
                  onClick={handleAddToCart}
                  className={`flex-1 h-14 rounded-full shadow-lg text-lg font-bold ${product.isCombo ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'}`}
                >
                  {isUnavailable ? "Sin stock" : `Agregar • $${totalPrice.toLocaleString('es-AR')}`}
                </Button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StorefrontClient({ categories, combos, loggedClient, config, prizes = [], loyaltyEnabled = false, rouletteEnabled = false }: { categories: any[], combos: any[], loggedClient?: any, config?: any, prizes?: any[], loyaltyEnabled?: boolean, rouletteEnabled?: boolean }) {
  const isNexo = config?.storeTheme === "NEXO";
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { items, getTotal, dailyPrize, setDailyPrize } = useCartStore();
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  useEffect(() => {
    if (isNexo && !openCategoryId) setOpenCategoryId(combos.length > 0 ? "combos" : categories[0]?.id || null);
  }, [isNexo, openCategoryId, combos.length, categories]);
  const [currentPoints, setCurrentPoints] = useState(loggedClient?.points || 0);

  useEffect(() => {
    if (loggedClient) setCurrentPoints(loggedClient.points);
  }, [loggedClient]);

  const handleRouletteWin = (prize: any) => {
    setDailyPrize(prize);
  };

  const handleToggleCategory = (id: string | null) => {
    if (openCategoryId === id) setOpenCategoryId(null);
    else setOpenCategoryId(id);
  };

  const hasItems = items.length > 0;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

  useEffect(() => {
    if (!loggedClient && !sessionStorage.getItem("nfood_auth_dismissed")) {
      setIsAuthModalOpen(true);
    }
  }, [loggedClient]);

  const [showSplash, setShowSplash] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showNoticeBoard, setShowNoticeBoard] = useState(false);
  const [noticeGateReady, setNoticeGateReady] = useState(false);
  const noticeContent = `${config?.id || "store"}|${config?.noticeBoardTitle || ""}|${config?.noticeBoardMessage || ""}`;
  const noticeFingerprint = Array.from(noticeContent).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

  useEffect(() => {
    if (!config?.splashEnabled) {
      setShowSplash(false);
      return;
    }

    const splashSeen = sessionStorage.getItem("nfood_splash_seen") === "true";
    if (splashSeen) {
      setShowSplash(false);
      return;
    }

    sessionStorage.setItem("nfood_splash_seen", "true");
    setShowSplash(true);
    // La imagen usa la duración configurada. El video termina al disparar onEnded;
    // este límite evita bloquear la tienda si el navegador no puede reproducirlo.
    const timeoutMs = config.splashType === "VIDEO" ? 20_000 : (config.splashDuration || 3) * 1000;
    const timer = setTimeout(() => setShowSplash(false), timeoutMs);
    return () => clearTimeout(timer);
  }, [config?.splashEnabled, config?.splashDuration, config?.splashType, config?.splashVideoUrl]);

  useEffect(() => {
    if (showSplash) return;
    if (!config?.noticeBoardEnabled || !config?.noticeBoardTitle?.trim() || !config?.noticeBoardMessage?.trim()) {
      setShowNoticeBoard(false);
      setNoticeGateReady(true);
      return;
    }
    const seen = sessionStorage.getItem(`onlyfood_notice_seen_${noticeFingerprint}`) === "true";
    setShowNoticeBoard(!seen);
    setNoticeGateReady(true);
  }, [config?.noticeBoardEnabled, config?.noticeBoardMessage, config?.noticeBoardTitle, noticeFingerprint, showSplash]);

  const handleCloseNoticeBoard = useCallback(() => {
    sessionStorage.setItem(`onlyfood_notice_seen_${noticeFingerprint}`, "true");
    setShowNoticeBoard(false);
  }, [noticeFingerprint]);

  // Welcome Banner VIP (sin sonidos ni ruidos, orientado al club y ranking)
  useEffect(() => {
    if (config?.welcomeBalloonEnabled && !showSplash && noticeGateReady && !showNoticeBoard) {
      const welcomeSeen = sessionStorage.getItem("onlyfood_welcome_seen") === "true";
      if (!welcomeSeen) {
        setShowWelcome(true);
      }
    }
  }, [config?.welcomeBalloonEnabled, noticeGateReady, showNoticeBoard, showSplash]);

  const handleAcceptWelcome = () => {
    sessionStorage.setItem("onlyfood_welcome_seen", "true");
    setShowWelcome(false);
  };

  const handleCloseAuth = () => {
    sessionStorage.setItem("onlyfood_auth_dismissed", "true");
    setIsAuthModalOpen(false);
  };

  const allProds = [
    ...combos,
    ...categories.flatMap(c => c.products)
  ];

  const searchResults = searchTerm.length > 2
    ? allProds.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const themeVars = {
    '--brand-primary': config?.primaryColor || '#f97316',
    '--brand-secondary': config?.secondaryColor || '#9333ea',
  } as React.CSSProperties;

  const mainBackgroundStyles: React.CSSProperties = {
    ...themeVars,
    backgroundColor: config?.backgroundColor || '#f8fafc',
    ...(config?.backgroundUrl && {
      backgroundImage: `url(${config.backgroundUrl})`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
    })
  };

  if (showSplash) {
    if (config?.splashType === "VIDEO" && config?.splashVideoUrl) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video
            src={config.splashVideoUrl}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label={`Presentación de ${config?.appName || "la tienda"}`}
            className="h-full w-full object-contain"
            onEnded={() => setShowSplash(false)}
            onError={() => setShowSplash(false)}
          />
          <button type="button" onClick={() => setShowSplash(false)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-black/45 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
            Omitir
          </button>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center text-white p-4 text-center transition-opacity duration-500" style={{ backgroundColor: config?.primaryColor || '#f97316', ...themeVars }}>
        {(config?.splashUrl || config?.logoUrl) && <Image unoptimized width={128} height={128} src={config.splashUrl || config.logoUrl} alt={config.appName || "Logo del local"} className="mb-6 h-32 w-32 animate-pulse object-contain" />}
        <h1 className="text-4xl font-black">{config?.appName || 'nfood'}</h1>
        <div className="mt-8 w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: config.splashDuration || 3 }} className="h-full bg-white rounded-full"></motion.div>
        </div>
      </div>
    );
  }

  const renderSharedModals = () => (
    <>
      <StoreNoticeBoard open={showNoticeBoard} onClose={handleCloseNoticeBoard} config={config} />
      {/* ═══ MODAL DE BIENVENIDA VIP CLUB & RANKING ═══ */}
      <AnimatePresence>
        {showWelcome && loyaltyEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-slate-950 border border-white/15 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-5 relative overflow-hidden text-white">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

              {/* Logo / Ícono VIP */}
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 p-0.5 shadow-xl">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
                  👑
                </div>
              </div>

              {/* Contenido según sesión */}
              {loggedClient ? (
                <div className="space-y-2 relative z-10">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white shadow-sm"
                    style={{ backgroundColor: loggedClient.tier?.color || "#a855f7" }}
                  >
                    👑 {loggedClient.tier?.name || "Club VIP"}
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    ¡Hola, {loggedClient.name || "Beater"}!
                  </h3>
                  <p className="text-slate-300 text-xs font-medium leading-relaxed">
                    Tenés <strong className="text-yellow-300 font-black">{currentPoints} puntos</strong> y multiplicás <strong className="text-yellow-300 font-black">{loggedClient.tier?.pointsMultiplier || 1}x</strong> con cada compra.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 relative z-10">
                  <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    👑 Club de Puntos
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {config?.appName || "OnlyFood"}
                  </h3>
                  <p className="text-slate-300 text-xs font-medium leading-relaxed">
                    Ingresá con tu teléfono para sumar puntos, subir a <strong>Gold / Select VIP</strong> y acceder a premios y descuentos exclusivos.
                  </p>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="space-y-2 pt-1 relative z-10">
                {loggedClient ? (
                  <Button
                    onClick={handleAcceptWelcome}
                    className="w-full h-12 rounded-2xl font-black text-sm bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-600/30 transition-all"
                  >
                    Explorar Menú & Beneficios
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        handleAcceptWelcome();
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full h-12 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:brightness-110 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      👑 Ingresar con mi Teléfono
                    </Button>
                    <button
                      type="button"
                      onClick={handleAcceptWelcome}
                      className="text-xs text-slate-400 hover:text-white font-bold transition-colors py-1 block w-full"
                    >
                      Continuar como invitado
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PointsCatalogModal
        isOpen={loyaltyEnabled && isPointsModalOpen}
        onClose={() => setIsPointsModalOpen(false)}
        loggedClient={loggedClient ? { ...loggedClient, points: currentPoints } : null}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onPointsUpdate={setCurrentPoints}
      />

      {rouletteEnabled && config?.isRouletteActive && prizes.length > 0 && !showSplash && (
        <button
          type="button"
          aria-label="Abrir ruleta de premios"
          onClick={() => loggedClient ? setIsRouletteOpen(true) : setIsAuthModalOpen(true)}
          className="fixed bottom-[110px] left-4 z-[90] flex h-14 items-center gap-2 rounded-full border-2 border-violet-200 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 px-4 font-black text-white shadow-[0_12px_35px_rgba(124,58,237,.45)] transition hover:scale-105 hover:brightness-110 active:scale-95 sm:left-6 sm:h-16"
        >
          <Dices className="size-6" />
          <span className="text-left leading-tight">
            <span className="block text-[10px] uppercase tracking-wider text-violet-100">Premios</span>
            <span className="block text-xs sm:text-sm">Girar ruleta</span>
          </span>
        </button>
      )}

      <RouletteModal
        isOpen={rouletteEnabled && config?.isRouletteActive === true && isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        prizes={prizes}
        onWin={handleRouletteWin}
        cost={config?.rouletteCost || 0}
        clientId={loggedClient?.id}
        currentPoints={currentPoints}
        onPointsUpdate={setCurrentPoints}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuth} />
    </>
  );

  // TEMA 1: URBAN DARK STREET SMASH
  if (config?.storeTheme === "URBAN_DARK") {
    return (
      <>
        <UrbanDarkStorefront
          categories={categories}
          combos={combos}
          config={config}
          loggedClient={loggedClient}
          currentPoints={currentPoints}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPointsModal={() => setIsPointsModalOpen(true)}
          loyaltyEnabled={loyaltyEnabled}
        />
        {renderSharedModals()}
      </>
    );
  }

  // TEMA 2: FAST-APP DELIVERY NEO
  if (config?.storeTheme === "FAST_NEO") {
    return (
      <>
        <FastNeoStorefront
          categories={categories}
          combos={combos}
          config={config}
          loggedClient={loggedClient}
          currentPoints={currentPoints}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPointsModal={() => setIsPointsModalOpen(true)}
          loyaltyEnabled={loyaltyEnabled}
        />
        {renderSharedModals()}
      </>
    );
  }

  // TEMA 3: CLEAN BOUTIQUE & BOWLS
  if (config?.storeTheme === "CLEAN_BOUTIQUE") {
    return (
      <>
        <CleanBoutiqueStorefront
          categories={categories}
          combos={combos}
          config={config}
          loggedClient={loggedClient}
          currentPoints={currentPoints}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPointsModal={() => setIsPointsModalOpen(true)}
          loyaltyEnabled={loyaltyEnabled}
        />
        {renderSharedModals()}
      </>
    );
  }

  if (config?.storeTheme === "FRESH_MARKET" || config?.storeTheme === "RETRO_DINER") {
    return (
      <>
        <SignatureStorefront categories={categories} combos={combos} config={config} theme={config.storeTheme} loyaltyEnabled={loyaltyEnabled} />
        {renderSharedModals()}
      </>
    );
  }

  if (config?.storeTheme === "COMIC_FOOD_POP") {
    return (
      <>
        <ComicFoodStorefront
          categories={categories}
          combos={combos}
          config={config}
          loggedClient={loggedClient}
          currentPoints={currentPoints}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPointsModal={() => setIsPointsModalOpen(true)}
          loyaltyEnabled={loyaltyEnabled}
        />
        {renderSharedModals()}
      </>
    );
  }

  if (config?.storeTheme === "ARCADE_KITCHEN") {
    return (
      <>
        <ArcadeKitchenStorefront
          categories={categories}
          combos={combos}
          config={config}
          loggedClient={loggedClient}
          currentPoints={currentPoints}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenPointsModal={() => setIsPointsModalOpen(true)}
          loyaltyEnabled={loyaltyEnabled}
        />
        {renderSharedModals()}
      </>
    );
  }

  return (
    <div className={`storefront min-h-screen pb-32 ${isNexo ? "nexo-storefront" : ""}`} style={mainBackgroundStyles}>

      {/* Header Banner (sin cambios) */}
      <div className="store-hero bg-brand-primary pb-12 pt-12 px-4 rounded-b-[40px] shadow-sm mb-[-20px] relative z-0 border-b-4 overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        {isNexo && <><span className="nexo-orb nexo-orb-one" /><span className="nexo-orb nexo-orb-two" /></>}

        <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20">
          {loggedClient ? (
            <div className="flex gap-2">
              {loyaltyEnabled && <Link href="/profile">
                <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/30 transition-colors cursor-pointer border border-white/20">
                  <ReceiptText className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm tracking-tight hidden md:inline">Ver Pedidos</span>
                </div>
              </Link>}
              <Link href="/profile">
                <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/30 transition-colors cursor-pointer border border-white/20">
                  <Star className="w-4 h-4 text-yellow-300 fill-current" />
                  <span className="text-white font-bold text-sm tracking-tight">{currentPoints} Pts</span>
                </div>
              </Link>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/30 transition-colors border border-white/20 shadow-sm">
              <User className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm tracking-tight">Ingresar o Registrarse</span>
            </button>
          )}
        </div>

        <div className="hero-copy max-w-2xl mx-auto flex flex-col items-center text-center mt-2 relative z-10">
          {isNexo && <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur"><Gift className="h-3.5 w-3.5" /> Tu proximo favorito esta aca</span>}
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-2 drop-shadow-md">{isNexo ? <>Comer rico.<br/><span>Sentirse cerca.</span></> : (config?.appName || 'nfood')}</h1>
          <p className="text-white opacity-90 font-medium md:text-lg max-w-md drop-shadow-sm">
            {isNexo ? `Hola ${loggedClient?.name ? loggedClient.name.split(' ')[0] : 'comensal'}, elegi lo que te gusta y nosotros hacemos el resto.` : `Hola ${loggedClient?.name ? loggedClient.name.split(' ')[0] : 'comensal'}, ¿qué vas a pedir hoy?`}
          </p>
          {isNexo && <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-bold text-white/90"><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">Preparado al momento</span><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">Pedido simple</span><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">Beneficios por volver</span></div>}
        </div>
      </div>

      <div className="store-content max-w-xl mx-auto px-4 relative z-10 space-y-6 mt-6">

        {config?.globalDiscount > 0 && (
          <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-center gap-2 border-2 border-white">
            <Star className="w-6 h-6 text-yellow-300 fill-current animate-pulse" />
            <span className="font-black text-lg tracking-tight">¡Hoy tenés {config.globalDiscount}% OFF en toda la tienda!</span>
          </div>
        )}

        {/* Search Bar (sin cambios) */}
        <div className="store-search bg-white p-2 border shadow-lg shadow-orange-500/5 rounded-2xl flex items-center gap-2 sticky top-4 z-40">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <Input
            placeholder="Buscar productos o combos..."
            className="border-0 shadow-none focus-visible:ring-0 px-2 h-10 text-base bg-transparent"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>x</Button>}
        </div>

        {isNexo && searchTerm.length <= 2 && (
          <div className="nexo-category-rail -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {combos.length > 0 && <button onClick={() => { setOpenCategoryId('combos'); document.getElementById('category-combos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-extrabold text-white">Promos</button>}
            {categories.filter(c => c.products?.length > 0).map(category => <button key={category.id} onClick={() => { setOpenCategoryId(category.id); document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm">{category.name}</button>)}
          </div>
        )}

        {/* Searching mode (sin cambios) */}
        {searchTerm.length > 2 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800">Resultados para "{searchTerm}"</h3>
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(p => <ExpandableProductCard key={p.id} product={p} categoryProducts={categories.find(c => c.id === p.categoryId)?.products || []} loyaltyEnabled={loyaltyEnabled} />)
            ) : (
              <div className="p-8 text-center text-muted-foreground">No encontramos nada con ese nombre.</div>
            )}
          </div>
        ) : (
          /* Normal Accordion Mode (sin cambios) */
          <div className="space-y-4">

            {/* Combos Accordion */}
            {combos.length > 0 && (
              <motion.div id="category-combos" className="store-category bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm border overflow-hidden border-purple-200 scroll-mt-36">
                <button
                  onClick={() => handleToggleCategory('combos')}
                  className="w-full p-5 flex items-center justify-between text-left focus:outline-none focus-visible:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">Promos y Combos</h2>
                      <p className="text-sm text-purple-600 font-medium">{combos.length} opciones increíbles</p>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: openCategoryId === 'combos' ? 180 : 0 }}>
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openCategoryId === 'combos' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t"
                      style={{ willChange: "height, opacity" }}
                    >
                      {combos.map(product => (
                        <ExpandableProductCard key={product.id} product={product} loyaltyEnabled={loyaltyEnabled} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Standard Categories */}
            {categories.filter(c => c.products?.length > 0).map(category => (
              <motion.div id={`category-${category.id}`} key={category.id} className="store-category bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm border overflow-hidden scroll-mt-36">
                <button
                  onClick={() => handleToggleCategory(category.id)}
                  className="w-full p-5 flex items-center justify-between text-left focus:outline-none focus-visible:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold font-mono text-lg text-orange-600">{category.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">{category.name}</h2>
                      <p className="text-sm text-slate-500 font-medium">{category.products.length} productos</p>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: openCategoryId === category.id ? 180 : 0 }}>
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openCategoryId === category.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t"
                      style={{ willChange: "height, opacity" }}
                    >
                      {category.products.map((product: any) => (
                        <ExpandableProductCard key={product.id} product={product} categoryProducts={category.products} loyaltyEnabled={loyaltyEnabled} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

          </div>
        )}
      </div>

      {/* Floating Sticky Cart Button (sin cambios) */}
      <AnimatePresence>
        {hasItems && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="store-cart-bar fixed bottom-0 left-0 w-full p-4 md:p-6 z-50 pointer-events-none"
          >
            <div className="max-w-xl mx-auto pointer-events-auto">
              <Link href="/cart">
                <Button className="w-full h-16 rounded-[2rem] bg-brand-primary hover:bg-black text-white shadow-2xl flex items-center justify-between px-6 text-lg group border-2 border-transparent">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <ShoppingBag className="w-6 h-6 text-white" />
                      <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                    </div>
                    <span className="font-bold tracking-tight">Ver Carrito</span>
                  </div>
                  <span className="font-black text-white">
                    ${(() => {
                      const base = getTotal();
                      let disc = base * (1 - (config?.globalDiscount || 0) / 100);
                      if (dailyPrize?.type === "PERCENT") disc -= disc * (dailyPrize.value / 100);
                      if (dailyPrize?.type === "AMOUNT") disc = Math.max(0, disc - dailyPrize.value);
                      return disc;
                    })().toLocaleString('es-AR')}
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante de Canje de Puntos */}
      {loyaltyEnabled && config?.isPointsCatalogActive !== false && !showSplash && (
        <div className="fixed bottom-[110px] right-4 z-[90] sm:right-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          >
            <button
              type="button"
              aria-label="Abrir catálogo de canjes por puntos"
              onClick={() => setIsPointsModalOpen(true)}
              className="group relative flex h-14 sm:h-16 items-center gap-2.5 overflow-hidden rounded-full border-2 border-amber-200 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 px-4 text-white shadow-[0_12px_35px_rgba(249,115,22,.48),inset_0_1px_2px_rgba(255,255,255,.65)] transition hover:scale-105 hover:brightness-110 active:scale-95 focus:outline-none"
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,.5),transparent_35%)]" />
              <Gift className="relative size-6 sm:size-7 drop-shadow-md text-white" strokeWidth={2.4} />
              <div className="relative text-left leading-tight pr-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 block">Club Puntos</span>
                <span className="text-xs sm:text-sm font-black text-white">Canjear Pts</span>
              </div>
            </button>
          </motion.div>
        </div>
      )}

      {renderSharedModals()}
    </div>
  );
}
