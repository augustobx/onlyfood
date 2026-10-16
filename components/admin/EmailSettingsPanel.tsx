"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { saveTenantEmailSettings, sendTenantEmailTest } from "@/app/actions/admin-email";
import type { EmailProvider } from "@/lib/email-configuration";

type EmailSettingsView = {
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  hasSmtpPassword: boolean;
  hasResendApiKey: boolean;
  hasBrevoApiKey: boolean;
  configured: boolean;
};

export function EmailSettingsPanel({ initialSettings }: { initialSettings: EmailSettingsView }) {
  const router = useRouter();
  const [provider, setProvider] = useState<EmailProvider>(initialSettings.provider);
  const [host, setHost] = useState(initialSettings.smtpHost);
  const [port, setPort] = useState(initialSettings.smtpPort);
  const [user, setUser] = useState(initialSettings.smtpUser);
  const [from, setFrom] = useState(initialSettings.smtpFrom);
  const [smtpPass, setSmtpPass] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"SAVE" | "TEST" | null>(null);
  const [configured, setConfigured] = useState(initialSettings.configured);

  async function save() {
    setBusy("SAVE");
    try {
      const response = await saveTenantEmailSettings({
        provider, smtpHost: host, smtpPort: port, smtpUser: user, smtpFrom: from,
        smtpPass, resendApiKey, brevoApiKey,
      });
      if (!response.success) {
        toast.error(response.error);
      } else {
        setConfigured(response.configured);
        setSmtpPass("");
        setResendApiKey("");
        setBrevoApiKey("");
        toast.success(response.configured ? "Correo configurado correctamente." : "Configuración guardada. Falta completar la credencial.");
        router.refresh();
      }
    } catch {
      toast.error("No se pudo guardar la configuración de correo.");
    } finally { setBusy(null); }
  }

  async function sendTest() {
    setBusy("TEST");
    try {
      const result = await sendTenantEmailTest(testTo);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    } catch {
      toast.error("Error al solicitar el envío de prueba.");
    } finally { setBusy(null); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Correo electrónico / SMTP</CardTitle>
        <CardDescription>
          Configuración por comercio basada en OnlyPadel. Las claves se guardan cifradas y nunca se vuelven a mostrar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="onlyfood-email-provider">Método de envío</Label>
          <select id="onlyfood-email-provider" value={provider} onChange={e => setProvider(e.target.value as EmailProvider)}
            className="w-full h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="SMTP">Servidor SMTP (como OnlyPadel)</option>
            <option value="RESEND">Resend API</option>
            <option value="BREVO">Brevo API</option>
          </select>
        </div>

        {provider === "SMTP" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="onlyfood-smtp-host">Servidor SMTP (Host)</Label>
                <Input id="onlyfood-smtp-host" value={host} onChange={e => setHost(e.target.value)} placeholder="c2801249.ferozo.com"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onlyfood-smtp-port">Puerto TLS</Label>
                <select id="onlyfood-smtp-port" value={port} onChange={e => setPort(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border bg-background px-3 text-sm">
                  <option value={465}>465 SSL</option>
                  <option value={587}>587 STARTTLS</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="onlyfood-smtp-user">Usuario / Correo</Label>
                <Input id="onlyfood-smtp-user" autoComplete="off" value={user} onChange={e => setUser(e.target.value)}
                  placeholder="psp@nanolabs.online"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onlyfood-smtp-password">Contraseña de la casilla</Label>
                <Input id="onlyfood-smtp-password" type="password" autoComplete="new-password" value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)} placeholder={initialSettings.hasSmtpPassword ? "•••••••• (guardada)" : "Ingresá la contraseña"} />
                <p className="text-xs text-muted-foreground">Dejá vacío para conservar la contraseña guardada, si existe.</p>
              </div>
            </div>
          </>
        )}
        {provider === "RESEND" && (
          <div className="space-y-2">
            <Label htmlFor="onlyfood-resend-key">Resend API Key</Label>
            <Input id="onlyfood-resend-key" type="password" autoComplete="new-password" value={resendApiKey}
              onChange={e => setResendApiKey(e.target.value)}
              placeholder={initialSettings.hasResendApiKey ? "•••••••• (guardada)" : "re_…"} />
            <p className="text-xs text-muted-foreground">Si ya existe, podés dejarla en blanco.</p>
          </div>
        )}
        {provider === "BREVO" && (
          <div className="space-y-2">
            <Label htmlFor="onlyfood-brevo-key">Brevo API Key</Label>
            <Input id="onlyfood-brevo-key" type="password" autoComplete="new-password" value={brevoApiKey}
              onChange={e => setBrevoApiKey(e.target.value)}
              placeholder={initialSettings.hasBrevoApiKey ? "•••••••• (guardada)" : "xkeysib-…"} />
            <p className="text-xs text-muted-foreground">Si ya existe, podés dejarla en blanco.</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="onlyfood-smtp-from">Nombre y remitente visible</Label>
          <Input id="onlyfood-smtp-from" value={from} onChange={e => setFrom(e.target.value)}
            placeholder="OnlyFood <psp@nanolabs.online>" />
          <p className="text-xs text-muted-foreground">En Resend/Brevo, la dirección debe estar autorizada por el proveedor.</p>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className={`text-xs font-medium flex items-center gap-1 ${configured ? "text-emerald-700" : "text-amber-700"}`}>
            <ShieldCheck className="w-4 h-4" />
            {configured ? "Configuración completa (pendiente de prueba real)" : "Falta configurar contraseña o API Key"}
          </p>
          <Button disabled={busy !== null} onClick={save} type="button">
            {busy === "SAVE" ? "Guardando…" : "Guardar correo"}
          </Button>
        </div>

        <div className="space-y-3 border-t pt-5">
          <Label htmlFor="onlyfood-test-email" className="font-bold">Probar conexión y envío de correo</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="onlyfood-test-email" type="email" placeholder="tu@email.com" value={testTo}
              onChange={e => setTestTo(e.target.value)} />
            <Button type="button" disabled={busy !== null || !configured || !testTo} onClick={sendTest}>
              <Send className="w-4 h-4 mr-2"/> {busy === "TEST" ? "Enviando…" : "Enviar prueba"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Solo confirma que el proveedor aceptó el mensaje. Verificá su recepción en la casilla.</p>
        </div>
      </CardContent>
    </Card>
  );
}
