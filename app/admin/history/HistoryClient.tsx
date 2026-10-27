"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Calendar, Filter, Clock, MapPin, Truck, Phone, User, CheckCircle2, AlertCircle, XCircle, ChevronRight, Download, Receipt, ArrowUpDown, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { toast } from "sonner";
import { updateOrderStatus, assignMessenger } from "@/app/actions/admin-orders";

import { getHistoryPage } from "@/app/actions/admin-history";
import { useSearchParams } from "next/navigation";
import { historyFromSearchParams } from "@/lib/history-query";

interface HistoryClientProps {
  initialResult: Awaited<ReturnType<typeof getHistoryPage>>;
  initialOrders: any[];
  initialMessengers?: any[];
}

export function HistoryClient({ initialOrders, initialResult, initialMessengers = [] }: HistoryClientProps) {
  const searchParams = useSearchParams();
  const initialQuery = historyFromSearchParams(Object.fromEntries(searchParams.entries()));
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [messengers, setMessengers] = useState<any[]>(initialMessengers);

  useEffect(() => {
    fetch("/api/messengers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setMessengers(data);
      })
      .catch(() => {});
  }, []);
  const [searchTerm, setSearchTerm] = useState(initialQuery.search);
  const [statusFilter, setStatusFilter] = useState<string>(initialQuery.status);
  const [typeFilter, setTypeFilter] = useState<string>(initialQuery.type);
  const [paymentFilter, setPaymentFilter] = useState<string>(initialQuery.payment);
  const [dateRange, setDateRange] = useState(initialQuery.range);
  const [customFrom, setCustomFrom] = useState(initialQuery.from);
  const [customTo, setCustomTo] = useState(initialQuery.to);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [page, setPage] = useState(initialQuery.page);
  const [result, setResult] = useState(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const requestId = useRef(0);
  const filters = JSON.stringify({search: searchTerm, status: statusFilter, type: typeFilter, payment: paymentFilter, range: dateRange, from: customFrom, to: customTo});
  const previousFilters = useRef(filters);
  useEffect(() => {
    if (previousFilters.current !== filters && page !== 1) { previousFilters.current = filters; setPage(1); return; }
    previousFilters.current = filters;
    const id = ++requestId.current;
    setBusy(true); setError("");
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      for (const [key, value] of Object.entries({...JSON.parse(filters), page})) {
        const name = key === "search" ? "q" : key;
        if (value === "" || value === "ALL" || (key === "page" && value === 1)) url.searchParams.delete(name);
        else url.searchParams.set(name, String(value));
      }
      window.history.replaceState(null, "", url);
      getHistoryPage({...JSON.parse(filters), page}).then(next => {
        if (id !== requestId.current) return;
        setResult(next); setOrders(next.orders); setBusy(false);
      }).catch(() => { if (id === requestId.current) { setError("No se pudo actualizar el historial. Reintentá."); setBusy(false); } });
    }, 250);
    return () => { clearTimeout(timer); requestId.current++; };
  }, [filters, page, reload]);
  const filteredOrders = orders;
  const stats = result.stats;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Nuevo</Badge>;
      case "IN_PROCESS":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">En Cocina</Badge>;
      case "PENDING_DELIVERY":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">A Reparto</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">En Camino</Badge>;
      case "FINISHED":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Listo p/ Retirar</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Entregado ✅</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelado ❌</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (order: any) => {
    if (order.orderType === "SCHEDULED_TOMORROW") {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">📅 Mañana</Badge>;
    }
    if (order.orderType === "CUSTOM_DATE") {
      const dateStr = order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString("es-AR") : "";
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">📆 Encargo {dateStr}</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] font-bold">⚡ Inmediato</Badge>;
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
      setReload(value => value + 1); toast.success(`Estado actualizado a: ${newStatus}`);
    } else {
      toast.error(res.error || "No se pudo actualizar el estado");
      throw new Error(res.error);
    }
  };

  const handleMessengerChange = async (orderId: string, messengerId: string | null) => {
    const cleanId = messengerId === "none" ? null : messengerId;
    const res = await assignMessenger(orderId, cleanId);
    if (res.success) {
      const m = messengers.find((x) => x.id === cleanId) || null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, messenger: m, messengerId: cleanId } : o
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => ({
          ...prev,
          messenger: m,
          messengerId: cleanId,
        }));
      }
      setReload(value => value + 1); toast.success(m ? `Asignado a ${m.name}` : "Cadete desasignado");
    } else {
      toast.error(res.error || "Error al asignar cadete");
      throw new Error(res.error);
    }
  };

  return (
    <div className="space-y-6" aria-busy={busy}><p role="status" aria-live="polite" className="text-sm text-slate-600">{busy ? "Buscando en todo el historial…" : error || "Filtros aplicados a todo el historial del comercio"}</p>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Historial General de Pedidos</h1>
          <p className="text-muted-foreground">Auditoría, búsqueda y consulta de todos los pedidos históricos.</p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas del Filtro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">Valor de pedidos del filtro</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600">${stats.totalRevenue.toLocaleString("es-AR")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">Pedidos Encontrados</CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800">{result.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">Ticket Promedio</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600">${Math.round(stats.averageTicket).toLocaleString("es-AR")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase">Entregados vs Cancelados</CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800">
              <span className="text-green-600">{stats.completedCount}</span> / <span className="text-red-500">{stats.cancelledCount}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID (#A1B2), cliente, teléfono o dirección…"
              className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Rango de fechas */}
            <select
              value={dateRange}
              onChange={(e: any) => setDateRange(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none"
            >
              <option value="ALL">🗓️ Todas las fechas</option>
              <option value="TODAY">Hoy</option>
              <option value="YESTERDAY">Ayer</option>
              <option value="LAST_7_DAYS">Últimos 7 días</option>
              <option value="THIS_MONTH">Este mes</option>
              <option value="CUSTOM">Personalizado…</option>
            </select>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none"
            >
              <option value="ALL">🏷️ Todos los estados</option>
              <option value="NEW">Nuevos</option>
              <option value="IN_PROCESS">En cocina</option>
              <option value="PENDING_DELIVERY">A reparto</option>
              <option value="OUT_FOR_DELIVERY">En camino</option>
              <option value="FINISHED">Listo p/ retirar</option>
              <option value="DELIVERED">Entregados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>

            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none"
            >
              <option value="ALL">⚡ Todos los tipos</option>
              <option value="IMMEDIATE">Para el momento</option>
              <option value="SCHEDULED_TOMORROW">Para mañana</option>
              <option value="CUSTOM_DATE">Por encargo</option>
            </select>

            {/* Método de pago */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none"
            >
              <option value="ALL">💳 Todos los pagos</option>
              <option value="CASH">Efectivo</option>
              <option value="MP">Mercado Pago</option><option value="TRANSFER">Transferencia</option>
              <option value="ADMIN">Manual mostrador</option>
            </select>
          </div>
        </div>

        {/* Inputs de rango de fecha personalizado */}
        {dateRange === "CUSTOM" && (
          <div className="flex items-center gap-3 pt-2 border-t text-xs font-bold">
            <span>Desde:</span>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-40" />
            <span>Hasta:</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-40" />
          </div>
        )}
      </Card>

      {/* Tabla de Órdenes */}
      <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="px-5 py-4">Orden</th>
                <th className="px-5 py-4">Fecha y Hora</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Tipo & Entrega</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Pago</th>
                <th className="px-5 py-4 text-right">Total</th>
                <th className="px-5 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-mono font-black text-slate-900">
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    <span className="font-bold block text-slate-800">
                      {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(order.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-800 block text-xs">{order.clientName}</span>
                    <span className="text-[11px] text-slate-500">{order.clientPhone}</span>
                  </td>
                  <td className="px-5 py-4 space-y-1">
                    <div>{getTypeBadge(order)}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                      {order.needsDelivery ? (
                        <>
                          <Truck className="w-3 h-3 text-orange-500" /> Delivery: {order.deliveryAddress || "A domicilio"}
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-blue-500" /> Retiro en local
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-xs block text-slate-700">
                      {order.paymentMethod === "ADMIN" ? "Manual" : order.paymentMethod === "MP" ? "Mercado Pago" : order.paymentMethod === "TRANSFER" ? "Transferencia" : "Efectivo"}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        order.paymentStatus === "PAID" ? "text-green-600" : order.paymentStatus === "FAILED" ? "text-red-500" : "text-amber-600"
                      }`}
                    >
                      {order.paymentStatus === "PAID" ? "Pagado" : order.paymentStatus === "FAILED" ? "Rechazado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 text-base">
                    ${(order.total || 0).toLocaleString("es-AR")}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-xl font-bold text-xs h-8 hover:bg-slate-900 hover:text-white"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver Detalle
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 text-sm">
        <span>{busy ? "Buscando en todo el historial…" : error || `${result.total} pedidos · página ${result.page} de ${Math.max(1, Math.ceil(result.total / 50))}`}</span>
        <div className="flex gap-2"><Button variant="outline" disabled={busy || result.page <= 1} onClick={() => setPage(result.page - 1)}>Anterior</Button><Button variant="outline" disabled={busy || result.page * 50 >= result.total} onClick={() => setPage(result.page + 1)}>Siguiente</Button>{error && <Button onClick={() => setReload(value => value + 1)}>Reintentar</Button>}</div>
        <p className="w-full text-xs text-slate-500">Totales de todos los resultados del filtro, sin cancelados. El valor de pedidos incluye pagos pendientes; no equivale a dinero cobrado.</p>
      </div>
      {/* Modal de Detalle de la Orden */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        messengers={messengers}
        onStatusChange={handleStatusChange}
        onMessengerChange={handleMessengerChange}
        onPrint={(orderId) => {
          window.open(`/admin/live/print/${orderId}`, "_blank");
        }}
      />
    </div>
  );
}
