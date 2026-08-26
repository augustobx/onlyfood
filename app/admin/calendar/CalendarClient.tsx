"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Truck,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChefHat,
  Eye,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Package,
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Sparkles,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { getCalendarOrders } from "@/app/actions/admin-calendar";
import { updateOrderStatus, assignMessenger } from "@/app/actions/admin-orders";
import { printOrderNow } from "@/app/actions/admin-printing";

type CalendarViewMode = "MONTH" | "WEEK" | "DAY";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getOrderDateStr(order: any): string {
  const d = order.scheduledDate ? new Date(order.scheduledDate) : new Date(order.createdAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const dayName = WEEKDAYS[(date.getDay() + 6) % 7];
  return `${dayName} ${d} de ${MONTHS_ES[m - 1]}`;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NEW: { label: "Nuevo", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  IN_PROCESS: { label: "Preparando", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  PENDING_DELIVERY: { label: "Listo Envío", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  OUT_FOR_DELIVERY: { label: "En Camino", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  FINISHED: { label: "Listo Retiro", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  DELIVERED: { label: "Entregado", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  CANCELLED: { label: "Cancelado", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

export function CalendarClient({ initialOrders = [], initialMessengers = [] }: { initialOrders?: any[]; initialMessengers?: any[] }) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [messengers, setMessengers] = useState<any[]>(initialMessengers);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("WEEK");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  // Modal and details state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, BOWLS, IMMEDIATE, SCHEDULED
  const [showPrepSummary, setShowPrepSummary] = useState(true);

  // Range calculation based on viewMode and currentDate
  const fetchOrdersForRange = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate a wide range covering previous month to next month to guarantee coverage
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59);

      const res = await getCalendarOrders(start.toISOString(), end.toISOString());
      if (res.success) {
        setOrders(res.orders);
        if (res.messengers) setMessengers(res.messengers);
      } else {
        toast.error("Error al cargar la agenda", { description: res.error });
      }
    } catch {
      toast.error("Error de conexión al cargar la agenda");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchOrdersForRange();
  }, [fetchOrdersForRange]);

  // Navigate functions
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "MONTH") {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === "WEEK") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, "0");
      const d = String(next.getDate()).padStart(2, "0");
      setSelectedDayStr(`${y}-${m}-${d}`);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "MONTH") {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === "WEEK") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, "0");
      const d = String(next.getDate()).padStart(2, "0");
      setSelectedDayStr(`${y}-${m}-${d}`);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setSelectedDayStr(`${y}-${m}-${d}`);
  };

  // Order actions
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
        toast.success("Estado actualizado con éxito");
      } else {
        toast.error("No se pudo actualizar el estado", { description: res.error });
      }
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleMessengerChange = async (orderId: string, messengerId: string) => {
    try {
      const res = await assignMessenger(orderId, messengerId === "none" ? null : messengerId);
      if (res.success) {
        const m = messengers.find(x => x.id === messengerId) || null;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, messenger: m, messengerId: m?.id || null } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, messenger: m, messengerId: m?.id || null }));
        }
        toast.success("Mensajero asignado");
      }
    } catch {
      toast.error("Error al asignar mensajero");
    }
  };

  const handlePrint = async (orderId: string) => {
    try {
      const res = await printOrderNow(orderId);
      if (res.success) {
        if (res.mode === "BROWSER" && res.url) {
          window.open(res.url, "_blank", "width=340,height=600");
        } else {
          toast.success("Enviado a imprimir");
        }
      } else {
        toast.error("Error al imprimir", { description: res.error });
      }
    } catch {
      toast.error("Error al imprimir");
    }
  };

  const openModal = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = order.clientName?.toLowerCase().includes(q);
        const matchesPhone = order.clientPhone?.toLowerCase().includes(q);
        const matchesId = order.id?.toLowerCase().includes(q);
        const matchesItem = order.items?.some((item: any) => item.product?.name?.toLowerCase().includes(q));
        if (!matchesClient && !matchesPhone && !matchesId && !matchesItem) return false;
      }

      // Status
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;

      // Type
      if (typeFilter === "BOWLS") {
        const hasBowl = order.items?.some((item: any) => item.product?.availableDays && item.product?.availableDays.trim() !== "");
        if (!hasBowl) return false;
      } else if (typeFilter === "IMMEDIATE" && order.orderType !== "IMMEDIATE") {
        return false;
      } else if (typeFilter === "SCHEDULED" && order.orderType === "IMMEDIATE") {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  // Group filtered orders by date string YYYY-MM-DD
  const ordersByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const order of filteredOrders) {
      const dateStr = getOrderDateStr(order);
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(order);
    }
    return map;
  }, [filteredOrders]);

  // Calculate days for WEEK view (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: d,
        dateStr,
        dayName: WEEKDAYS[i],
        dayNum: d.getDate(),
        monthName: MONTHS_ES[d.getMonth()],
        isToday: dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        orders: ordersByDate.get(dateStr) || [],
      });
    }
    return days;
  }, [currentDate, ordersByDate]);

  // Calculate days for MONTH view (Grid)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is 1, Sunday is 7
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;

    const days = [];

    // Padding from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        orders: ordersByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(i).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        orders: ordersByDate.get(dateStr) || [],
      });
    }

    // Padding for next month to complete 35 or 42 cells
    const remaining = 42 - days.length;
    if (remaining > 0 && remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(i).padStart(2, "0");
        const dateStr = `${y}-${m}-${dayNum}`;
        days.push({
          date: d,
          dateStr,
          dayNum: i,
          isCurrentMonth: false,
          isToday: dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
          orders: ordersByDate.get(dateStr) || [],
        });
      }
    }

    return days;
  }, [currentDate, ordersByDate]);

  // Production prep summary for the current view
  const prepSummary = useMemo(() => {
    let targetOrders: any[] = [];
    if (viewMode === "DAY") {
      targetOrders = ordersByDate.get(selectedDayStr) || [];
    } else if (viewMode === "WEEK") {
      targetOrders = weekDays.flatMap(d => d.orders);
    } else {
      targetOrders = monthDays.filter(d => d.isCurrentMonth).flatMap(d => d.orders);
    }

    const nonCancelled = targetOrders.filter(o => o.status !== "CANCELLED");
    const itemCounts = new Map<string, { name: string; quantity: number; isBowl: boolean }>();

    for (const order of nonCancelled) {
      for (const item of order.items || []) {
        const prodName = item.product?.name || "Producto";
        const isBowl = Boolean(item.product?.availableDays && item.product.availableDays.trim() !== "");
        const current = itemCounts.get(prodName) || { name: prodName, quantity: 0, isBowl };
        current.quantity += item.quantity || 1;
        itemCounts.set(prodName, current);
      }
    }

    const list = Array.from(itemCounts.values()).sort((a, b) => b.quantity - a.quantity);
    const totalDishes = list.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = nonCancelled.reduce((sum, o) => sum + (o.total || 0), 0);

    return { list, totalDishes, totalOrders: nonCancelled.length, totalRevenue };
  }, [viewMode, selectedDayStr, weekDays, monthDays, ordersByDate]);

  // Title header text
  const headerTitle = useMemo(() => {
    if (viewMode === "MONTH") {
      return `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "WEEK") {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.dayNum} ${first.monthName.slice(0, 3)} - ${last.dayNum} ${last.monthName.slice(0, 3)} ${last.date.getFullYear()}`;
    }
    return formatDisplayDate(selectedDayStr);
  }, [viewMode, currentDate, weekDays, selectedDayStr]);

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-[1600px] mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-md">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Agenda y Calendario de Pedidos
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Planificación por día, semana y mes con gestión completa de comandas y producción
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher + Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode("DAY")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "DAY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode("WEEK")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "WEEK" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("MONTH")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "MONTH" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mes
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="rounded-xl font-bold text-xs h-9 border-slate-200 hover:bg-slate-50"
          >
            Hoy
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchOrdersForRange}
            disabled={isLoading}
            className="rounded-xl h-9 w-9 border-slate-200"
            title="Recargar agenda"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Date Navigation & Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Navigation buttons */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center font-black text-slate-800 text-sm tracking-tight">
            {headerTitle}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, tel, plato..."
              className="pl-9 h-10 rounded-2xl bg-white border-slate-200 text-xs font-semibold"
            />
          </div>

          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "ALL")}>
            <SelectTrigger className="w-36 h-10 rounded-2xl bg-white border-slate-200 text-xs font-bold">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="BOWLS">Solo Bowls</SelectItem>
              <SelectItem value="SCHEDULED">Encargos</SelectItem>
              <SelectItem value="IMMEDIATE">Inmediatos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold">{prepSummary.totalOrders} Pedidos</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">{prepSummary.totalDishes} Platos</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs font-black text-emerald-400">
            ${prepSummary.totalRevenue.toLocaleString("es-AR")}
          </div>
        </div>
      </div>

      {/* Production Prep Summary Widget (Collapsible) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowPrepSummary(p => !p)}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Resumen de Producción y Cocina</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Cantidades totales a elaborar en el período seleccionado ({viewMode === "DAY" ? "Día" : viewMode === "WEEK" ? "Semana" : "Mes"})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-black bg-slate-50 text-slate-700">
              {prepSummary.list.length} Variedades
            </Badge>
            <span className="text-xs font-bold text-indigo-600">{showPrepSummary ? "Ocultar" : "Ver detalle"}</span>
          </div>
        </div>

        <AnimatePresence>
          {showPrepSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-2"
            >
              {prepSummary.list.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-slate-400">
                  No hay platos programados en este período.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {prepSummary.list.map((item) => (
                    <div
                      key={item.name}
                      className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                        item.isBowl
                          ? "bg-purple-50/70 border-purple-200 text-purple-950"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <span className="text-xs font-bold line-clamp-2 leading-snug">{item.name}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className={`text-[10px] font-black uppercase ${item.isBowl ? "text-purple-600" : "text-slate-400"}`}>
                          {item.isBowl ? "Bowl Semanal" : "Carta"}
                        </span>
                        <span className="text-base font-black tracking-tight">{item.quantity} un.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main View Area */}
      {viewMode === "MONTH" && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
            {WEEKDAYS.map(w => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((dayObj) => {
              const dayOrders = dayObj.orders;
              const hasOrders = dayOrders.length > 0;
              const isSelected = dayObj.dateStr === selectedDayStr;

              return (
                <div
                  key={dayObj.dateStr}
                  onClick={() => {
                    setSelectedDayStr(dayObj.dateStr);
                    setViewMode("DAY");
                  }}
                  className={`min-h-[110px] sm:min-h-[130px] p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-purple-500 border-purple-400 bg-purple-50/30"
                      : dayObj.isToday
                      ? "bg-blue-50/50 border-blue-300"
                      : dayObj.isCurrentMonth
                      ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      : "bg-slate-50/60 border-slate-100 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black h-6 w-6 rounded-full flex items-center justify-center ${
                        dayObj.isToday
                          ? "bg-blue-600 text-white"
                          : dayObj.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {dayObj.dayNum}
                    </span>

                    {hasOrders && (
                      <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md">
                        {dayOrders.length} ped.
                      </span>
                    )}
                  </div>

                  {/* Order chips preview */}
                  <div className="space-y-1 my-1 overflow-hidden flex-1">
                    {dayOrders.slice(0, 3).map((o) => {
                      const cfg = statusConfig[o.status] || statusConfig.NEW;
                      const hasBowl = o.items?.some((it: any) => it.product?.availableDays && it.product.availableDays.trim() !== "");
                      return (
                        <div
                          key={o.id}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border ${cfg.bg} ${cfg.color} ${cfg.border} flex items-center justify-between`}
                        >
                          <span className="truncate">{o.clientName || `#${o.id.slice(-4)}`}</span>
                          {hasBowl && <span className="text-[8px] ml-1 shrink-0">🥣</span>}
                        </div>
                      );
                    })}
                    {dayOrders.length > 3 && (
                      <div className="text-[9px] font-bold text-slate-400 text-center">
                        +{dayOrders.length - 3} más
                      </div>
                    )}
                  </div>

                  {hasOrders && (
                    <div className="text-right text-[10px] font-black text-slate-700">
                      ${dayOrders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + (o.total || 0), 0).toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "WEEK" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map((col) => {
            const dayOrders = col.orders;
            const totalDaySales = dayOrders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + (o.total || 0), 0);

            return (
              <div
                key={col.dateStr}
                className={`bg-white rounded-3xl border flex flex-col shadow-sm overflow-hidden ${
                  col.isToday ? "border-purple-400 ring-2 ring-purple-100" : "border-slate-200"
                }`}
              >
                {/* Column Day Header */}
                <div className={`p-3.5 border-b select-none ${col.isToday ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-800"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">{col.dayName}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.isToday ? "bg-white text-purple-700" : "bg-slate-200 text-slate-800"}`}>
                      {col.dayNum}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-bold opacity-90">
                    <span>{dayOrders.length} pedidos</span>
                    <span>${totalDaySales.toLocaleString("es-AR")}</span>
                  </div>
                </div>

                {/* Orders list in this day column */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[700px] bg-slate-50/50">
                  {dayOrders.length === 0 ? (
                    <div className="text-center py-8 text-[11px] font-semibold text-slate-400">
                      Sin pedidos
                    </div>
                  ) : (
                    dayOrders.map((order) => {
                      const cfg = statusConfig[order.status] || statusConfig.NEW;
                      const isDelivery = Boolean(order.needsDelivery);
                      const hasBowl = order.items?.some((it: any) => it.product?.availableDays && it.product.availableDays.trim() !== "");

                      return (
                        <Card
                          key={order.id}
                          onClick={() => openModal(order)}
                          className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all cursor-pointer space-y-2 select-none"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="leading-tight">
                              <span className="font-black text-xs text-slate-800 block">
                                #{order.id.slice(-5).toUpperCase()}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600 line-clamp-1">
                                {order.clientName}
                              </span>
                            </div>
                            <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[9px] font-black shrink-0 px-1.5 py-0`}>
                              {cfg.label}
                            </Badge>
                          </div>

                          {/* Time and Delivery badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {order.deliveryTime || "Turno"}
                            </span>
                            {isDelivery ? (
                              <span className="text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Truck className="w-2.5 h-2.5" /> Envío
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" /> Retiro
                              </span>
                            )}
                            {hasBowl && (
                              <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                                Bowl
                              </span>
                            )}
                          </div>

                          {/* Items summary */}
                          <div className="text-[11px] font-medium text-slate-600 bg-slate-50 p-1.5 rounded-xl border border-slate-100 space-y-0.5">
                            {order.items?.map((it: any) => (
                              <div key={it.id} className="flex justify-between items-center text-[10px]">
                                <span className="line-clamp-1 font-semibold">{it.product?.name}</span>
                                <span className="font-black text-slate-500 ml-1">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>

                          {/* Footer with total and actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="font-black text-xs text-slate-900">
                              ${(order.total || 0).toLocaleString("es-AR")}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-slate-400 hover:text-slate-900 rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(order.id);
                                }}
                                title="Imprimir comanda"
                              >
                                <Printer className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-purple-600 hover:bg-purple-50 rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(order);
                                }}
                                title="Ver detalles y gestionar"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "DAY" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-600 block">Vista Diaria Detallada</span>
              <h2 className="text-xl font-black text-slate-900">{formatDisplayDate(selectedDayStr)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDayStr}
                onChange={(e) => setSelectedDayStr(e.target.value)}
                className="h-10 rounded-2xl font-bold text-xs bg-slate-50 border-slate-200"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("WEEK")}
                className="rounded-2xl font-bold text-xs h-10 border-slate-200"
              >
                <CalendarRange className="w-4 h-4 mr-1 text-slate-600" />
                Ver Semana Completa
              </Button>
            </div>
          </div>

          {/* Detailed list for the day */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(!ordersByDate.get(selectedDayStr) || ordersByDate.get(selectedDayStr)!.length === 0) ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
                <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="font-extrabold text-slate-700 text-base">No hay pedidos registrados para este día</h3>
                <p className="text-xs text-slate-400 font-semibold">Podés navegar a otro día o cambiar a vista semanal/mensual.</p>
              </div>
            ) : (
              ordersByDate.get(selectedDayStr)!.map((order) => {
                const cfg = statusConfig[order.status] || statusConfig.NEW;
                const isDelivery = Boolean(order.needsDelivery);

                return (
                  <Card
                    key={order.id}
                    onClick={() => openModal(order)}
                    className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm text-slate-900 block">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{order.clientName}</span>
                      </div>
                      <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-xs font-black`}>
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-700">
                      <span className="bg-slate-100 px-2 py-1 rounded-xl flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {order.deliveryTime || "Horario a convenir"}
                      </span>
                      {isDelivery ? (
                        <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-1 rounded-xl flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-orange-500" /> Domicilio
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-xl flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" /> Retiro en local
                        </span>
                      )}
                    </div>

                    {isDelivery && order.deliveryAddress && (
                      <p className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{order.deliveryAddress}</span>
                      </p>
                    )}

                    {/* Products details */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      {order.items?.map((it: any) => (
                        <div key={it.id} className="text-xs flex items-center justify-between font-semibold">
                          <span className="text-slate-800 font-bold">{it.product?.name}</span>
                          <span className="text-slate-500 font-black">x{it.quantity} (${it.subtotal})</span>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Total</span>
                        <span className="text-base font-black text-slate-900">
                          ${(order.total || 0).toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-bold text-xs h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(order.id);
                          }}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Imprimir
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl font-bold text-xs h-9 bg-purple-600 hover:bg-purple-500 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(order);
                          }}
                        >
                          Gestionar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal for complete management */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        messengers={messengers}
        onStatusChange={handleStatusChange}
        onMessengerChange={handleMessengerChange}
        onPrint={handlePrint}
      />
    </div>
  );
}
