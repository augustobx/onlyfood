"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateConfig, broadcastPushNotification, disconnectWhatsAppIntegration, retryWhatsAppNotification, testWhatsAppConnection } from "@/app/actions/admin-settings";
import { testConfiguredPrinter } from "@/app/actions/admin-printing";
import { Save, Store, Palette, Wallet, Megaphone, Send, Printer, CreditCard, MessageCircle, Calendar, Clock, CircleCheck, CircleAlert, RefreshCw, Unplug } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseBusinessHours, DaySchedule } from "@/lib/business-hours";
import { MediaPickerInput } from "@/components/admin/MediaPickerInput";

export function SettingsForm({
  initialConfig,
  printNodeApiKeyConfigured,
  whatsappIntegrationConfigured,
  metaAppSecretConfigured,
  whatsappWebhookUrl,
  whatsappNotifications,
  whatsappEnabled,
  printNodeEnabled,
}: {
  initialConfig: any;
  printNodeApiKeyConfigured: boolean;
  whatsappIntegrationConfigured: boolean;
  metaAppSecretConfigured: boolean;
  whatsappWebhookUrl: string;
  whatsappNotifications: any[];
  whatsappEnabled: boolean;
  printNodeEnabled: boolean;
}) {
  const [cfg, setCfg] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>(() => parseBusinessHours(initialConfig.businessHours));

  // Estados para el envío masivo PUSH
  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<"KITCHEN" | "COUNTER" | null>(null);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [disconnectingWhatsApp, setDisconnectingWhatsApp] = useState(false);
  const [retryingNotification, setRetryingNotification] = useState<string | null>(null);
  const [waConfigured, setWaConfigured] = useState(whatsappIntegrationConfigured);

  const updateField = (field: string, value: any) => {
    setCfg((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateDaySchedule = (dayIndex: number, patch: Partial<DaySchedule>) => {
    setBusinessHours((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const dataToSave = {
      appName: cfg.appName,
      isStoreOpen: cfg.isStoreOpen,
      closedMessage: cfg.closedMessage,
      primaryColor: cfg.primaryColor,
      secondaryColor: cfg.secondaryColor,
      storeTheme: cfg.storeTheme || "ORIGINAL",
      splashEnabled: cfg.splashEnabled,
      splashDuration: Number(cfg.splashDuration),
      splashType: cfg.splashType || "IMAGE",
      welcomeBalloonDuration: Number(cfg.welcomeBalloonDuration) || 0,
      deliveryCost: Number(cfg.deliveryCost) || 0,
      globalDiscount: Number(cfg.globalDiscount) || 0,
      splashUrl: cfg.splashUrl,
      splashVideoUrl: cfg.splashVideoUrl,
      logoUrl: cfg.logoUrl,
      welcomeBalloonEnabled: cfg.welcomeBalloonEnabled,
      welcomeBalloonText: cfg.welcomeBalloonText,
      noticeBoardEnabled: Boolean(cfg.noticeBoardEnabled),
      noticeBoardTitle: cfg.noticeBoardTitle || "Novedades",
      noticeBoardMessage: cfg.noticeBoardMessage || "",
      noticeBoardAutoClose: Boolean(cfg.noticeBoardAutoClose),
      noticeBoardDuration: Number(cfg.noticeBoardDuration) || 8,
      paymentCash: cfg.paymentCash,
      paymentMp: cfg.paymentMp,
      autoPrintTickets: printNodeEnabled ? cfg.autoPrintTickets : false,
      printingMode: printNodeEnabled ? (cfg.printingMode || "BROWSER") : "BROWSER",
      printNodeCounterPrinterId: cfg.printNodeCounterPrinterId ? Number(cfg.printNodeCounterPrinterId) : null,
      printNodeKitchenPrinterId: cfg.printNodeKitchenPrinterId ? Number(cfg.printNodeKitchenPrinterId) : null,
      backgroundUrl: cfg.backgroundUrl,
      backgroundBlur: cfg.backgroundBlur,
      mpAccessToken: cfg.mpAccessToken,
      mpPublicKey: cfg.mpPublicKey,

      // Horarios y Pedidos Anticipados / Modulares
      allowImmediateOrders: Boolean(cfg.allowImmediateOrders ?? true),
      allowScheduledTomorrow: Boolean(cfg.allowScheduledTomorrow ?? true),
      allowAdvanceOrders: Boolean(cfg.allowAdvanceOrders ?? true),
      advanceOrderMinDays: Number(cfg.advanceOrderMinDays) || 1,
      advanceOrderMaxDays: Number(cfg.advanceOrderMaxDays) || 30,
      asapEstimatedMinutes: Number(cfg.asapEstimatedMinutes) || 40,
      businessHours: JSON.stringify(businessHours),
      autoScheduleEnabled: Boolean(cfg.autoScheduleEnabled),

      // NUEVOS CAMPOS DE IMPRESORAS
      printerCounterName: cfg.printerCounterName,
      printerCounterSize: cfg.printerCounterSize || "80mm",
      printerKitchenName: cfg.printerKitchenName,
      printerKitchenSize: cfg.printerKitchenSize || "80mm",

      // Notificaciones transaccionales por WhatsApp
      whatsappNotificationsEnabled: whatsappEnabled ? cfg.whatsappNotificationsEnabled : false,
      whatsappNotifyOrderConfirmed: Boolean(cfg.whatsappNotifyOrderConfirmed ?? true),
      whatsappNotifyOrderPreparing: Boolean(cfg.whatsappNotifyOrderPreparing ?? true),
      whatsappNotifyOrderReady: Boolean(cfg.whatsappNotifyOrderReady ?? true),
      whatsappTemplateLanguage: cfg.whatsappTemplateLanguage || "es_AR",
      whatsappConfirmedTemplate: cfg.whatsappConfirmedTemplate || "onlyfood_order_confirmed",
      whatsappPreparingTemplate: cfg.whatsappPreparingTemplate || "onlyfood_order_preparing",
      whatsappReadyPickupTemplate: cfg.whatsappReadyPickupTemplate || "onlyfood_order_ready_pickup",
      whatsappReadyDeliveryTemplate: cfg.whatsappReadyDeliveryTemplate || "onlyfood_order_ready_delivery",
      whatsappDefaultCountryCode: cfg.whatsappDefaultCountryCode || "549",
      metaApiToken: cfg.metaApiToken,
      metaPhoneNumberId: cfg.metaPhoneNumberId,
      metaVerifyToken: cfg.metaVerifyToken,
      metaApiVersion: cfg.metaApiVersion || "v23.0",
    };

    const result = await updateConfig(cfg.id, dataToSave);
    if (result.success) {
      toast.success("Configuración general guardada");
      if ("whatsappConfigured" in result) setWaConfigured(Boolean(result.whatsappConfigured));
    } else {
      toast.error("Error", { description: result.error });
    }
    setIsSaving(false);
  };

  const handleWhatsAppTest = async () => {
    setTestingWhatsApp(true);
    const result = await testWhatsAppConnection();
    if (result.success) toast.success("Conexión con Meta correcta", { description: `${result.name} · ${result.phone}` });
    else toast.error("No se pudo validar WhatsApp", { description: result.error });
    setTestingWhatsApp(false);
  };

  const handleWhatsAppDisconnect = async () => {
    setDisconnectingWhatsApp(true);
    const result = await disconnectWhatsAppIntegration();
    if (result.success) {
      setWaConfigured(false);
      setCfg((prev: any) => ({ ...prev, whatsappNotificationsEnabled: false, metaApiToken: null, metaPhoneNumberId: null, metaVerifyToken: null }));
      toast.success("Integración de WhatsApp desconectada");
    } else toast.error("No se pudo desconectar WhatsApp");
    setDisconnectingWhatsApp(false);
  };

  const handleWhatsAppRetry = async (notificationId: string) => {
    setRetryingNotification(notificationId);
    const result = await retryWhatsAppNotification(notificationId);
    if (result.success) toast.success("Notificación reenviada");
    else toast.error("El reintento falló", { description: result.error });
    setRetryingNotification(null);
  };

  const handlePrinterTest = async (kind: "KITCHEN" | "COUNTER") => {
    setTestingPrinter(kind);
    const printerId = Number(kind === "KITCHEN" ? cfg.printNodeKitchenPrinterId : cfg.printNodeCounterPrinterId);
    const configuredRollSize = kind === "KITCHEN" ? cfg.printerKitchenSize : cfg.printerCounterSize;
    const rollSize: "58mm" | "80mm" = configuredRollSize === "58mm" ? "58mm" : "80mm";
    const result = await testConfiguredPrinter(kind, printerId, rollSize);
    if (result.success) toast.success("Prueba enviada a PrintNode", { description: `Trabajo #${"jobId" in result ? result.jobId ?? "aceptado" : "aceptado"}` });
    else toast.error("No se pudo imprimir", { description: result.error });
    setTestingPrinter(null);
  };

  const handleBroadcastPush = async () => {
    if (!promoTitle.trim() || !promoBody.trim()) {
      toast.error("Datos incompletos", { description: "Debe ingresar un título y un mensaje." });
      return;
    }

    if (!confirm("¿Está seguro de enviar esta notificación a TODOS los dispositivos suscritos?")) {
      return;
    }

    setIsBroadcasting(true);
    const res = await broadcastPushNotification(promoTitle, promoBody, "/");

    if (res.success) {
      toast.success("¡Notificaciones enviadas!", { description: res.message });
      setPromoTitle("");
      setPromoBody("");
    } else {
      toast.error("Fallo de envío", { description: res.error });
    }
    setIsBroadcasting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg font-bold">
          <Save className="h-5 w-5 mr-2" /> Guardar Todos los Cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 bg-slate-200 h-auto p-1 gap-1">
          <TabsTrigger value="general"><Store className="w-4 h-4 mr-2" /> Negocio</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-2" /> Horarios</TabsTrigger>
          <TabsTrigger value="finance"><Wallet className="w-4 h-4 mr-2" /> Pagos</TabsTrigger>
          <TabsTrigger value="mercadopago"><CreditCard className="w-4 h-4 mr-2" /> M. Pago</TabsTrigger>
          {whatsappEnabled && <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</TabsTrigger>}
          <TabsTrigger value="marketing"><Megaphone className="w-4 h-4 mr-2" /> Splash</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-2" /> Diseño</TabsTrigger>
          {printNodeEnabled && <TabsTrigger value="printers"><Printer className="w-4 h-4 mr-2" /> Impresoras</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes de Operación</CardTitle>
              <CardDescription>Controla el estado principal de la app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Aplicación (Título)</Label>
                  <Input value={cfg.appName} onChange={e => updateField('appName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <MediaPickerInput
                    label="Logo del NavBar (Opcional)"
                    placeholder="URL de la imagen (dejar vacío para usar el texto)"
                    value={cfg.logoUrl || ''}
                    onChange={url => updateField('logoUrl', url)}
                  />
                  <p className="text-xs text-muted-foreground">Aparecerá en la barra superior en vez del texto clásico.</p>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4 bg-slate-50">
                <div className="space-y-0.5">
                  <Label className="text-base text-slate-800 font-bold">Local Abierto (Aceptar Pedidos)</Label>
                  <p className="text-sm text-muted-foreground">Si se desactiva, los clientes verán el mensaje de cierre y no podrán comprar.</p>
                </div>
                <Switch checked={cfg.isStoreOpen} onCheckedChange={v => updateField('isStoreOpen', v)} />
              </div>

              {!cfg.isStoreOpen && (
                <div className="space-y-2">
                  <Label className="text-red-600 font-semibold">Mensaje de Local Cerrado</Label>
                  <Textarea value={cfg.closedMessage} onChange={e => updateField('closedMessage', e.target.value)} placeholder="Ej: Ya cerramos por hoy. Volvemos mañana a las 20hs." />
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA HORARIOS & ENCARGOS */}
        <TabsContent value="schedule" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" /> Reglas de Pedidos Anticipados y Tiempos
              </CardTitle>
              <CardDescription>
                Configuración para pedidos inmediatos, para el día siguiente y por encargo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between border rounded-2xl p-4 bg-slate-50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-800">⚡ Pedidos al momento</Label>
                    <p className="text-xs text-muted-foreground">Recepción inmediata para cocina / despacho de hoy.</p>
                  </div>
                  <Switch
                    checked={cfg.allowImmediateOrders ?? true}
                    onCheckedChange={(v) => updateField("allowImmediateOrders", v)}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-2xl p-4 bg-slate-50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-800">📅 Pedidos para mañana</Label>
                    <p className="text-xs text-muted-foreground">Programación para el día siguiente.</p>
                  </div>
                  <Switch
                    checked={cfg.allowScheduledTomorrow ?? true}
                    onCheckedChange={(v) => updateField("allowScheduledTomorrow", v)}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-2xl p-4 bg-slate-50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-800">📆 Pedidos por encargo</Label>
                    <p className="text-xs text-muted-foreground">Calendario de fecha futura y eventos.</p>
                  </div>
                  <Switch
                    checked={cfg.allowAdvanceOrders ?? true}
                    onCheckedChange={(v) => updateField("allowAdvanceOrders", v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Tiempo estimado pedido inmediato (minutos)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={cfg.asapEstimatedMinutes || 40}
                    onChange={(e) => updateField("asapEstimatedMinutes", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Se muestra en la opción "Para el momento".</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Mínimo días de anticipación (Encargo)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={cfg.advanceOrderMinDays || 1}
                    onChange={(e) => updateField("advanceOrderMinDays", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Días mínimos antes de la fecha elegida.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Máximo días de anticipación (Encargo)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={cfg.advanceOrderMaxDays || 30}
                    onChange={(e) => updateField("advanceOrderMaxDays", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Límite máximo del calendario.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" /> Cronograma Semanal de Atención
                  </CardTitle>
                  <CardDescription>
                    Configura los días y turnos de atención del comercio (Lunes a Domingo).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                  <div className="text-right">
                    <Label htmlFor="auto-sched" className="text-xs font-black text-purple-950 block">Apertura Automática</Label>
                    <span className="text-[10px] text-purple-700">Abre/cierra según hora local</span>
                  </div>
                  <Switch
                    id="auto-sched"
                    checked={cfg.autoScheduleEnabled || false}
                    onCheckedChange={(v) => updateField("autoScheduleEnabled", v)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessHours.map((day, idx) => (
                  <div
                    key={day.day}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      day.isOpen ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[130px]">
                      <Switch
                        checked={day.isOpen}
                        onCheckedChange={(v) => updateDaySchedule(idx, { isOpen: v })}
                      />
                      <div>
                        <span className="font-black text-sm text-slate-900 block">{day.dayName}</span>
                        <span className={`text-[10px] font-bold uppercase ${day.isOpen ? "text-green-600" : "text-slate-400"}`}>
                          {day.isOpen ? "Abierto" : "Cerrado"}
                        </span>
                      </div>
                    </div>

                    {day.isOpen ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                          <span className="text-xs font-bold text-slate-500 min-w-[55px]">Turno 1:</span>
                          <Input
                            type="time"
                            value={day.shift1Open}
                            onChange={(e) => updateDaySchedule(idx, { shift1Open: e.target.value })}
                            className="h-8 bg-white text-xs font-bold w-24"
                          />
                          <span className="text-xs text-slate-400 font-bold">a</span>
                          <Input
                            type="time"
                            value={day.shift1Close}
                            onChange={(e) => updateDaySchedule(idx, { shift1Close: e.target.value })}
                            className="h-8 bg-white text-xs font-bold w-24"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                          <span className="text-xs font-bold text-slate-500 min-w-[55px]">Turno 2:</span>
                          <Input
                            type="time"
                            value={day.shift2Open}
                            onChange={(e) => updateDaySchedule(idx, { shift2Open: e.target.value })}
                            className="h-8 bg-white text-xs font-bold w-24"
                          />
                          <span className="text-xs text-slate-400 font-bold">a</span>
                          <Input
                            type="time"
                            value={day.shift2Close}
                            onChange={(e) => updateDaySchedule(idx, { shift2Close: e.target.value })}
                            className="h-8 bg-white text-xs font-bold w-24"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400 italic">No se recibirán pedidos inmediatos este día.</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos, Envíos y Descuentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Costo de Envío Fijo ($)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Se sumará al total si eligen Delivery.</p>
                  <Input type="number" min="0" step="0.01" value={cfg.deliveryCost} onChange={e => updateField('deliveryCost', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600">Descuento Global (%)</Label>
                  <p className="text-xs text-muted-foreground mb-2">0% desactiva el cartel. Por ej: 10% aplica a la tienda entera.</p>
                  <Input type="number" min="0" max="100" step="1" value={cfg.globalDiscount} onChange={e => updateField('globalDiscount', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="block text-base font-bold mb-2">Métodos de Pago Habitilitados</Label>

                <div className="flex items-center justify-between border rounded-lg p-3">
                  <Label>Efectivo (Pago al recibir/retirar)</Label>
                  <Switch checked={cfg.paymentCash} onCheckedChange={v => updateField('paymentCash', v)} />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-3">
                  <Label>MercadoPago (Transferencia / Link)</Label>
                  <Switch checked={cfg.paymentMp} onCheckedChange={v => updateField('paymentMp', v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mercadopago" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Integración Mercado Pago</CardTitle>
              <CardDescription>Credenciales de Producción de tu cuenta de Mercado Pago.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 bg-slate-50 p-4 border rounded-xl">
                <div className="space-y-2">
                  <Label className="font-bold">Access Token</Label>
                  <Input
                    type="password"
                    placeholder="APP_USR-..."
                    value={cfg.mpAccessToken || ''}
                    onChange={e => updateField('mpAccessToken', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Token privado necesario para generar los cobros.</p>
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="font-bold">Public Key</Label>
                  <Input
                    placeholder="APP_USR-..."
                    value={cfg.mpPublicKey || ''}
                    onChange={e => updateField('mpPublicKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Clave pública de la aplicación.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp transactional notifications */}
        {whatsappEnabled && <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Avisos automáticos por WhatsApp</CardTitle>
              <CardDescription>Envía plantillas oficiales de Meta cuando el pedido se confirma, entra en cocina o queda listo. Este módulo no responde mensajes ni toma pedidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-2 border-green-200 rounded-xl p-4 bg-green-50">
                <div className="space-y-0.5">
                  <Label className="text-base text-slate-800 font-bold">Activar avisos de pedidos</Label>
                  <p className="text-sm text-muted-foreground">Los avisos se envían automáticamente al teléfono informado por el cliente.</p>
                </div>
                <Switch checked={cfg.whatsappNotificationsEnabled} onCheckedChange={v => updateField('whatsappNotificationsEnabled', v)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`rounded-xl border p-3 ${waConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center gap-2 font-bold text-sm">{waConfigured ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />} Credenciales del comercio</div>
                  <p className="mt-1 text-xs text-muted-foreground">{waConfigured ? "Configuradas y cifradas" : "Falta guardar token, Phone Number ID y verify token"}</p>
                </div>
                <div className={`rounded-xl border p-3 ${metaAppSecretConfigured ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex items-center gap-2 font-bold text-sm">{metaAppSecretConfigured ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-red-600" />} App Secret de la plataforma</div>
                  <p className="mt-1 text-xs text-muted-foreground">{metaAppSecretConfigured ? "Configurado en el servidor" : "Falta META_APP_SECRET en el contenedor"}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                <Label className="font-bold">URL del webhook para Meta</Label>
                <Input readOnly value={whatsappWebhookUrl || "Configurá BASE_URL en el servidor"} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Suscribí el campo <strong>messages</strong>. El endpoint registra entregas, lecturas y errores; ignora conversaciones entrantes.</p>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 border rounded-xl">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label className="font-bold">Token de Acceso Permanente</Label><Input type="password" placeholder={waConfigured ? "Guardado · dejar vacío para conservar" : "EAA..."} value={cfg.metaApiToken || ''} onChange={e => updateField('metaApiToken', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Phone Number ID</Label><Input placeholder="1234567890" value={cfg.metaPhoneNumberId || ''} onChange={e => updateField('metaPhoneNumberId', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Token de verificación del webhook</Label><Input type="password" placeholder={waConfigured ? "Guardado · dejar vacío para conservar" : "Mínimo 16 caracteres"} value={cfg.metaVerifyToken || ''} onChange={e => updateField('metaVerifyToken', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="font-bold">Graph API</Label><Input value={cfg.metaApiVersion || 'v23.0'} onChange={e => updateField('metaApiVersion', e.target.value)} placeholder="v23.0" /></div>
                    <div className="space-y-2"><Label className="font-bold">Prefijo país</Label><Input value={cfg.whatsappDefaultCountryCode || '549'} onChange={e => updateField('whatsappDefaultCountryCode', e.target.value)} placeholder="549" /></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Para Argentina usá <strong>549</strong>. Guardá teléfonos con código de área, sin 0 ni 15.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleWhatsAppTest} disabled={!waConfigured || testingWhatsApp}><RefreshCw className={`mr-2 h-4 w-4 ${testingWhatsApp ? "animate-spin" : ""}`} /> Validar conexión</Button>
                  <Button type="button" variant="outline" className="text-red-700" onClick={handleWhatsAppDisconnect} disabled={!waConfigured || disconnectingWhatsApp}><Unplug className="mr-2 h-4 w-4" /> Desconectar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Eventos y plantillas aprobadas</CardTitle><CardDescription>Los nombres deben coincidir exactamente con plantillas Utility aprobadas en WhatsApp Manager.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["whatsappNotifyOrderConfirmed", "Pedido confirmado", "Productos, cantidades, total y modalidad."],
                  ["whatsappNotifyOrderPreparing", "Pedido en cocina", "Cuando pasa a En preparación."],
                  ["whatsappNotifyOrderReady", "Pedido listo", "Texto diferente para retiro o envío."],
                ].map(([field, title, description]) => <div key={field} className="flex items-start justify-between gap-3 rounded-xl border p-3"><div><p className="text-sm font-bold">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={Boolean(cfg[field])} onCheckedChange={value => updateField(field, value)} /></div>)}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Idioma</Label><Input value={cfg.whatsappTemplateLanguage || 'es_AR'} onChange={e => updateField('whatsappTemplateLanguage', e.target.value)} /></div>
                <div className="space-y-2"><Label>Confirmado · 6 variables</Label><Input value={cfg.whatsappConfirmedTemplate || ''} onChange={e => updateField('whatsappConfirmedTemplate', e.target.value)} /></div>
                <div className="space-y-2"><Label>En cocina · 3 variables</Label><Input value={cfg.whatsappPreparingTemplate || ''} onChange={e => updateField('whatsappPreparingTemplate', e.target.value)} /></div>
                <div className="space-y-2"><Label>Listo para retirar · 3 variables</Label><Input value={cfg.whatsappReadyPickupTemplate || ''} onChange={e => updateField('whatsappReadyPickupTemplate', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Listo para enviar · 4 variables</Label><Input value={cfg.whatsappReadyDeliveryTemplate || ''} onChange={e => updateField('whatsappReadyDeliveryTemplate', e.target.value)} /></div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-950 space-y-2">
                <p><strong>Confirmado:</strong> 1 cliente, 2 pedido, 3 comercio, 4 detalle, 5 total, 6 entrega/retiro.</p>
                <p><strong>En cocina:</strong> 1 cliente, 2 pedido, 3 comercio.</p>
                <p><strong>Listo retiro:</strong> 1 cliente, 2 pedido, 3 comercio.</p>
                <p><strong>Listo envío:</strong> 1 cliente, 2 pedido, 3 dirección, 4 comercio.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Últimos envíos</CardTitle><CardDescription>Aceptación, entrega, lectura y errores informados por Meta.</CardDescription></CardHeader>
            <CardContent>
              {whatsappNotifications.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay notificaciones registradas.</p> : <div className="space-y-2">{whatsappNotifications.map(notification => <div key={notification.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-bold">#{notification.order.id.slice(-6).toUpperCase()} · {notification.order.clientName}</p><p className="truncate text-xs text-muted-foreground">{notification.event} · {notification.templateName} · intento {notification.attempts}</p>{notification.error && <p className="mt-1 text-xs text-red-700">{notification.error}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${notification.status === 'FAILED' ? 'bg-red-100 text-red-700' : notification.status === 'READ' || notification.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{notification.status}</span>{notification.status === "FAILED" && <Button type="button" size="sm" variant="outline" onClick={() => handleWhatsAppRetry(notification.id)} disabled={retryingNotification === notification.id}><RefreshCw className={`mr-1 h-3 w-3 ${retryingNotification === notification.id ? 'animate-spin' : ''}`} /> Reintentar</Button>}</div></div>)}</div>}
            </CardContent>
          </Card>
        </TabsContent>}

        <TabsContent value="marketing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comunicaciones y Marketing</CardTitle>
              <CardDescription>Envío de Notificaciones PUSH y configuración visual de bienvenida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NOTIFICACIONES PUSH MASIVAS */}
              <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/50 space-y-4">
                <div>
                  <Label className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <Send className="w-5 h-5" /> Envío Masivo de Notificaciones (Prueba/Promo)
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">Enviará un Push instantáneo a todos los usuarios y dispositivos que hayan activado las notificaciones. Útil para testear o avisar de promociones.</p>
                </div>

                <div className="space-y-4 bg-white p-4 rounded-lg border shadow-sm">
                  <div className="space-y-2">
                    <Label>Título de la Notificación</Label>
                    <Input
                      placeholder="Ej: Prueba del Sistema / ¡20% de Descuento Hoy!"
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje (Cuerpo)</Label>
                    <Textarea
                      placeholder="Ej: Esta es una notificación de prueba. / Ingresá ahora para ver nuestras promos."
                      value={promoBody}
                      onChange={(e) => setPromoBody(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleBroadcastPush}
                    disabled={isBroadcasting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {isBroadcasting ? "Enviando..." : "Enviar a todos los dispositivos"}
                  </Button>
                </div>
              </div>

              {/* SPLASH */}
              <div className="border rounded-xl p-4 bg-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-bold text-slate-800">Pantalla de Carga (Splash Screen)</Label>
                  <Switch checked={cfg.splashEnabled} onCheckedChange={v => updateField('splashEnabled', v)} />
                </div>
                {cfg.splashEnabled && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                      <Label>Contenido activo</Label>
                      <Select value={cfg.splashType || "IMAGE"} onValueChange={value => updateField("splashType", value)}>
                        <SelectTrigger className="bg-white"><SelectValue>{cfg.splashType === "VIDEO" ? "Video de apertura" : "Imagen tradicional"}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMAGE">Imagen tradicional</SelectItem>
                          <SelectItem value="VIDEO">Video de apertura</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Aparece una sola vez por sesión, no al navegar entre menús.</p>
                    </div>
                    {cfg.splashType === "VIDEO" ? (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                        <MediaPickerInput
                          label="Video de Apertura (Splash)"
                          placeholder="/uploads/video.mp4 o elegí de la galería"
                          acceptType="VIDEO"
                          value={cfg.splashVideoUrl || ""}
                          onChange={(url) => updateField("splashVideoUrl", url)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Se reproduce completo, automáticamente y sin sonido al abrir la aplicación por primera vez.
                        </p>
                        {cfg.splashVideoUrl && (
                          <div className="rounded-xl overflow-hidden bg-black border border-slate-300 shadow-sm">
                            <video src={cfg.splashVideoUrl} muted playsInline controls className="max-h-72 w-full object-contain" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <MediaPickerInput
                            label="Imagen del Splash"
                            placeholder="Seleccioná una imagen de la galería"
                            value={cfg.splashUrl || ''}
                            onChange={url => updateField('splashUrl', url)}
                          />
                          <p className="text-xs text-muted-foreground">Podés mantener la imagen actual o indicar otra imagen.</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Tiempo de duración (segundos)</Label>
                          <Input type="number" min="1" max="30" value={cfg.splashDuration} onChange={e => updateField('splashDuration', e.target.value)} />
                          <p className="text-xs text-slate-500">Este tiempo se usa solamente en el modo imagen.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* BALLOON */}
              <div className="border rounded-xl p-4 bg-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-bold text-slate-800">Globo Pop-up de Bienvenida</Label>
                  <Switch checked={cfg.welcomeBalloonEnabled} onCheckedChange={v => updateField('welcomeBalloonEnabled', v)} />
                </div>
                {cfg.welcomeBalloonEnabled && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                      <Label>Mensaje del Globo</Label>
                      <Textarea value={cfg.welcomeBalloonText} onChange={e => updateField('welcomeBalloonText', e.target.value)} placeholder="¡Pedí por acá y ganá puntos!" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiempo en pantalla (Segundos)</Label>
                      <Input type="number" min="1" max="20" value={cfg.welcomeBalloonDuration} onChange={e => updateField('welcomeBalloonDuration', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* NOTICE BOARD */}
              <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><Label className="text-base font-bold text-slate-800">Tablón de noticias</Label><p className="mt-1 text-xs text-slate-600">Se abre al entrar a la tienda, toma los colores del tema y se muestra una vez por sesión para cada mensaje.</p></div>
                  <Switch checked={Boolean(cfg.noticeBoardEnabled)} onCheckedChange={value => updateField('noticeBoardEnabled', value)} />
                </div>
                {cfg.noticeBoardEnabled && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-2"><Label>Título</Label><Input value={cfg.noticeBoardTitle || ''} onChange={event => updateField('noticeBoardTitle', event.target.value)} maxLength={80} placeholder="Ej: Novedades de esta semana" /></div>
                    <div className="space-y-2"><Label>Noticia o aviso</Label><Textarea value={cfg.noticeBoardMessage || ''} onChange={event => updateField('noticeBoardMessage', event.target.value)} maxLength={2000} rows={5} placeholder="Contá una promoción, cambio de horario, producto nuevo o cualquier novedad." /><p className="text-right text-[10px] text-slate-500">{(cfg.noticeBoardMessage || '').length}/2000</p></div>
                    <div className="flex items-center justify-between rounded-xl border bg-white p-3"><div><Label className="font-bold">Cerrar automáticamente</Label><p className="text-xs text-muted-foreground">El botón de cerrar siempre estará disponible.</p></div><Switch checked={Boolean(cfg.noticeBoardAutoClose)} onCheckedChange={value => updateField('noticeBoardAutoClose', value)} /></div>
                    {cfg.noticeBoardAutoClose && <div className="space-y-2"><Label>Tiempo visible (segundos)</Label><Input type="number" min="3" max="120" value={cfg.noticeBoardDuration || 8} onChange={event => updateField('noticeBoardDuration', event.target.value)} /></div>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalización de Color</CardTitle>
              <CardDescription>Se inyectarán como variables de Tailwind y CSS Global nativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-black text-slate-900">Diseño y Tema Visual de la PWA</Label>
                <p className="text-xs text-muted-foreground">Elegí el concepto visual para la tienda online de tus clientes. Podés alternar libremente en cualquier momento.</p>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {/* Tema 1: Urban Dark Smash */}
                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'URBAN_DARK')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all relative overflow-hidden ${
                      cfg.storeTheme === 'URBAN_DARK'
                        ? 'border-orange-500 bg-[#0c0f17] text-white shadow-xl shadow-orange-500/20 ring-2 ring-orange-500/40'
                        : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-orange-600 text-white uppercase tracking-wider">
                        🌙 Urban Dark
                      </span>
                      {cfg.storeTheme === 'URBAN_DARK' && <span className="text-xs font-bold text-orange-400">ACTIVO ✓</span>}
                    </div>
                    <span className="block text-base font-black">Urban Dark Street Smash</span>
                    <span className={`mt-1 block text-xs leading-relaxed ${cfg.storeTheme === 'URBAN_DARK' ? 'text-slate-300' : 'text-slate-500'}`}>
                      Modo oscuro premium con acentos en naranja neón, estética hamburguesería moderna, cards en 2 columnas y bottom-sheet.
                    </span>
                  </button>

                  {/* Tema 2: Fast-App Delivery Neo */}
                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'FAST_NEO')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all relative overflow-hidden ${
                      cfg.storeTheme === 'FAST_NEO'
                        ? 'border-orange-500 bg-orange-50/50 text-slate-950 shadow-xl ring-2 ring-orange-500/40'
                        : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white uppercase tracking-wider">
                        🚀 Fast-App Neo
                      </span>
                      {cfg.storeTheme === 'FAST_NEO' && <span className="text-xs font-bold text-orange-600">ACTIVO ✓</span>}
                    </div>
                    <span className="block text-base font-black">Fast-App Delivery Neo</span>
                    <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
                      Estilo app nativa (UberEats / DoorDash), buscador superior instantáneo, stories circulares y dock inferior de 4 tabs.
                    </span>
                  </button>

                  {/* Tema 3: Clean Boutique & Bowls */}
                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'CLEAN_BOUTIQUE')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all relative overflow-hidden ${
                      cfg.storeTheme === 'CLEAN_BOUTIQUE'
                        ? 'border-stone-800 bg-[#fdfbf7] text-stone-950 shadow-xl ring-2 ring-stone-800/20'
                        : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-stone-800 text-white uppercase tracking-wider">
                        🥗 Clean Boutique
                      </span>
                      {cfg.storeTheme === 'CLEAN_BOUTIQUE' && <span className="text-xs font-bold text-stone-800">ACTIVO ✓</span>}
                    </div>
                    <span className="block text-base font-black">Clean Boutique & Bowls</span>
                    <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
                      Minimalismo cálido marfil, tipografía editorial gourmet, chips visibles con ingredientes de cada receta.
                    </span>
                  </button>

                  {/* Tema 4: Clásico / Nexo */}
                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'NEXO')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all relative overflow-hidden ${
                      cfg.storeTheme === 'NEXO' || cfg.storeTheme === 'ORIGINAL'
                        ? 'border-purple-600 bg-purple-50/50 text-slate-950 shadow-xl ring-2 ring-purple-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-purple-600 text-white uppercase tracking-wider">
                        🍔 Nexo Clásico
                      </span>
                      {(cfg.storeTheme === 'NEXO' || cfg.storeTheme === 'ORIGINAL') && <span className="text-xs font-bold text-purple-600">ACTIVO ✓</span>}
                    </div>
                    <span className="block text-base font-black">Diseño Nexo Clásico</span>
                    <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
                      El diseño tradicional de lista con acordeón desplegable por producto para compatibilidad.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'FRESH_MARKET')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all ${cfg.storeTheme === 'FRESH_MARKET' ? 'border-[#173b2c] bg-[#f4f0e6] text-[#173b2c] shadow-xl ring-2 ring-[#ef6a4b]/30' : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'}`}
                  >
                    <div className="mb-2 flex items-center justify-between"><span className="rounded-lg bg-[#173b2c] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-white">🌿 Fresh Market</span>{cfg.storeTheme === 'FRESH_MARKET' && <span className="text-xs font-bold">ACTIVO ✓</span>}</div>
                    <span className="block font-serif text-base font-black">Fresh Market Editorial</span>
                    <span className="mt-1 block text-xs leading-relaxed opacity-70">Marfil, verde botánico y coral; fotografía protagonista y estilo cálido para viandas, bowls, cafeterías y cocina natural.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'RETRO_DINER')}
                    className={`rounded-3xl border-2 p-4 text-left transition-all ${cfg.storeTheme === 'RETRO_DINER' ? 'border-[#251a32] bg-[#f8d84a] text-[#251a32] shadow-xl ring-2 ring-[#e43d30]/30' : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'}`}
                  >
                    <div className="mb-2 flex items-center justify-between"><span className="rounded-lg bg-[#e43d30] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-white">🍒 Retro Diner</span>{cfg.storeTheme === 'RETRO_DINER' && <span className="text-xs font-bold">ACTIVO ✓</span>}</div>
                    <span className="block text-base font-black uppercase">Retro Diner Pop</span>
                    <span className="mt-1 block text-xs leading-relaxed opacity-70">Amarillo manteca, rojo cereza, bordes gráficos y tipografía contundente para hamburgueserías, pizzas, helados y fast food.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'COMIC_FOOD_POP')}
                    className={`relative overflow-hidden rounded-3xl border-[3px] p-4 text-left transition-all ${cfg.storeTheme === 'COMIC_FOOD_POP' ? 'border-[#17121f] bg-[#fff7db] text-[#17121f] shadow-[7px_7px_0_#17121f]' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'}`}
                  >
                    <div className="mb-2 flex items-center justify-between"><span className="rotate-[-2deg] rounded-lg border-2 border-[#17121f] bg-[#ff4d7d] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-white">💥 Comic Food Pop</span>{cfg.storeTheme === 'COMIC_FOOD_POP' && <span className="text-xs font-black">ACTIVO ✓</span>}</div>
                    <span className="block text-base font-black uppercase">Comic Food Pop</span>
                    <span className="mt-1 block text-xs leading-relaxed opacity-70">Experiencia de historieta con viñetas, tramas, stickers, titulares explosivos, movimiento y Club VIP integrado.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('storeTheme', 'ARCADE_KITCHEN')}
                    className={`relative overflow-hidden rounded-3xl border-2 p-4 text-left transition-all ${cfg.storeTheme === 'ARCADE_KITCHEN' ? 'border-cyan-300 bg-[#090625] text-white shadow-[7px_7px_0_#ec4899] ring-2 ring-cyan-300/40' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'}`}
                  >
                    <div className="mb-2 flex items-center justify-between"><span className="border border-yellow-200 bg-fuchsia-600 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-white">🎮 Arcade Kitchen</span>{cfg.storeTheme === 'ARCADE_KITCHEN' && <span className="text-xs font-black text-cyan-200">ACTIVO ✓</span>}</div>
                    <span className="block text-base font-black uppercase tracking-wide">Arcade Kitchen</span>
                    <span className="mt-1 block text-xs leading-relaxed opacity-70">Menú como videojuego: niveles, power-ups, XP, HUD del carrito, perfil VIP y efectos pixelados accesibles.</span>
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="mb-4 font-bold">Colores de marca</h4>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label>Color Primario (Acentos y Botones Ppal)</Label>
                  <div className="flex gap-4">
                    <Input type="color" className="p-1 h-12 w-24 cursor-pointer" value={cfg.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} />
                    <Input type="text" className="h-12 w-32 font-mono uppercase" value={cfg.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Color Secundario (Detalles)</Label>
                  <div className="flex gap-4">
                    <Input type="color" className="p-1 h-12 w-24 cursor-pointer" value={cfg.secondaryColor} onChange={e => updateField('secondaryColor', e.target.value)} />
                    <Input type="text" className="h-12 w-32 font-mono uppercase" value={cfg.secondaryColor} onChange={e => updateField('secondaryColor', e.target.value)} />
                  </div>
                </div>
              </div>
              </div>

              <div className="space-y-4 border-t pt-6 mt-6 pb-6">
                <h4 className="font-bold">Fondo General de la App (Background)</h4>
                <div className="space-y-2">
                  <Label>URL de Imagen de Fondo</Label>
                  <Input placeholder="Ej: https://.../fondo.jpg (Dejar vacío para bloque liso)" value={cfg.backgroundUrl || ''} onChange={e => updateField('backgroundUrl', e.target.value)} />
                </div>
                {cfg.backgroundUrl && (
                  <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50">
                    <Label>Efecto de Desfoque Oscuro (Blur + Opacity)</Label>
                    <Switch checked={cfg.backgroundBlur || false} onCheckedChange={v => updateField('backgroundBlur', v)} />
                  </div>
                )}
              </div>

              <div className="mt-8 p-6 rounded-2xl border" style={{ backgroundColor: '#f8fafc' }}>
                <h4 className="font-bold mb-4">Vista Recreada</h4>
                <div className="flex gap-4">
                  <Button style={{ backgroundColor: cfg.primaryColor, color: 'white' }}>Botón Principal</Button>
                  <Button variant="outline" style={{ borderColor: cfg.secondaryColor, color: cfg.secondaryColor }}>Secundario</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA IMPRESORAS */}
        {printNodeEnabled && <TabsContent value="printers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Impresoras Físicas</CardTitle>
              <CardDescription>Ajustes para la impresión térmica de comandas (Cocina) y tickets (Mostrador).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              <div className="grid gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-base font-bold text-slate-800">Modo de impresión</Label>
                  <Select value={cfg.printingMode || "BROWSER"} onValueChange={value => updateField("printingMode", value)}>
                    <SelectTrigger className="bg-white"><SelectValue>{cfg.printingMode === "PRINTNODE" ? "PrintNode — impresión directa" : "Navegador — confirmar manualmente"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BROWSER">Navegador — confirmar manualmente</SelectItem>
                      <SelectItem value="PRINTNODE">PrintNode — impresión directa</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {cfg.printingMode === "PRINTNODE" ? "El servidor enviará los tickets directamente a las impresoras configuradas." : "Se abrirá el diálogo del navegador para confirmar la impresión."}
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${printNodeApiKeyConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  <p className="font-bold">Clave API de PrintNode</p>
                  <p className="mt-1 text-sm">{printNodeApiKeyConfigured ? "Configurada de forma segura en el servidor." : "Falta PRINTNODE_API_KEY en .env.docker."}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-orange-200 rounded-xl p-4 bg-orange-50">
                <div className="space-y-0.5">
                  <Label className="text-base text-slate-800 font-bold">Auto-Impresión de Tickets</Label>
                  <p className="text-sm text-muted-foreground">{cfg.printingMode === "PRINTNODE" ? "Los pedidos en efectivo se envían al crearse y los de Mercado Pago al acreditarse." : "La app abrirá el ticket y el diálogo del navegador cuando ingrese un pedido nuevo."}</p>
                </div>
                <Switch checked={cfg.autoPrintTickets} onCheckedChange={v => updateField('autoPrintTickets', v)} />
              </div>

              {/* Impresora Mostrador */}
              <div className="space-y-4 p-5 border rounded-xl bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                  <Printer className="w-5 h-5 text-blue-600" /> Impresora de Mostrador (Tickets)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {cfg.printingMode === "PRINTNODE" ? (
                      <>
                        <Label>ID PrintNode — Mostrador</Label>
                        <Input type="number" min={1} placeholder="Ej: 742113" value={cfg.printNodeCounterPrinterId || ""} onChange={e => updateField("printNodeCounterPrinterId", e.target.value)} />
                        <Button type="button" variant="outline" disabled={testingPrinter !== null || !printNodeApiKeyConfigured} onClick={() => handlePrinterTest("COUNTER")}>
                          {testingPrinter === "COUNTER" ? "Enviando..." : "Probar mostrador"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Label>Nombre de la impresora (OS)</Label>
                        <Input placeholder="Ej: POS-58C, XP-80C..." value={cfg.printerCounterName || ''} onChange={e => updateField('printerCounterName', e.target.value)} />
                        <p className="text-xs text-muted-foreground leading-tight">La impresora se elige en el diálogo del navegador.</p>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Ancho del Rollo de Papel</Label>
                    <Select value={cfg.printerCounterSize || "80mm"} onValueChange={v => updateField('printerCounterSize', v)}>
                      <SelectTrigger className="bg-white"><SelectValue>{cfg.printerCounterSize === "58mm" ? "58mm (rollo angosto)" : "80mm (rollo estándar)"}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm (Rollos angostos)</SelectItem>
                        <SelectItem value="80mm">80mm (Rollos estándar de ticketadora)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Impresora Cocina */}
              <div className="space-y-4 p-5 border rounded-xl bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                  <Printer className="w-5 h-5 text-orange-600" /> Impresora de Cocina (Comandas)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {cfg.printingMode === "PRINTNODE" ? (
                      <>
                        <Label>ID PrintNode — Cocina</Label>
                        <Input type="number" min={1} placeholder="Ej: 742114" value={cfg.printNodeKitchenPrinterId || ""} onChange={e => updateField("printNodeKitchenPrinterId", e.target.value)} />
                        <Button type="button" variant="outline" disabled={testingPrinter !== null || !printNodeApiKeyConfigured} onClick={() => handlePrinterTest("KITCHEN")}>
                          {testingPrinter === "KITCHEN" ? "Enviando..." : "Probar cocina"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Label>Nombre de la impresora (OS)</Label>
                        <Input placeholder="Ej: Cocina-80..." value={cfg.printerKitchenName || ''} onChange={e => updateField('printerKitchenName', e.target.value)} />
                        <p className="text-xs text-muted-foreground leading-tight">La impresora se elige en el diálogo del navegador.</p>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Ancho del Rollo de Papel</Label>
                    <Select value={cfg.printerKitchenSize || "80mm"} onValueChange={v => updateField('printerKitchenSize', v)}>
                      <SelectTrigger className="bg-white"><SelectValue>{cfg.printerKitchenSize === "58mm" ? "58mm (rollo angosto)" : "80mm (rollo estándar)"}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm (Rollos angostos)</SelectItem>
                        <SelectItem value="80mm">80mm (Rollos estándar de ticketadora)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>}

      </Tabs>
    </div>
  );
}
