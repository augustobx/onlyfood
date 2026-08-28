"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  MapPinIcon, 
  ArrowLeft, 
  Copy, 
  Check, 
  ShoppingBag, 
  UserRound, 
  Phone, 
  Share2, 
  AlertCircle,
  Truck,
  Receipt,
  Calendar,
  CalendarDays,
  ChefHat,
  Flame,
  CheckCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AutoRefresh from "./AutoRefresh";
import MPReturnHandler from "./MPReturnHandler";
import { PushPrompt } from "./PushPrompt";

interface TrackOrderClientProps {
  order: any;
  relatedOrders?: any[];
  config: any;
  deliveryCost: number;
  searchParams?: { status?: string; payment_id?: string; token?: string };
}

function getThemeStyles(theme: string) {
  switch (theme) {
    case "COMIC_FOOD_POP":
      return {
        page: "bg-[#fff7db] text-[#17121f] min-h-[100dvh]",
        header: "bg-[#fff7db]/95 border-b-[3px] border-[#17121f] text-[#17121f]",
        backBtn: "bg-white border-2 border-[#17121f] text-[#17121f] shadow-[3px_3px_0_#17121f]",
        card: "bg-white border-[3px] border-[#17121f] text-[#17121f] shadow-[6px_6px_0_#17121f]",
        cardInner: "bg-[#fff7db] border-2 border-[#17121f]/30",
        heading: "text-[#17121f] uppercase",
        subtext: "text-[#5e5368] font-semibold",
        mutedText: "text-[#7a6f82]",
        accent: "text-[#17121f]",
        accentBg: "bg-[var(--brand-primary)] border-2 border-[#17121f] text-white shadow-[4px_4px_0_#17121f]",
        secondaryBtn: "bg-white border-2 border-[#17121f] text-[#17121f] shadow-[3px_3px_0_#17121f]",
        badgeActive: "bg-[#ffe45e] border-2 border-[#17121f] text-[#17121f] font-black",
        badgePending: "bg-white border-2 border-[#17121f]/30 text-[#6d6374]",
        stepCompleted: "bg-[#8ef0d0] text-[#17121f] border-2 border-[#17121f] shadow-[3px_3px_0_#17121f]",
        stepCurrent: "bg-[#ffe45e] text-[#17121f] border-2 border-[#17121f] shadow-[4px_4px_0_#17121f] scale-105",
        stepPending: "bg-white text-[#82778a] border-2 border-[#17121f]/30",
        stepLine: "bg-[#17121f]/20",
        stepLineFilled: "bg-[#17121f]",
        divider: "border-[#17121f]/25",
        totalText: "text-[#17121f] font-black",
        tagGreen: "bg-[#8ef0d0] text-[#17121f] border-2 border-[#17121f]",
        tagOrange: "bg-[#ffe45e] text-[#17121f] border-2 border-[#17121f]",
        tagPurple: "bg-[#eee1ff] text-purple-950 border-2 border-[#17121f]",
        messengerCard: "bg-[#8ef0d0] border-[#17121f] text-[#17121f]",
        messengerBadge: "bg-white text-[#17121f] border border-[#17121f]",
      };
    case "ARCADE_KITCHEN":
      return {
        page: "bg-[#090625] text-white min-h-[100dvh]",
        header: "bg-[#090625]/95 border-b-2 border-cyan-300/70 text-white",
        backBtn: "bg-[#15113b] border-2 border-cyan-300 text-cyan-200 shadow-[3px_3px_0_#ec4899]",
        card: "bg-[#15113b] border-2 border-cyan-300 text-white shadow-[6px_6px_0_#ec4899]",
        cardInner: "bg-[#090625] border border-cyan-300/30",
        heading: "text-white uppercase tracking-wide",
        subtext: "text-violet-200/65 font-mono",
        mutedText: "text-violet-300/45",
        accent: "text-cyan-300",
        accentBg: "bg-fuchsia-600 border-2 border-yellow-200 text-white shadow-[4px_4px_0_#32f5ff]",
        secondaryBtn: "bg-[#090625] border-2 border-cyan-300 text-cyan-200",
        badgeActive: "bg-yellow-200 border-2 border-yellow-200 text-[#090625] font-black",
        badgePending: "bg-[#090625] border border-violet-400/40 text-violet-300",
        stepCompleted: "bg-cyan-300 text-[#090625] border-2 border-cyan-100 shadow-[3px_3px_0_#ec4899]",
        stepCurrent: "bg-yellow-200 text-[#090625] border-2 border-yellow-100 shadow-[4px_4px_0_#ec4899] scale-105",
        stepPending: "bg-[#090625] text-violet-400 border border-violet-400/35",
        stepLine: "bg-violet-400/20",
        stepLineFilled: "bg-gradient-to-r from-cyan-300 to-fuchsia-500",
        divider: "border-cyan-300/25",
        totalText: "text-yellow-200 font-black",
        tagGreen: "bg-emerald-300/15 text-emerald-200 border border-emerald-300/40",
        tagOrange: "bg-yellow-200/15 text-yellow-100 border border-yellow-200/40",
        tagPurple: "bg-fuchsia-300/15 text-fuchsia-200 border border-fuchsia-300/40",
        messengerCard: "bg-cyan-300/10 border-cyan-300/40 text-white",
        messengerBadge: "bg-cyan-300/15 text-cyan-200",
      };
    case "URBAN_DARK":
      return {
        page: "bg-[#080a0f] text-slate-100 font-sans min-h-[100dvh]",
        header: "bg-[#080a0f]/90 backdrop-blur-xl border-b border-white/[0.08] text-white",
        backBtn: "bg-white/[0.06] border-white/[0.08] text-slate-300 hover:bg-white/[0.12] hover:text-white",
        card: "bg-white/[0.04] border border-white/[0.08] text-white shadow-xl backdrop-blur-md",
        cardInner: "bg-white/[0.02] border border-white/[0.06]",
        heading: "text-white",
        subtext: "text-slate-400",
        mutedText: "text-slate-500",
        accent: "text-orange-400",
        accentBg: "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25",
        secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200",
        badgeActive: "bg-orange-500/20 border border-orange-500/40 text-orange-300",
        badgePending: "bg-white/[0.04] border border-white/[0.08] text-slate-400",
        stepCompleted: "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.45)] ring-2 ring-orange-400/40",
        stepCurrent: "bg-orange-600 text-white shadow-[0_0_25px_rgba(249,115,22,0.6)] ring-4 ring-orange-500/30 scale-105",
        stepPending: "bg-white/[0.06] text-slate-500 border border-white/[0.08]",
        stepLine: "bg-white/10",
        stepLineFilled: "bg-gradient-to-r from-orange-500 to-amber-500",
        divider: "border-white/[0.08]",
        totalText: "text-orange-400 font-black",
        tagGreen: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        tagOrange: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
        tagPurple: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
        messengerCard: "bg-orange-950/25 border-orange-500/30 text-white",
        messengerBadge: "bg-orange-500/20 text-orange-300",
      };
    case "FAST_NEO":
      return {
        page: "bg-slate-50 text-slate-900 font-sans min-h-[100dvh]",
        header: "bg-white border-b border-slate-100 shadow-xs text-slate-900",
        backBtn: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
        card: "bg-white border border-slate-200/90 text-slate-900 shadow-sm",
        cardInner: "bg-slate-50/80 border border-slate-100",
        heading: "text-slate-900",
        subtext: "text-slate-500",
        mutedText: "text-slate-400",
        accent: "text-orange-600",
        accentBg: "bg-orange-600 hover:bg-orange-700 text-white shadow-sm",
        secondaryBtn: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
        badgeActive: "bg-orange-50 border border-orange-200 text-orange-800 font-bold",
        badgePending: "bg-slate-100 border border-slate-200 text-slate-500",
        stepCompleted: "bg-orange-600 text-white shadow-md",
        stepCurrent: "bg-orange-600 text-white shadow-lg ring-4 ring-orange-200 scale-105",
        stepPending: "bg-slate-100 text-slate-400 border border-slate-200",
        stepLine: "bg-slate-200",
        stepLineFilled: "bg-orange-600",
        divider: "border-slate-200",
        totalText: "text-slate-900 font-black",
        tagGreen: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        tagOrange: "bg-orange-50 text-orange-700 border border-orange-200",
        tagPurple: "bg-purple-50 text-purple-700 border border-purple-200",
        messengerCard: "bg-orange-50/70 border-orange-200 text-slate-900",
        messengerBadge: "bg-orange-100 text-orange-800",
      };
    case "CLEAN_BOUTIQUE":
      return {
        page: "bg-[#f6f3ee] text-stone-900 font-sans min-h-[100dvh]",
        header: "bg-[#f6f3ee]/90 backdrop-blur-xl border-b border-stone-300/50 text-stone-900",
        backBtn: "bg-white border-stone-300/50 text-stone-700 hover:bg-stone-50",
        card: "bg-white border border-stone-300/60 text-stone-900 shadow-sm",
        cardInner: "bg-[#faf8f5] border border-stone-200/80",
        heading: "text-stone-900 font-serif",
        subtext: "text-stone-500",
        mutedText: "text-stone-400",
        accent: "text-amber-800",
        accentBg: "bg-stone-900 hover:bg-stone-800 text-white font-serif shadow-sm tracking-wide",
        secondaryBtn: "bg-white border border-stone-300/50 text-stone-700 hover:bg-stone-50 font-serif",
        badgeActive: "bg-stone-100 border border-stone-300/80 text-stone-900 font-serif font-bold",
        badgePending: "bg-stone-100 border border-stone-200 text-stone-500",
        stepCompleted: "bg-stone-900 text-amber-300 shadow-sm",
        stepCurrent: "bg-stone-900 text-amber-300 shadow-md ring-4 ring-stone-300/60 scale-105",
        stepPending: "bg-stone-100 text-stone-400 border border-stone-200",
        stepLine: "bg-stone-200",
        stepLineFilled: "bg-stone-900",
        divider: "border-stone-200",
        totalText: "text-stone-900 font-serif font-black",
        tagGreen: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        tagOrange: "bg-amber-50 text-amber-900 border border-amber-200",
        tagPurple: "bg-purple-50 text-purple-900 border border-purple-200",
        messengerCard: "bg-stone-100/80 border-stone-300/70 text-stone-900",
        messengerBadge: "bg-stone-200 text-stone-800",
      };
    default: // NEXO / ORIGINAL
      return {
        page: "text-slate-950 font-sans min-h-[100dvh]",
        header: "bg-white/90 backdrop-blur-xl border-b border-slate-200/80 text-slate-950",
        backBtn: "bg-white border-slate-200 text-slate-700 hover:bg-slate-100",
        card: "bg-white border border-slate-200/80 text-slate-950 shadow-md",
        cardInner: "bg-slate-50/70 border border-slate-100",
        heading: "text-slate-950",
        subtext: "text-slate-500",
        mutedText: "text-slate-400",
        accent: "text-orange-600",
        accentBg: "bg-slate-950 hover:bg-slate-900 text-white shadow-lg shadow-slate-950/20",
        secondaryBtn: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100",
        badgeActive: "bg-orange-100 text-orange-700 font-bold",
        badgePending: "bg-slate-100 text-slate-500",
        stepCompleted: "bg-orange-600 text-white shadow-lg",
        stepCurrent: "bg-orange-600 text-white shadow-xl ring-4 ring-orange-200 scale-105",
        stepPending: "bg-slate-100 text-slate-400 border border-slate-200",
        stepLine: "bg-slate-200",
        stepLineFilled: "bg-orange-600",
        divider: "border-slate-200",
        totalText: "text-orange-600 font-black",
        tagGreen: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        tagOrange: "bg-orange-50 text-orange-700 border border-orange-200",
        tagPurple: "bg-purple-50 text-purple-700 border border-purple-200",
        messengerCard: "bg-orange-50/60 border-orange-200 text-slate-950",
        messengerBadge: "bg-orange-100 text-orange-700",
      };
  }
}

function parseDeliveryDate(order: any): {
  isToday: boolean;
  isTomorrow: boolean;
  isFuture: boolean;
  formattedDate: string;
  dayShort: string;
  badgeLabel: string;
} {
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayShorts = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (!order.scheduledDate && order.orderType !== "SCHEDULED_TOMORROW" && order.orderType !== "CUSTOM_DATE") {
    return {
      isToday: true,
      isTomorrow: false,
      isFuture: false,
      formattedDate: "Hoy",
      dayShort: "Hoy",
      badgeLabel: "⚡ Entrega Hoy",
    };
  }

  const now = new Date();
  let target: Date;

  if (order.orderType === "SCHEDULED_TOMORROW") {
    target = new Date(now);
    target.setDate(target.getDate() + 1);
  } else if (order.scheduledDate) {
    target = new Date(order.scheduledDate);
  } else {
    target = new Date(now);
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = isSameDay(target, now);
  const isTomorrow = isSameDay(target, tomorrow);
  const isFuture = !isToday && !isTomorrow;

  const dayName = dayNames[target.getDay()];
  const dayShort = `${dayShorts[target.getDay()]} ${target.getDate()}`;
  const formattedDate = `${dayName} ${target.getDate()} de ${monthNames[target.getMonth()]}`;

  const badgeLabel = isToday
    ? "⚡ Entrega Hoy"
    : isTomorrow
    ? "⏰ Entrega Mañana"
    : `📅 Entrega el ${dayName} ${target.getDate()}`;

  return {
    isToday,
    isTomorrow,
    isFuture,
    formattedDate,
    dayShort,
    badgeLabel,
  };
}

export function TrackOrderClient({ order, relatedOrders = [], config, deliveryCost, searchParams }: TrackOrderClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const theme = config?.storeTheme || "ORIGINAL";
  const appName = config?.appName || "OnlyFood";
  const s = getThemeStyles(theme);

  const dateInfo = parseDeliveryDate(order);
  const isCancelled = order.status === "CANCELLED";

  // Build appropriate stepper based on whether the order is for TODAY vs a FUTURE / SCHEDULED DATE
  const isImmediateFlow = dateInfo.isToday;

  const statuses = isImmediateFlow
    ? order.needsDelivery
      ? [
          { id: "NEW", label: "Recibido", icon: Package },
          { id: "IN_PROCESS", label: "Preparando", icon: Clock },
          { id: "PENDING_DELIVERY", label: "Listo", icon: Package },
          { id: "OUT_FOR_DELIVERY", label: "En camino", icon: MapPinIcon },
          { id: "DELIVERED", label: "Entregado", icon: CheckCircle2 },
        ]
      : [
          { id: "NEW", label: "Recibido", icon: Package },
          { id: "IN_PROCESS", label: "Preparando", icon: Clock },
          { id: "FINISHED", label: "Listo para retirar", icon: Package },
          { id: "DELIVERED", label: "Entregado", icon: CheckCircle2 },
        ]
    : order.needsDelivery
      ? [
          { id: "NEW", label: "Agendado", icon: CalendarDays },
          { id: "IN_PROCESS", label: "En Cocina", icon: ChefHat },
          { id: "OUT_FOR_DELIVERY", label: "En camino", icon: Truck },
          { id: "DELIVERED", label: "Entregado", icon: CheckCircle2 },
        ]
      : [
          { id: "NEW", label: "Agendado", icon: CalendarDays },
          { id: "IN_PROCESS", label: "En Cocina", icon: ChefHat },
          { id: "FINISHED", label: "Listo retiro", icon: Package },
          { id: "DELIVERED", label: "Entregado", icon: CheckCircle2 },
        ];

  const currentIndex = statuses.findIndex((st) => st.id === order.status);
  const currentStatusLabel =
    currentIndex >= 0
      ? statuses[currentIndex].label
      : isCancelled
      ? "Cancelado"
      : !isImmediateFlow
      ? "Confirmado y Agendado"
      : "Procesando";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("¡Enlace copiado!", {
        description: "Podés compartir este enlace o guardarlo para seguir el estado de tu pedido.",
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Número de orden copiado");
  };

  // Build list of all related orders (including current one) sorted by scheduled date
  const allOrdersList = [
    { ...order, isCurrent: true },
    ...relatedOrders.map((o) => ({ ...o, isCurrent: false })),
  ].sort((a, b) => {
    const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : new Date(a.createdAt).getTime();
    const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : new Date(b.createdAt).getTime();
    return da - db;
  });

  return (
    <div className={`track-page ${s.page} pb-24`}>
      <AutoRefresh intervalMs={20000} />
      <MPReturnHandler
        orderId={order.id}
        paymentId={searchParams?.payment_id}
        status={searchParams?.status || undefined}
        paymentStatus={order.paymentStatus}
      />

      {/* ══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR
      ══════════════════════════════════════════════════════════ */}
      <nav className={`sticky top-0 z-40 w-full px-3.5 sm:px-6 py-2.5 sm:py-3 shadow-xs ${s.header}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Back / Home button */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shrink-0 ${s.backBtn}`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Volver al Menú</span>
            <span className="sm:hidden">Menú</span>
          </Link>

          {/* Center: Branding & Order tag */}
          <div className="flex items-center gap-2 min-w-0 text-center">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              {config?.logoUrl && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs overflow-hidden">
                  <img src={config.logoUrl} alt={appName} className="h-full w-full object-cover" />
                </span>
              )}
              <span className={`text-sm sm:text-base font-black truncate leading-none ${theme === "CLEAN_BOUTIQUE" ? "font-serif" : ""}`}>
                {appName}
              </span>
            </Link>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/profile"
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${s.backBtn}`}
            >
              <UserRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mis Pedidos</span>
            </Link>

            <button
              type="button"
              onClick={handleCopyLink}
              title="Compartir link de seguimiento"
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${s.backBtn}`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          MAIN TRACKING CONTENT
      ══════════════════════════════════════════════════════════ */}
      <main className="max-w-2xl mx-auto px-3.5 sm:px-6 pt-5 sm:pt-8 space-y-5 sm:space-y-6">

        {/* ═══ MULTI-DAY PLAN SWITCHER (IF MORE THAN 1 ORDER) ═══ */}
        {allOrdersList.length > 1 && (
          <div className="p-3.5 rounded-2xl border bg-orange-50/60 border-orange-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-orange-600" /> Tu Plan de Entregas ({allOrdersList.length} pedidos)
              </span>
              <span className="text-[10px] font-bold text-orange-700">Tocá un día para ver su estado:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {allOrdersList.map((ord, idx) => {
                const info = parseDeliveryDate(ord);
                const isSelected = ord.isCurrent;
                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      if (!isSelected) {
                        const tokenQuery = searchParams?.token ? `?token=${encodeURIComponent(searchParams.token)}` : "";
                        router.push(`/track/${ord.id}${tokenQuery}`);
                      }
                    }}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                      isSelected
                        ? "bg-orange-600 text-white border-orange-700 shadow-sm scale-[1.02]"
                        : "bg-white text-slate-700 border-orange-200 hover:bg-orange-100/50"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${ord.status === "DELIVERED" ? "bg-emerald-400" : isSelected ? "bg-white animate-pulse" : "bg-orange-400"}`} />
                    <span>{info.dayShort}</span>
                    <span className="opacity-75 text-[10px]">#{ord.id.slice(-4).toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TITLE & SCHEDULED DATE HERO CARD ═══ */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20">
            <i className={`h-2 w-2 rounded-full ${dateInfo.isToday ? "bg-emerald-500 animate-ping" : "bg-orange-500"}`} />
            {dateInfo.badgeLabel}
          </div>

          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${s.heading}`}>
            {dateInfo.isToday ? "Estado de tu pedido en vivo" : `Entrega agendada para el ${dateInfo.formattedDate}`}
          </h1>

          <div className="flex items-center justify-center gap-2 pt-0.5">
            <button
              onClick={handleCopyOrderId}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${s.cardInner} ${s.subtext} hover:opacity-80`}
              title="Tocar para copiar ID"
            >
              <span>Orden #{order.id.slice(-6).toUpperCase()}</span>
              <Copy className="w-3 h-3" />
            </button>
            {order.scheduledTime && (
              <>
                <span className={`text-xs ${s.mutedText}`}>·</span>
                <span className="text-xs font-black text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-md border border-orange-200">
                  ⏰ Franja: {order.scheduledTime} hs
                </span>
              </>
            )}
          </div>
        </div>

        {/* ═══ SCHEDULED EXPLANATION BANNER (FOR FUTURE DATES) ═══ */}
        {!dateInfo.isToday && !isCancelled && (
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs flex items-start gap-3.5 ${s.tagPurple} bg-purple-50/70 border-purple-200 text-purple-950`}>
            <Calendar className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <p className="font-extrabold text-purple-900">
                ¡Tu pedido está confirmado para el {dateInfo.formattedDate}!
              </p>
              <p className="text-purple-700 leading-relaxed text-xs">
                Para garantizar la máxima frescura, la cocina comenzará la elaboración de tus platos durante la mañana del {dateInfo.formattedDate}.
                Podés volver a esta pantalla ese mismo día para ver el seguimiento del despacho en tiempo real.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STATUS STEPPER / CANCELLED CARD ═══ */}
        {isCancelled ? (
          <div className="border border-rose-500/40 bg-rose-500/10 p-6 sm:p-8 rounded-3xl text-center space-y-3 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-500">Pedido Cancelado</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-md mx-auto">
                {order.paymentMethod === "MP"
                  ? "Cancelado por falta de confirmación de pago o cancelación manual."
                  : "Tu pedido ha sido cancelado. Comunicate con el local si tenés dudas."}
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => router.push("/")}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl px-6 h-11"
              >
                Volver al Menú
              </Button>
            </div>
          </div>
        ) : (
          <div className={`p-5 sm:p-8 rounded-3xl border shadow-sm ${s.card}`}>
            {/* Status header */}
            <div className="text-center mb-7 sm:mb-8 space-y-1">
              <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.16em] ${s.subtext}`}>
                {dateInfo.isToday ? "Estado actual en cocina" : "Estado del encargo"}
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${currentIndex >= 0 ? "bg-orange-500 animate-pulse" : "bg-slate-400"}`} />
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${s.heading}`}>
                  {currentStatusLabel}
                </h2>
              </div>
              <p className={`text-xs ${s.mutedText}`}>
                {dateInfo.isToday
                  ? "Esta pantalla se actualiza en tiempo real automáticamente."
                  : `El día ${dateInfo.formattedDate} verás aquí el avance en cocina y reparto.`}
              </p>
            </div>

            {/* Stepper progress line */}
            <div className="relative px-2">
              <div className={`absolute top-5 left-6 right-6 h-1 rounded-full ${s.stepLine}`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${s.stepLineFilled}`}
                  style={{
                    width: `${(Math.max(0, currentIndex) / Math.max(1, statuses.length - 1)) * 100}%`,
                  }}
                />
              </div>

              <div className="relative flex justify-between">
                {statuses.map((st, idx) => {
                  const Icon = st.icon;
                  const isCompleted = currentIndex > idx;
                  const isCurrent = currentIndex === idx;
                  const isUpcoming = currentIndex < idx;

                  const circleClass = isCurrent
                    ? s.stepCurrent
                    : isCompleted
                    ? s.stepCompleted
                    : s.stepPending;

                  return (
                    <div key={st.id} className="flex flex-col items-center gap-2 z-10">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${circleClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs font-bold text-center max-w-[70px] sm:max-w-[85px] leading-tight transition-colors ${
                          isCurrent
                            ? `${s.accent} font-black`
                            : isCompleted
                            ? s.heading
                            : s.mutedText
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PUSH NOTIFICATIONS PROMPT ═══ */}
        {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
          <PushPrompt orderId={order.id} clientId={order.clientId || undefined} trackingToken={searchParams?.token} theme={theme} />
        )}

        {/* ═══ MESSENGER INFO CARD (Delivery in progress) ═══ */}
        {order.messenger && order.status === "OUT_FOR_DELIVERY" && (
          <div className={`p-5 rounded-3xl border shadow-sm space-y-3 ${s.messengerCard}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Truck className="w-5 h-5 text-orange-500 animate-bounce" />
                <span>Tu repartidor está en camino</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${s.messengerBadge}`}>
                En viaje
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="font-extrabold text-base">{order.messenger.name}</p>
                {order.messenger.phone && (
                  <p className="text-xs opacity-80 mt-0.5">Tel: {order.messenger.phone}</p>
                )}
              </div>
              {order.messenger.phone && (
                <a
                  href={`tel:${order.messenger.phone}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-sm hover:bg-orange-500 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Llamar
                </a>
              )}
            </div>
          </div>
        )}

        {/* ═══ ORDER DETAILS CARD ═══ */}
        <div className={`rounded-3xl border shadow-sm p-5 sm:p-7 space-y-5 ${s.card}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-500" />
              <h3 className={`font-black text-lg tracking-tight ${s.heading}`}>
                Detalles del Pedido
              </h3>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${order.paymentStatus === 'PAID' ? s.tagGreen : s.tagOrange}`}>
              {order.paymentStatus === 'PAID' ? '✓ Pagado' : order.paymentMethod === 'CASH' ? '💵 Efectivo al recibir' : '⏳ Pendiente'}
            </span>
          </div>

          {/* Client & delivery data */}
          <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${s.cardInner}`}>
            <div className="flex justify-between">
              <span className={s.subtext}>Fecha de Entrega:</span>
              <span className={`font-black text-orange-600`}>{dateInfo.formattedDate}</span>
            </div>
            {order.scheduledTime && (
              <div className="flex justify-between">
                <span className={s.subtext}>Franja Horaria:</span>
                <span className={`font-bold ${s.heading}`}>{order.scheduledTime} hs</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={s.subtext}>Cliente:</span>
              <span className={`font-bold ${s.heading}`}>{order.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className={s.subtext}>Teléfono:</span>
              <span className={`font-bold ${s.heading}`}>{order.clientPhone}</span>
            </div>
            {order.needsDelivery && order.deliveryAddress && (
              <div className="flex justify-between items-start gap-2 pt-1 border-t border-dashed border-white/10 mt-1">
                <span className={s.subtext}>Dirección:</span>
                <span className={`font-bold text-right ${s.heading}`}>{order.deliveryAddress}</span>
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="divide-y divide-white/10 border rounded-2xl overflow-hidden border-white/10">
            {order.items.map((item: any) => (
              <div key={item.id} className={`p-3.5 sm:p-4 flex justify-between gap-3 ${s.cardInner}`}>
                <div className="min-w-0 flex-1">
                  <div className={`font-bold text-sm leading-snug ${s.heading}`}>
                    {item.quantity}x {item.product.name}
                  </div>

                  {item.addedExtras && item.addedExtras.length > 0 && (
                    <div className="text-xs mt-1 space-y-0.5">
                      {item.addedExtras.map((ex: any) => (
                        <span key={ex.extraId || ex.id} className="block text-emerald-400 font-medium">
                          + {ex.extra?.name || ex.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <div className={`text-xs italic mt-0.5 ${s.mutedText}`}>
                      Sin algunos ingredientes
                    </div>
                  )}

                  {item.notes && (
                    <p className={`text-xs italic mt-1 p-1.5 rounded-lg border ${s.cardInner} ${s.mutedText}`}>
                      "{item.notes}"
                    </p>
                  )}
                </div>

                <div className={`font-black text-sm whitespace-nowrap self-start ${s.heading}`}>
                  ${item.subtotal.toLocaleString("es-AR")}
                </div>
              </div>
            ))}
          </div>

          {/* Totals breakdown */}
          <div className="space-y-1.5 pt-2 text-xs">
            <div className={`flex justify-between font-medium ${s.subtext}`}>
              <span>Subtotal</span>
              <span>${(order.total - deliveryCost).toLocaleString("es-AR")}</span>
            </div>

            {order.needsDelivery && (
              <div className={`flex justify-between font-medium ${s.subtext}`}>
                <span>Costo de envío</span>
                <span>${deliveryCost.toLocaleString("es-AR")}</span>
              </div>
            )}

            <div className={`flex justify-between items-baseline pt-3 border-t font-black text-base sm:text-lg ${s.divider}`}>
              <span className={s.heading}>Total</span>
              <span className={`text-xl sm:text-2xl ${s.totalText}`}>
                ${order.total.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            ACTION & NAVIGATION BUTTONS (NEVER GET TRAPPED)
        ══════════════════════════════════════════════════════════ */}
        <div className="space-y-3 pt-2">
          {/* PRIMARY: Return to store / order again */}
          <Button
            onClick={() => router.push("/")}
            className={`w-full h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99] ${s.accentBg}`}
          >
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <span>Volver a la Tienda / Hacer otro pedido</span>
          </Button>

          {/* SECONDARY & AUXILIARY BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              onClick={() => router.push("/profile")}
              variant="outline"
              className={`h-12 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${s.secondaryBtn}`}
            >
              <UserRound className="w-4 h-4 shrink-0" />
              <span>Ver mis Pedidos</span>
            </Button>

            <Button
              onClick={handleCopyLink}
              variant="outline"
              className={`h-12 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${s.secondaryBtn}`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
              <span>{copied ? "¡Link copiado!" : "Copiar link de estado"}</span>
            </Button>
          </div>

        </div>

      </main>

      {/* ══════════════════════════════════════════════════════════
          MOBILE FLOATING DOCK
      ══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md md:hidden">
        <div className={`p-2 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 ${
          theme === "COMIC_FOOD_POP"
            ? "bg-[#fff7db]/95 border-[#17121f] text-[#17121f] shadow-[6px_6px_0_#17121f]"
            : theme === "ARCADE_KITCHEN"
            ? "bg-[#15113b]/95 border-cyan-300 text-white shadow-[6px_6px_0_#ec4899]"
            : theme === "URBAN_DARK"
            ? "bg-[#0c101a]/95 border-white/10 text-white"
            : theme === "CLEAN_BOUTIQUE"
            ? "bg-white/95 border-stone-300 text-stone-900"
            : "bg-slate-900/95 border-white/20 text-white"
        }`}>
          <Link
            href="/"
            className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ir al Menú</span>
          </Link>
          <Link
            href="/profile"
            className={`h-11 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
              theme === "COMIC_FOOD_POP"
                ? "bg-white border-[#17121f] text-[#17121f]"
                : theme === "ARCADE_KITCHEN"
                ? "bg-[#090625] border-cyan-300 text-cyan-200"
                : theme === "URBAN_DARK"
                ? "bg-white/10 border-white/10 text-slate-200"
                : theme === "CLEAN_BOUTIQUE"
                ? "bg-stone-100 border-stone-300 text-stone-800"
                : "bg-white/10 border-white/10 text-white"
            }`}
          >
            <UserRound className="w-4 h-4" />
            <span>Mis Pedidos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
