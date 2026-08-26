"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateConfig, broadcastPushNotification } from "@/app/actions/admin-settings";
import { testConfiguredPrinter } from "@/app/actions/admin-printing";
import { Save, Store, Palette, Wallet, Megaphone, Send, Printer, CreditCard, MessageCircle, Calendar, Clock, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseBusinessHours, DaySchedule } from "@/lib/business-hours";
import { MediaPickerInput } from "@/components/admin/MediaPickerInput";

export function SettingsForm({ initialConfig, printNodeApiKeyConfigured }: { initialConfig: any; printNodeApiKeyConfigured: boolean }) {
  const [cfg, setCfg] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>(() => parseBusinessHours(initialConfig.businessHours));

  // Estados para el envío masivo PUSH
  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<"KITCHEN" | "COUNTER" | null>(null);

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
      whatsappMessage: cfg.whatsappMessage,
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
      paymentCash: cfg.paymentCash,
      paymentMp: cfg.paymentMp,
      autoPrintTickets: cfg.autoPrintTickets,
      printingMode: cfg.printingMode || "BROWSER",
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

      // WhatsApp Bot
      whatsappBotEnabled: cfg.whatsappBotEnabled,
      metaApiToken: cfg.metaApiToken,
      metaPhoneNumberId: cfg.metaPhoneNumberId,
      metaVerifyToken: cfg.metaVerifyToken,
    };

    const result = await updateConfig(cfg.id, dataToSave);
    if (result.success) {
      toast.success("Configuración general guardada");
    } else {
      toast.error("Error", { description: result.error });
    }
    setIsSaving(false);
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
          <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="marketing"><Megaphone className="w-4 h-4 mr-2" /> Splash</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-2" /> Diseño</TabsTrigger>
          <TabsTrigger value="printers"><Printer className="w-4 h-4 mr-2" /> Impresoras</TabsTrigger>
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

              <div className="space-y-2 border-t pt-4">
                <Label>Mensaje de WhatsApp para notificaciones</Label>
                <p className="text-xs text-muted-foreground pb-2">Usa {'{{estado}}'} para insertar dinámicamente el estado del pedido.</p>
                <Textarea value={cfg.whatsappMessage} onChange={e => updateField('whatsappMessage', e.target.value)} />
              </div>
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

        {/* WhatsApp Bot Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Automático de WhatsApp</CardTitle>
              <CardDescription>Configuración de Meta Cloud API para automatizar pedidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-2 border-green-200 rounded-xl p-4 bg-green-50">
                <div className="space-y-0.5">
                  <Label className="text-base text-slate-800 font-bold">Activar Bot de WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Si se activa, el sistema responderá automáticamente a los mensajes entrantes para tomar pedidos.</p>
                </div>
                <Switch checked={cfg.whatsappBotEnabled} onCheckedChange={v => updateField('whatsappBotEnabled', v)} />
              </div>

              {cfg.whatsappBotEnabled && (
                <div className="space-y-4 bg-slate-50 p-4 border rounded-xl animate-in fade-in">
                  <div className="space-y-2">
                    <Label className="font-bold">Token de Acceso Permanente (Meta API)</Label>
                    <Input
                      type="password"
                      placeholder="EAA..."
                      value={cfg.metaApiToken || ''}
                      onChange={e => updateField('metaApiToken', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="font-bold">ID del Número de Teléfono (Phone Number ID)</Label>
                    <Input
                      placeholder="1234567890"
                      value={cfg.metaPhoneNumberId || ''}
                      onChange={e => updateField('metaPhoneNumberId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="font-bold">Token de Verificación (Webhook Verify Token)</Label>
                    <Input
                      placeholder="mi_token_secreto_123"
                      value={cfg.metaVerifyToken || ''}
                      onChange={e => updateField('metaVerifyToken', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Este token debes ingresarlo en la configuración del Webhook en Meta Developers.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                            placeholder="/splash.png o seleccioná de la galería"
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
        <TabsContent value="printers" className="space-y-4 mt-4">
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
        </TabsContent>

      </Tabs>
    </div>
  );
}
