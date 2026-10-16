"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmClientEmailToken } from "@/app/actions/client-security";

export function VerifyEmailClient({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const confirm = async () => {
    setBusy(true);
    try {
      const result = await confirmClientEmailToken(token);
      setMessage(result.success ? "Correo verificado. Ya podés recuperar tu contraseña por email." : (result.error || "No se pudo verificar el correo."));
    } catch { setMessage("No se pudo verificar el correo."); }
    finally { setBusy(false); }
  };
  return <main className="min-h-[70vh] flex items-center justify-center p-4">
    <section className="w-full max-w-sm rounded-2xl border p-6 bg-white text-slate-900 space-y-4 shadow-lg">
      <h1 className="text-2xl font-black">Confirmar correo</h1>
      <p>La confirmación habilita la recuperación segura de tu contraseña.</p>
      <button type="button" disabled={busy || !token} onClick={confirm}
        className="w-full bg-orange-500 text-white rounded-xl p-3 font-bold">
        {busy ? "Verificando…" : "Verificar correo"}
      </button>
      {message && <p role="status">{message}</p>}
      <Link href="/profile" className="block text-center text-sm font-bold text-orange-600">Ir a mi perfil</Link>
    </section>
  </main>;
}
