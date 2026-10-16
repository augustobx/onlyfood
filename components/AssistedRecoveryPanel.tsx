"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestClientAdminPasswordReset } from "@/app/actions/client-admin-reset";

export function AssistedRecoveryPanel({ initialPhone, onRequested }: {
  initialPhone: string;
  onRequested: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone.includes("@") ? "" : initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Abrimos la pestaña sincrónicamente: el navegador bloquea ventanas
    // creadas después de esperar una Server Action.
    const whatsappTab = window.open("about:blank", "_blank");
    setBusy(true);
    setError("");
    try {
      const result = await requestClientAdminPasswordReset({ name, phone });
      if (!result.success) {
        whatsappTab?.close();
        setError(result.error);
        return;
      }
      if (result.whatsappUrl) {
        if (whatsappTab && !whatsappTab.closed) {
          whatsappTab.opener = null;
          whatsappTab.location.replace(result.whatsappUrl);
        } else {
          toast.info("Abrí WhatsApp para avisar al comercio.", {
            action: { label: "Abrir WhatsApp", onClick: () => window.open(result.whatsappUrl!, "_blank", "noopener,noreferrer") },
            duration: 15000,
          });
        }
      } else {
        whatsappTab?.close();
        toast.warning("Solicitud registrada. No hay un WhatsApp del comercio configurado.", {
          description: "El comercio igualmente puede verla en su panel.",
          duration: 10000,
        });
      }
      toast.success("¡Solicitud de clave enviada! Aguardá unos minutos, ya te avisamos.", {
        description: result.whatsappUrl
          ? "Confirmá el envío del mensaje que abrimos en WhatsApp."
          : "Registramos el pedido en el sistema del comercio.",
        duration: 9000,
      });
      onRequested();
    } catch {
      whatsappTab?.close();
      setError("No se pudo registrar la solicitud.");
    } finally {
      setBusy(false);
    }
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
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
      <p className="text-xs opacity-70">
        WhatsApp abrirá un mensaje preparado. Para enviarlo, confirmá el envío en WhatsApp.
        El comercio te avisará personalmente una vez aprobado.
      </p>
    </section>
  );
}
