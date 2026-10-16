"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestClientAdminPasswordReset } from "@/app/actions/client-admin-reset";

export function AssistedRecoveryPanel({ initialPhone }: { initialPhone: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone.includes("@") ? "" : initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestClientAdminPasswordReset({ name, phone });
      if (!result.success) { setError(result.error); return; }
      setMessage(result.message);
      setWhatsappUrl(result.whatsappUrl);
    } catch { setError("No se pudo registrar la solicitud."); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-3">
      <h4 className="text-base font-black">Solicitar restablecimiento al comercio</h4>
      <p className="text-xs leading-relaxed">
        Si tu cuenta no tiene correo, el comercio podrá autorizar una clave temporal.
        Después deberás cargar tu email y crear una contraseña nueva.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="reset-client-name">Tu nombre</Label>
        <Input id="reset-client-name" autoComplete="name" required minLength={2} maxLength={80}
          value={name} onChange={e => setName(e.target.value)} disabled={busy}
          placeholder="Nombre y apellido" />
        <Label htmlFor="reset-client-phone">Teléfono de tu cuenta</Label>
        <Input id="reset-client-phone" type="tel" autoComplete="tel" required
          value={phone} onChange={e => setPhone(e.target.value)} disabled={busy}
          placeholder="Ej. 11 2345 6789" />
        <Button type="submit" disabled={busy}
          className="w-full rounded-xl bg-orange-600 text-white">
          {busy ? "Registrando…" : "Solicitar reseteo"}
        </Button>
      </form>
      {message && <p role="status" className="text-xs font-semibold">{message}</p>}
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white">
          Abrir WhatsApp y enviar al comercio
        </a>
      )}
      {message && !whatsappUrl && (
        <p className="text-xs">La solicitud quedó disponible en el panel del comercio.
          Si querés avisarles por WhatsApp, comunicate con su número habitual.</p>
      )}
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
      <p className="text-xs opacity-70">
        WhatsApp abrirá un mensaje preparado. Para enviarlo, confirmá el envío en WhatsApp.
        El comercio te avisará personalmente una vez aprobado.
      </p>
    </section>
  );
}
