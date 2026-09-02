"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Coins,
  Sparkles,
  Percent,
  DollarSign,
  Package,
  CheckCircle2,
  Lock,
  Loader2,
  Ticket,
  ChevronRight,
  ArrowRight,
  Crown,
  Flame,
  Star,
  Trophy,
  Zap,
  Info,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { fetchPublicRewards, redeemReward } from "@/app/actions/client-rewards";
import { useCartStore } from "@/lib/store";

interface PointsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedClient: any | null;
  onOpenAuth: () => void;
  onPointsUpdate?: (newPoints: number) => void;
}

const TIER_ICONS: Record<string, any> = {
  Crown,
  Flame,
  Star,
  Trophy,
  Zap,
};

export function PointsCatalogModal({
  isOpen,
  onClose,
  loggedClient,
  onOpenAuth,
  onPointsUpdate,
}: PointsCatalogModalProps) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [currentPoints, setCurrentPoints] = useState(loggedClient?.points || 0);
  const [clientTier, setClientTier] = useState<any | null>(null);
  const [nextTier, setNextTier] = useState<any | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [tiers, setTiers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"CATALOG" | "COUPONS" | "TIERS_INFO">("CATALOG");

  const { addItem, setAppliedCoupon, items, appliedCoupon } = useCartStore();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchPublicRewards()
        .then((res) => {
          setRewards(res.rewards || []);
          setRedemptions(res.redemptions || []);
          setTiers(res.tiers || []);
          if (res.loggedClient) {
            setCurrentPoints(res.loggedClient.points);
            setClientTier(res.loggedClient.tier);
            setNextTier(res.loggedClient.nextTier);
            setProgressPercent(res.loggedClient.progressPercent);
            if (onPointsUpdate) onPointsUpdate(res.loggedClient.points);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, loggedClient?.id, onPointsUpdate]);

  const handleRedeem = async (reward: any) => {
    if (!loggedClient) {
      toast.info("Iniciá sesión con tu teléfono para canjear puntos");
      onOpenAuth();
      return;
    }

    if (reward.minTier && (!clientTier || (clientTier.sequence ?? 0) < (reward.minTier.sequence ?? 0))) {
      toast.error(`Este beneficio es exclusivo para miembros ${reward.minTier.name}.`);
      return;
    }

    if (currentPoints < reward.pointsCost) {
      toast.error(`Te faltan ${reward.pointsCost - currentPoints} puntos para este beneficio.`);
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await redeemReward(reward.id);
      if (res.success) {
        if (res.newPoints !== undefined) {
          setCurrentPoints(res.newPoints);
          if (onPointsUpdate) onPointsUpdate(res.newPoints);
        }
        if (res.redemption) {
          setRedemptions((prev) => [res.redemption, ...prev]);

          if (reward.type === "PRODUCT" || reward.type === "COMBO") {
            const product = reward.product || res.redemption.reward?.product;
            if (product) {
              const qty = reward.value ? Math.max(1, Math.round(reward.value)) : 1;
              addItem({
                product,
                quantity: qty,
                removedIngredients: [],
                addedExtras: [],
                unitPrice: 0,
                notes: `🎁 Premio Canjeado (${reward.name})`,
                isReward: true,
                rewardRedemptionId: res.redemption.id,
              });
              setAppliedCoupon(res.redemption);
              toast.success(`¡Canjeaste "${reward.name}" con éxito!`, {
                description: `Se agregaron ${qty > 1 ? `${qty} unidades` : "1 unidad"} de "${product.name}" directo a tu carrito ($0).`,
              });
            }
          } else {
            setAppliedCoupon(res.redemption);
            toast.success(`¡Canjeaste "${reward.name}" con éxito!`, {
              description: "El descuento se aplicó directo a tu carrito.",
            });
          }
        }
        setActiveTab("COUPONS");
      } else {
        toast.error("No se pudo canjear", { description: res.error });
      }
    } finally {
      setRedeemingId(null);
    }
  };

  const TierIcon = clientTier?.iconName ? TIER_ICONS[clientTier.iconName] || Crown : Crown;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-slate-200 shadow-2xl bg-slate-50">
        {/* Header con gradiente de marca */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 rounded-t-3xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Club BeatsBurgers
                </span>
                {clientTier ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg text-white shadow-sm"
                    style={{ backgroundColor: clientTier.color || "#a855f7" }}
                  >
                    <TierIcon className="w-3 h-3" />
                    {clientTier.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-black/30 text-white border border-white/20">
                    👑 Club VIP
                  </span>
                )}
              </div>

              {loggedClient ? (
                <div className="bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/20">
                  <Coins className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs text-white font-bold">Tus Puntos:</span>
                  <span className="text-sm font-black text-yellow-200">{currentPoints} pts</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="bg-white text-orange-700 hover:bg-white/90 font-black text-xs h-8 rounded-xl shadow-sm"
                >
                  👑 Ingresar / Sumate
                </Button>
              )}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Tienda de Beneficios & Canjes
              </h2>
              <p className="text-xs sm:text-sm text-orange-100 font-medium">
                Cuanto más pedís, mayor es tu rango (Beaters Gold, Select VIP) para acceder a beneficios secretos.
              </p>
            </div>

            {/* Barra de progreso al siguiente rango */}
            {loggedClient && nextTier && (
              <div className="p-3 bg-black/25 backdrop-blur-sm rounded-2xl border border-white/15 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-white">
                  <span>Próximo Rango: <strong className="text-yellow-300">{nextTier.name}</strong></span>
                  <span>{progressPercent}% completado</span>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pestañas Catálogo / Mis Cupones / Escalera de Rangos */}
        <div className="px-6 pt-4 flex gap-4 border-b bg-white overflow-x-auto text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`pb-3 transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "CATALOG"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Gift className="w-4 h-4" /> Catálogo de Premios ({rewards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("COUPONS")}
            className={`pb-3 transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "COUPONS"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Ticket className="w-4 h-4" /> Mis Cupones ({redemptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TIERS_INFO")}
            className={`pb-3 transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "TIERS_INFO"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" /> Escalera de Rangos VIP
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
              <p className="text-xs font-bold">Cargando beneficios...</p>
            </div>
          ) : activeTab === "CATALOG" ? (
            rewards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border text-slate-400 text-xs font-semibold p-6">
                <Gift className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No hay premios disponibles en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {rewards.map((reward) => {
                    const isUnlockedByTier = reward.minTier && clientTier && (clientTier.sequence ?? 0) >= (reward.minTier.sequence ?? 0);
                    const isLockedByTier =
                      reward.minTier &&
                      (!clientTier || (clientTier.sequence ?? 0) < (reward.minTier.sequence ?? 0));
                    const canAfford = currentPoints >= reward.pointsCost;
                    const isRedeeming = redeemingId === reward.id;

                    return (
                      <div
                        key={reward.id}
                        className={`rounded-3xl border p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          isLockedByTier
                            ? "bg-slate-100/80 border-slate-200 opacity-75"
                            : isUnlockedByTier
                              ? "bg-purple-50/30 border-purple-200 hover:border-purple-300 hover:shadow-md"
                              : "bg-white border-slate-200 hover:border-orange-300 hover:shadow-md"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900">{reward.name}</span>
                            {reward.badgeText && (
                              <Badge className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.2">
                                {reward.badgeText}
                              </Badge>
                            )}
                            {reward.minTier && (
                              <span
                                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-2xs flex items-center gap-1"
                                style={{ backgroundColor: reward.minTier.color || "#a855f7" }}
                              >
                                <Crown className="w-2.5 h-2.5" /> Nivel {reward.minTier.name}
                              </span>
                            )}
                            {isUnlockedByTier && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black">
                                ✓ Desbloqueado por tu VIP
                              </Badge>
                            )}
                          </div>

                          {reward.description && (
                            <p className="text-xs text-slate-500 font-medium">{reward.description}</p>
                          )}

                          <div className="flex items-center gap-2 pt-1 text-xs">
                            <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-500" />
                              {reward.pointsCost} Puntos
                            </span>

                            {(reward.type === "PRODUCT" || reward.type === "COMBO") && (
                              <span className="font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Package className="w-3 h-3 text-orange-500" />
                                {reward.value && reward.value > 1 ? `${reward.value} unidades` : "1 unidad"} gratis
                              </span>
                            )}

                            {isLockedByTier && (
                              <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-purple-600" /> Desbloquea al alcanzar {reward.minTier.name}
                              </span>
                            )}
                          </div>
                        </div>

                      {/* Botón Canjear */}
                      <div>
                        {isLockedByTier ? (
                          <Button
                            disabled
                            size="sm"
                            className="w-full sm:w-auto bg-slate-200 text-slate-500 font-bold text-xs h-10 px-4 rounded-2xl cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" /> Bloqueado (Rango VIP)
                          </Button>
                        ) : (
                          <Button
                            disabled={!canAfford || isRedeeming}
                            size="sm"
                            onClick={() => handleRedeem(reward)}
                            className={`w-full sm:w-auto font-black text-xs h-10 px-5 rounded-2xl shadow-sm transition-all ${
                              canAfford
                                ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {isRedeeming ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : canAfford ? (
                              <>
                                <Gift className="w-3.5 h-3.5 mr-1" /> Canjear
                              </>
                            ) : (
                              `Faltan ${reward.pointsCost - currentPoints} pts`
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === "COUPONS" ? (
            /* Tab Mis Cupones */
            redemptions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border text-slate-400 text-xs font-semibold p-6">
                <Ticket className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No tenés cupones canjeados pendientes de uso.
              </div>
            ) : (
              <div className="space-y-3">
                {redemptions.map((red) => {
                  const isProductReward = red.reward?.type === "PRODUCT" || red.reward?.type === "COMBO";
                  const productInCart = items.find((i) => i.rewardRedemptionId === red.id);
                  const isCouponApplied = appliedCoupon?.id === red.id;
                  const qty = red.reward?.value ? Math.max(1, Math.round(red.reward.value)) : 1;

                  return (
                    <div
                      key={red.id}
                      className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-black text-sm text-emerald-950 block">{red.reward?.name}</span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {isProductReward
                            ? `✓ ${qty > 1 ? `${qty} unidades de producto completo gratis` : "Producto completo gratis"} ($0)`
                            : `✓ Descuento del ${red.reward?.type === "PERCENT" ? `${red.reward?.value}%` : `$${red.reward?.value}`}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isProductReward ? (
                          productInCart ? (
                            <Badge className="bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> En tu Carrito ({productInCart.quantity} un.)
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                const prod = red.reward?.product;
                                if (prod) {
                                  addItem({
                                    product: prod,
                                    quantity: qty,
                                    removedIngredients: [],
                                    addedExtras: [],
                                    unitPrice: 0,
                                    notes: `🎁 Premio Canjeado (${red.reward.name})`,
                                    isReward: true,
                                    rewardRedemptionId: red.id,
                                  });
                                  setAppliedCoupon(red);
                                  toast.success(`Se agregaron ${qty > 1 ? `${qty} unidades` : "1 unidad"} de "${prod.name}" a tu carrito.`);
                                } else {
                                  toast.error("El producto del premio no está disponible.");
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 px-3.5 rounded-xl shadow-sm shrink-0"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Agregar al Carrito ($0)
                            </Button>
                          )
                        ) : isCouponApplied ? (
                          <Badge className="bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Descuento Aplicado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setAppliedCoupon(red);
                              toast.success(`Se aplicó el cupón "${red.reward?.name}" al carrito.`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 px-3.5 rounded-xl shadow-sm shrink-0"
                          >
                            <Ticket className="w-3.5 h-3.5 mr-1" /> Aplicar al Carrito
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Tab Escalera de Rangos VIP */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-black text-sm text-amber-950">¿Cómo funciona el Ranking de Membresías?</h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Cada vez que hacés un pedido con tu teléfono, sumás pedidos, gasto y puntos. El sistema te asciende automáticamente de nivel para que disfrutes de mayores beneficios.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {tiers.map((t, idx) => {
                  const IconComp = TIER_ICONS[t.iconName] || Crown;
                  const isCurrent = clientTier?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-3xl border transition-all ${
                        isCurrent
                          ? "bg-white border-orange-400 shadow-md ring-2 ring-orange-500/20"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                            style={{ backgroundColor: t.color || "#f97316" }}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-base text-slate-900">{t.name}</h4>
                              <span
                                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-2xs"
                                style={{ backgroundColor: t.color || "#f97316" }}
                              >
                                {t.badgeText}
                              </span>
                              {isCurrent && (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  ✓ Tu Rango Actual
                                </Badge>
                              )}
                            </div>
                            {t.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">Requisitos:</span>
                          <span className="font-bold text-slate-800">
                            {t.minOrdersCount > 0 ? `${t.minOrdersCount} pedidos` : "Sin mínimo"}
                            {t.minSpent > 0 ? ` · $${t.minSpent.toLocaleString("es-AR")}` : ""}
                            {t.minPoints > 0 ? ` · ${t.minPoints} pts` : ""}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-purple-950">
                          <span className="text-[10px] font-black uppercase text-purple-700 block">Beneficios VIP:</span>
                          <span className="font-black text-purple-900">
                            {t.pointsMultiplier}x en puntos
                            {t.discountPercent > 0 ? ` · ${t.discountPercent}% OFF extra` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
