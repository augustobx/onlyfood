"use client";

import { useState } from "react";
import Link from "next/link";
import { resetClientPasswordWithToken } from "@/app/actions/client-security";

export function ResetPasswordClient({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [complete, setComplete] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setStatus("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const result = await resetClientPasswordWithToken(token, password);
      if (result.success) { setComplete(true); setStatus("Tu contraseña fue actualizada. Podés iniciar sesión."); }
      else setStatus(result.error || "No se pudo restablecer la contraseña.");
    } catch { setStatus("No se pudo restablecer la contraseña."); }
    finally { setBusy(false); }
  };
  return <main className="min-h-[70vh] flex items-center justify-center p-4">
    <section className="w-full max-w-sm rounded-2xl border p-6 bg-white text-slate-900 space-y-4 shadow-lg">
      <h1 className="text-2xl font-black">Nueva contraseña</h1>
      {!token ? <p>Enlace inválido.</p> : !complete && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-bold">Contraseña nueva (mínimo 8 caracteres)
            <input required minLength={8} maxLength={128} type="password" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-xl p-2 mt-1"/>
          </label>
          <label className="block text-sm font-bold">Repetir contraseña
            <input required minLength={8} type="password" autoComplete="new-password"
              value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full border rounded-xl p-2 mt-1"/>
          </label>
          <button disabled={busy} className="w-full bg-orange-500 text-white rounded-xl p-3 font-bold">
            {busy ? "Guardando…" : "Restablecer contraseña"}
          </button>
        </form>
      )}
      {status && <p role="status" className="text-sm">{status}</p>}
      <Link href="/" className="block text-center text-sm font-bold text-orange-600">Volver a la tienda</Link>
    </section>
  </main>;
}
