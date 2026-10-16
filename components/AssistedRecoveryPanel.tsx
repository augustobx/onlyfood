"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithAssistedRecoveryCode } from "@/app/actions/client-recovery";

export function AssistedRecoveryPanel({
  initialPhone, onAuthenticated,
}: { initialPhone: string; onAuthenticated: () => void }) {
  const [phone, setPhone] = useState(initialPhone.includes("@") ? "" : initialPhone);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await loginWithAssistedRecoveryCode({ phone, code });
      if (!result.success) { setError(result.error); return; }
      setCode("");
      toast.success("Ingreso exitoso. Ahora agregá tu correo para recuperar tu contraseña.");
      onAuthenticated();
    } catch {
      setError("No se pudo completar el ingreso. Probá nuevamente.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-black text-base">¿No tenés correo y olvidaste tu clave?</h4>
      <p className="text-xs leading-relaxed">
        Contactá al comercio. Después de verificar tu identidad, te entregarán un
        <strong> código personal de un solo uso</strong>, válido durante 10 minutos.
        No existe una contraseña universal.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="recover-with-phone">Teléfono registrado</Label>
          <Input id="recover-with-phone" type="tel" autoComplete="tel"
            required value={phone} onChange={event => setPhone(event.target.value)}
            placeholder="Ej. 11 2345 6789" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recover-one-time-code">Código entregado por el comercio</Label>
          <Input id="recover-one-time-code" type="text" autoComplete="one-time-code"
            required minLength={16} maxLength={24} value={code}
            onChange={event => setCode(event.target.value.toUpperCase())}
            placeholder="Código personal de 16 caracteres" />
        </div>
        {error && <p role="alert" className="text-xs font-bold text-red-500">{error}</p>}
        <Button type="submit" disabled={busy}
          className="w-full rounded-xl bg-orange-600 text-white font-bold">
          {busy ? "Validando…" : "Ingresar directamente"}
        </Button>
      </form>
      <p className="text-xs opacity-80">
        Después del ingreso te pediremos un correo. El código caduca al usarlo,
        y las próximas recuperaciones se harán por email confirmado.
      </p>
    </div>
  );
}
