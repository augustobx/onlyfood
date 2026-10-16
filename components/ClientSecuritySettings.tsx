"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { client as webauthn } from "@passwordless-id/webauthn";
import { Fingerprint, MailCheck, Trash2, UserRound, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { sendEmailVerification } from "@/app/actions/client-security";
import { saveClientProfileName } from "@/app/actions/client-profile";
import {
  beginClientPasskeyRegistration, finishClientPasskeyRegistration,
  listClientPasskeys, removeClientPasskey,
} from "@/app/actions/client-passkeys";

type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

export function ClientSecuritySettings({
  initialName, phone, initialEmail, verified,
}: { initialName: string; phone: string; initialEmail: string; verified: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials);
    listClientPasskeys().then(setPasskeys).catch(() => {});
  }, []);

  async function saveName() {
    setBusy(true);
    try {
      const result = await saveClientProfileName(name);
      if (result.success) {
        toast.success("Nombre actualizado.");
        setName(result.name || "");
        setEditingName(false);
        router.refresh();
      } else toast.error(result.error || "No se pudo guardar.");
    } catch { toast.error("No se pudo guardar."); }
    finally { setBusy(false); }
  }

  async function sendVerification() {
    setBusy(true);
    try {
      const result = await sendEmailVerification(email);
      if (result.success) toast.success(result.message || "Revisá tu correo.", { duration: 8000 });
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
    <section className="rounded-3xl border bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 p-5 mb-6 space-y-5">
      <h2 className="font-black text-xl flex items-center gap-2"><UserRound className="w-5 h-5" /> Mis datos y seguridad</h2>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="client-profile-name" className="text-sm font-bold">Nombre de la cuenta</label>
          {!editingName && <button type="button" onClick={() => setEditingName(true)}
            className="text-xs font-bold text-orange-600 inline-flex gap-1 items-center"><Pencil className="w-3 h-3"/> Editar</button>}
        </div>
        <input id="client-profile-name" type="text" maxLength={80} autoComplete="name"
          disabled={!editingName || busy} value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm disabled:opacity-70"/>
        {editingName && <div className="flex gap-2">
          <button disabled={busy || !name.trim()} type="button" onClick={saveName}
            className="rounded-xl bg-orange-500 text-white font-bold px-4 py-2 text-xs">Guardar nombre</button>
          <button type="button" disabled={busy} onClick={() => { setName(initialName); setEditingName(false); }}
            className="rounded-xl border px-3 py-2 text-xs">Cancelar</button>
        </div>}
        <label htmlFor="client-profile-phone" className="text-sm font-bold block">Teléfono de acceso</label>
        <input id="client-profile-phone" readOnly value={phone}
          className="w-full rounded-xl border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-2 text-sm"/>
        <p className="text-xs text-slate-500">Para corregir el teléfono con el que ingresás, contactá al comercio.</p>
      </div>
      <div className="border-t dark:border-slate-700 pt-4 space-y-2">
        <label htmlFor="client-security-email" className="text-sm font-bold block">
          Correo electrónico para recuperar la contraseña
        </label>
        <input id="client-security-email" type="email" autoComplete="email" maxLength={254}
          placeholder="tu@email.com" disabled={busy} value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm" />
        {verified && email.trim().toLowerCase() === initialEmail.trim().toLowerCase() ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Correo verificado. Ya podés recuperar tu contraseña por email.
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {initialEmail && email !== initialEmail
              ? "El cambio de correo se guardará solo después de confirmar el enlace enviado a la nueva dirección."
              : "Este correo todavía no está verificado. Es necesario confirmar el enlace para poder recuperar tu contraseña."}
          </p>
        )}
        {!(verified && email.trim().toLowerCase() === initialEmail.trim().toLowerCase()) && (
          <button disabled={busy || !email.trim()} type="button" onClick={sendVerification}
            className="rounded-xl bg-orange-500 text-white font-bold px-4 py-2 text-sm inline-flex items-center gap-2">
            <MailCheck className="w-4 h-4" /> {busy ? "Procesando…" : "Enviar enlace de confirmación"}
          </button>
        )}
        <p className="text-xs text-slate-500">El enlace llega desde el correo configurado por tu comercio. Revisá también spam.</p>
      </div>
      <div className="border-t dark:border-slate-700 pt-4 space-y-3">
        <h3 className="font-black flex items-center gap-2"><Fingerprint className="w-5 h-5"/> Face ID / Huella / Windows Hello</h3>
        <p className="text-xs text-slate-500">Tu rostro y tus huellas permanecen en el dispositivo; OnlyFood almacena únicamente una clave pública.</p>
        {supported ? (
          <button disabled={busy} type="button" onClick={enrollPasskey}
            className="rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold px-4 py-2 text-sm">
            {busy ? "Procesando…" : "Activar biometría"}
          </button>
        ) : <p className="text-sm">Tu navegador o dispositivo no admite passkeys.</p>}
        {passkeys.length > 0 && (
          <ul className="space-y-2">
            {passkeys.map(p => (
              <li key={p.id} className="rounded-xl border dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-sm"><strong>{p.name}</strong><br/><small>Registrado: {new Date(p.createdAt).toLocaleDateString("es-AR")}</small></span>
                <button type="button" disabled={busy} onClick={() => removePasskey(p.id)}
                  className="p-2 text-red-600" aria-label="Eliminar dispositivo"><Trash2 className="w-4 h-4"/></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
