"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { client as webauthn } from "@passwordless-id/webauthn";
import { Fingerprint, MailCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { sendEmailVerification } from "@/app/actions/client-security";
import {
  beginClientPasskeyRegistration, finishClientPasskeyRegistration,
  listClientPasskeys, removeClientPasskey,
} from "@/app/actions/client-passkeys";

type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

export function ClientSecuritySettings({ initialEmail, verified }: { initialEmail: string; verified: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials);
    listClientPasskeys().then(setPasskeys).catch(() => {});
  }, []);

  async function sendVerification() {
    setBusy(true);
    try {
      const result = await sendEmailVerification(email);
      if (result.success) toast.success(result.message || "Revisá tu correo.");
      else toast.error(result.error || "No se pudo completar la operación.");
    } catch { toast.error("No se pudo enviar la verificación."); }
    finally { setBusy(false); }
  }

  async function enrollPasskey() {
    setBusy(true);
    try {
      const start = await beginClientPasskeyRegistration();
      if (!start.success) { toast.error(start.error); return; }
      const registration = await webauthn.register({
        challenge: start.challenge, user: start.user, domain: start.rpId,
        hints: ["client-device"], userVerification: "required",
        discoverable: "required", attestation: false, timeout: 60_000,
      });
      const finish = await finishClientPasskeyRegistration(start.challengeId, registration);
      if (!finish.success) { toast.error(finish.error); return; }
      toast.success("Biometría activada en este dispositivo.");
      setPasskeys(await listClientPasskeys());
      router.refresh();
    } catch (error) {
      if (!(error instanceof DOMException && ["NotAllowedError", "AbortError"].includes(error.name))) {
        console.error(error);
        toast.error("No se pudo activar la biometría.");
      }
    } finally { setBusy(false); }
  }

  async function removePasskey(id: string) {
    if (!confirm("¿Eliminar este acceso biométrico?")) return;
    setBusy(true);
    try {
      const result = await removeClientPasskey(id);
      if (!result.success) { toast.error(result.error); return; }
      setPasskeys(await listClientPasskeys());
      toast.success("Dispositivo eliminado.");
    } catch { toast.error("No se pudo eliminar la credencial."); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-5 mb-6 space-y-5">
      <h2 className="font-black text-xl flex items-center gap-2"><Fingerprint className="w-5 h-5" /> Seguridad y acceso</h2>
      <div className="space-y-2">
        <label htmlFor="client-security-email" className="text-sm font-bold">Correo electrónico para recuperar tu contraseña</label>
        <input id="client-security-email" type="email" autoComplete="email"
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
          value={email} onChange={e => setEmail(e.target.value)} />
        <p className="text-xs text-slate-500">
          {verified && email === initialEmail ? "Correo verificado." : "Confirmá tu correo desde el enlace que recibirás para habilitar la recuperación."}
        </p>
        {!(verified && email === initialEmail) && (
          <button disabled={busy} type="button" onClick={sendVerification}
            className="rounded-xl bg-orange-500 text-white font-bold px-4 py-2 text-sm inline-flex items-center gap-2">
            <MailCheck className="w-4 h-4" /> Enviar verificación
          </button>
        )}
      </div>
      <div className="border-t dark:border-slate-700 pt-4 space-y-3">
        <h3 className="font-black">Face ID / Huella / Windows Hello</h3>
        <p className="text-xs text-slate-500">Tu rostro y tus huellas se quedan en el dispositivo; OnlyFood guarda únicamente una clave pública.</p>
        {supported ? (
          <button disabled={busy} type="button" onClick={enrollPasskey}
            className="rounded-xl bg-slate-900 text-white font-bold px-4 py-2 text-sm">
            {busy ? "Procesando…" : "Activar biometría"}
          </button>
        ) : <p className="text-sm">Tu navegador o dispositivo no admite passkeys.</p>}
        {passkeys.length > 0 && (
          <ul className="space-y-2">
            {passkeys.map(p => (
              <li key={p.id} className="rounded-xl border dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-sm"><strong>{p.name}</strong><br /><small>Registrado: {new Date(p.createdAt).toLocaleDateString("es-AR")}</small></span>
                <button type="button" disabled={busy} onClick={() => removePasskey(p.id)}
                  className="p-2 text-red-600" aria-label="Eliminar dispositivo"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
