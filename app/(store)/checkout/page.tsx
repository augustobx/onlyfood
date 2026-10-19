"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createOrder, fetchConfig } from "@/app/actions/checkout";
import { fetchCurrentClient } from "@/app/actions/auth";
import { AuthModal } from "@/components/AuthModal";
import { fetchClientAvailableCoupons } from "@/app/actions/client-rewards";
import { ArrowRight, ArrowLeft, MapPin, Zap, Calendar, Clock, Star, Ticket, Check, X, Bike, Store, Banknote, CreditCard, Info, BookmarkPlus, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { analyzeCartSchedule, WEEK_DAYS } from "@/lib/weekly-menu";
import { useQuantityDiscountPreview } from "@/lib/use-quantity-discount";
import { allowsTierBenefit } from "@/lib/tier-payment-policy";
import {
  getClientSavedAddresses, upsertClientSavedAddress,
} from "@/app/actions/client-addresses";
import {
  buildDeliveryAddress, isDeliveryAddressValid, isSlotSelectable,
  checkoutActionLabel, checkoutPaymentLabel,
  type FulfillmentChoice, type DeliveryAddressParts,
} from "@/lib/checkout-presentation";

/* ══ Theme class maps ══ */
function getThemeClasses(theme: string) {
  switch (theme) {
    case "SUSHI_ZEN":
      return {
        page: "bg-[#0b0e14] text-slate-100 font-sans",
        heading: "text-white tracking-tight",
        subtext: "text-slate-400",
        label: "text-slate-300 font-bold",
        formCard: "bg-[#121722] border border-amber-500/25 text-slate-100 shadow-xl shadow-black/50",
        inputBg: "bg-[#0c1017] border border-white/15 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40",
        selectBg: "bg-[#0c1017] border border-white/15 text-white focus:border-amber-500/60",
        switchBg: "bg-[#0c1017] border border-amber-500/30",
        switchLabel: "text-slate-200 font-bold",
        summaryBg: "bg-[#121722] border border-amber-500/25 shadow-2xl shadow-black/60",
        summaryText: "text-slate-400",
        summaryTotal: "text-amber-300",
        divider: "border-white/[0.08]",
        backBtn: "bg-[#141923] border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white",
        accent: "text-amber-300",
        accentBg: "bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white shadow-lg shadow-rose-950/50",
        accentBgHover: "hover:brightness-110",
        pillActive: "border border-amber-400 bg-amber-500/20 text-amber-300 shadow-md",
        pillInactive: "border border-white/10 bg-[#0c1017] text-slate-400 hover:text-slate-200",
        pillDisabled: "border border-white/5 bg-[#0c1017]/40 text-slate-600 opacity-50 cursor-not-allowed",
        warnBg: "bg-amber-950/40 border border-amber-500/30 text-amber-200",
        dateBg: "bg-rose-950/30 border border-rose-500/30",
        dateLabel: "text-rose-300",
        dateHint: "text-rose-400/80",
        couponActive: "border border-amber-400/60 bg-amber-500/20 text-amber-300 shadow-sm",
        couponInactive: "border border-white/10 bg-[#0c1017] text-slate-300",
        couponNone: "border border-white/10 bg-[#0c1017] text-slate-500",
        pointsBanner: "from-rose-900/60 via-amber-950/60 to-[#121722] border border-amber-500/30",
        modalBg: "bg-[#121722] border border-amber-500/30",
        modalText: "text-white",
        modalSub: "text-slate-400",
      };
    case "COMIC_FOOD_POP":
      return {
        page: "bg-[#fff7db] text-[#17121f]",
        heading: "text-[#17121f] uppercase",
        subtext: "text-[#5e5368] font-semibold",
        label: "text-[#17121f] font-black",
        formCard: "bg-white border-[3px] border-[#17121f] shadow-[6px_6px_0_#17121f]",
        inputBg: "bg-[#fffdf5] border-2 border-[#17121f] text-[#17121f] placeholder:text-[#82778a] focus:border-[var(--brand-primary)]",
        selectBg: "bg-[#fffdf5] border-2 border-[#17121f] text-[#17121f]",
        switchBg: "bg-[#ffe45e] border-2 border-[#17121f]",
        switchLabel: "text-[#17121f] font-bold",
        summaryBg: "bg-[#8ef0d0] border-[3px] border-[#17121f] shadow-[6px_6px_0_#17121f]",
        summaryText: "text-[#4d4357]",
        summaryTotal: "text-[#17121f]",
        divider: "border-[#17121f]/25",
        backBtn: "bg-white border-2 border-[#17121f] text-[#17121f] shadow-[3px_3px_0_#17121f]",
        accent: "text-[#17121f]",
        accentBg: "bg-[var(--brand-primary)] border-2 border-[#17121f] shadow-[4px_4px_0_#17121f]",
        accentBgHover: "hover:brightness-105",
        pillActive: "border-2 border-[#17121f] bg-[#ffe45e] text-[#17121f] shadow-[3px_3px_0_#17121f]",
        pillInactive: "border-2 border-[#17121f]/40 bg-white text-[#4d4357]",
        pillDisabled: "border-2 border-[#17121f]/20 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed",
        warnBg: "bg-amber-100 border-2 border-[#17121f] text-amber-950",
        dateBg: "bg-sky-100 border-2 border-[#17121f]",
        dateLabel: "text-sky-950",
        dateHint: "text-sky-800",
        couponActive: "border-2 border-[#17121f] bg-[#8ef0d0] text-[#17121f] shadow-[3px_3px_0_#17121f]",
        couponInactive: "border-2 border-[#17121f]/40 bg-white text-[#17121f]",
        couponNone: "border-2 border-[#17121f]/30 bg-slate-100 text-slate-600",
        pointsBanner: "from-[#ff4d7d] to-[var(--brand-primary)]",
        modalBg: "bg-[#fff7db] border-[3px] border-[#17121f]",
        modalText: "text-[#17121f]",
        modalSub: "text-[#5e5368]",
      };
    case "ARCADE_KITCHEN":
      return {
        page: "bg-[#090625] text-white",
        heading: "text-white uppercase tracking-wide",
        subtext: "text-violet-200/65 font-mono",
        label: "text-cyan-200 font-black uppercase",
        formCard: "bg-[#15113b] border-2 border-cyan-300 shadow-[6px_6px_0_#ec4899]",
        inputBg: "bg-[#090625] border-2 border-cyan-300/70 text-white placeholder:text-violet-300/40 focus:border-yellow-200",
        selectBg: "bg-[#090625] border-2 border-cyan-300/70 text-white focus:border-yellow-200",
        switchBg: "bg-[#090625] border-2 border-cyan-300/50",
        switchLabel: "text-violet-100",
        summaryBg: "bg-[#15113b] border-2 border-cyan-300 shadow-[6px_6px_0_#ec4899]",
        summaryText: "text-violet-200/65",
        summaryTotal: "text-yellow-200",
        divider: "border-cyan-300/25",
        backBtn: "bg-[#15113b] border-2 border-cyan-300 text-cyan-200 shadow-[3px_3px_0_#ec4899]",
        accent: "text-cyan-300",
        accentBg: "bg-fuchsia-600 border-2 border-yellow-200 shadow-[4px_4px_0_#32f5ff]",
        accentBgHover: "hover:brightness-110",
        pillActive: "border-2 border-yellow-200 bg-yellow-200 text-[#090625] shadow-[3px_3px_0_#ec4899]",
        pillInactive: "border-2 border-violet-400/50 bg-[#090625] text-violet-200",
        pillDisabled: "border border-violet-400/20 bg-[#090625] text-violet-500 opacity-50 cursor-not-allowed",
        warnBg: "bg-yellow-200/10 border-2 border-yellow-200/50 text-yellow-100",
        dateBg: "bg-cyan-300/10 border-2 border-cyan-300/40",
        dateLabel: "text-cyan-200",
        dateHint: "text-cyan-300/65",
        couponActive: "border-2 border-emerald-300 bg-emerald-300/15 text-emerald-200 shadow-[3px_3px_0_#22c55e]",
        couponInactive: "border-2 border-violet-400/50 bg-[#090625] text-violet-100",
        couponNone: "border-2 border-violet-400/30 bg-[#090625] text-violet-300",
        pointsBanner: "from-fuchsia-600 to-violet-700",
        modalBg: "bg-[#15113b] border-2 border-cyan-300",
        modalText: "text-white",
        modalSub: "text-violet-200/65",
      };
    case "HALLOWEEN":
    case "URBAN_DARK":
      return {
        page: "bg-[#080a0f] text-slate-100",
        heading: "text-white",
        subtext: "text-slate-400",
        label: "text-slate-300",
        formCard: "bg-white/[0.04] border-white/[0.06]",
        inputBg: "bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 focus:border-orange-500",
        selectBg: "bg-white/[0.06] border-white/[0.08] text-white focus:border-orange-500",
        switchBg: "bg-white/[0.06] border-white/[0.08]",
        switchLabel: "text-slate-200",
        summaryBg: "bg-white/[0.04] border-white/[0.06]",
        summaryText: "text-slate-400",
        summaryTotal: "text-orange-400",
        divider: "border-white/[0.06]",
        backBtn: "bg-white/[0.06] border-white/[0.08] text-slate-300 hover:bg-white/[0.1]",
        accent: "text-orange-400",
        accentBg: "bg-orange-600",
        accentBgHover: "hover:bg-orange-500",
        pillActive: "border-orange-500 bg-orange-500/15 text-orange-300 ring-2 ring-orange-500/20",
        pillInactive: "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.06]",
        pillDisabled: "border-white/[0.06] bg-white/[0.03] text-slate-600 opacity-50 cursor-not-allowed",
        warnBg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
        dateBg: "bg-blue-500/10 border-blue-500/20",
        dateLabel: "text-blue-300",
        dateHint: "text-blue-400/70",
        couponActive: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/15",
        couponInactive: "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.06]",
        couponNone: "border-slate-700 bg-white/[0.04] text-slate-400",
        pointsBanner: "from-amber-600 to-orange-600",
        modalBg: "bg-[#131722] border-white/[0.08]",
        modalText: "text-white",
        modalSub: "text-slate-400",
      };
    case "FAST_NEO":
      return {
        page: "bg-slate-50 text-slate-900",
        heading: "text-slate-900",
        subtext: "text-slate-500",
        label: "text-slate-700",
        formCard: "bg-white border-slate-200/80",
        inputBg: "bg-slate-100 border-transparent text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white",
        selectBg: "bg-slate-100 border-slate-200 text-slate-900 focus:border-orange-400",
        switchBg: "bg-slate-100 border-slate-200",
        switchLabel: "text-slate-800",
        summaryBg: "bg-slate-100 border-slate-200",
        summaryText: "text-slate-500",
        summaryTotal: "text-slate-900",
        divider: "border-slate-200",
        backBtn: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
        accent: "text-orange-600",
        accentBg: "bg-orange-600",
        accentBgHover: "hover:bg-orange-500",
        pillActive: "border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20",
        pillInactive: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        pillDisabled: "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed",
        warnBg: "bg-amber-50 border-amber-200 text-amber-800",
        dateBg: "bg-blue-50 border-blue-100",
        dateLabel: "text-blue-900",
        dateHint: "text-blue-600",
        couponActive: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20",
        couponInactive: "border-emerald-200 bg-white text-slate-800 hover:border-emerald-300",
        couponNone: "border-slate-300 bg-slate-50 text-slate-600",
        pointsBanner: "from-amber-500 to-orange-500",
        modalBg: "bg-white border-slate-200",
        modalText: "text-slate-900",
        modalSub: "text-slate-500",
      };
    case "CLEAN_BOUTIQUE":
      return {
        page: "bg-[#f6f3ee] text-stone-900",
        heading: "text-stone-900",
        subtext: "text-stone-500",
        label: "text-stone-700",
        formCard: "bg-white border-stone-300/50",
        inputBg: "bg-stone-50 border-stone-300/50 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:bg-white",
        selectBg: "bg-stone-50 border-stone-300/50 text-stone-900 focus:border-stone-500",
        switchBg: "bg-stone-100 border-stone-200",
        switchLabel: "text-stone-800",
        summaryBg: "bg-stone-50 border-stone-300/50",
        summaryText: "text-stone-500",
        summaryTotal: "text-stone-900",
        divider: "border-stone-200",
        backBtn: "bg-white border-stone-300/50 text-stone-600 hover:bg-stone-50",
        accent: "text-amber-800",
        accentBg: "bg-stone-900",
        accentBgHover: "hover:bg-stone-800",
        pillActive: "border-stone-900 bg-stone-900 text-stone-50 shadow-sm",
        pillInactive: "border-stone-300/50 bg-white text-stone-600 hover:bg-stone-50",
        pillDisabled: "border-stone-200 bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed",
        warnBg: "bg-amber-50 border-amber-200 text-amber-800",
        dateBg: "bg-blue-50/60 border-blue-100",
        dateLabel: "text-blue-900",
        dateHint: "text-blue-600",
        couponActive: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20",
        couponInactive: "border-stone-300 bg-white text-stone-800 hover:border-emerald-300",
        couponNone: "border-stone-300 bg-stone-50 text-stone-600",
        pointsBanner: "from-amber-600 to-amber-700",
        modalBg: "bg-white border-stone-200",
        modalText: "text-stone-900",
        modalSub: "text-stone-500",
      };
    default:
      return {
        page: "text-slate-900",
        heading: "text-slate-800",
        subtext: "text-slate-500",
        label: "text-slate-700",
        formCard: "bg-white border-slate-100",
        inputBg: "bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white",
        selectBg: "bg-slate-50 border-slate-200 text-slate-900 focus:border-orange-500",
        switchBg: "bg-slate-50 border-slate-100",
        switchLabel: "text-slate-800",
        summaryBg: "bg-slate-50 border-slate-100",
        summaryText: "text-slate-500",
        summaryTotal: "text-orange-600",
        divider: "border-slate-200",
        backBtn: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
        accent: "text-orange-600",
        accentBg: "bg-orange-500",
        accentBgHover: "hover:bg-orange-600",
        pillActive: "border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20",
        pillInactive: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
        pillDisabled: "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed",
        warnBg: "bg-amber-50 border-amber-200 text-amber-900",
        dateBg: "bg-blue-50/60 border-blue-100",
        dateLabel: "text-blue-900",
        dateHint: "text-blue-600",
        couponActive: "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20",
        couponInactive: "border-emerald-200 bg-white text-slate-800 hover:border-emerald-300",
        couponNone: "border-slate-400 bg-slate-100 text-slate-800",
        pointsBanner: "from-amber-500 to-orange-500",
        modalBg: "bg-white border-slate-200",
        modalText: "text-slate-800",
        modalSub: "text-slate-500",
      };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const checkoutCompletedRef = useRef(false);

  const { items, getTotal, clearCart, dailyPrize, appliedCoupon, clearDailyPrize, dismissCoupon } = useCartStore();
  const quantityDiscount = useQuantityDiscountPreview(items);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Requiere una elección explícita: retiro no puede quedar marcado por omisión.
  const [fulfillmentChoice, setFulfillmentChoice] = useState<FulfillmentChoice | null>(null);
  const [addressParts, setAddressParts] = useState<DeliveryAddressParts>({
    street: "", unit: "", reference: "",
  });
  const [savedAddresses, setSavedAddresses] = useState<Awaited<ReturnType<typeof getClientSavedAddresses>>>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("Casa");
  const [newAddressDefault, setNewAddressDefault] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [userOptedOutCoupon, setUserOptedOutCoupon] = useState(false);

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    whatsappOptIn: false,
    needsDelivery: false,
    deliveryAddress: "",
    deliverySlotId: "",
    orderType: "IMMEDIATE" as "IMMEDIATE" | "SCHEDULED_TOMORROW" | "CUSTOM_DATE",
    scheduledDate: "",
    scheduledTime: "",
    paymentMethod: "CASH" as "CASH" | "MP" | "TRANSFER",
  });

  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoadError, setSlotsLoadError] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const theme = config?.storeTheme || "ORIGINAL";
  const t = getThemeClasses(theme);

  const getMinDateStr = (minDays: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + minDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMaxDateStr = (maxDays: number = 30) => {
    const d = new Date();
    d.setDate(d.getDate() + maxDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const schedule = useMemo(() => analyzeCartSchedule(items), [items]);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg) {
        if (!cfg.whatsappOptInEnabled) setFormData((p) => ({ ...p, whatsappOptIn: false }));
        if (!cfg.paymentCash && cfg.paymentMp) setFormData((p) => ({ ...p, paymentMethod: "MP" }));
        else if (!cfg.paymentCash && !cfg.paymentMp && cfg.paymentTransfer) setFormData((p) => ({ ...p, paymentMethod: "TRANSFER" }));
        else if (cfg.paymentCash) setFormData((p) => ({ ...p, paymentMethod: "CASH" }));

        if (schedule.hasScheduledProducts && schedule.targetDateInfo) {
          const isToday = schedule.targetDateInfo.dayOffset === 0;
          const isTomorrow = schedule.targetDateInfo.dayOffset === 1;
          const isImmediateOpen = Boolean(cfg.isStoreOpen && cfg.allowImmediateOrders !== false);

          if (isToday && isImmediateOpen && !schedule.isMultiDaySchedule) {
            setFormData((p) => ({
              ...p,
              orderType: "IMMEDIATE",
              scheduledDate: schedule.targetDateInfo!.dateStr,
            }));
          } else if (isTomorrow && cfg.allowScheduledTomorrow !== false && !schedule.isMultiDaySchedule) {
            setFormData((p) => ({
              ...p,
              orderType: "SCHEDULED_TOMORROW",
              scheduledDate: schedule.targetDateInfo!.dateStr,
            }));
          } else {
            setFormData((p) => ({
              ...p,
              orderType: "CUSTOM_DATE",
              scheduledDate: schedule.targetDateInfo!.dateStr,
            }));
          }
        } else {
          const isImmediateOpen = Boolean(cfg.isStoreOpen && cfg.allowImmediateOrders !== false);
          if (!isImmediateOpen) {
            if (cfg.allowScheduledTomorrow !== false) {
              setFormData((p) => ({ ...p, orderType: "SCHEDULED_TOMORROW" }));
            } else if (cfg.allowAdvanceOrders !== false) {
              const minDays = cfg.advanceOrderMinDays !== undefined && cfg.advanceOrderMinDays !== null ? cfg.advanceOrderMinDays : 1;
              setFormData((p) => ({ ...p, orderType: "CUSTOM_DATE", scheduledDate: getMinDateStr(minDays) }));
            }
          }
        }
      }
    });

    fetch("/api/slots")
      .then(async r => {
        if (!r.ok) throw new Error("SLOTS_UNAVAILABLE");
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error("INVALID_SLOTS");
        return data;
      })
      .then((all: any[]) => {
        setSlots(all);
        setSlotsLoadError(false);
        const available = all.filter(slot => isSlotSelectable(Number(slot.available)));
        setFormData(prev => {
          const chosen = available.find(slot => slot.id === prev.deliverySlotId) || available[0];
          return { ...prev, deliverySlotId: chosen?.id || "", scheduledTime: chosen?.time || "" };
        });
      })
      .catch(() => {
        setSlots([]);
        setSlotsLoadError(true);
        setFormData(prev => ({ ...prev, deliverySlotId: "", scheduledTime: "" }));
      });
  }, [schedule.hasScheduledProducts, schedule.targetDateInfo]);

  const [loggedClient, setLoggedClient] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!loggedClient) {
      setSavedAddresses([]);
      setSelectedSavedAddressId(null);
      return;
    }
    void getClientSavedAddresses().then(addresses => {
      if (mounted) setSavedAddresses(addresses);
    }).catch(() => { if (mounted) setSavedAddresses([]); });
    return () => { mounted = false; };
  }, [loggedClient?.id]);

  // Si el usuario eligió delivery antes de terminar la consulta, usar igualmente
  // su dirección predeterminada. Nunca pisar lo que escribió manualmente.
  useEffect(() => {
    if (fulfillmentChoice !== "DELIVERY" || addressTouched || addressParts.street || !savedAddresses.length) return;
    const preferred = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
    const parts = { street: preferred.street, unit: preferred.unit, reference: preferred.reference };
    setAddressParts(parts);
    setSelectedSavedAddressId(preferred.id);
    setFormData(prev => ({ ...prev, deliveryAddress: buildDeliveryAddress(parts) }));
  }, [fulfillmentChoice, addressTouched, addressParts.street, savedAddresses]);

  useEffect(() => {
    fetchCurrentClient().then((client) => {
        if (client) {
          setLoggedClient(client);
          setFormData((prev) => ({
            ...prev,
            clientName: client.name || prev.clientName,
            clientPhone: client.phone || prev.clientPhone,
          }));
        }
      }).finally(() => setAuthChecked(true));

    fetchClientAvailableCoupons().then((coupons) => {
      if (coupons && coupons.length > 0) {
        setAvailableCoupons(coupons);
        const rewardItem = items.find((i) => i.rewardRedemptionId);
        const preselectedId = appliedCoupon?.id || rewardItem?.rewardRedemptionId;
        if (preselectedId && !userOptedOutCoupon) {
          const match = coupons.find((c: any) => c.id === preselectedId);
          if (match) setSelectedCoupon(match);
        }
      }
    });
  }, [appliedCoupon, items, userOptedOutCoupon]);

  useEffect(() => {
    if (userOptedOutCoupon) return;
    if (appliedCoupon && !selectedCoupon) {
      setSelectedCoupon(appliedCoupon);
    } else if (!selectedCoupon) {
      const rewardItem = items.find((i) => i.rewardRedemptionId);
      if (rewardItem?.rewardRedemptionId && availableCoupons.length > 0) {
        const match = availableCoupons.find((c) => c.id === rewardItem.rewardRedemptionId);
        if (match) setSelectedCoupon(match);
      }
    }
  }, [appliedCoupon, availableCoupons, items, selectedCoupon, userOptedOutCoupon]);

  // Expiración preventiva del premio diario (+24hs)
  useEffect(() => {
    if (dailyPrize?.wonAt) {
      const isExpired = Date.now() - dailyPrize.wonAt > 24 * 60 * 60 * 1000;
      if (isExpired) {
        clearDailyPrize();
        toast.info("Tu premio de la ruleta ha caducado (+24hs).");
      }
    }
  }, [dailyPrize, clearDailyPrize]);

  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (items.length === 0 && !isSuccess && !checkoutCompletedRef.current) {
      router.push("/");
    }
  }, [items, router, isSuccess]);

  const subtotal = getTotal();
  const afterQuantityDiscount = Math.max(0, subtotal - (quantityDiscount?.amount || 0));
  const discountMultiplier = 1 - (config?.globalDiscount || 0) / 100;
  let discountedSubtotal = afterQuantityDiscount * discountMultiplier;

  // Las reglas por medio de pago deben coincidir con el servidor.
  const selectedTierBenefits = loggedClient?.tier?.paymentBenefits?.[formData.paymentMethod];
  const tierDiscountPercent = selectedTierBenefits?.discountPercent ?? loggedClient?.tier?.discountPercent ?? 0;
  const tierDiscountAmount = tierDiscountPercent > 0 ? (afterQuantityDiscount * (tierDiscountPercent / 100)) : 0;
  discountedSubtotal = Math.max(0, discountedSubtotal - tierDiscountAmount);

  let prizeDiscount = 0;
  if (dailyPrize) {
    if (dailyPrize.type === "PERCENT") {
      prizeDiscount = discountedSubtotal * (dailyPrize.value / 100);
    } else if (dailyPrize.type === "AMOUNT") {
      prizeDiscount = Math.min(discountedSubtotal, dailyPrize.value);
    }
    discountedSubtotal -= prizeDiscount;
  }

  let couponDiscount = 0;
  let productCouponBonus = 0;
  // Preferir siempre el cupón actualizado desde DB al guardado en localStorage:
  // puede haberse cambiado la regla del nivel después de que se guardó.
  const pricedCoupon = selectedCoupon
    ? availableCoupons.find(c => c.id === selectedCoupon.id) || selectedCoupon
    : null;
  const couponAllowed = !pricedCoupon?.reward?.minTier ||
    allowsTierBenefit(pricedCoupon.reward.minTier.paymentMode, formData.paymentMethod);
  if (pricedCoupon?.reward && couponAllowed) {
    if (pricedCoupon.reward.type === "PERCENT") {
      couponDiscount = discountedSubtotal * ((pricedCoupon.reward.value || 0) / 100);
    } else if (pricedCoupon.reward.type === "AMOUNT") {
      couponDiscount = Math.min(discountedSubtotal, pricedCoupon.reward.value || 0);
    } else if (pricedCoupon.reward.type === "PRODUCT" || pricedCoupon.reward.type === "COMBO") {
      const targetProdId = pricedCoupon.reward.productId || pricedCoupon.reward.product?.id;
      const matchingItem = items.find((i) => (i.product?.id === targetProdId || (i as any).productId === targetProdId) && !i.isReward);
      if (matchingItem) {
        productCouponBonus = matchingItem.unitPrice;
      }
    }
    discountedSubtotal = Math.max(0, discountedSubtotal - couponDiscount - productCouponBonus);
  }

  const deliveryCost = formData.needsDelivery ? config?.deliveryCost || 0 : 0;
  const total = discountedSubtotal + deliveryCost;

  const pointsMultiplier = selectedTierBenefits?.pointsMultiplier ?? loggedClient?.tier?.pointsMultiplier ?? 1.0;
  const totalEarnedPoints = Math.round(items.reduce((sum, item) => sum + (item.product?.points || 0) * item.quantity, 0) * pointsMultiplier);

  const validateAndSubmit = async () => {
    if (items.length === 0) return;
    if (selectedCoupon && !couponAllowed) {
      toast.error("Este cupón no está disponible para el medio de pago seleccionado.");
      return;
    }
    if (config?.requireLoginForCheckout && !loggedClient) {
      setShowAuthModal(true);
      toast.error("Para comprar, primero iniciá sesión o registrate.");
      return;
    }

    if (!formData.clientName || !formData.clientPhone) {
      toast.error("Datos incompletos", { description: "Por favor, ingresá tu nombre y teléfono." });
      return;
    }
    if (!fulfillmentChoice) {
      toast.error("Seleccioná entrega a domicilio o retiro en local.");
      return;
    }
    if (formData.needsDelivery && !isDeliveryAddressValid(formData.deliveryAddress)) {
      toast.error("Dirección incompleta", {
        description: "Ingresá calle y altura. La dirección completa no puede superar 250 caracteres.",
      });
      addressInputRef.current?.focus();
      return;
    }
    if ((config?.paymentCash === false && formData.paymentMethod === "CASH") ||
      (config?.paymentMp === false && formData.paymentMethod === "MP") ||
      (!config?.paymentTransfer && formData.paymentMethod === "TRANSFER")) {
      toast.error("El medio de pago elegido no está disponible en este comercio.");
      return;
    }
    if (formData.orderType === "CUSTOM_DATE" && !formData.scheduledDate) {
      toast.error("Fecha requerida", { description: "Por favor, seleccioná la fecha de encargo." });
      return;
    }
    if (formData.orderType === "IMMEDIATE" && !formData.deliverySlotId) {
      toast.error("Horario requerido", { description: "Seleccioná uno de los horarios disponibles para hoy." });
      return;
    }

    setIsSubmitting(true);
    try {
      const rewardRedemptionId = pricedCoupon?.id || items.find((i) => i.rewardRedemptionId)?.rewardRedemptionId || null;
      const result = await createOrder({
        ...formData,
        items,
        rouletteWinId: dailyPrize?.winId || null,
        redemptionId: rewardRedemptionId,
      });

      if (result.success) {
        if (formData.paymentMethod === "MP" && result.mpInitPoint) {
          toast.loading("Redirigiendo a Mercado Pago...", { duration: 3000 });
          checkoutCompletedRef.current = true;
          setIsSuccess(true);
          clearCart();
          window.location.assign(result.mpInitPoint);
        } else {
          checkoutCompletedRef.current = true;
          setIsSuccess(true);
          clearCart();
          toast.success("¡Pedido recibido!", {
            description: formData.paymentMethod === "TRANSFER"
              ? "Ahora transferí y compartí el comprobante por WhatsApp. El pago queda pendiente de aprobación."
              : total <= 0 ? "Tu pedido bonificado por tu premio ya fue registrado." : "Tu pedido ya fue registrado en el sistema.",
          });
          try {
            const audio = new Audio("/sounds/dingdong.mp3");
            audio.play();
          } catch {
            // ignore audio fail
          }
          router.push(`/track/${result.orderId}?token=${encodeURIComponent(result.trackingToken || "")}`);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Lo sentimos", { description: error?.message || "No pudimos procesar tu pedido. Intenta nuevamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applySavedAddress = (item: (typeof savedAddresses)[number]) => {
    const parts = { street: item.street, unit: item.unit, reference: item.reference };
    setAddressParts(parts);
    setSelectedSavedAddressId(item.id);
    setAddressTouched(false);
    setFormData(prev => ({ ...prev, deliveryAddress: buildDeliveryAddress(parts) }));
  };

  const chooseFulfillment = (choice: FulfillmentChoice) => {
    setFulfillmentChoice(choice);
    setFormData(prev => ({ ...prev, needsDelivery: choice === "DELIVERY" }));
    if (choice === "DELIVERY" && !addressParts.street && !savedAddresses.length) {
      window.setTimeout(() => addressInputRef.current?.focus(), 150);
    }
  };

  const changeAddressPart = (field: keyof DeliveryAddressParts, value: string) => {
    const next = { ...addressParts, [field]: value };
    setAddressParts(next);
    setAddressTouched(true);
    setSelectedSavedAddressId(null);
    setFormData(prev => ({ ...prev, deliveryAddress: buildDeliveryAddress(next) }));
  };

  const saveCheckoutAddress = async () => {
    if (savingAddress || !loggedClient) return;
    setSavingAddress(true);
    try {
      const result = await upsertClientSavedAddress({
        label: newAddressLabel,
        ...addressParts,
        makeDefault: newAddressDefault,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const updated = await getClientSavedAddresses();
      setSavedAddresses(updated);
      const selected = updated.find(a => a.id === result.id);
      if (selected) applySavedAddress(selected);
      toast.success("Dirección guardada. La próxima vez se completará automáticamente.");
    } catch {
      toast.error("No se pudo guardar la dirección. Probá nuevamente.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePreSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fulfillmentChoice) {
      toast.error("Elegí cómo querés recibir tu pedido", {
        description: "Seleccioná Envío a domicilio o Retiro en local para continuar.",
      });
      document.getElementById("checkout-fulfillment")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    void validateAndSubmit();
  };

  if (items.length === 0) return null;

  const isScheduledForToday = schedule.hasScheduledProducts && schedule.targetDateInfo?.dayOffset === 0 && !schedule.isMultiDaySchedule;
  const isScheduledForFuture = schedule.hasScheduledProducts && ((schedule.targetDateInfo?.dayOffset ?? 0) > 0 || schedule.isMultiDaySchedule);

  const isImmediateAllowed = Boolean(
    config?.isStoreOpen &&
    config?.allowImmediateOrders !== false &&
    (!schedule.hasScheduledProducts || isScheduledForToday)
  );

  if (config?.requireLoginForCheckout && authChecked && !loggedClient) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Ingresá para finalizar tu pedido</h1>
        <p>Tu carrito se mantiene guardado. Para comprar en este comercio necesitás una cuenta.</p>
        <Button onClick={() => setShowAuthModal(true)}>Ingresar o crear cuenta</Button>
        <AuthModal isOpen={showAuthModal} theme={theme} onClose={async () => {
          setShowAuthModal(false);
          const client = await fetchCurrentClient();
          setLoggedClient(client);
          if (client) setFormData(prev => ({ ...prev, clientName: client.name || prev.clientName, clientPhone: client.phone || prev.clientPhone }));
        }} />
      </div>
    );
  }

  return (
    <>
      <div className={`checkout-page max-w-xl mx-auto px-3.5 sm:px-6 pb-10 pt-4 sm:pt-6 ${t.page}`}
        data-checkout-theme={theme.toLowerCase()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className={`w-9 h-9 border shadow-xs rounded-xl flex items-center justify-center transition-colors shrink-0 ${t.backBtn}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-none ${t.heading}`}>Datos del pedido</h1>
            <p className={`text-xs font-medium mt-0.5 ${t.subtext}`}>Completá la información para confirmar</p>
          </div>
        </div>

        {/* Weekly Menu Notice */}
        {schedule.hasScheduledProducts && schedule.targetDateInfo && (
          <div className={`mb-4 p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${t.dateBg}`}>
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={`font-black ${t.dateLabel}`}>📅 Menú Semanal / Encargo Programado</p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Tu pedido contiene platos que se elaboran exclusivamente los días <strong>{schedule.scheduledDays.map(d => WEEK_DAYS.find(w => w.id === d)?.name).join(', ')}</strong>.
                La fecha de entrega/retiro se configuró automáticamente para el <strong>{schedule.targetDateInfo.formatted}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Points banner */}
        {totalEarnedPoints > 0 && (
          <div className={`mb-4 bg-gradient-to-r ${t.pointsBanner} rounded-2xl p-3 text-white shadow-md flex items-center gap-2.5`}>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 fill-yellow-200 text-yellow-200" />
            </div>
            <p className="text-xs font-bold leading-tight">
              Con este pedido acumulás <span className="underline font-black">+{totalEarnedPoints} puntos</span>
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className={`border rounded-2xl shadow-sm p-4 sm:p-5 space-y-5 ${t.formCard}`}>
          <form onSubmit={handlePreSubmit} className="space-y-5">

            {/* ORDER TYPE */}
            {schedule.isMultiDaySchedule ? (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span>Plan Semanal Multidía ({schedule.distinctDatesCount} entregas)</span>
                  </div>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {schedule.distinctDatesCount} Pedidos Individuales
                  </span>
                </div>

                <div className="space-y-2">
                  {schedule.groups.map((group) => (
                    <div key={group.dateStr} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-purple-200 block">
                          📅 {group.formatted}
                        </span>
                        <span className="text-[11px] text-purple-300/80">
                          {group.items.map(it => `${it.product.name} (x${(it as any).quantity || 1})`).join(", ")}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-purple-900/50 text-purple-200 px-2 py-0.5 rounded-md border border-purple-700/50">
                        {group.dayName}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-purple-300/80 leading-tight">
                  ✨ <strong>El sistema registrará un pedido para cada día con su fecha correspondiente.</strong> La cocina los preparará frescos el día indicado para tu retiro o entrega.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Label className={`font-bold text-xs ml-0.5 ${t.label}`}>¿Para cuándo querés tu pedido?</Label>

                {!isImmediateAllowed && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-medium flex items-center gap-2 ${t.warnBg}`}>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {schedule.hasScheduledProducts
                        ? "Contiene platos del menú semanal. El pedido se programó para el día de elaboración."
                        : "No estamos tomando pedidos inmediatos. Podés programarlo."}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={!isImmediateAllowed}
                    data-checkout-choice aria-pressed={formData.orderType === "IMMEDIATE"}
                    onClick={() => setFormData({ ...formData, orderType: "IMMEDIATE" })}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                      !isImmediateAllowed ? t.pillDisabled : formData.orderType === "IMMEDIATE" ? t.pillActive : t.pillInactive
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Hoy
                    {!isImmediateAllowed && (
                      <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1 py-0.5 rounded">
                        {isScheduledForFuture ? "Programado" : "Pausado"}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={config?.allowScheduledTomorrow === false || (schedule.hasScheduledProducts && schedule.targetDateInfo?.dayOffset !== 1)}
                    data-checkout-choice aria-pressed={formData.orderType === "SCHEDULED_TOMORROW"}
                    onClick={() => setFormData({ ...formData, orderType: "SCHEDULED_TOMORROW" })}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                      config?.allowScheduledTomorrow === false || (schedule.hasScheduledProducts && schedule.targetDateInfo?.dayOffset !== 1) ? t.pillDisabled : formData.orderType === "SCHEDULED_TOMORROW" ? t.pillActive : t.pillInactive
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Mañana
                  </button>

                  <button
                    type="button"
                    disabled={config?.allowAdvanceOrders === false && !schedule.hasScheduledProducts}
                    data-checkout-choice aria-pressed={formData.orderType === "CUSTOM_DATE"}
                    onClick={() => {
                      const minDays = config?.advanceOrderMinDays !== undefined && config?.advanceOrderMinDays !== null ? config.advanceOrderMinDays : 1;
                      setFormData({
                        ...formData,
                        orderType: "CUSTOM_DATE",
                        scheduledDate: formData.scheduledDate || (schedule.targetDateInfo ? schedule.targetDateInfo.dateStr : getMinDateStr(minDays)),
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                      config?.allowAdvanceOrders === false && !schedule.hasScheduledProducts ? t.pillDisabled : formData.orderType === "CUSTOM_DATE" ? t.pillActive : t.pillInactive
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Encargo
                  </button>
                </div>

                {formData.orderType === "CUSTOM_DATE" && (() => {
                  const minDays = config?.advanceOrderMinDays !== undefined && config?.advanceOrderMinDays !== null ? config.advanceOrderMinDays : 1;
                  const configMinDate = getMinDateStr(minDays);
                  const effectiveMinDate = schedule.hasScheduledProducts && schedule.targetDateInfo
                    ? (schedule.targetDateInfo.dateStr < configMinDate ? schedule.targetDateInfo.dateStr : configMinDate)
                    : configMinDate;

                  return (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl border space-y-1.5 mt-2 ${t.dateBg}`}>
                      <Label htmlFor="custom-date" className={`text-[10px] font-black uppercase tracking-wider block ${t.dateLabel}`}>
                        Día del encargo
                      </Label>
                      <Input
                        id="custom-date"
                        type="date"
                        required
                        min={effectiveMinDate}
                        max={getMaxDateStr(config?.advanceOrderMaxDays ?? 30)}
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className={`h-10 rounded-xl font-bold text-sm ${t.inputBg}`}
                      />
                      <p className={`text-[10px] ${t.dateHint}`}>
                        {minDays === 0
                          ? "Podés encargar para hoy o fechas posteriores."
                          : `Mínimo ${minDays} día(s) de anticipación.`}
                      </p>
                    </motion.div>
                  );
                })()}
              </div>
            )}

            {/* CLIENT DATA */}
            <div className={`space-y-3 border-t pt-4 ${t.divider}`}>
              <div>
                <Label htmlFor="name" className={`font-bold text-xs ml-0.5 mb-1 block ${t.label}`}>Nombre y Apellido</Label>
                <Input
                  id="name"
                  required
                  autoFocus
                  className={`h-10 rounded-xl transition-colors text-sm ${t.inputBg}`}
                  placeholder="Ej. Juan Pérez"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone" className={`font-bold text-xs ml-0.5 mb-1 block ${t.label}`}>Teléfono (WhatsApp)</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  className={`h-10 rounded-xl transition-colors text-sm ${t.inputBg}`}
                  placeholder="Ej. 1123456789"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                />
                {config?.whatsappOptInEnabled && (
                  <label className={`mt-2 flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-xs ${t.switchBg}`}>
                    <Switch checked={formData.whatsappOptIn} onCheckedChange={(checked) => setFormData({ ...formData, whatsappOptIn: checked })} aria-label="Recibir avisos del pedido por WhatsApp" />
                    <span className={t.switchLabel}>Quiero recibir por WhatsApp únicamente la confirmación y los cambios operativos de este pedido.</span>
                  </label>
                )}
              </div>
            </div>

            {/* CHECKOUT 2.0 — modalidad de entrega */}
            <section id="checkout-fulfillment" aria-labelledby="checkout-fulfillment-title"
              className={`scroll-mt-24 space-y-3 border-t pt-4 ${t.divider}`}>
              <div className="space-y-1">
                <h2 id="checkout-fulfillment-title" className={`text-base font-black ${t.heading}`}>
                  ¿Cómo querés recibir tu pedido?
                </h2>
                <p className={`text-xs ${t.subtext}`}>
                  Elegí si te lo llevamos a domicilio o si preferís retirarlo en el local.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button type="button"
                  data-checkout-choice aria-pressed={fulfillmentChoice === "DELIVERY"}
                  onClick={() => chooseFulfillment("DELIVERY")}
                  className={`relative flex min-h-[132px] flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:p-4 ${
                    fulfillmentChoice === "DELIVERY" ? t.pillActive : t.pillInactive
                  }`}>
                  <div className="flex w-full items-start justify-between gap-2">
                    <Bike className="h-6 w-6 shrink-0" aria-hidden="true"/>
                    {fulfillmentChoice === "DELIVERY" && <Check className="h-5 w-5" aria-hidden="true"/>}
                  </div>
                  <span className="text-sm font-extrabold leading-snug">Envío a domicilio</span>
                  <span className="text-[11px] leading-snug opacity-85">Te lo llevamos</span>
                  <span className="mt-auto text-[11px] font-bold">
                    {(config?.deliveryCost || 0) > 0
                      ? `+ $${(config.deliveryCost as number).toLocaleString("es-AR")}`
                      : "Sin cargo"}
                  </span>
                </button>
                <button type="button"
                  data-checkout-choice aria-pressed={fulfillmentChoice === "PICKUP"}
                  onClick={() => chooseFulfillment("PICKUP")}
                  className={`relative flex min-h-[132px] flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:p-4 ${
                    fulfillmentChoice === "PICKUP" ? t.pillActive : t.pillInactive
                  }`}>
                  <div className="flex w-full items-start justify-between gap-2">
                    <Store className="h-6 w-6 shrink-0" aria-hidden="true"/>
                    {fulfillmentChoice === "PICKUP" && <Check className="h-5 w-5" aria-hidden="true"/>}
                  </div>
                  <span className="text-sm font-extrabold leading-snug">Retiro en local</span>
                  <span className="text-[11px] leading-snug opacity-85">Pasás a buscarlo</span>
                  <span className="mt-auto text-[11px] font-bold">Sin costo de envío</span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {fulfillmentChoice === "DELIVERY" && (
                  <motion.div
                    key="delivery-address"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`mt-1 space-y-3 rounded-2xl border p-3.5 sm:p-4 ${t.switchBg}`}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true"/>
                        <h3 className={`text-sm font-extrabold ${t.label}`}>¿A qué dirección lo llevamos?</h3>
                      </div>
                      {loggedClient && savedAddresses.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs font-black ${t.label}`}>Tus direcciones guardadas</h4>
                            <button type="button" onClick={() => {
                              setAddressParts({ street: "", unit: "", reference: "" });
                              setFormData(prev => ({ ...prev, deliveryAddress: "" }));
                              setAddressTouched(true);
                              setSelectedSavedAddressId(null);
                              window.setTimeout(() => addressInputRef.current?.focus(), 100);
                            }} className={`text-[11px] font-bold underline ${t.accent}`}>
                              + Nueva dirección
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {savedAddresses.map(item => (
                              <button key={item.id} type="button"
                                data-checkout-choice aria-pressed={selectedSavedAddressId === item.id}
                                onClick={() => applySavedAddress(item)}
                                className={`flex min-w-0 items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors ${
                                  selectedSavedAddressId === item.id ? t.pillActive : t.pillInactive
                                }`}>
                                {item.label.toLowerCase() === "casa" ? <Home className="h-4 w-4 shrink-0" aria-hidden="true"/> :
                                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-black">
                                    {item.label} {item.isDefault ? "· Principal" : ""}
                                  </span>
                                  <span className="block break-words text-[11px] opacity-80">
                                    {item.street}
                                  </span>
                                </span>
                                {selectedSavedAddressId === item.id && <Check className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="delivery-street" className={`text-xs font-semibold ${t.label}`}>
                          Calle y número *
                        </Label>
                        <Input id="delivery-street" ref={addressInputRef} required={formData.needsDelivery}
                          autoComplete="street-address" maxLength={180}
                          className={`h-11 rounded-xl text-sm ${t.inputBg}`}
                          value={addressParts.street}
                          onChange={e => changeAddressPart("street", e.target.value)}
                          placeholder="Ej.: Mitre 1234"/>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="delivery-unit" className={`text-xs font-semibold ${t.label}`}>
                          Piso, departamento o casa (opcional)
                        </Label>
                        <Input id="delivery-unit" maxLength={60} autoComplete="address-line2"
                          className={`h-11 rounded-xl text-sm ${t.inputBg}`}
                          value={addressParts.unit}
                          onChange={e => changeAddressPart("unit", e.target.value)}
                          placeholder="Ej.: Piso 2, depto B"/>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="delivery-reference" className={`text-xs font-semibold ${t.label}`}>
                          Referencias para encontrar la dirección (opcional)
                        </Label>
                        <Input id="delivery-reference" maxLength={80}
                          className={`h-11 rounded-xl text-sm ${t.inputBg}`}
                          value={addressParts.reference}
                          onChange={e => changeAddressPart("reference", e.target.value)}
                          placeholder="Ej.: Portón negro, timbre rojo"/>
                      </div>
                      {loggedClient && !selectedSavedAddressId && (
                        <div className={`space-y-2 rounded-xl border p-3 ${t.switchBg}`}>
                          <div className="flex items-center gap-2">
                            <BookmarkPlus className="h-4 w-4 shrink-0" aria-hidden="true"/>
                            <span className={`text-xs font-black ${t.label}`}>¿Querés guardar esta dirección?</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className={`space-y-1 text-[11px] font-bold ${t.label}`}>
                              Nombre
                              <select aria-label="Nombre de la dirección"
                                value={newAddressLabel}
                                onChange={e => setNewAddressLabel(e.target.value)}
                                className={`h-10 w-full rounded-xl border px-3 text-xs ${t.selectBg}`}>
                                <option value="Casa">Casa</option>
                                <option value="Trabajo">Trabajo</option>
                                <option value="Otra">Otra</option>
                              </select>
                            </label>
                            <label className={`flex items-center gap-2 text-xs ${t.label}`}>
                              <input type="checkbox" checked={newAddressDefault}
                                onChange={e => setNewAddressDefault(e.target.checked)}
                                className="h-4 w-4 accent-orange-500"/>
                              Usar siempre por defecto
                            </label>
                          </div>
                          <Button type="button" variant="outline" disabled={savingAddress || !isDeliveryAddressValid(formData.deliveryAddress)}
                            onClick={() => void saveCheckoutAddress()}
                            className="h-10 w-full rounded-xl border-orange-500/50 text-xs font-bold">
                            <BookmarkPlus className="mr-2 h-4 w-4"/>
                            {savingAddress ? "Guardando…" : "Guardar para próximos pedidos"}
                          </Button>
                        </div>
                      )}
                      {!loggedClient && (
                        <p className={`text-[11px] ${t.subtext}`}>
                          Iniciá sesión para guardar direcciones y no tener que volver a escribirlas.
                        </p>
                      )}
                      <p className={`text-[11px] leading-relaxed ${t.subtext}`}>
                        Comprobá la dirección antes de confirmar. El comercio la recibirá junto con tu pedido.
                      </p>
                      {formData.deliveryAddress.length > 250 && (
                        <p className="text-xs font-bold text-red-500" role="alert">
                          Acortá la dirección o las referencias (máximo 250 caracteres entre todos los campos).
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {fulfillmentChoice === "PICKUP" && (
                <p className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed ${t.switchBg}`}>
                  <Info className="h-4 w-4 shrink-0" aria-hidden="true"/>
                  Elegiste retiro. No se cobrará envío; pasá por el local en el horario seleccionado.
                </p>
              )}
            </section>

            {/* Selección visual de horarios — cupos reales de la API */}
            <section aria-labelledby="checkout-slot-title" className={`space-y-2 border-t pt-4 ${t.divider}`}>
              <div className="space-y-1">
                <h2 id="checkout-slot-title" className={`text-sm font-black ${t.heading}`}>
                  {formData.needsDelivery ? "¿En qué horario querés recibirlo?" : "¿En qué horario querés retirarlo?"}
                </h2>
                <p className={`text-[11px] ${t.subtext}`}>
                  {formData.orderType === "IMMEDIATE"
                    ? "Elegí uno de los horarios disponibles para hoy."
                    : "Seleccioná tu horario preferido para el pedido programado."}
                </p>
              </div>
              {slots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Horarios del pedido">
                  {slots.map(slot => {
                    const available = isSlotSelectable(Number(slot.available));
                    const selected = formData.deliverySlotId === slot.id;
                    return (
                      <button type="button" key={slot.id} disabled={!available}
                        data-checkout-choice aria-pressed={selected}
                        onClick={() => setFormData(prev => ({
                          ...prev, deliverySlotId: slot.id, scheduledTime: slot.time,
                        }))}
                        className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2.5 text-center text-xs font-extrabold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                          !available ? t.pillDisabled : selected ? t.pillActive : t.pillInactive
                        }`}>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
                          {slot.time}
                          {selected && <Check className="h-3.5 w-3.5" aria-hidden="true"/>}
                        </span>
                        <span className="text-[10px] font-medium opacity-80">
                          {!available ? "Sin cupos" : formData.orderType === "IMMEDIATE"
                            ? `${slot.available} cupos`
                            : "Preferido"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`rounded-xl border p-3 text-xs ${t.warnBg}`} role="status">
                  {slotsLoadError
                    ? "No pudimos consultar los horarios. Volvé a cargar la página antes de confirmar."
                    : formData.orderType === "IMMEDIATE"
                      ? "No hay horarios disponibles para hoy."
                      : "El local confirmará el horario de tu pedido programado."}
                </div>
              )}
            </section>

            {/* Forma de pago sin desplegable */}
            <section aria-labelledby="checkout-payment-title" className={`space-y-2 border-t pt-4 ${t.divider}`}>
              <h2 id="checkout-payment-title" className={`text-sm font-black ${t.heading}`}>
                ¿Cómo querés pagar?
              </h2>
              {total <= 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs font-bold text-emerald-900">
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true"/>
                  Total $0 · Pedido bonificado por tu premio canjeado.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {config?.paymentCash !== false && (
                    <button type="button" data-checkout-choice aria-pressed={formData.paymentMethod === "CASH"}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "CASH" }))}
                      className={`flex min-h-[76px] items-center gap-2 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                        formData.paymentMethod === "CASH" ? t.pillActive : t.pillInactive
                      }`}>
                      <Banknote className="h-6 w-6 shrink-0" aria-hidden="true"/>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">Efectivo</span>
                        <span className="block text-[11px] opacity-85">Al recibir o retirar</span>
                      </span>
                      {formData.paymentMethod === "CASH" && <Check className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                    </button>
                  )}
                  {config?.paymentMp !== false && (
                    <button type="button" data-checkout-choice aria-pressed={formData.paymentMethod === "MP"}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "MP" }))}
                      className={`flex min-h-[76px] items-center gap-2 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                        formData.paymentMethod === "MP" ? t.pillActive : t.pillInactive
                      }`}>
                      <CreditCard className="h-6 w-6 shrink-0" aria-hidden="true"/>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">Mercado Pago</span>
                        <span className="block text-[11px] opacity-85">Pago online seguro</span>
                      </span>
                      {formData.paymentMethod === "MP" && <Check className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                    </button>
                  )}
                  {config?.paymentTransfer === true && (
                    <button type="button" data-checkout-choice aria-pressed={formData.paymentMethod === "TRANSFER"}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "TRANSFER" }))}
                      className={`flex min-h-[76px] items-center gap-2 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${formData.paymentMethod === "TRANSFER" ? t.pillActive : t.pillInactive}`}>
                      <Banknote className="h-6 w-6 shrink-0" aria-hidden="true"/>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-black">Transferencia</span>
                        <span className="block text-[11px] opacity-85">Comprobante por WhatsApp · aprobación manual</span>
                      </span>
                      {formData.paymentMethod === "TRANSFER" && <Check className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                    </button>
                  )}
                  {config?.paymentCash === false && config?.paymentMp === false && !config?.paymentTransfer && (
                    <p className={`rounded-xl border p-3 text-xs ${t.warnBg}`}>
                      El comercio todavía no tiene métodos de pago disponibles.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* COUPONS */}
            {availableCoupons.length > 0 && (
              <div className={`border-t pt-4 space-y-2 ${t.divider}`}>
                <Label className={`font-bold text-xs ml-0.5 flex items-center gap-1.5 ${t.label}`}>
                  <Ticket className="w-3.5 h-3.5" /> ¿Aplicar un cupón de puntos?
                </Label>
                <div className="space-y-1.5">
                  <div
                    onClick={() => {
                      setSelectedCoupon(null);
                      setUserOptedOutCoupon(true);
                      dismissCoupon();
                    }}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all flex items-center justify-between ${
                      selectedCoupon === null ? t.couponNone : t.couponInactive
                    }`}
                  >
                    <span>No aplicar cupón</span>
                    {selectedCoupon === null && <Check className="w-3.5 h-3.5" />}
                  </div>

                  {availableCoupons.map((coupon) => {
                    const isSelected = selectedCoupon?.id === coupon.id;
                    const compatible = !coupon.reward?.minTier ||
                      allowsTierBenefit(coupon.reward.minTier.paymentMode, formData.paymentMethod);
                    return (
                      <div
                        key={coupon.id}
                        onClick={() => {
                          if (!compatible) return;
                          setSelectedCoupon(coupon);
                          setUserOptedOutCoupon(false);
                        }}
                        className={`p-2.5 rounded-xl border text-[11px] transition-all flex items-center justify-between ${compatible ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${
                          isSelected ? t.couponActive : t.couponInactive
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`font-black text-xs block ${t.heading}`}>🎁 {coupon.reward?.name}</span>
                          <span className={`text-[10px] block ${t.subtext}`}>
                            {coupon.reward?.type === "PERCENT"
                              ? `${coupon.reward.value}% de descuento`
                              : coupon.reward?.type === "AMOUNT"
                              ? `$${coupon.reward.value?.toLocaleString("es-AR")} de descuento`
                              : `Producto gratis`}
                          </span>
                          {!compatible && <span className="text-[10px] font-bold text-red-600">
                            Solo {coupon.reward.minTier.paymentMode === "CASH" ? "efectivo" : "Mercado Pago"}
                          </span>}
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUMMARY — estado de pedido claramente visible antes de confirmar */}
            <section aria-label="Resumen de tu pedido"
              className={`rounded-2xl border p-3.5 space-y-2.5 ${t.summaryBg}`}>
              <h2 className={`text-sm font-black ${t.heading}`}>Revisá tu pedido</h2>
              <div className={`grid grid-cols-1 gap-2 rounded-xl border p-3 text-xs sm:grid-cols-2 ${t.switchBg}`}>
                <div className="flex items-start gap-2">
                  {formData.needsDelivery ? <Bike className="h-4 w-4 shrink-0" aria-hidden="true"/> : <Store className="h-4 w-4 shrink-0" aria-hidden="true"/>}
                  <div className="min-w-0">
                    <div className="font-black">
                      {fulfillmentChoice === "DELIVERY" ? "Envío a domicilio" :
                        fulfillmentChoice === "PICKUP" ? "Retiro en local" : "Elegí envío o retiro"}
                    </div>
                    {fulfillmentChoice === "DELIVERY" && addressParts.street && (
                      <div className="break-words opacity-80">{formData.deliveryAddress}</div>
                    )}
                    {fulfillmentChoice === "PICKUP" && <div className="opacity-80">Sin costo de envío</div>}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true"/>
                    <span className="font-bold">{formData.scheduledTime || "Horario por confirmar"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true"/>
                    <span className="font-bold">{checkoutPaymentLabel(formData.paymentMethod)}</span>
                  </div>
                </div>
              </div>
              <div className={`flex justify-between font-medium text-[11px] ${t.summaryText}`}>
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR")}</span>
              </div>
              {quantityDiscount && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>📦 {quantityDiscount.name} ({quantityDiscount.qualifyingUnits} un.)</span>
                  <span>-${quantityDiscount.amount.toLocaleString("es-AR")}</span>
                </div>
              )}
              {config?.globalDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold text-[11px]">
                  <span>Descuento ({config.globalDiscount}%)</span>
                  <span>-${(afterQuantityDiscount * (config.globalDiscount / 100)).toLocaleString("es-AR")}</span>
                </div>
              )}
              {tierDiscountPercent > 0 && (
                <div className="flex justify-between text-purple-600 font-bold text-[11px]">
                  <span>👑 Descuento VIP {loggedClient?.tier?.name} ({tierDiscountPercent}%)</span>
                  <span>-${tierDiscountAmount.toLocaleString("es-AR")}</span>
                </div>
              )}
              {dailyPrize && (
                <div className="flex justify-between items-center text-purple-600 font-bold text-[11px]">
                  <span>✨ Premio ({dailyPrize.type === "PRODUCT" ? dailyPrize.product?.name || "Producto" : dailyPrize.type === "PERCENT" ? `${dailyPrize.value}% OFF` : `$${dailyPrize.value} OFF`})</span>
                  <div className="flex items-center gap-1.5">
                    {dailyPrize.type !== "PRODUCT" && <span>-${prizeDiscount.toLocaleString("es-AR")}</span>}
                    {dailyPrize.type === "PRODUCT" && <span className="text-green-600">GRATIS</span>}
                    <button
                      type="button"
                      onClick={() => {
                        clearDailyPrize();
                        toast.info("Premio diario removido del pedido");
                      }}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                      title="Quitar premio"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {items.some((i) => i.isReward) && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>🎁 Premios canjeados ({items.filter((i) => i.isReward).reduce((s, i) => s + i.quantity, 0)} un.)</span>
                  <span className="text-emerald-700 font-black">BONIFICADO ($0)</span>
                </div>
              )}
              {selectedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>🎁 Cupón ({selectedCoupon.reward?.name})</span>
                  <span>-${couponDiscount.toLocaleString("es-AR")}</span>
                </div>
              )}
              {selectedCoupon && (selectedCoupon.reward?.type === "PRODUCT" || selectedCoupon.reward?.type === "COMBO") && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>🎁 Cupón ({selectedCoupon.reward?.name})</span>
                  <span>{productCouponBonus > 0 ? `-$${productCouponBonus.toLocaleString("es-AR")}` : "Bonificado en pedido"}</span>
                </div>
              )}
              {formData.needsDelivery && (
                <div className={`flex justify-between font-medium text-[11px] ${t.summaryText}`}>
                  <span>Costo de envío</span>
                  <span>${deliveryCost.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className={`flex justify-between font-black text-lg pt-2 border-t mt-1 ${t.divider}`}>
                <span className={t.heading}>Total</span>
                <span className={t.summaryTotal}>${total.toLocaleString("es-AR")}</span>
              </div>
            </section>

            <Button
              type="submit"
              className={`w-full h-12 rounded-2xl text-sm font-bold text-white shadow-lg group transition-all ${t.accentBg} ${t.accentBgHover}`}
              disabled={isSubmitting || (config?.paymentCash === false && config?.paymentMp === false && !config?.paymentTransfer)}
            >
              {isSubmitting ? "Procesando pedido..." : checkoutActionLabel(formData.paymentMethod, total)}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        </div>
      </div>

    </>
  );
}
