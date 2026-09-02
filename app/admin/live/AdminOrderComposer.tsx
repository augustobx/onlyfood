import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, Search, ShoppingBag, Trash2, X, User, UserCheck, Crown, Coins, Check, CreditCard, Banknote, QrCode } from "lucide-react";
import { toast } from "sonner";

import { createAdminOrder } from "@/app/actions/checkout";
import { getAdminOrderCatalog, searchAdminClients } from "@/app/actions/admin-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuantityDiscountPreview } from "@/lib/use-quantity-discount";

type CatalogData = Awaited<ReturnType<typeof getAdminOrderCatalog>>;
type Product = CatalogData["combos"][number];
type SearchedClient = Awaited<ReturnType<typeof searchAdminClients>>[number];

type CartItem = {
  key: string;
  product: Product;
  quantity: number;
  notes: string;
  removedIngredients: string[];
  addedExtras: { id: string; name: string; price: number }[];
  secondHalfProduct: Product | null;
  comboRemovedIngredients: Record<string, string[]>;
  unitPrice: number;
};

const money = (value: number) => value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function AdminOrderComposer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (orderId: string) => void }) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtraIds, setAddedExtraIds] = useState<string[]>([]);
  const [secondHalfId, setSecondHalfId] = useState<string | null>(null);
  const [comboRemoved, setComboRemoved] = useState<Record<string, string[]>>({});
  
  // Cliente
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientResults, setClientResults] = useState<SearchedClient[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SearchedClient | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Pagos y entrega
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MP" | "ADMIN">("CASH");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PENDING">("PAID");
  const [directDelivered, setDirectDelivered] = useState(false);

  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [slotId, setSlotId] = useState("");
  const [orderType, setOrderType] = useState<"IMMEDIATE" | "SCHEDULED_TOMORROW" | "CUSTOM_DATE">("IMMEDIATE");
  const [scheduledDate, setScheduledDate] = useState("");
  const quantityDiscount = useQuantityDiscountPreview(cart);

  useEffect(() => {
    if (!open || catalog || loadingCatalog) return;
    setLoadingCatalog(true);
    getAdminOrderCatalog()
      .then((data) => {
        setCatalog(data);
        setCategoryId(data.combos.length > 0 ? "combos" : data.categories[0]?.id ?? null);
        setSlotId(data.slots[0]?.id ?? "");
        setWhatsappOptIn((current) => data.whatsappOptInEnabled && current);
        setOrderType(data.allowImmediateOrders
          ? "IMMEDIATE"
          : data.allowScheduledTomorrow
            ? "SCHEDULED_TOMORROW"
            : "CUSTOM_DATE");
      })
      .catch(() => toast.error("No se pudo cargar el catálogo"))
      .finally(() => setLoadingCatalog(false));
  }, [open, catalog, loadingCatalog]);

  useEffect(() => {
    if (!open) setSelectedProduct(null);
  }, [open]);

  // Debounced client search
  useEffect(() => {
    if (!clientSearchQuery || clientSearchQuery.trim().length < 2) {
      setClientResults([]);
      setIsSearchingClient(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingClient(true);
      searchAdminClients(clientSearchQuery)
        .then((res) => {
          setClientResults(res);
          setShowClientDropdown(true);
        })
        .finally(() => setIsSearchingClient(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [clientSearchQuery]);

  const handleSelectClient = (client: SearchedClient) => {
    setSelectedClient(client);
    setClientName(client.name || "");
    setClientPhone(client.phone || "");
    setShowClientDropdown(false);
    setClientSearchQuery("");
    toast.success(`Cliente seleccionado: ${client.name}`, {
      description: `${client.points} pts acumulados ${client.tier ? `· Nivel ${client.tier.name}` : ""}`,
    });
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientName("");
    setClientPhone("");
    setClientSearchQuery("");
    setShowClientDropdown(false);
  };

  const allProducts = useMemo(() => catalog ? [...catalog.combos, ...catalog.categories.flatMap((category) => category.products)] : [], [catalog]);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    const source = categoryId === "combos" ? catalog?.combos ?? [] : allProducts.filter((product) => !categoryId || product.categoryId === categoryId);
    return source.filter((product) => !term || `${product.name} ${product.description || ""}`.toLocaleLowerCase("es").includes(term));
  }, [allProducts, catalog?.combos, categoryId, search]);

  const secondHalf = allProducts.find((product) => product.id === secondHalfId) ?? null;
  const selectedExtras = selectedProduct?.extras
    .map((entry) => entry.extra)
    .filter((extra) => addedExtraIds.includes(extra.id)) ?? [];
  const draftUnitPrice = selectedProduct
    ? (secondHalf ? selectedProduct.basePrice / 2 + secondHalf.basePrice / 2 : selectedProduct.basePrice) + selectedExtras.reduce((sum, extra) => sum + extra.price, 0)
    : 0;

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const afterQuantityDiscount = Math.max(0, subtotal - (quantityDiscount?.amount || 0));
  const discountedSubtotal = afterQuantityDiscount * (1 - (catalog?.globalDiscount ?? 0) / 100);
  const total = discountedSubtotal + (needsDelivery ? catalog?.deliveryCost ?? 0 : 0);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setNotes("");
    setRemovedIngredients([]);
    setAddedExtraIds([]);
    setSecondHalfId(null);
    setComboRemoved({});
  };

  const addConfiguredProduct = () => {
    if (!selectedProduct) return;
    if (selectedProduct.onlyHalf && !secondHalf) {
      toast.error("Seleccioná la segunda mitad");
      return;
    }
    setCart((current) => [...current, {
      key: crypto.randomUUID(),
      product: selectedProduct,
      quantity,
      notes,
      removedIngredients,
      addedExtras: selectedExtras,
      secondHalfProduct: secondHalf,
      comboRemovedIngredients: comboRemoved,
      unitPrice: draftUnitPrice,
    }]);
    setSelectedProduct(null);
    toast.success("Producto agregado");
  };

  const updateCartQuantity = (key: string, next: number) => {
    setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(50, next)) } : item));
  };

  const submitOrder = async () => {
    if (clientName.trim().length < 2) return toast.error("Ingresá el nombre del cliente");
    if (!/^\+?[0-9]{8,15}$/.test(clientPhone.trim())) return toast.error("Ingresá un teléfono válido");
    if (!cart.length) return toast.error("Agregá al menos un producto");
    if (orderType === "CUSTOM_DATE" && !scheduledDate) return toast.error("Seleccioná la fecha para el pedido por encargo");
    if (orderType === "IMMEDIATE" && !slotId) return toast.error("Seleccioná un horario disponible para hoy");
    if (needsDelivery && deliveryAddress.trim().length < 5) return toast.error("Ingresá la dirección de entrega");

    setSubmitting(true);
    try {
      const result = await createAdminOrder({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientId: selectedClient?.id || null,
        whatsappOptIn,
        needsDelivery,
        deliveryAddress: needsDelivery ? deliveryAddress.trim() : null,
        deliverySlotId: slotId || null,
        orderType,
        scheduledDate: orderType === "CUSTOM_DATE" ? scheduledDate : null,
        scheduledTime: catalog?.slots.find((s) => s.id === slotId)?.time || "Horario del turno",
        paymentMethod,
        paymentStatus,
        directDelivered,
        rouletteWinId: null,
        items: cart.map((item) => ({
          product: { id: item.product.id },
          quantity: item.quantity,
          notes: item.notes || null,
          removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras.map((extra) => ({ id: extra.id })),
          secondHalfProduct: item.secondHalfProduct ? { id: item.secondHalfProduct.id } : null,
          comboRemovedIngredients: item.comboRemovedIngredients,
        })),
      });
      if (!result.success || !result.orderId) return toast.error("No se pudo crear el pedido", { description: result.error, duration: 8000 });
      
      const successDesc = selectedClient
        ? `Vinculado a ${selectedClient.name} (${selectedClient.points} pts) · ${paymentStatus === "PAID" ? "Pagado" : "Pendiente"}`
        : `${paymentStatus === "PAID" ? "Marcado como pagado" : "Pago pendiente"}`;
      toast.success("Pedido manual creado con éxito", { description: successDesc });

      setCart([]);
      setSelectedClient(null);
      setClientName("");
      setClientPhone("");
      setClientSearchQuery("");
      setWhatsappOptIn(false);
      setDeliveryAddress("");
      setNeedsDelivery(false);
      setOrderType("IMMEDIATE");
      setScheduledDate("");
      setPaymentMethod("CASH");
      setPaymentStatus("PAID");
      setDirectDelivered(false);
      setCatalog(null);
      onCreated(result.orderId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-4">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-[94vh] sm:rounded-3xl sm:border sm:border-white/50">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Venta desde mostrador / POS</p>
            <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Nuevo pedido manual</h2>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="size-5" /></button>
        </header>

        {loadingCatalog || !catalog ? (
          <div className="grid flex-1 place-items-center"><div className="flex items-center gap-3 font-bold text-slate-500"><Loader2 className="size-5 animate-spin" /> Cargando menú…</div></div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_420px]">
            <section className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="sticky top-0 z-10 -mx-1 mb-4 bg-slate-50/95 px-1 pb-3 backdrop-blur">
                <div className="relative mb-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto…" className="h-11 rounded-xl bg-white pl-10" /></div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {catalog.combos.length > 0 && <button type="button" onClick={() => setCategoryId("combos")} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${categoryId === "combos" ? "bg-purple-700 text-white" : "border border-purple-200 bg-purple-50 text-purple-700"}`}>Combos</button>}
                  {catalog.categories.map((category) => <button type="button" key={category.id} onClick={() => setCategoryId(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${categoryId === category.id ? "bg-slate-950 text-white" : "border bg-white text-slate-600"}`}>{category.name}</button>)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <button type="button" key={product.id} onClick={() => openProduct(product)} className="group rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md">
                    <div className="mb-3 flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><ShoppingBag className="size-5" /></span>{product.isCombo && <span className="rounded-full bg-purple-100 px-2 py-1 text-[9px] font-black uppercase text-purple-700">Combo</span>}</div>
                    <h3 className="font-black leading-tight text-slate-900">{product.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{product.description || "Personalizable"}</p>
                    <p className="mt-3 text-lg font-black text-orange-600">{money(product.basePrice)}</p>
                  </button>
                ))}
              </div>
            </section>

            <aside className="min-h-0 overflow-y-auto border-l bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Datos del pedido</h3>
              <div className="grid gap-3">
                {/* Selector de tipo */}
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold">
                  <button type="button" disabled={!catalog.allowImmediateOrders} onClick={() => setOrderType("IMMEDIATE")} className={`rounded-lg py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${orderType === "IMMEDIATE" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Hoy</button>
                  <button type="button" disabled={!catalog.allowScheduledTomorrow} onClick={() => setOrderType("SCHEDULED_TOMORROW")} className={`rounded-lg py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${orderType === "SCHEDULED_TOMORROW" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Mañana</button>
                  <button type="button" disabled={!catalog.allowAdvanceOrders} onClick={() => setOrderType("CUSTOM_DATE")} className={`rounded-lg py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${orderType === "CUSTOM_DATE" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Encargo</button>
                </div>

                {orderType === "CUSTOM_DATE" && (
                  <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="h-10 text-xs font-bold" />
                )}

                {/* Buscador y Selección de Cliente Registrado */}
                <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                      <User className="size-3.5 text-orange-600" /> Cliente
                    </span>
                    {selectedClient ? (
                      <button
                        type="button"
                        onClick={handleClearClient}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        ✕ Desvincular
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Registrado o nuevo</span>
                    )}
                  </div>

                  {selectedClient ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="size-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-black text-emerald-950 truncate">{selectedClient.name}</span>
                          {selectedClient.tier && (
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.2 rounded text-white"
                              style={{ backgroundColor: selectedClient.tier.color || "#8b5cf6" }}
                            >
                              👑 {selectedClient.tier.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-800 font-medium pl-5 mt-0.5">
                          {selectedClient.phone} · <strong className="font-black text-amber-700">{selectedClient.points} pts acumulados</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          onFocus={() => clientResults.length > 0 && setShowClientDropdown(true)}
                          placeholder="Buscar cliente registrado (nombre o tel)..."
                          className="h-9 bg-white pl-8 text-xs font-medium rounded-xl"
                        />
                        {isSearchingClient && (
                          <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-slate-400" />
                        )}
                      </div>

                      {showClientDropdown && clientResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {clientResults.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => handleSelectClient(c)}
                              className="w-full text-left px-3 py-2 text-xs border-b last:border-0 hover:bg-orange-50 transition-colors flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 truncate">{c.name}</p>
                                <p className="text-[11px] text-slate-500">{c.phone}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {c.tier && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded text-white" style={{ backgroundColor: c.tier.color || "#8b5cf6" }}>
                                    {c.tier.name}
                                  </span>
                                )}
                                <span className="block text-[10px] font-bold text-amber-600">+{c.points} pts</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="Nombre del cliente"
                      maxLength={100}
                      className="h-9 text-xs font-medium bg-white"
                    />
                    <Input
                      value={clientPhone}
                      onChange={(event) => setClientPhone(event.target.value.replace(/[^+\d]/g, ""))}
                      placeholder="Teléfono"
                      inputMode="tel"
                      maxLength={16}
                      className="h-9 text-xs font-medium bg-white"
                    />
                  </div>
                </div>

                {catalog.whatsappOptInEnabled && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border bg-slate-50 p-2.5 text-xs text-slate-700">
                    <Checkbox checked={whatsappOptIn} onCheckedChange={(checked) => setWhatsappOptIn(checked === true)} />
                    El cliente autorizó recibir confirmación y estados de este pedido por WhatsApp.
                  </label>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNeedsDelivery(false)} className={`rounded-xl border p-2.5 text-xs font-black ${!needsDelivery ? "border-orange-500 bg-orange-50 text-orange-700" : "text-slate-500"}`}>Retira en local</button>
                  <button type="button" onClick={() => setNeedsDelivery(true)} className={`rounded-xl border p-2.5 text-xs font-black ${needsDelivery ? "border-orange-500 bg-orange-50 text-orange-700" : "text-slate-500"}`}>Envío a domicilio</button>
                </div>
                {needsDelivery && <Input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Dirección de entrega" maxLength={250} className="h-9 text-xs" />}
                
                <select value={slotId} onChange={(event) => setSlotId(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-xs">
                  <option value="" disabled>Seleccionar franja horaria</option>
                  {catalog.slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.time} · {slot.available} cupos</option>)}
                </select>

                {/* Selector de Método de Pago y Estado del Pago */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-700 block">
                    Forma y Estado del Pago
                  </span>

                  {/* Método de pago */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all ${paymentMethod === "CASH" ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 shadow-xs" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <Banknote className="size-4 mb-1 text-emerald-600" />
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("MP")}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all ${paymentMethod === "MP" ? "border-sky-500 bg-sky-50 text-sky-950 ring-1 ring-sky-500 shadow-xs" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <QrCode className="size-4 mb-1 text-sky-600" />
                      Mercado Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ADMIN")}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold transition-all ${paymentMethod === "ADMIN" ? "border-purple-500 bg-purple-50 text-purple-950 ring-1 ring-purple-500 shadow-xs" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <CreditCard className="size-4 mb-1 text-purple-600" />
                      Tarjeta / Pos
                    </button>
                  </div>

                  {/* Estado del pago */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus("PAID")}
                      className={`p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${paymentStatus === "PAID" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      <Check className="size-3.5" /> Ya Cobrado / Pagado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus("PENDING")}
                      className={`p-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${paymentStatus === "PENDING" ? "bg-amber-600 text-white border-amber-600 shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      Pendiente de Cobro
                    </button>
                  </div>

                  {/* Entrega directa en mostrador */}
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] font-bold text-slate-700">
                    <Checkbox checked={directDelivered} onCheckedChange={(c) => setDirectDelivered(c === true)} />
                    <span>Entregado en mano ahora (sin pasar por cola de cocina)</span>
                  </label>
                </div>
              </div>

              <div className="my-5 border-t" />
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Pedido</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} ítems</span></div>
              <div className="space-y-2">
                {!cart.length && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">Elegí productos del menú</div>}
                {cart.map((item) => (
                  <div key={item.key} className="rounded-xl border bg-slate-50 p-3">
                    <div className="flex justify-between gap-3"><div><p className="text-sm font-black text-slate-900">{item.secondHalfProduct ? `Mitad ${item.product.name} / ${item.secondHalfProduct.name}` : item.product.name}</p>{item.addedExtras.length > 0 && <p className="text-[10px] font-bold text-green-700">+ {item.addedExtras.map((extra) => extra.name).join(", ")}</p>}{item.removedIngredients.length > 0 && <p className="text-[10px] font-bold text-red-600">Ingredientes quitados: {item.removedIngredients.length}</p>}</div><button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} className="text-red-500"><Trash2 className="size-4" /></button></div>
                    <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2 rounded-full border bg-white p-1"><button type="button" onClick={() => updateCartQuantity(item.key, item.quantity - 1)} className="grid size-6 place-items-center"><Minus className="size-3" /></button><span className="w-5 text-center text-xs font-black">{item.quantity}</span><button type="button" onClick={() => updateCartQuantity(item.key, item.quantity + 1)} className="grid size-6 place-items-center"><Plus className="size-3" /></button></div><span className="font-black text-orange-600">{money(item.unitPrice * item.quantity)}</span></div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>{quantityDiscount && <div className="flex justify-between font-bold text-emerald-700"><span>{quantityDiscount.name}</span><span>-{money(quantityDiscount.amount)}</span></div>}{catalog.globalDiscount > 0 && <div className="flex justify-between text-green-700"><span>Descuento general ({catalog.globalDiscount}%)</span><span>-{money(afterQuantityDiscount - discountedSubtotal)}</span></div>}{needsDelivery && <div className="flex justify-between text-slate-500"><span>Envío</span><span>{money(catalog.deliveryCost)}</span></div>}<div className="flex justify-between border-t pt-3 text-xl font-black text-slate-950"><span>Total</span><span>{money(total)}</span></div></div>
              <Button onClick={submitOrder} disabled={submitting || !cart.length} className="mt-5 h-14 w-full rounded-2xl bg-orange-600 text-base font-black hover:bg-orange-700">
                {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Creando pedido…</> : directDelivered ? "Crear y marcar como entregado" : "Crear pedido en sistema"}
              </Button>
            </aside>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-orange-600">Personalizar</p><h3 className="text-2xl font-black text-slate-950">{selectedProduct.name}</h3><p className="font-bold text-orange-600">{money(draftUnitPrice)} c/u</p></div><button type="button" onClick={() => setSelectedProduct(null)} className="grid size-9 place-items-center rounded-full bg-slate-100"><X className="size-4" /></button></div>

            {selectedProduct.allowHalf && <OptionSection title={selectedProduct.onlyHalf ? "Completá la otra mitad" : "Otra mitad (opcional)"}><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setSecondHalfId(null)} className={`rounded-xl border p-2 text-xs font-bold ${!secondHalfId ? "border-orange-500 bg-orange-50" : ""}`}>Producto entero</button>{allProducts.filter((product) => product.id !== selectedProduct.id && product.categoryId === selectedProduct.categoryId && product.allowHalf).map((product) => <button type="button" key={product.id} onClick={() => setSecondHalfId(product.id)} className={`rounded-xl border p-2 text-xs font-bold ${secondHalfId === product.id ? "border-orange-500 bg-orange-50" : ""}`}>{product.name}</button>)}</div></OptionSection>}

            {!selectedProduct.isCombo && selectedProduct.allowRemoveIngredients && selectedProduct.ingredients.length > 0 && <OptionSection title="Ingredientes"><div className="grid gap-2">{selectedProduct.ingredients.map((entry) => <CheckRow key={entry.ingredient.id} label={entry.ingredient.name} checked={!removedIngredients.includes(entry.ingredient.id)} disabled={!entry.isRemovable} onChange={(checked) => setRemovedIngredients((current) => checked ? current.filter((id) => id !== entry.ingredient.id) : [...current, entry.ingredient.id])} />)}</div></OptionSection>}

            {selectedProduct.isCombo && selectedProduct.comboItemsConfig.map((comboItem) => comboItem.product.allowRemoveIngredients && comboItem.product.ingredients.length > 0 ? <OptionSection key={comboItem.id} title={`${comboItem.product.name} × ${comboItem.quantity}`}><div className="grid gap-2">{comboItem.product.ingredients.map((entry) => <CheckRow key={entry.ingredient.id} label={entry.ingredient.name} checked={!(comboRemoved[comboItem.id] ?? []).includes(entry.ingredient.id)} disabled={!entry.isRemovable} onChange={(checked) => setComboRemoved((current) => { const ids = current[comboItem.id] ?? []; return { ...current, [comboItem.id]: checked ? ids.filter((id) => id !== entry.ingredient.id) : [...ids, entry.ingredient.id] }; })} />)}</div></OptionSection> : null)}

            {selectedProduct.extras.length > 0 && <OptionSection title="Extras"><div className="grid gap-2">{selectedProduct.extras.map(({ extra }) => <CheckRow key={extra.id} label={`${extra.name} · +${money(extra.price)}`} checked={addedExtraIds.includes(extra.id)} onChange={(checked) => setAddedExtraIds((current) => checked ? [...current, extra.id] : current.filter((id) => id !== extra.id))} />)}</div></OptionSection>}

            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Aclaraciones para cocina…" maxLength={500} className="mt-4" />
            <div className="mt-5 flex items-center gap-3"><div className="flex h-12 items-center rounded-full border bg-slate-50 p-1"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid size-9 place-items-center"><Minus className="size-4" /></button><span className="w-7 text-center font-black">{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(50, quantity + 1))} className="grid size-9 place-items-center"><Plus className="size-4" /></button></div><Button onClick={addConfiguredProduct} className="h-12 flex-1 rounded-full bg-orange-600 font-black hover:bg-orange-700">Agregar · {money(draftUnitPrice * quantity)}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">{title}</h4>{children}</section>;
}

function CheckRow({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${disabled ? "cursor-not-allowed bg-slate-50 opacity-50" : "hover:bg-slate-50"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-orange-600" /><span className="font-medium text-slate-700">{label}</span></label>;
}
