import { getLoggedClient } from "@/lib/auth";
import { getTenantDb } from "@/lib/tenant-db";
import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import { 
  ArrowLeft, 
  Star, 
  Package, 
  MapPinIcon, 
  CheckCircle2, 
  Clock, 
  CalendarDays, 
  Flame, 
  Truck,
  ChevronRight,
  Crown,
  Trophy,
  Zap,
  Sparkles,
  Award,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./LogoutButton";

const TIER_ICONS: Record<string, any> = {
  Crown,
  Flame,
  Star,
  Trophy,
  Zap,
  Award,
};

function isSameDayDate(d1?: string | Date | null, d2: Date = new Date()) {
  if (!d1) return false;
  const a = new Date(d1);
  return a.getFullYear() === d2.getFullYear() && a.getMonth() === d2.getMonth() && a.getDate() === d2.getDate();
}

function formatScheduledDateLabel(order: any): { label: string; isToday: boolean; isTomorrow: boolean } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (order.orderType === "SCHEDULED_TOMORROW") {
    return { label: "Mañana", isToday: false, isTomorrow: true };
  }

  if (!order.scheduledDate) {
    return { label: "Hoy", isToday: true, isTomorrow: false };
  }

  const target = new Date(order.scheduledDate);
  const isToday = isSameDayDate(target, now);
  const isTomorrow = isSameDayDate(target, tomorrow);

  if (isToday) return { label: "Hoy", isToday: true, isTomorrow: false };
  if (isTomorrow) return { label: "Mañana", isToday: false, isTomorrow: true };

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return {
    label: `${dayNames[target.getDay()]} ${target.getDate()} ${monthNames[target.getMonth()]}`,
    isToday: false,
    isTomorrow: false,
  };
}

export default async function ProfilePage() {
  const client = await getLoggedClient();
  
  if (!client) {
    redirect("/");
  }
  const db = await getTenantDb();
  const tenant = await getTenantContext();
  const loyaltyEnabled = tenant.features.has("loyalty");

  const [orders, tiers, dbClient, config] = await Promise.all([
    db.order.findMany({
      where: { clientId: client.id },
      orderBy: [
        { scheduledDate: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        items: { include: { product: true } }
      }
    }),
    loyaltyEnabled ? db.customerTier.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: "asc" }, { minSpent: "asc" }],
    }) : [],
    db.client.findUnique({
      where: { id: client.id },
      include: { customTier: true },
    }),
    db.systemConfig.findFirst({
      select: { storeTheme: true },
    }),
  ]);

  const isSushiZen = config?.storeTheme === "SUSHI_ZEN";

  const activeOrders = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const pastOrders = orders.filter(o => o.status === "DELIVERED" || o.status === "CANCELLED");

  // Determine client tier
  const completedOrders = orders.filter(o => o.status !== "CANCELLED");
  const ordersCount = completedOrders.length;
  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const points = dbClient?.points || 0;

  let activeTier: any = dbClient?.customTier || null;
  if (!activeTier && tiers.length > 0) {
    const reverseTiers = [...tiers].sort((a, b) => b.sequence - a.sequence || b.minSpent - a.minSpent);
    activeTier = reverseTiers.find((t) => {
      const meetsOrders = t.minOrdersCount === 0 || ordersCount >= t.minOrdersCount;
      const meetsSpent = t.minSpent === 0 || totalSpent >= t.minSpent;
      const meetsPoints = t.minPoints === 0 || points >= t.minPoints;
      return meetsOrders && meetsSpent && meetsPoints;
    }) || tiers[0];
  }

  let nextTier: any = null;
  let progressPercent = 0;

  if (activeTier && tiers.length > 1) {
    const currentIndex = tiers.findIndex(t => t.id === activeTier.id);
    if (currentIndex >= 0 && currentIndex < tiers.length - 1) {
      nextTier = tiers[currentIndex + 1];
      if (nextTier.minSpent > 0) {
        progressPercent = Math.min(100, Math.round((totalSpent / nextTier.minSpent) * 100));
      } else if (nextTier.minOrdersCount > 0) {
        progressPercent = Math.min(100, Math.round((ordersCount / nextTier.minOrdersCount) * 100));
      } else if (nextTier.minPoints > 0) {
        progressPercent = Math.min(100, Math.round((points / nextTier.minPoints) * 100));
      }
    }
  }

  const TierIcon = activeTier?.iconName ? TIER_ICONS[activeTier.iconName] || Crown : Crown;

  // Split active orders into TODAY vs FUTURE SCHEDULED
  const todayActiveOrders = activeOrders.filter(o => {
    if (o.orderType === "SCHEDULED_TOMORROW") return false;
    if (o.orderType === "CUSTOM_DATE" && !isSameDayDate(o.scheduledDate, new Date())) return false;
    return true;
  });

  const futureScheduledOrders = activeOrders.filter(o => {
    if (o.orderType === "SCHEDULED_TOMORROW") return true;
    if (o.orderType === "CUSTOM_DATE" && !isSameDayDate(o.scheduledDate, new Date())) return true;
    return false;
  });

  return (
    <div className="profile-page max-w-2xl mx-auto pb-24 px-4 sm:px-0">
      {/* Header */}
      <div className={`flex items-center gap-4 mb-6 ${isSushiZen ? "text-slate-100" : "text-slate-800"}`}>
         <Link href="/">
           <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
             isSushiZen
               ? "bg-[#141923] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 shadow-md"
               : "bg-white border shadow-sm text-slate-600 hover:bg-slate-50"
           }`} aria-label="Volver a la tienda">
              <ArrowLeft className="w-5 h-5" />
           </button>
         </Link>
         <div className="flex-1">
           <span className={`text-xs font-black uppercase tracking-wider ${isSushiZen ? "text-amber-400" : "text-orange-600"}`}>Tu Espacio de Beneficios</span>
           <h1 className={`text-3xl font-black tracking-tight ${isSushiZen ? "text-white" : "text-slate-900"}`}>Mi Perfil</h1>
           <p className={`text-sm font-medium ${isSushiZen ? "text-slate-400" : "text-muted-foreground"}`}>Hola, {client.name || client.phone}!</p>
         </div>
         <LogoutButton />
      </div>

      {/* ═══ VIP LOYALTY TIER & POINTS CARD ═══ */}
      {loyaltyEnabled && <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 rounded-[2.5rem] p-7 text-white shadow-xl mb-8 relative overflow-hidden border border-white/10">
        <Sparkles className="absolute -right-6 -bottom-6 w-44 h-44 text-purple-400 opacity-10 pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          {/* Top Row: Tier Badge & Points */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {activeTier ? (
              <div className="flex items-center gap-2">
                <span
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: activeTier.color || "#f97316" }}
                >
                  <TierIcon className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Tu Membresía</span>
                  <span className="text-base font-black text-white">{activeTier.name}</span>
                </div>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Cliente Frecuente</span>
            )}

            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/15">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <div className="text-right">
                <span className="text-xl font-black tracking-tight text-yellow-300">{points}</span>
                <span className="text-[10px] font-bold text-slate-300 ml-1">pts</span>
              </div>
            </div>
          </div>

          {/* Tier Benefits info */}
          {activeTier && (
            <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Multiplicador activo: <strong className="text-yellow-300">{activeTier.pointsMultiplier}x puntos</strong></span>
              </div>
              {activeTier.discountPercent > 0 && (
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  {activeTier.discountPercent}% OFF en tus pedidos
                </span>
              )}
            </div>
          )}

          {/* Progress bar towards next tier */}
          {nextTier && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Próximo Rango: <strong className="text-white">{nextTier.name}</strong></span>
                <span className="text-yellow-400">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-purple-400 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Seguí pidiendo para desbloquear la insignia {nextTier.badgeText} y beneficios exclusivos en la tienda.
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* 1. SECCIÓN: PEDIDOS EN CURSO PARA HOY */}
      {todayActiveOrders.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${isSushiZen ? "text-amber-400" : "text-orange-600"}`} />
            <h3 className={`text-xl font-black ${isSushiZen ? "text-white" : "text-slate-900"}`}>Entregas de Hoy ({todayActiveOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {todayActiveOrders.map(order => (
              <Link href={`/track/${order.id}`} key={order.id} className="block">
                <div className={`rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group ${
                  isSushiZen
                    ? "bg-[#121722] border border-amber-500/30 text-white shadow-xl shadow-black/40"
                    : "bg-white border border-orange-200 text-slate-900"
                }`}>
                   <div className={`absolute top-0 left-0 w-2.5 h-full ${isSushiZen ? "bg-amber-400" : "bg-orange-500"}`} />
                   <div className="flex justify-between items-start mb-2">
                     <div>
                       <span className={`font-black text-base ${isSushiZen ? "text-white" : "text-slate-900"}`}>Orden #{order.id.slice(-6).toUpperCase()}</span>
                       <span className={`block text-[11px] font-bold ${isSushiZen ? "text-amber-300" : "text-orange-600"}`}>⚡ Para recibir o retirar hoy</span>
                     </div>
                     <span className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                       isSushiZen
                         ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                         : "bg-orange-100 text-orange-800"
                     }`}>
                       {order.status === 'IN_PROCESS' && <Clock className="w-3.5 h-3.5"/>}
                       {order.status === 'OUT_FOR_DELIVERY' && <Truck className="w-3.5 h-3.5"/>}
                       {order.status === 'FINISHED' && <MapPinIcon className="w-3.5 h-3.5"/>}
                       {order.status === 'NEW' && <Package className="w-3.5 h-3.5"/>}
                       {order.status === 'IN_PROCESS' ? 'En Cocina' : order.status === 'OUT_FOR_DELIVERY' ? 'En Viaje' : order.status === 'FINISHED' ? 'Listo Retiro' : 'Recibido'}
                     </span>
                   </div>
                   <p className={`text-xs font-medium line-clamp-1 mt-1 ${isSushiZen ? "text-slate-300" : "text-slate-600"}`}>
                     {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}
                   </p>
                   <div className={`mt-3 pt-2 border-t flex justify-between items-center text-xs ${isSushiZen ? "border-white/10" : "border-slate-100"}`}>
                     <span className={`${isSushiZen ? "text-slate-400" : "text-slate-500"} font-medium`}>Franja: {order.scheduledTime ? `${order.scheduledTime} hs` : "Horario no informado"}</span>
                     <div className="flex items-center gap-2">
                       <span className={`font-black text-sm ${isSushiZen ? "text-amber-300" : "text-slate-900"}`}>${order.total.toLocaleString('es-AR')}</span>
                       <span className={`font-black text-xs group-hover:translate-x-0.5 transition-transform flex items-center ${isSushiZen ? "text-amber-400" : "text-orange-600"}`}>Seguimiento <ChevronRight className="w-3.5 h-3.5" /></span>
                     </div>
                   </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: PEDIDOS Y PLANES AGENDADOS PARA DÍAS FUTUROS */}
      {futureScheduledOrders.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className={`w-5 h-5 ${isSushiZen ? "text-rose-400" : "text-purple-600"}`} />
            <h3 className={`text-xl font-black ${isSushiZen ? "text-white" : "text-slate-900"}`}>Entregas Agendadas ({futureScheduledOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {futureScheduledOrders.map(order => {
              const dateInfo = formatScheduledDateLabel(order);
              return (
                <Link href={`/track/${order.id}`} key={order.id} className="block">
                  <div className={`rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group ${
                    isSushiZen
                      ? "bg-[#121722] border border-rose-500/30 text-white shadow-xl shadow-black/40"
                      : "bg-white border border-purple-200 text-slate-900"
                  }`}>
                     <div className={`absolute top-0 left-0 w-2.5 h-full ${isSushiZen ? "bg-rose-500" : "bg-purple-600"}`} />
                     <div className="flex justify-between items-start mb-2">
                       <div>
                         <span className={`font-black text-base ${isSushiZen ? "text-white" : "text-slate-900"}`}>Orden #{order.id.slice(-6).toUpperCase()}</span>
                         <span className={`block text-xs font-black mt-0.5 ${isSushiZen ? "text-rose-300" : "text-purple-700"}`}>
                           📅 Programado para el {dateInfo.label}
                         </span>
                       </div>
                       <span className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                         isSushiZen
                           ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                           : "bg-purple-100 text-purple-800"
                       }`}>
                         <CalendarDays className="w-3.5 h-3.5" /> Agendado
                       </span>
                     </div>
                     <p className={`text-xs font-medium line-clamp-1 mt-1 ${isSushiZen ? "text-slate-300" : "text-slate-600"}`}>
                       {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}
                     </p>
                     <div className={`mt-3 pt-2 border-t flex justify-between items-center text-xs ${isSushiZen ? "border-white/10" : "border-slate-100"}`}>
                       <span className={`${isSushiZen ? "text-slate-400" : "text-slate-500"} font-medium`}>Franja: {order.scheduledTime ? `${order.scheduledTime} hs` : "Horario de entrega"}</span>
                       <div className="flex items-center gap-2">
                         <span className={`font-black text-sm ${isSushiZen ? "text-amber-300" : "text-slate-900"}`}>${order.total.toLocaleString('es-AR')}</span>
                         <span className={`font-black text-xs group-hover:translate-x-0.5 transition-transform flex items-center ${isSushiZen ? "text-rose-400" : "text-purple-600"}`}>Ver detalle <ChevronRight className="w-3.5 h-3.5" /></span>
                       </div>
                     </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: HISTORIAL DE COMPRAS PASADAS */}
      <div>
        <h3 className={`text-xl font-black mb-4 ${isSushiZen ? "text-white" : "text-slate-900"}`}>Historial de Compras</h3>
        {pastOrders.length === 0 ? (
           <div className={`text-center p-8 rounded-2xl border text-xs font-medium ${
             isSushiZen
               ? "bg-[#121722] border-white/10 text-slate-400"
               : "bg-slate-50 border-slate-200 text-slate-500"
           }`}>Aún no hay compras pasadas.</div>
        ) : (
          <div className="space-y-3">
            {pastOrders.map(order => (
              <div key={order.id} className={`rounded-2xl p-4 flex items-center justify-between shadow-2xs border ${
                isSushiZen
                  ? "bg-[#121722] border-white/10 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}>
                 <div>
                   <span className={`font-bold block text-sm ${isSushiZen ? "text-white" : "text-slate-800"}`}>
                     #{order.id.slice(-6).toUpperCase()} 
                     {order.status === "CANCELLED" && <span className="text-rose-400 text-xs ml-2 font-black">(Cancelado)</span>}
                     {order.status === "DELIVERED" && <span className="text-emerald-400 text-xs ml-2 font-black">✓ Entregado</span>}
                   </span>
                   <span className={`text-xs ${isSushiZen ? "text-slate-400" : "text-slate-500"}`}>{new Date(order.createdAt).toLocaleDateString()}</span>
                 </div>
                 <div className="text-right">
                   <span className={`font-black block text-sm ${isSushiZen ? "text-amber-300" : "text-slate-900"}`}>${order.total.toLocaleString('es-AR')}</span>
                   {order.earnedPoints > 0 && <span className="text-xs font-black text-amber-400 block">+{order.earnedPoints} pts</span>}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
