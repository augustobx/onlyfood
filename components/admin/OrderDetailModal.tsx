"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  Printer,
  Calendar as CalendarIcon,
  MessageCircle,
  ChefHat,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Copy,
  Receipt,
  User,
  Zap,
  ShoppingBag,
  Layers,
  Star,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

interface OrderDetailModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  messengers: any[];
  onStatusChange?: (orderId: string, status: string) => Promise<void> | void;
  onMessengerChange?: (orderId: string, messengerId: string) => Promise<void> | void;
  onPrint?: (orderId: string) => Promise<void> | void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  messengers,
  onStatusChange,
  onMessengerChange,
  onPrint,
}: OrderDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!order) return null;

  const isDelivery = Boolean(order.needsDelivery);
  const isPaid = order.paymentStatus === "PAID" || order.paymentMethod === "ADMIN";

  const availableMessengers = useMemo(() => {
    const map = new Map<string, any>();
    (messengers || []).forEach((m) => {
      if (m && m.id) map.set(m.id, m);
    });
    if (order?.messenger && !map.has(order.messenger.id)) {
      map.set(order.messenger.id, order.messenger);
    }
    return Array.from(map.values());
  }, [messengers, order]);

  const handleStatus = async (status: string) => {
    if (!onStatusChange) return;
    setIsUpdating(true);
    try {
      await onStatusChange(order.id, status);
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMessenger = async (messengerId: string) => {
    if (!onMessengerChange) return;
    setIsUpdating(true);
    try {
      await onMessengerChange(order.id, messengerId);
    } catch (e: any) {
      toast.error(e?.message || "Error al asignar cadete");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintClick = async () => {
    if (!onPrint) return;
    setIsPrinting(true);
    try {
      await onPrint(order.id);
    } finally {
      setIsPrinting(false);
    }
  };

  const copyAddress = () => {
    if (order.deliveryAddress) {
      navigator.clipboard.writeText(order.deliveryAddress);
      toast.success("Dirección copiada al portapapeles");
    }
  };

  const cleanPhone = order.clientPhone ? order.clientPhone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `¡Hola ${order.clientName || "cliente"}! Nos comunicamos de BeatsBurgers sobre tu pedido #${order.id.slice(-6).toUpperCase()}`
      )}`
    : null;

  const googleMapsUrl = order.deliveryAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`
    : null;

  const totalItemCount = order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[96vw] max-h-[92vh] flex flex-col p-0 rounded-3xl border border-slate-200 shadow-2xl bg-slate-50 overflow-hidden">
        {/* ═══ HEADER MODAL ═══ */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Título y Código */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-orange-400">
                  Detalle del Pedido
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(order.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  #{order.id.slice(-6).toUpperCase()}
                </h2>

                {isDelivery ? (
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                    <Truck className="w-3.5 h-3.5" /> Envío a Domicilio
                  </Badge>
                ) : (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-2.5 py-1 gap-1.5 shadow-sm">
                    <MapPin className="w-3.5 h-3.5" /> Retiro en Mostrador
                  </Badge>
                )}
              </div>
            </div>

            {/* Badges de Estado y Acciones Rápidas */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrintClick}
                disabled={isPrinting}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs h-9 px-3.5 rounded-xl transition-all shadow-sm"
              >
                {isPrinting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1.5 text-orange-400" />}
                Imprimir Comanda
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fila de Badges de Información Rápida */}
          <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-slate-800/80">
            {/* Modalidad de Tiempo */}
            {order.orderType === "SCHEDULED_TOMORROW" && (
              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-xs py-0.5">
                <Clock className="w-3 h-3 mr-1" /> Programado Mañana: {order.deliveryTime || "Turno"}
              </Badge>
            )}
            {order.orderType === "CUSTOM_DATE" && (
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold text-xs py-0.5">
                <CalendarIcon className="w-3 h-3 mr-1" /> Encargo: {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString("es-AR") : "Fecha Futura"} ({order.deliveryTime || "Turno"})
              </Badge>
            )}
            {(!order.orderType || order.orderType === "IMMEDIATE") && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs py-0.5">
                <Zap className="w-3 h-3 mr-1 text-emerald-400" /> Hoy: {order.deliveryTime || "Horario no informado"}
              </Badge>
            )}

            {/* Estado del Pedido */}
            <Badge
              className={`font-black text-xs py-0.5 ${
                order.status === "NEW"
                  ? "bg-amber-500 text-slate-950 font-black"
                  : order.status === "IN_PROCESS"
                  ? "bg-yellow-400 text-slate-950 font-black"
                  : order.status === "PENDING_DELIVERY"
                  ? "bg-purple-600 text-white"
                  : order.status === "OUT_FOR_DELIVERY"
                  ? "bg-indigo-600 text-white"
                  : order.status === "FINISHED" || order.status === "DELIVERED"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              Etapa: {order.status}
            </Badge>

            {/* Pago */}
            <Badge
              className={`font-bold text-xs py-0.5 ${
                isPaid
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              Pago: {order.paymentMethod === "ADMIN" ? "Manual Pagado" : order.paymentMethod === "MP" ? `Mercado Pago (${order.paymentStatus || "PENDIENTE"})` : "Efectivo al recibir"}
            </Badge>
          </div>
        </div>

        {/* ═══ CUERPO CON SCROLL GENEROSO ═══ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* ── COLUMNA IZQUIERDA (7 de 12 cols): Cliente + Productos ── */}
            <div className="md:col-span-7 space-y-5">
              {/* Tarjeta Cliente */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-orange-600" /> Información del Cliente
                  </span>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black transition-colors shadow-xs shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      WhatsApp
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {order.clientName || "Cliente sin nombre"}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{order.clientPhone || "Sin teléfono registrado"}</span>
                  </div>
                </div>

                {isDelivery ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dirección de Entrega:
                    </span>
                    <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl text-slate-900 font-bold text-sm flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span className="leading-snug break-words">{order.deliveryAddress || "Sin dirección especificada"}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {order.deliveryAddress && (
                          <button
                            type="button"
                            onClick={copyAddress}
                            title="Copiar dirección"
                            className="p-1.5 bg-white hover:bg-orange-100 border border-orange-200 rounded-lg text-slate-700 transition-colors shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir en Google Maps"
                            className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>El cliente retira personalmente por el mostrador del local.</span>
                  </div>
                )}
              </div>

              {/* Tarjeta Productos del Pedido */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Productos del Pedido ({totalItemCount})
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">Detalle cocina</span>
                </div>

                <div className="space-y-3">
                  {order.items?.map((item: any, idx: number) => {
                    const subtotalItem = item.subtotal || (item.unitPrice ? item.unitPrice * item.quantity : 0);
                    return (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5 hover:border-slate-300 transition-colors"
                      >
                        {/* Fila principal del producto */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs flex items-center justify-center font-black shrink-0 mt-0.5">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-black text-sm text-slate-900 leading-snug">
                                {item.isHalfAndHalf
                                  ? `½ ${item.product?.name || "Mitad 1"} / ½ ${item.secondHalfProduct?.name || "Mitad 2"}`
                                  : item.product?.name || "Producto"}
                              </h4>
                              {item.product?.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {item.product.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="font-black text-sm text-slate-900 text-right shrink-0">
                            ${subtotalItem.toLocaleString("es-AR")}
                          </div>
                        </div>

                        {/* Extras y Modificaciones */}
                        <div className="pl-9 space-y-1.5">
                          {item.addedExtras && item.addedExtras.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Extras:</span>
                              {item.addedExtras.map((ex: any, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200"
                                >
                                  + {ex.extra?.name || ex.name} {ex.price ? `(+$${ex.price.toLocaleString("es-AR")})` : ""}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Sin:</span>
                              {item.removedIngredients.map((ing: any, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200"
                                >
                                  - Sin {ing.ingredient?.name || ing.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Combo interno */}
                          {item.comboItems && item.comboItems.length > 0 && (
                            <div className="p-2 bg-purple-50/80 border border-purple-200 rounded-lg space-y-1 text-xs">
                              <span className="font-bold text-purple-900 block text-[10px] uppercase">Contenido del Combo:</span>
                              {item.comboItems.map((ci: any, i: number) => (
                                <div key={i} className="text-purple-950 flex items-center justify-between">
                                  <span>{ci.quantity}x {ci.product?.name}</span>
                                  {ci.removedIngredients?.length > 0 && (
                                    <span className="text-[10px] text-red-600 font-bold">
                                      -Sin {ci.removedIngredients.map((r: any) => r.ingredient?.name).join(", ")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Aclaraciones / Notas para cocina */}
                          {item.notes && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium italic">
                              "{item.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA (5 de 12 cols): Estado, Cadete y Totales ── */}
            <div className="md:col-span-5 space-y-5">
              {/* Tarjeta de Control de Etapas y Cadete */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <ChefHat className="w-4 h-4 text-orange-600" /> Gestión y Despacho
                </span>

                {/* Asignación de Cadete (disponible para todo pedido) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Repartidor / Cadete Asignado:
                    </label>
                    {!isDelivery && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Mostrador / Retiro
                      </span>
                    )}
                  </div>
                  <Select
                    value={order.messengerId || "none"}
                    onValueChange={(val) => handleMessenger(val)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-300 font-bold text-xs rounded-xl">
                      <SelectValue placeholder="Asignar repartidor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar (Nadie)</SelectItem>
                      {availableMessengers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.phone ? `(${m.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mensaje si la orden fue cancelada */}
                {order.status === "CANCELLED" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      Pedido actualmente cancelado
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleStatus("IN_PROCESS")}
                      className="h-7 text-xs bg-white hover:bg-red-100 text-red-900 border-red-300 font-bold rounded-lg"
                    >
                      Reactivar a Cocina
                    </Button>
                  </div>
                )}

                {/* Mensaje si la orden ya está entregada */}
                {order.status === "DELIVERED" && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pedido completado y entregado con éxito.</span>
                  </div>
                )}

                {/* Botones de Cambio de Etapa */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block">
                    Avanzar Etapa del Pedido:
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      type="button"
                      disabled={isUpdating || order.status === "IN_PROCESS"}
                      onClick={() => handleStatus("IN_PROCESS")}
                      className={`w-full justify-start h-10 font-bold text-xs rounded-xl transition-all border ${
                        order.status === "IN_PROCESS"
                          ? "bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm"
                          : "bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border-yellow-200"
                      }`}
                    >
                      <ChefHat className="w-4 h-4 mr-2 text-yellow-700" />
                      1. En Cocina / Preparación
                      {order.status === "IN_PROCESS" && <Check className="ml-auto w-4 h-4" />}
                    </Button>

                    <Button
                      type="button"
                      disabled={isUpdating || order.status === "PENDING_DELIVERY" || order.status === "FINISHED"}
                      onClick={() => handleStatus(isDelivery ? "PENDING_DELIVERY" : "FINISHED")}
                      className={`w-full justify-start h-10 font-bold text-xs rounded-xl transition-all border ${
                        order.status === "PENDING_DELIVERY" || order.status === "FINISHED"
                          ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200"
                      }`}
                    >
                      <Truck className="w-4 h-4 mr-2 text-purple-700" />
                      {isDelivery ? "2. Listo para Reparto" : "2. Listo para Retiro"}
                      {(order.status === "PENDING_DELIVERY" || order.status === "FINISHED") && <Check className="ml-auto w-4 h-4" />}
                    </Button>

                    {isDelivery && (
                      <Button
                        type="button"
                        disabled={isUpdating || order.status === "OUT_FOR_DELIVERY"}
                        onClick={() => handleStatus("OUT_FOR_DELIVERY")}
                        className={`w-full justify-start h-10 font-bold text-xs rounded-xl transition-all border ${
                          order.status === "OUT_FOR_DELIVERY"
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200"
                        }`}
                      >
                        <Truck className="w-4 h-4 mr-2 text-indigo-700" />
                        3. En Camino (Con Cadete)
                        {order.status === "OUT_FOR_DELIVERY" && <Check className="ml-auto w-4 h-4" />}
                      </Button>
                    )}

                    <Button
                      type="button"
                      disabled={isUpdating || order.status === "DELIVERED"}
                      onClick={() => handleStatus("DELIVERED")}
                      className={`w-full justify-start h-10 font-bold text-xs rounded-xl transition-all border ${
                        order.status === "DELIVERED"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-700" />
                      {isDelivery ? "4. Entregado al Cliente ✅" : "3. Retirado por Cliente ✅"}
                      {order.status === "DELIVERED" && <Check className="ml-auto w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Resumen Financiero */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <Receipt className="w-4 h-4 text-orange-600" /> Resumen de Cobro
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Productos:</span>
                    <span className="font-bold text-slate-900">
                      ${(order.items?.reduce((s: number, i: any) => s + (i.subtotal || (i.unitPrice ? i.unitPrice * i.quantity : 0)), 0) || 0).toLocaleString("es-AR")}
                    </span>
                  </div>

                  {order.quantityDiscountAmount > 0 && (
                    <div className="flex justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2 font-bold text-emerald-700">
                      <span>Promoción por cantidad:</span>
                      <span>-${order.quantityDiscountAmount.toLocaleString("es-AR")}</span>
                    </div>
                  )}

                  {isDelivery && (
                    <div className="flex justify-between text-slate-600">
                      <span>Costo de Envío:</span>
                      <span className="font-bold text-slate-900">Incluido en total</span>
                    </div>
                  )}

                  {order.earnedPoints > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Puntos otorgados:
                      </span>
                      <span>+{order.earnedPoints} pts</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-900">Total del Pedido:</span>
                    <span className="text-2xl font-black text-orange-600">
                      ${order.total?.toLocaleString("es-AR")}
                    </span>
                  </div>

                  <div className="text-[11px] font-bold text-slate-500 text-right pt-1">
                    Método: {order.paymentMethod === "ADMIN" ? "Pedido manual pagado" : order.paymentMethod === "MP" ? "Mercado Pago" : "Efectivo"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER MODAL ═══ */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div>
            {!showCancelConfirm ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isUpdating || order.status === "CANCELLED"}
                onClick={() => setShowCancelConfirm(true)}
                className="font-bold text-xs rounded-xl"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Cancelar Pedido
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200">
                <span className="text-xs font-bold text-red-800 pl-1">¿Confirmar cancelación?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isUpdating}
                  onClick={() => {
                    setShowCancelConfirm(false);
                    handleStatus("CANCELLED");
                  }}
                  className="font-bold text-xs h-7 px-2.5 rounded-lg"
                >
                  Sí, Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                  className="font-bold text-xs h-7 px-2.5 rounded-lg"
                >
                  No
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrintClick}
              disabled={isPrinting}
              variant="outline"
              className="border-slate-300 text-slate-800 font-bold text-xs rounded-xl h-9 px-4 hover:bg-slate-50"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />}
              Imprimir
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-9 px-5 shadow-sm"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
