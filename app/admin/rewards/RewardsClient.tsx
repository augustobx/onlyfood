"use client";

import { useState } from "react";
import {
  Gift,
  PlusCircle,
  Trash2,
  Edit2,
  Sparkles,
  UserCheck,
  Coins,
  Loader2,
  Crown,
  Flame,
  Star,
  Trophy,
  Zap,
  Shield,
  Lock,
  TrendingUp,
  Award,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  savePointReward,
  deletePointReward,
  togglePointsCatalog,
  saveCustomerTier,
  deleteCustomerTier,
  adminAssignRewardToClient,
  adminAdjustClientPoints,
  fetchCustomerRanking,
} from "@/app/actions/admin-rewards";

interface RewardsClientProps {
  initialRewards: any[];
  products: any[];
  initialTiers: any[];
  initialRanking: any[];
  isPointsCatalogActive: boolean;
}

const TIER_ICONS: Record<string, any> = {
  Crown,
  Flame,
  Star,
  Trophy,
  Zap,
  Award,
  Shield,
};

export function RewardsClient({
  initialRewards,
  products,
  initialTiers,
  initialRanking,
  isPointsCatalogActive,
}: RewardsClientProps) {
  const [activeTab, setActiveTab] = useState<"REWARDS" | "TIERS" | "RANKING">("REWARDS");

  const [rewards, setRewards] = useState<any[]>(initialRewards);
  const [tiers, setTiers] = useState<any[]>(initialTiers);
  const [ranking, setRanking] = useState<any[]>(initialRanking);
  const [isCatalogActive, setIsCatalogActive] = useState(isPointsCatalogActive);
  const [isUpdatingCatalog, setIsUpdatingCatalog] = useState(false);
  const [isRefreshingRanking, setIsRefreshingRanking] = useState(false);

  // Modal Crear / Editar Recompensa
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any | null>(null);
  const [isSavingReward, setIsSavingReward] = useState(false);

  const [rewardForm, setRewardForm] = useState({
    id: "",
    name: "",
    description: "",
    pointsCost: 100,
    type: "PERCENT" as "PRODUCT" | "PERCENT" | "AMOUNT" | "COMBO" | "PROMO",
    value: 10,
    productId: "",
    badgeText: "",
    minTierId: "none",
    isActive: true,
    sequence: 1,
  });

  // Modal Crear / Editar Nivel e Insignia (CustomerTier)
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any | null>(null);
  const [isSavingTier, setIsSavingTier] = useState(false);

  const [tierForm, setTierForm] = useState({
    id: "",
    name: "",
    badgeText: "VIP",
    minOrdersCount: 0,
    minPoints: 0,
    minSpent: 0,
    discountPercent: 0,
    pointsMultiplier: 1.0,
    color: "#f97316",
    bgGradient: "from-amber-500 to-yellow-600",
    iconName: "Crown",
    description: "",
    sequence: 1,
    isActive: true,
  });

  // Modal Asignar Premio a Cliente
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Modal Ajustar Puntos Manual
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [adjustClient, setAdjustClient] = useState<any | null>(null);
  const [pointsDelta, setPointsDelta] = useState(100);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // ══════════════════════════════════════════════════════════
  // REWARDS HANDLERS
  // ══════════════════════════════════════════════════════════

  const handleToggleCatalog = async () => {
    setIsUpdatingCatalog(true);
    const nextState = !isCatalogActive;
    try {
      const res = await togglePointsCatalog(nextState);
      if (res.success) {
        setIsCatalogActive(nextState);
        toast.success(nextState ? "Catálogo de Canjes ACTIVADO en la PWA" : "Catálogo de Canjes DESACTIVADO en la PWA");
      } else {
        toast.error("Error", { description: res.error });
      }
    } finally {
      setIsUpdatingCatalog(false);
    }
  };

  const openCreateReward = () => {
    setEditingReward(null);
    setRewardForm({
      id: "",
      name: "",
      description: "",
      pointsCost: 100,
      type: "PERCENT",
      value: 10,
      productId: products[0]?.id || "",
      badgeText: "",
      minTierId: "none",
      isActive: true,
      sequence: rewards.length + 1,
    });
    setIsRewardModalOpen(true);
  };

  const openEditReward = (reward: any) => {
    setEditingReward(reward);
    setRewardForm({
      id: reward.id,
      name: reward.name,
      description: reward.description || "",
      pointsCost: reward.pointsCost,
      type: reward.type,
      value: reward.value ?? (reward.type === "PRODUCT" || reward.type === "COMBO" ? 1 : 0),
      productId: reward.productId || products[0]?.id || "",
      badgeText: reward.badgeText || "",
      minTierId: reward.minTierId || "none",
      isActive: reward.isActive,
      sequence: reward.sequence || 1,
    });
    setIsRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingReward(true);

    try {
      const payload = {
        id: rewardForm.id || undefined,
        name: rewardForm.name,
        description: rewardForm.description || null,
        pointsCost: Number(rewardForm.pointsCost),
        type: rewardForm.type,
        value:
          rewardForm.type === "PERCENT" || rewardForm.type === "AMOUNT"
            ? Number(rewardForm.value)
            : rewardForm.type === "PRODUCT" || rewardForm.type === "COMBO"
              ? Math.max(1, Math.round(Number(rewardForm.value) || 1))
              : null,
        productId: rewardForm.type === "PRODUCT" || rewardForm.type === "COMBO" ? rewardForm.productId : null,
        badgeText: rewardForm.badgeText || null,
        minTierId: rewardForm.minTierId === "none" ? null : rewardForm.minTierId,
        isActive: rewardForm.isActive,
        sequence: Number(rewardForm.sequence),
      };

      const res = await savePointReward(payload);
      if (res.success) {
        toast.success(rewardForm.id ? "Recompensa actualizada" : "Recompensa creada exitosamente");
        setIsRewardModalOpen(false);
        const updatedTier = tiers.find((t) => t.id === payload.minTierId) || null;
        if (rewardForm.id) {
          setRewards((prev) =>
            prev.map((r) => (r.id === rewardForm.id ? { ...r, ...payload, minTier: updatedTier } : r))
          );
        } else {
          setRewards((prev) => [...prev, { ...payload, id: `temp-${Date.now()}`, minTier: updatedTier }]);
        }
      } else {
        toast.error("Error al guardar", { description: res.error });
      }
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta recompensa del catálogo?")) return;
    const res = await deletePointReward(id);
    if (res.success) {
      toast.success("Recompensa eliminada");
      setRewards((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Error al eliminar", { description: res.error });
    }
  };

  // ══════════════════════════════════════════════════════════
  // CUSTOMER TIERS HANDLERS
  // ══════════════════════════════════════════════════════════

  const openCreateTier = () => {
    setEditingTier(null);
    setTierForm({
      id: "",
      name: "",
      badgeText: "VIP",
      minOrdersCount: 0,
      minPoints: 0,
      minSpent: 0,
      discountPercent: 0,
      pointsMultiplier: 1.0,
      color: "#a855f7",
      bgGradient: "from-purple-600 to-pink-600",
      iconName: "Crown",
      description: "",
      sequence: tiers.length + 1,
      isActive: true,
    });
    setIsTierModalOpen(true);
  };

  const openEditTier = (tier: any) => {
    setEditingTier(tier);
    setTierForm({
      id: tier.id,
      name: tier.name,
      badgeText: tier.badgeText || "VIP",
      minOrdersCount: tier.minOrdersCount || 0,
      minPoints: tier.minPoints || 0,
      minSpent: tier.minSpent || 0,
      discountPercent: tier.discountPercent || 0,
      pointsMultiplier: tier.pointsMultiplier || 1.0,
      color: tier.color || "#f97316",
      bgGradient: tier.bgGradient || "from-amber-500 to-yellow-600",
      iconName: tier.iconName || "Crown",
      description: tier.description || "",
      sequence: tier.sequence || 1,
      isActive: tier.isActive,
    });
    setIsTierModalOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTier(true);

    try {
      const payload = {
        id: tierForm.id || undefined,
        name: tierForm.name,
        badgeText: tierForm.badgeText.toUpperCase(),
        minOrdersCount: Number(tierForm.minOrdersCount),
        minPoints: Number(tierForm.minPoints),
        minSpent: Number(tierForm.minSpent),
        discountPercent: Number(tierForm.discountPercent),
        pointsMultiplier: Number(tierForm.pointsMultiplier),
        color: tierForm.color,
        bgGradient: tierForm.bgGradient,
        iconName: tierForm.iconName,
        description: tierForm.description || null,
        sequence: Number(tierForm.sequence),
        isActive: tierForm.isActive,
      };

      const res = await saveCustomerTier(payload);
      if (res.success) {
        toast.success(tierForm.id ? "Nivel actualizado" : "Nivel creado exitosamente");
        setIsTierModalOpen(false);
        if (tierForm.id) {
          setTiers((prev) => prev.map((t) => (t.id === tierForm.id ? { ...t, ...payload } : t)));
        } else {
          setTiers((prev) => [...prev, { ...payload, id: `tier-${Date.now()}` }]);
        }
        void refreshRanking();
      } else {
        toast.error("Error al guardar nivel", { description: res.error });
      }
    } finally {
      setIsSavingTier(false);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este nivel? Los clientes y premios vinculados pasarán al nivel básico.")) return;
    const res = await deleteCustomerTier(id);
    if (res.success) {
      toast.success("Nivel eliminado");
      setTiers((prev) => prev.filter((t) => t.id !== id));
      void refreshRanking();
    } else {
      toast.error("Error al eliminar", { description: res.error });
    }
  };

  const refreshRanking = async () => {
    setIsRefreshingRanking(true);
    try {
      const res = await fetchCustomerRanking();
      if (res.success && res.ranking) {
        setRanking(res.ranking);
        toast.success("Ranking actualizado");
      }
    } finally {
      setIsRefreshingRanking(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // ASSIGN & ADJUST POINTS HANDLERS
  // ══════════════════════════════════════════════════════════

  const openAssignModal = (client: any) => {
    setSelectedClient(client);
    setSelectedRewardId(rewards[0]?.id || "");
    setIsAssignModalOpen(true);
  };

  const handleAssignReward = async () => {
    if (!selectedClient || !selectedRewardId) return;
    setIsAssigning(true);
    try {
      const res = await adminAssignRewardToClient(selectedClient.id, selectedRewardId);
      if (res.success) {
        toast.success("Premio asignado con éxito");
        setIsAssignModalOpen(false);
        void refreshRanking();
      } else {
        toast.error("Error al asignar premio", { description: res.error });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const openPointsModal = (client: any) => {
    setAdjustClient(client);
    setPointsDelta(100);
    setIsPointsModalOpen(true);
  };

  const handleSavePoints = async () => {
    if (!adjustClient) return;
    setIsAdjusting(true);
    try {
      const res = await adminAdjustClientPoints(adjustClient.id, pointsDelta);
      if (res.success) {
        toast.success("Saldo de puntos actualizado");
        setIsPointsModalOpen(false);
        void refreshRanking();
      } else {
        toast.error("Error al ajustar puntos", { description: res.error });
      }
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ TOP TABS & SWITCH BAR ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("REWARDS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "REWARDS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gift className="w-4 h-4 text-orange-500" />
            Catálogo de Premios ({rewards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TIERS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "TIERS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Crown className="w-4 h-4 text-purple-600" />
            Niveles e Insignias ({tiers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RANKING")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "RANKING" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Ranking de Compradores ({ranking.length})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border">
            <span className="text-xs font-bold text-slate-700">Catálogo PWA:</span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                isCatalogActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
              }`}
            >
              {isCatalogActive ? "ACTIVO" : "PAUSADO"}
            </span>
            <Switch checked={isCatalogActive} disabled={isUpdatingCatalog} onCheckedChange={handleToggleCatalog} />
          </div>

          {activeTab === "REWARDS" && (
            <Button
              onClick={openCreateReward}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs h-9 rounded-xl shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> + Nuevo Premio
            </Button>
          )}

          {activeTab === "TIERS" && (
            <Button
              onClick={openCreateTier}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs h-9 rounded-xl shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> + Nuevo Nivel VIP
            </Button>
          )}

          {activeTab === "RANKING" && (
            <Button
              variant="outline"
              onClick={refreshRanking}
              disabled={isRefreshingRanking}
              className="text-xs font-bold h-9 rounded-xl border-slate-200"
            >
              {isRefreshingRanking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <TrendingUp className="w-3.5 h-3.5 mr-1 text-orange-600" />}
              Actualizar Ranking
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: REWARDS CATALOG
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "REWARDS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const reqTier = tiers.find((t) => t.id === reward.minTierId) || reward.minTier;
              return (
                <Card
                  key={reward.id}
                  className="rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden bg-white flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-base text-slate-900 leading-snug">{reward.name}</span>
                        </div>
                        {reward.badgeText && (
                          <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                            {reward.badgeText}
                          </span>
                        )}
                      </div>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-xs px-2.5 py-1 rounded-xl shrink-0">
                        🪙 {reward.pointsCost} pts
                      </Badge>
                    </div>

                    {reward.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{reward.description}</p>
                    )}

                    {/* Exclusivity Badge if applicable */}
                    {reqTier ? (
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-bold">
                        <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Exclusivo para: <strong className="font-black text-purple-700">{reqTier.name}</strong></span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium">Disponible para todos los clientes</div>
                    )}

                    {(reward.type === "PRODUCT" || reward.type === "COMBO") && (
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-orange-950 font-bold">
                        <Package className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>
                          Premio: <strong>{reward.value && reward.value > 1 ? `${reward.value}x ` : "1x "}{reward.product?.name || "Producto"}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditReward(reward)}
                        className="h-8 text-xs font-bold text-slate-700 hover:text-slate-900"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteReward(reward.id)}
                        className="h-8 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                      </Button>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {reward._count?.redemptions || 0} canjes
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: CUSTOMER TIERS & BADGES (BEATERS SELECT / GOLD)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "TIERS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier, idx) => {
              const IconComponent = TIER_ICONS[tier.iconName] || Crown;
              return (
                <Card
                  key={tier.id}
                  className="rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden bg-white flex flex-col justify-between relative"
                >
                  <div className="p-5 space-y-4">
                    {/* Header with Icon and Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                          style={{ backgroundColor: tier.color }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-slate-900 leading-tight">{tier.name}</h3>
                          <span
                            className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white mt-1 shadow-2xs"
                            style={{ backgroundColor: tier.color }}
                          >
                            INSIGNIA: {tier.badgeText}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        #{tier.sequence || idx + 1}
                      </span>
                    </div>

                    {tier.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{tier.description}</p>
                    )}

                    {/* Requirements box */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Requisitos de Desbloqueo:</span>
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Mínimo de compras:</span>
                        <span className="text-slate-900">{tier.minOrdersCount > 0 ? `${tier.minOrdersCount} pedidos` : "Sin mínimo"}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Total gastado:</span>
                        <span className="text-slate-900">{tier.minSpent > 0 ? `$${tier.minSpent.toLocaleString("es-AR")}` : "Sin mínimo"}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>Puntos acumulados:</span>
                        <span className="text-slate-900">{tier.minPoints > 0 ? `${tier.minPoints} pts` : "Sin mínimo"}</span>
                      </div>
                    </div>

                    {/* Benefits box */}
                    <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1.5 text-purple-950">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">Beneficios de Membresía:</span>
                      <div className="flex justify-between font-bold">
                        <span>Multiplicador de puntos:</span>
                        <span className="font-black text-purple-700">{tier.pointsMultiplier}x puntos</span>
                      </div>
                      {tier.discountPercent > 0 && (
                        <div className="flex justify-between font-bold">
                          <span>Descuento automático:</span>
                          <span className="font-black text-emerald-600">{tier.discountPercent}% OFF</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold">
                        <span>Premios exclusivos asociados:</span>
                        <span className="font-black text-purple-700">{tier._count?.rewards || 0} premios</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditTier(tier)}
                        className="h-8 text-xs font-bold text-slate-700 hover:text-slate-900"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar Nivel
                      </Button>
                      {tiers.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTier(tier.id)}
                          className="h-8 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                        </Button>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{tier._count?.clients || 0} miembros</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: CUSTOMER RANKING / LEADERBOARD
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "RANKING" && (
        <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Tabla de Posiciones y Mejores Compradores
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Los clientes ascienden automáticamente de nivel al cumplir con los requisitos de compras y puntos.
              </CardDescription>
            </div>
            <Badge className="bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-xl">
              {ranking.length} Clientes Activos
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4"># Puesto</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Insignia / Nivel</th>
                  <th className="py-3 px-4 text-center">Compras</th>
                  <th className="py-3 px-4 text-right">Total Gastado</th>
                  <th className="py-3 px-4 text-right">Puntos</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {ranking.map((item) => {
                  const TierIcon = item.tier?.iconName ? TIER_ICONS[item.tier.iconName] || Crown : Crown;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {item.rank === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs">
                            🥇
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-black text-xs shadow-xs">
                            🥈
                          </span>
                        ) : item.rank === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold px-2">#{item.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.tier ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg text-white shadow-2xs"
                            style={{ backgroundColor: item.tier.color || "#f97316" }}
                          >
                            <TierIcon className="w-3 h-3" />
                            {item.tier.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Sin nivel</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-900">{item.ordersCount}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ${item.totalSpent.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-amber-600">
                        🪙 {item.points.toLocaleString("es-AR")} pts
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignModal(item)}
                            className="h-7 px-2 text-[11px] font-bold rounded-lg border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                          >
                            <Gift className="w-3 h-3 mr-1 text-orange-500" /> Premiar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPointsModal(item)}
                            className="h-7 px-2 text-[11px] font-bold rounded-lg text-slate-600 hover:text-slate-900"
                          >
                            <Coins className="w-3 h-3 mr-1 text-amber-500" /> Puntos
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR RECOMPENSA
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isRewardModalOpen} onOpenChange={setIsRewardModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-600" />
              {rewardForm.id ? "Editar Recompensa" : "Nueva Recompensa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configurá los puntos requeridos y si es exclusiva para miembros de un nivel específico.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveReward} className="space-y-3.5 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Título de la Recompensa</Label>
              <Input
                required
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="ej: 20% OFF en tu próxima Burger"
                className="h-9 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Costo en Puntos (🪙)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: Number(e.target.value) })}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Tipo de Beneficio</Label>
                <Select
                  value={rewardForm.type}
                  onValueChange={(val: any) => setRewardForm({ ...rewardForm, type: val ?? "PERCENT" })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Porcentaje (% Descuento)</SelectItem>
                    <SelectItem value="AMOUNT">Monto Fijo ($ Descuento)</SelectItem>
                    <SelectItem value="PRODUCT">Producto Gratis</SelectItem>
                    <SelectItem value="COMBO">Combo Gratis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(rewardForm.type === "PERCENT" || rewardForm.type === "AMOUNT") && (
              <div>
                <Label className="text-xs font-bold">
                  {rewardForm.type === "PERCENT" ? "Porcentaje de Descuento (%)" : "Monto en Pesos ($)"}
                </Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={rewardForm.value}
                  onChange={(e) => setRewardForm({ ...rewardForm, value: Number(e.target.value) })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            )}

            {(rewardForm.type === "PRODUCT" || rewardForm.type === "COMBO") && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold">Producto Asignado</Label>
                  <Select
                    value={rewardForm.productId}
                    onValueChange={(val: string | null) => setRewardForm({ ...rewardForm, productId: val ?? "" })}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (${p.basePrice})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Cantidad de Unidades del Premio</Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={rewardForm.value || 1}
                    onChange={(e) => setRewardForm({ ...rewardForm, value: Math.max(1, Number(e.target.value)) })}
                    placeholder="ej. 5 bowls, 2 burgers..."
                    className="h-9 text-xs mt-1"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Se agregarán estas unidades como productos completos con costo $0 directamente al carrito del cliente.
                  </p>
                </div>
              </div>
            )}

            {/* Selector de Nivel Mínimo Exclusivo (CustomerTier) */}
            <div>
              <Label className="text-xs font-bold flex items-center gap-1 text-purple-900">
                <Crown className="w-3.5 h-3.5 text-purple-600" />
                Nivel Mínimo Requerido (Exclusividad)
              </Label>
              <Select
                value={rewardForm.minTierId}
                onValueChange={(val: string | null) => setRewardForm({ ...rewardForm, minTierId: val ?? "none" })}
              >
                <SelectTrigger className="h-9 text-xs mt-1 bg-purple-50/50 border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">🌐 Para todos los clientes (Sin restricción)</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      👑 Solo {t.name} (Insignia {t.badgeText})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">
                Si seleccionás un nivel, los clientes de categorías inferiores verán el premio bloqueado con un candado y la explicación de cómo ascender.
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold">Descripción (Opcional)</Label>
              <Textarea
                rows={2}
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Válido para pedidos online..."
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsRewardModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingReward}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 px-4 rounded-xl"
              >
                {isSavingReward ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Recompensa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR NIVEL E INSIGNIA (CUSTOMERTIER)
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isTierModalOpen} onOpenChange={setIsTierModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              {tierForm.id ? "Editar Nivel e Insignia" : "Nuevo Nivel de Membresía"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Personalizá el nombre, la insignia visual y los requisitos que deben cumplir los clientes para alcanzar este rango.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTier} className="space-y-3.5 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Nombre del Rango</Label>
                <Input
                  required
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="ej: Beaters Select"
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Texto de la Insignia</Label>
                <Input
                  required
                  value={tierForm.badgeText}
                  onChange={(e) => setTierForm({ ...tierForm, badgeText: e.target.value.toUpperCase() })}
                  placeholder="ej: SELECT VIP"
                  className="h-9 text-xs mt-1 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Color del Nivel (Hex)</Label>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="color"
                    value={tierForm.color}
                    onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                    className="w-9 h-9 rounded-xl border p-0.5 cursor-pointer"
                  />
                  <Input
                    value={tierForm.color}
                    onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold">Ícono Visual</Label>
                <Select
                  value={tierForm.iconName}
                  onValueChange={(val: string | null) => setTierForm({ ...tierForm, iconName: val ?? "Crown" })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crown">👑 Corona (Crown)</SelectItem>
                    <SelectItem value="Flame">🔥 Fuego (Flame)</SelectItem>
                    <SelectItem value="Star">⭐ Estrella (Star)</SelectItem>
                    <SelectItem value="Trophy">🏆 Trofeo (Trophy)</SelectItem>
                    <SelectItem value="Zap">⚡ Rayo (Zap)</SelectItem>
                    <SelectItem value="Award">🎖️ Medalla (Award)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Requisitos de ascensión */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                Requisitos para alcanzar este nivel:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-bold">Mín. Pedidos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tierForm.minOrdersCount}
                    onChange={(e) => setTierForm({ ...tierForm, minOrdersCount: Number(e.target.value) })}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Mín. Gastado ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tierForm.minSpent}
                    onChange={(e) => setTierForm({ ...tierForm, minSpent: Number(e.target.value) })}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Mín. Puntos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tierForm.minPoints}
                    onChange={(e) => setTierForm({ ...tierForm, minPoints: Number(e.target.value) })}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Podés dejar en 0 cualquiera de los requisitos que no desees aplicar.
              </p>
            </div>

            {/* Beneficios automáticos */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 block">
                Beneficios Automáticos de este Rango:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-purple-900">Multiplicador de Puntos</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={1.0}
                    max={10.0}
                    value={tierForm.pointsMultiplier}
                    onChange={(e) => setTierForm({ ...tierForm, pointsMultiplier: Number(e.target.value) })}
                    className="h-8 text-xs mt-0.5"
                  />
                  <span className="text-[9px] text-purple-700">ej: 1.5 suma 50% más de puntos</span>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-purple-900">Descuento Automático (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tierForm.discountPercent}
                    onChange={(e) => setTierForm({ ...tierForm, discountPercent: Number(e.target.value) })}
                    className="h-8 text-xs mt-0.5"
                  />
                  <span className="text-[9px] text-purple-700">Descuento aplicado en checkout</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Descripción pública del nivel</Label>
              <Textarea
                rows={2}
                value={tierForm.description}
                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                placeholder="Acceso exclusivo a premios secretos y multiplicador de puntos..."
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsTierModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingTier}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 rounded-xl"
              >
                {isSavingTier ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Nivel"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          MODAL: ASIGNAR PREMIO A CLIENTE
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-600" />
              Asignar Premio a Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Otorgá un beneficio directo a {selectedClient?.name || selectedClient?.phone}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Seleccionar Premio</Label>
              <Select value={selectedRewardId} onValueChange={(val: string | null) => setSelectedRewardId(val ?? "")}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rewards.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.pointsCost} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isAssigning}
                onClick={handleAssignReward}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 px-4 rounded-xl"
              >
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Asignar Cupón"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          MODAL: AJUSTAR PUNTOS MANUAL
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isPointsModalOpen} onOpenChange={setIsPointsModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Ajustar Puntos Manualmente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cliente: {adjustClient?.name || adjustClient?.phone} (Saldo actual: {adjustClient?.points || 0} pts)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Puntos a Sumar / Restar</Label>
              <Input
                type="number"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(Number(e.target.value))}
                placeholder="ej: 100 para sumar, -50 para restar"
                className="h-9 text-xs mt-1 font-bold"
              />
              <span className="text-[10px] text-slate-500">Usá números negativos para descontar puntos.</span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsPointsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isAdjusting}
                onClick={handleSavePoints}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-9 px-4 rounded-xl"
              >
                {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Puntos"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
