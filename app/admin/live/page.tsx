"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Navigation,
  Phone,
  AlertCircle,
  Trash2,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle,
  Truck,
  PackageX,
  Loader2,
  RefreshCw,
  ChefHat,
  PlusCircle,
  Power,
  PowerOff,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Search,
  Zap,
  Calendar as CalendarIcon,
  Eye,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  PackageCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateOrderStatus, assignMessenger, dispatchMessengerRoadmap, reconcilePendingMercadoPagoOrders } from "@/app/actions/admin-orders";
import { setStoreOpen, updateSlotAvailable, setModuleState } from "@/app/actions/admin-settings";
import { printOrderNow } from "@/app/actions/admin-printing";
import { AnimatePresence, motion } from "framer-motion";
import { AdminOrderComposer } from "./AdminOrderComposer";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";

function getTimeElapsed(createdAt: string | Date): { text: string; isUrgent: boolean; isWarning: boolean } {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));

  if (diffMinutes < 1) return { text: "Recién", isUrgent: false, isWarning: false };
  if (diffMinutes < 60) {
    return {
      text: `${diffMinutes}m`,
      isUrgent: diffMinutes >= 25,
      isWarning: diffMinutes >= 15 && diffMinutes < 25,
    };
  }
  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return {
    text: `${hours}h ${remainingMins}m`,
    isUrgent: true,
    isWarning: false,
  };
}

function deliveryTimeInMinutes(value: unknown) {
  if (typeof value !== "string") return Number.POSITIVE_INFINITY;
  const match = value.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

function compareByDeliveryTime(a: any, b: any) {
  const timeDifference = deliveryTimeInMinutes(a.deliveryTime) - deliveryTimeInMinutes(b.deliveryTime);
  if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference;
  if (Number.isFinite(deliveryTimeInMinutes(a.deliveryTime)) !== Number.isFinite(deliveryTimeInMinutes(b.deliveryTime))) {
    return Number.isFinite(deliveryTimeInMinutes(a.deliveryTime)) ? -1 : 1;
  }
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export default function LiveDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [messengers, setMessengers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOrderComposerOpen, setIsOrderComposerOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean | null>(null);
  const [updatingStoreState, setUpdatingStoreState] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCancelledOpen, setIsCancelledOpen] = useState(false);
  const [dispatchFilter, setDispatchFilter] = useState<"ALL" | "DELIVERY" | "PICKUP">("ALL");

  const [moduleStates, setModuleStates] = useState<{
    allowImmediateOrders: boolean;
    allowScheduledTomorrow: boolean;
    allowAdvanceOrders: boolean;
  }>({
    allowImmediateOrders: true,
    allowScheduledTomorrow: true,
    allowAdvanceOrders: true,
  });
  const [updatingModule, setUpdatingModule] = useState<string | null>(null);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasLoadedOrdersRef = useRef(false);
  const knownOrderIdsRef = useRef(new Set<string>());
  const lastPaymentReconcileRef = useRef(0);
  const autoPrintRef = useRef(false);
  const printedOrdersRef = useRef(new Set<string>());

  const ensureAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
  }, []);

  useEffect(() => {
    const enabled = localStorage.getItem("adminSoundAlertsEnabled") !== "false";
    setIsMonitoring(enabled);
    if (!enabled) return;
    const unlockAudio = () => void ensureAudio();
    void ensureAudio();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [ensureAudio]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (Date.now() - lastPaymentReconcileRef.current >= 30_000) {
          lastPaymentReconcileRef.current = Date.now();
          void reconcilePendingMercadoPagoOrders().then((result) => {
            if (result.success && result.updated > 0) setRefreshKey((key) => key + 1);
          }).catch((error) => console.error("Payment reconciliation failed", error));
        }
        const [ordersRes, messengersRes, configRes, slotsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/messengers"),
          fetch("/api/config"),
          fetch("/api/slots")
        ]);

        if (configRes.ok) {
          const nextConfig = await configRes.json();
          autoPrintRef.current = Boolean(nextConfig.autoPrintTickets && nextConfig.printingMode === "BROWSER");
          setIsStoreOpen(Boolean(nextConfig.isStoreOpen));
          setModuleStates({
            allowImmediateOrders: nextConfig.allowImmediateOrders !== false,
            allowScheduledTomorrow: nextConfig.allowScheduledTomorrow !== false,
            allowAdvanceOrders: nextConfig.allowAdvanceOrders !== false,
          });
        }

        if (ordersRes.ok) {
          const newOrders = await ordersRes.json();
          setOrders(newOrders);

          const arrivingOrders = newOrders.filter((order: any) => order.status === "NEW" && !knownOrderIdsRef.current.has(order.id));

          if (hasLoadedOrdersRef.current && isMonitoring && arrivingOrders.length > 0) {
            playAlert();
            if (autoPrintRef.current) {
              const unseen = arrivingOrders.filter((order: any) => !printedOrdersRef.current.has(order.id));
              unseen.forEach((order: any) => {
                printedOrdersRef.current.add(order.id);
                window.open(`/admin/live/print/${order.id}`, "_blank", "noopener,noreferrer");
              });
            }
          }
          knownOrderIdsRef.current = new Set(newOrders.map((order: any) => order.id));
          hasLoadedOrdersRef.current = true;
        }

        if (messengersRes.ok) setMessengers(await messengersRes.json());
        if (slotsRes.ok) setSlots(await slotsRes.json());

      } catch (err) {
        console.error("Polling error", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isMonitoring, refreshKey, ensureAudio]);

  const toggleSoundAlerts = () => {
    if (isMonitoring) {
      localStorage.setItem("adminSoundAlertsEnabled", "false");
      setIsMonitoring(false);
      toast.info("Alertas de sonido desactivadas");
    } else {
      localStorage.setItem("adminSoundAlertsEnabled", "true");
      void ensureAudio();
      setIsMonitoring(true);
      toast.success("Alertas de sonido activadas");
    }
  };

  function playAlert() {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    const osc = audioCtxRef.current.createOscillator();
    const gainNode = audioCtxRef.current.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtxRef.current.currentTime);
    osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.6);
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrderForModal?.id === orderId) {
          setSelectedOrderForModal((prev: any) => ({ ...prev, status: newStatus }));
        }
        toast.success(`Estado actualizado a: ${newStatus}`);
      } else {
        toast.error("No se pudo actualizar", { description: result.error, duration: 6000 });
        setRefreshKey(key => key + 1);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePrintOrder = async (orderId: string) => {
    setPrintingOrderId(orderId);
    try {
      const result = await printOrderNow(orderId);
      if (!result.success) {
        toast.error("No se pudo imprimir", { description: result.error });
        return;
      }
      if (result.mode === "BROWSER") window.open(result.url, "_blank", "width=340,height=600");
      else {
        toast.success("Tickets enviados a impresora");
        setRefreshKey(key => key + 1);
      }
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleMessengerChange = async (orderId: string, messengerId: string) => {
    const result = await assignMessenger(orderId, messengerId === "none" ? null : messengerId);
    if (result.success) {
      const messenger = messengers.find(m => m.id === messengerId) || null;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, messenger, messengerId: messenger?.id || null } : o));
      if (selectedOrderForModal?.id === orderId) {
        setSelectedOrderForModal((prev: any) => ({ ...prev, messenger, messengerId: messenger?.id || null }));
      }
      toast.success("Repartidor asignado");
    }
  };

  const handleStoreStateChange = async () => {
    if (isStoreOpen === null || updatingStoreState) return;
    const nextState = !isStoreOpen;
    setUpdatingStoreState(true);
    try {
      const result = await setStoreOpen(nextState);
      if (result.success && typeof result.isStoreOpen === "boolean") {
        setIsStoreOpen(result.isStoreOpen);
        toast.success(result.isStoreOpen ? "Local Abierto (Recibiendo pedidos)" : "Local Cerrado");
      }
    } finally {
      setUpdatingStoreState(false);
    }
  };

  const handleToggleModule = async (moduleName: "IMMEDIATE" | "TOMORROW" | "ADVANCE", nextVal: boolean) => {
    setUpdatingModule(moduleName);
    const key = moduleName === "IMMEDIATE" ? "allowImmediateOrders" : moduleName === "TOMORROW" ? "allowScheduledTomorrow" : "allowAdvanceOrders";
    setModuleStates(prev => ({ ...prev, [key]: nextVal }));
    try {
      const res = await setModuleState(moduleName, nextVal);
      if (res.success) {
        const title = moduleName === "IMMEDIATE" ? "Pedidos Inmediatos" : moduleName === "TOMORROW" ? "Pedidos Mañana" : "Pedidos por Encargo";
        toast.success(`${title} ${nextVal ? "activados" : "pausados"}`);
      } else {
        toast.error("Error al actualizar módulo", { description: res.error });
        setRefreshKey(k => k + 1);
      }
    } finally {
      setUpdatingModule(null);
    }
  };

  const handleSlotChange = async (slotId: string, delta: number) => {
    if (updatingSlotId === slotId) return;
    setUpdatingSlotId(slotId);
    try {
      const result = await updateSlotAvailable(slotId, delta);
      if (result.success && result.slot) {
        setSlots((current) => current.map((slot) => slot.id === slotId ? result.slot : slot));
      }
    } finally {
      setUpdatingSlotId(null);
    }
  };

  const dispatchRoadmap = async (messengerId: string) => {
    const result = await dispatchMessengerRoadmap(messengerId);
    if (result.success) {
      toast.success("Enviado. Abriendo WhatsApp...");
      const cadete = messengers.find(m => m.id === messengerId);
      const phone = cadete?.phone.replace(/\D/g, "") || "";
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(result.text || "")}`;
      window.open(url, "_blank");
      setOrders(prev => prev.map(o => (o.messengerId === messengerId && o.status === "PENDING_DELIVERY") ? { ...o, status: "OUT_FOR_DELIVERY" } : o));
    } else {
      toast.error("Error", { description: result.error });
    }
  };

  // Helper date checker
  const isSameDayDate = (d1?: string | Date | null, d2: Date = new Date()) => {
    if (!d1) return false;
    const a = new Date(d1);
    return a.getFullYear() === d2.getFullYear() && a.getMonth() === d2.getMonth() && a.getDate() === d2.getDate();
  };

  // Filter orders for TODAY
  const todayOrders = useMemo(() => {
    return orders.filter((o: any) => {
      if (o.orderType === "SCHEDULED_TOMORROW") return false;
      if (o.orderType === "CUSTOM_DATE" && !isSameDayDate(o.scheduledDate, new Date())) return false;
      return true;
    });
  }, [orders]);

  // Apply search query
  const filteredTodayOrders = useMemo(() => {
    if (!searchQuery.trim()) return [...todayOrders].sort(compareByDeliveryTime);
    const q = searchQuery.toLowerCase();
    return todayOrders.filter((o: any) => {
      return (
        o.clientName?.toLowerCase().includes(q) ||
        o.clientPhone?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.items?.some((it: any) => it.product?.name?.toLowerCase().includes(q))
      );
    }).sort(compareByDeliveryTime);
  }, [todayOrders, searchQuery]);

  // Operational Stages Categorization (4 distinct streams)
  const stageNew = filteredTodayOrders.filter((o: any) => o.status === "NEW");
  const stageInPrep = filteredTodayOrders.filter((o: any) => o.status === "IN_PROCESS");
  const stageReadyOrDelivery = filteredTodayOrders.filter((o: any) => o.status === "PENDING_DELIVERY" || o.status === "OUT_FOR_DELIVERY" || o.status === "FINISHED");
  const dispatchDeliveryCount = stageReadyOrDelivery.filter((o: any) => Boolean(o.needsDelivery)).length;
  const dispatchPickupCount = stageReadyOrDelivery.length - dispatchDeliveryCount;
  const visibleDispatchOrders = stageReadyOrDelivery.filter((o: any) => (
    dispatchFilter === "ALL" || (dispatchFilter === "DELIVERY" ? Boolean(o.needsDelivery) : !o.needsDelivery)
  ));
  const stageCompleted = filteredTodayOrders.filter((o: any) => o.status === "DELIVERED");
  const stageCancelled = filteredTodayOrders.filter((o: any) => o.status === "CANCELLED");

  // Metrics summary
  const activeOrdersCount = stageNew.length + stageInPrep.length + stageReadyOrDelivery.length;
  const nonCancelledToday = todayOrders.filter(o => o.status !== "CANCELLED");
  const totalRevenue = nonCancelledToday.reduce((sum, o) => sum + (o.total || 0), 0);
  const cashRevenue = nonCancelledToday.filter(o => o.paymentMethod === "CASH").reduce((s, o) => s + (o.total || 0), 0);
  const mpRevenue = nonCancelledToday.filter(o => o.paymentMethod === "MP" && o.paymentStatus === "PAID").reduce((s, o) => s + (o.total || 0), 0);

  // Render Order Card (Operational KDS Style)
  const renderOrderCard = (order: any, stageId: "NEW" | "IN_PREP" | "READY_DELIVERY" | "COMPLETED") => {
    const isDelivery = Boolean(order.needsDelivery);
    const hasStockIssues = Array.isArray(order.stockIssues) && order.stockIssues.length > 0;
    const isUpdating = updatingOrderId === order.id;
    const timeInfo = getTimeElapsed(order.createdAt);
    const isPaid = order.paymentStatus === "PAID" || order.paymentMethod === "ADMIN";
    const hasBowl = order.items?.some((it: any) => it.product?.availableDays && it.product.availableDays.trim() !== "");

    return (
      <Card
        key={order.id}
        className={`shadow-xs rounded-2xl border overflow-hidden transition-all bg-white hover:shadow-md ${
          hasStockIssues
            ? "border-red-400 ring-2 ring-red-200"
            : stageId === "NEW"
            ? "border-blue-200 hover:border-blue-400"
            : stageId === "IN_PREP"
            ? "border-amber-200 hover:border-amber-400"
            : stageId === "READY_DELIVERY"
            ? "border-purple-200 hover:border-purple-400"
            : "border-slate-200 opacity-80"
        }`}
      >
        <div className="p-3.5 space-y-3">
          {/* Card Top: Order Number, Timer, Delivery/Pickup Badge */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-slate-900 tracking-tight">
                  #{order.id.slice(-5).toUpperCase()}
                </span>
                {isDelivery ? (
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-black px-1.5 py-0 flex items-center gap-1">
                    <Truck className="w-2.5 h-2.5" /> Envío
                  </Badge>
                ) : (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black px-1.5 py-0 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Retiro
                  </Badge>
                )}
                {hasBowl && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[9px] font-black px-1.5 py-0">
                    Bowl
                  </Badge>
                )}
              </div>
              <span className="text-xs font-bold text-slate-600 block line-clamp-1 mt-0.5">
                {order.clientName}
              </span>
            </div>

            {/* Timer & Payment Status */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  timeInfo.isUrgent
                    ? "bg-red-500 text-white animate-pulse"
                    : timeInfo.isWarning
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-600"
                }`}
                title="Tiempo transcurrido desde el pedido"
              >
                <Clock className="w-2.5 h-2.5" />
                {timeInfo.text}
              </span>

              {order.paymentMethod === "MP" ? (
                isPaid ? (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    MP: PAGADO
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded animate-pulse">
                    MP: PENDIENTE
                  </span>
                )
              ) : order.paymentMethod === "ADMIN" ? (
                <span className="text-[9px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.2 rounded">
                  MANUAL
                </span>
              ) : (
                <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                  EFECTIVO
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-black text-slate-800">
            <Clock className="h-3.5 w-3.5 text-purple-600" />
            <span>Entrega: {order.deliveryTime || "Sin horario"}</span>
          </div>

          {/* Delivery address if applicable */}
          {isDelivery && order.deliveryAddress && (
            <div className="text-[11px] font-semibold text-slate-600 bg-orange-50/50 p-2 rounded-xl border border-orange-100 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{order.deliveryAddress}</span>
            </div>
          )}

          {/* Products List (Kitchen Items) */}
          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
            {order.items?.map((item: any) => (
              <div key={item.id} className="leading-tight space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-900">
                    <span className="text-orange-600 font-black mr-1">{item.quantity}x</span>
                    {item.product?.name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">${item.subtotal}</span>
                </div>
                {item.addedExtras?.length > 0 && (
                  <div className="text-[10px] font-bold text-emerald-700">
                    +{item.addedExtras.map((e: any) => e.extra?.name).join(", ")}
                  </div>
                )}
                {item.removedIngredients?.length > 0 && (
                  <div className="text-[10px] font-bold text-red-600">
                    -Sin {item.removedIngredients.map((ing: any) => ing.ingredient?.name).join(", ")}
                  </div>
                )}
                {item.notes && (
                  <div className="text-[10px] font-medium italic text-slate-500 bg-white p-1 rounded border border-slate-200 mt-1">
                    "{item.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stock Alert if missing */}
          {hasStockIssues && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-2.5 text-red-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[11px] uppercase text-red-800">
                <PackageX className="w-3.5 h-3.5 text-red-600" /> Falta Stock
              </div>
              {order.stockIssues.map((issue: any) => (
                <div key={issue.ingredientId} className="text-[11px] font-medium">
                  {issue.name}: faltan {issue.missing}
                </div>
              ))}
            </div>
          )}

          {/* Stage-Specific Fast Action Bar */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {stageId === "NEW" && (
              <div className="flex gap-2">
                <Button
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold h-9 rounded-xl"
                  onClick={() => handleStatusChange(order.id, "CANCELLED")}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Rechazar
                </Button>
                <Button
                  disabled={isUpdating || hasStockIssues || (order.paymentMethod === "MP" && !isPaid)}
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 font-black text-white text-xs h-9 rounded-xl shadow-sm"
                  onClick={() => handleStatusChange(order.id, "IN_PROCESS")}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Flame className="w-4 h-4 mr-1 fill-white" /> Cocinar</>}
                </Button>
              </div>
            )}

            {stageId === "IN_PREP" && (
              <div className="space-y-2">
                {isDelivery ? (
                  <div className="flex gap-2">
                    <Select value={order.messengerId || "none"} onValueChange={(v) => handleMessengerChange(order.id, v)}>
                      <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-slate-50 border-slate-200 rounded-xl">
                        <SelectValue>{order.messenger?.name || "Asignar cadete"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cadete</SelectItem>
                        {messengers.filter(m => m.isActive || m.id === order.messengerId).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={isUpdating}
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs h-9 rounded-xl"
                      onClick={() => handleStatusChange(order.id, "PENDING_DELIVERY")}
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-3.5 h-3.5 mr-1" /> A Reparto</>}
                    </Button>
                  </div>
                ) : (
                  <Button
                    disabled={isUpdating}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs h-9 rounded-xl"
                    onClick={() => handleStatusChange(order.id, "FINISHED")}
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Terminado (Listo p/ Retiro)</>}
                  </Button>
                )}
              </div>
            )}

            {stageId === "READY_DELIVERY" && (
              <div className="space-y-2">
                {order.status === "PENDING_DELIVERY" && (
                  <div className="flex gap-2">
                    {order.messengerId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 bg-green-50 text-xs font-bold h-9 rounded-xl"
                        onClick={() => dispatchRoadmap(order.messengerId)}
                        title="Enviar hoja de ruta al cadete"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> WS Cadete
                      </Button>
                    )}
                    <Button
                      disabled={isUpdating}
                      size="sm"
                      className="flex-1 bg-orange-600 hover:bg-orange-700 font-black text-white text-xs h-9 rounded-xl"
                      onClick={() => handleStatusChange(order.id, "OUT_FOR_DELIVERY")}
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-3.5 h-3.5 mr-1" /> Despachar (En camino)</>}
                    </Button>
                  </div>
                )}

                {(order.status === "OUT_FOR_DELIVERY" || order.status === "FINISHED") && (
                  <Button
                    disabled={isUpdating}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs h-9 rounded-xl"
                    onClick={() => handleStatusChange(order.id, "DELIVERED")}
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PackageCheck className="w-4 h-4 mr-1" /> Marcar Entregado ✅</>}
                  </Button>
                )}
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-1 text-slate-500">
              <span className="font-black text-xs text-slate-900">
                Total: ${(order.total || 0).toLocaleString("es-AR")}
              </span>

              <div className="flex items-center gap-1">
                <a
                  href={`https://wa.me/${order.clientPhone?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Contactar por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  disabled={printingOrderId === order.id}
                  onClick={() => handlePrintOrder(order.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Imprimir comanda"
                >
                  {printingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs font-black text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                  onClick={() => setSelectedOrderForModal(order)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Detalle
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-[1700px] mx-auto">
      {/* ═══ TOP STREAMLINED CONTROL HEADER ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
        {/* Left: Status & Title */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Operación en Vivo</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cocina y Despacho</h1>
          </div>

          {/* Store Open / Closed Switch */}
          <Button
            onClick={() => void handleStoreStateChange()}
            disabled={isStoreOpen === null || updatingStoreState}
            className={`rounded-2xl font-black text-xs h-10 px-4 transition-all shadow-sm ${
              isStoreOpen
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                : "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20"
            }`}
          >
            {updatingStoreState ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isStoreOpen ? (
              <Power className="w-4 h-4 mr-2 text-emerald-600" />
            ) : (
              <PowerOff className="w-4 h-4 mr-2" />
            )}
            {isStoreOpen ? "Local Abierto" : "Local Cerrado"}
          </Button>
        </div>

        {/* Center: Realtime Metrics Pill */}
        <div className="flex items-center gap-4 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-sm self-start lg:self-center">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold">{activeOrdersCount} Activos</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{todayOrders.length} Hoy</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs font-black text-emerald-400">
            ${totalRevenue.toLocaleString("es-AR")}
          </div>
        </div>

        {/* Right: Actions (Search, New Order, Sound, Module Popover) */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsCancelledOpen(true)}
            className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100"
            title="Ver pedidos cancelados"
          >
            <Trash2 className="mr-1.5 size-4" /> Cancelados
            {stageCancelled.length > 0 && <Badge className="ml-2 rounded-full bg-red-600 px-1.5 text-white">{stageCancelled.length}</Badge>}
          </Button>
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-36 sm:w-44 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          {/* New Order Composer */}
          <Button
            onClick={() => setIsOrderComposerOpen(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs h-9 rounded-xl shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> + Pedido
          </Button>

          {/* Sound Alert Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSoundAlerts}
            className={`h-9 w-9 rounded-xl border-slate-200 transition-colors ${
              isMonitoring ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-red-50 text-red-600 border-red-200"
            }`}
            title={isMonitoring ? "Alertas sonoras activas" : "Alertas sonoras apagadas"}
          >
            {isMonitoring ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Settings & Modules Quick Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSettingsModalOpen(true)}
            className="h-9 w-9 rounded-xl border-slate-200"
            title="Ajustes de módulos y cupos"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-9 w-9 rounded-xl border-slate-200"
            title="Refrescar comanda"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* ═══ 4 OPERATIONAL KANBAN STAGES ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* STAGE 1: 🔔 Nuevos / Por Aceptar */}
        <div className="bg-blue-50/40 rounded-3xl border border-blue-200/80 p-3.5 flex flex-col min-h-[600px] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <h2 className="font-black text-sm text-blue-950 uppercase tracking-tight">Nuevos / Ingresados</h2>
            </div>
            <Badge className="bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-full">
              {stageNew.length}
            </Badge>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {stageNew.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold space-y-1">
                <CheckCircle className="w-6 h-6 mx-auto text-blue-300" />
                <p>Sin pedidos nuevos pendientes</p>
              </div>
            ) : (
              stageNew.map((order) => renderOrderCard(order, "NEW"))
            )}
          </div>
        </div>

        {/* STAGE 2: 🔥 En Cocina / Preparando */}
        <div className="bg-amber-50/40 rounded-3xl border border-amber-200/80 p-3.5 flex flex-col min-h-[600px] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-black text-sm text-amber-950 uppercase tracking-tight">En Cocina</h2>
            </div>
            <Badge className="bg-amber-500 text-white font-black text-xs px-2 py-0.5 rounded-full">
              {stageInPrep.length}
            </Badge>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {stageInPrep.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold space-y-1">
                <ChefHat className="w-6 h-6 mx-auto text-amber-300" />
                <p>Cocina libre</p>
              </div>
            ) : (
              stageInPrep.map((order) => renderOrderCard(order, "IN_PREP"))
            )}
          </div>
        </div>

        {/* STAGE 3: 🛵 En Reparto / Listos */}
        <div className="bg-purple-50/40 rounded-3xl border border-purple-200/80 p-3.5 flex flex-col min-h-[600px] shadow-xs">
          <div className="space-y-2.5 border-b border-purple-200 px-1 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500" />
                <h2 className="font-black text-sm text-purple-950 uppercase tracking-tight">Despacho / En Reparto</h2>
              </div>
              <Badge className="bg-purple-600 text-white font-black text-xs px-2 py-0.5 rounded-full">
                {visibleDispatchOrders.length}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-purple-100/80 p-1">
              {([
                ["ALL", "Todos", stageReadyOrDelivery.length],
                ["DELIVERY", "Envío", dispatchDeliveryCount],
                ["PICKUP", "Retiro", dispatchPickupCount],
              ] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDispatchFilter(value)}
                  aria-pressed={dispatchFilter === value}
                  className={`rounded-lg px-1.5 py-1.5 text-[10px] font-black transition-colors ${dispatchFilter === value ? "bg-white text-purple-800 shadow-sm" : "text-purple-700 hover:bg-white/60"}`}
                >
                  {label} <span className="ml-0.5 rounded-full bg-purple-200 px-1.5 py-0.5 text-[9px]">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {visibleDispatchOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold space-y-1">
                <Truck className="w-6 h-6 mx-auto text-purple-300" />
                <p>{stageReadyOrDelivery.length === 0 ? "Sin pedidos en despacho" : "No hay pedidos de este tipo"}</p>
              </div>
            ) : (
              visibleDispatchOrders.map((order) => renderOrderCard(order, "READY_DELIVERY"))
            )}
          </div>
        </div>

        {/* STAGE 4: ✅ Entregados / Completados Hoy */}
        <div className="bg-slate-100/60 rounded-3xl border border-slate-200 p-3.5 flex flex-col min-h-[600px] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <h2 className="font-black text-sm text-slate-800 uppercase tracking-tight">Completados Hoy</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-slate-700 text-white font-black text-xs px-2 py-0.5 rounded-full">
                {stageCompleted.length}
              </Badge>
              <button
                type="button"
                onClick={() => setIsCompletedCollapsed(p => !p)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
                title={isCompletedCollapsed ? "Desplegar" : "Plegar"}
              >
                {isCompletedCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isCompletedCollapsed && (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px]">
              {stageCompleted.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                  Aún no hay pedidos completados hoy
                </div>
              ) : (
                stageCompleted.map((order) => renderOrderCard(order, "COMPLETED"))
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCancelledOpen} onOpenChange={setIsCancelledOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-3xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-800"><Trash2 className="size-5" /> Pedidos cancelados de hoy</DialogTitle>
            <DialogDescription>Se guardan como historial y no forman parte de los pedidos completados ni de la facturación.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            {stageCancelled.length === 0
              ? <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">No hay pedidos cancelados hoy.</div>
              : stageCancelled.map((order) => renderOrderCard(order, "COMPLETED"))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings & Modules Modal Dialog */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-orange-600" />
              Ajustes de Módulos y Turnos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pausá o activá los tipos de pedidos y modificá los cupos disponibles en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Módulos de Recepción</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">⚡ Inmediatos (Hoy)</span>
                    <span className="text-[10px] text-slate-500">Pedidos para preparar ya</span>
                  </div>
                  <button
                    type="button"
                    disabled={updatingModule === "IMMEDIATE"}
                    onClick={() => handleToggleModule("IMMEDIATE", !moduleStates.allowImmediateOrders)}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                      moduleStates.allowImmediateOrders
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }`}
                  >
                    {moduleStates.allowImmediateOrders ? "ACTIVO" : "PAUSADO"}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">⏰ Programados Mañana</span>
                    <span className="text-[10px] text-slate-500">Pedidos para el día siguiente</span>
                  </div>
                  <button
                    type="button"
                    disabled={updatingModule === "TOMORROW"}
                    onClick={() => handleToggleModule("TOMORROW", !moduleStates.allowScheduledTomorrow)}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                      moduleStates.allowScheduledTomorrow
                        ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }`}
                  >
                    {moduleStates.allowScheduledTomorrow ? "ACTIVO" : "PAUSADO"}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">📅 Encargos Futuros</span>
                    <span className="text-[10px] text-slate-500">Calendario anticipado y eventos</span>
                  </div>
                  <button
                    type="button"
                    disabled={updatingModule === "ADVANCE"}
                    onClick={() => handleToggleModule("ADVANCE", !moduleStates.allowAdvanceOrders)}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                      moduleStates.allowAdvanceOrders
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }`}
                  >
                    {moduleStates.allowAdvanceOrders ? "ACTIVO" : "PAUSADO"}
                  </button>
                </div>
              </div>
            </div>

            {/* Cupos de Franjas Horarias */}
            {slots.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Cupos de Turnos de Hoy</h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {slots.map((slot) => (
                    <div key={slot.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <span className="font-black text-slate-800">{slot.time}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSlotChange(slot.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-200 font-black text-xs hover:bg-slate-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-black px-1.5 text-slate-900 min-w-5 text-center">{slot.available}</span>
                        <button
                          type="button"
                          onClick={() => handleSlotChange(slot.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-200 font-black text-xs hover:bg-slate-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Admin Order Composer Modal */}
      <AdminOrderComposer
        open={isOrderComposerOpen}
        onClose={() => setIsOrderComposerOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrderForModal}
        isOpen={Boolean(selectedOrderForModal)}
        onClose={() => setSelectedOrderForModal(null)}
        messengers={messengers}
        onStatusChange={handleStatusChange}
        onMessengerChange={handleMessengerChange}
        onPrint={handlePrintOrder}
      />
    </div>
  );
}
