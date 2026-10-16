"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithAssistedRecoveryCode, requestAutomaticClientRecovery } from "@/app/actions/client-recovery";

export function AssistedRecoveryPanel({
  initialPhone, onAuthenticated,
}: { initialPhone: string; onAuthenticated: () => void }) {
  const [phone, setPhone] = useState(initialPhone.includes("@") ? "" : initialPhone);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestAutomaticClientRecovery(phone, consent);
      if (!result.success) { setError(result.error); return; }
      setSent(true);
      toast.success(result.message, { duration: 7000 });
    } catch {
      setError("No se pudo solicitar el código. Probá nuevamente.");
    } finally { setBusy(false); }
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await loginWithAssistedRecoveryCode({ phone, code });
      if (!result.success) { setError(result.error); return; }
      setCode("");
      toast.success("Acceso confirmado. Agregá ahora tu correo para las próximas recuperaciones.");
      onAuthenticated();
    } catch {
      setError("No se pudo completar el ingreso.");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4">
      <h4 className="text-base font-black">Recuperar acceso sin correo</h4>
      <p className="text-xs leading-relaxed">
        Ingresá el celular asociado a tu cuenta. Te enviamos un código personal
        por WhatsApp, sin necesidad de contactar al comercio.
      </p>
      <form onSubmit={requestCode} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="recover-phone">Celular registrado</Label>
          <Input id="recover-phone" type="tel" autoComplete="tel" required
            minLength={8} maxLength={32} value={phone}
            disabled={busy || sent} onChange={event => setPhone(event.target.value)}
            placeholder="Ej. 11 2345 6789" />
        </div>
        {!sent && (
          <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}
              className="mt-0.5 accent-orange-600" />
            <span>Acepto recibir por WhatsApp un código de autenticación en el teléfono indicado.</span>
          </label>
        )}
        {!sent && <Button type="submit" disabled={busy || !consent}
          className="w-full rounded-xl bg-orange-600 text-white font-bold">
          {busy ? "Enviando…" : "Enviar código por WhatsApp"}
        </Button>}
      </form>
      {sent && (
        <form onSubmit={signIn} className="space-y-3">
          <p role="status" className="text-xs">
            Si existe una cuenta sin correo con ese número, recibirás el código por WhatsApp.
            Es válido 10 minutos y puede usarse una vez.
          </p>
          <div className="space-y-1">
            <Label htmlFor="recover-code">Código recibido</Label>
            <Input id="recover-code" type="text" autoComplete="one-time-code"
              inputMode="numeric" required minLength={8} maxLength={24}
              value={code} disabled={busy} onChange={event => setCode(event.target.value)}
              placeholder="Código de 8 dígitos" />
          </div>
          <Button type="submit" disabled={busy}
            className="w-full rounded-xl bg-orange-600 text-white font-bold">
            {busy ? "Verificando…" : "Ingresar directamente"}
          </Button>
          <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setError(""); }}
            className="block w-full text-center text-xs font-semibold underline">
            Solicitar otro código
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
      <p className="text-xs opacity-80">
        Después de ingresar, te pediremos un correo. Desde entonces, la recuperación
        será por enlace al correo verificado y no se podrá volver a usar este código.
      </p>
    </section>
  );
}
