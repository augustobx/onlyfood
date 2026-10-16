"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { finishTemporaryPasswordSetup } from "@/app/actions/client-forced-setup";

export function TemporaryPasswordSetup({
  setupToken,
  onCompleted,
}: {
  setupToken: string;
  onCompleted: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    if (password === "12345678") { setError("Elegí una contraseña distinta de la temporal."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await finishTemporaryPasswordSetup({ setupToken, email, password });
      if (!result.success) { setError(result.error); return; }
      toast.success(result.message, { duration: 9000 });
      onCompleted();
    } catch {
      setError("No se pudo guardar. Volvé a intentarlo.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="relative z-10 space-y-4">
      <h3 className="text-xl font-black">Activá tu cuenta</h3>
      <p className="text-xs leading-relaxed">
        Ingresaste con la contraseña temporal. Para continuar tenés que guardar
        tu correo y una nueva contraseña. Todavía no podés acceder a tu cuenta.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="setup-email">Correo electrónico obligatorio</Label>
        <Input id="setup-email" type="email" autoComplete="email" required maxLength={254}
          value={email} disabled={loading} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com" />
        <Label htmlFor="setup-password">Nueva contraseña</Label>
        <Input id="setup-password" type="password" autoComplete="new-password" required
          minLength={8} maxLength={128} disabled={loading} value={password}
          onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        <Label htmlFor="setup-confirm">Repetí la nueva contraseña</Label>
        <Input id="setup-confirm" type="password" autoComplete="new-password" required
          minLength={8} maxLength={128} disabled={loading} value={confirmation}
          onChange={e => setConfirmation(e.target.value)} placeholder="Confirmar contraseña" />
        {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-orange-600 text-white">
          {loading ? "Guardando…" : "Guardar correo y nueva contraseña"}
        </Button>
      </form>
      <p className="text-xs opacity-70">
        El correo debe verificarse desde el enlace recibido para habilitar la recuperación por email.
      </p>
    </div>
  );
}
