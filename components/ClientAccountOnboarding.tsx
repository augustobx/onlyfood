"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { client as webauthn } from "@passwordless-id/webauthn";
import { Fingerprint, MailCheck, ShieldCheck, IdCard, LogOut } from "lucide-react";
import { toast } from "sonner";
import { sendEmailVerification } from "@/app/actions/client-security";
import { completeClientDniStep, getClientOnboardingStatus } from "@/app/actions/client-profile";
import { logoutClient } from "@/app/actions/auth";
import { beginClientPasskeyRegistration, finishClientPasskeyRegistration } from "@/app/actions/client-passkeys";

type Status = NonNullable<Awaited<ReturnType<typeof getClientOnboardingStatus>>>;
type Step = "EMAIL" | "DNI" | "PASSKEY" | null;

/**
 * Se monta en el layout de tienda: cubre TODOS los temas, no solo el storefront.
 * La carga de correo es obligatoria si falta; DNI y passkey se pueden omitir.
 */
export function ClientAccountOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<Step>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const current = await getClientOnboardingStatus();
      setStatus(current);
      setError("");
      if (!current) { setStep(null); return; }
      if (!current.email) {
        setEmail("");
        setStep("EMAIL");
      } else if (!current.dniProvided &&
        sessionStorage.getItem(`onlyfood:dni-skip:${current.clientId}`) !== "yes") {
        setStep("DNI");
      } else {
        setStep(null);
      }
    } catch {
      // No interferir con navegación ni compras cuando el endpoint falla.
      setStep(null);
    }
  }, []);

  useEffect(() => {
    setPasskeySupported(Boolean(window.PublicKeyCredential && navigator.credentials));
    void refresh();
    window.addEventListener("onlyfood:client-auth-changed", refresh);
    return () => window.removeEventListener("onlyfood:client-auth-changed", refresh);
  }, [refresh]);

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await sendEmailVerification(email);
      if (!result.success) { setError(result.error || "No pudimos enviar el correo."); return; }
      const current = await getClientOnboardingStatus();
      if (!current?.email) { setError("No se pudo guardar el correo. Volvé a intentar."); return; }
      setStatus(current);
      toast.success("Correo agregado. Confirmá el enlace recibido para poder recuperar tu clave.", { duration: 8000 });
      setStep(current.dniProvided ? null : "DNI");
      router.refresh();
    } catch { setError("No pudimos guardar el correo. Intentá nuevamente."); }
    finally { setBusy(false); }
  }

  async function saveDni(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await completeClientDniStep(dni);
      if (!result.success) { setError(result.error || "Revisá el número ingresado."); return; }
      // Nunca guardar ni mostrar el documento ingresado.
      setDni("");
      setStep(passkeySupported && !status?.hasPasskey ? "PASSKEY" : null);
      router.refresh();
    } catch { setError("No se pudo completar el paso."); }
    finally { setBusy(false); }
  }

  function skipOptional() {
    if (step === "DNI" && status) {
      sessionStorage.setItem(`onlyfood:dni-skip:${status.clientId}`, "yes");
    }
    setDni("");
    setError("");
    setStep(null);
  }

  async function enablePasskey() {
    setBusy(true);
    setError("");
    try {
      const start = await beginClientPasskeyRegistration();
      if (!start.success) { setError(start.error); return; }
      const registration = await webauthn.register({
        challenge: start.challenge, user: start.user, domain: start.rpId,
        hints: ["client-device"], userVerification: "required",
        discoverable: "required", attestation: false, timeout: 60_000,
      });
      const finish = await finishClientPasskeyRegistration(start.challengeId, registration);
      if (!finish.success) { setError(finish.error); return; }
      toast.success("Huella / Face ID / Windows Hello activado en este dispositivo.");
      setStep(null);
      router.refresh();
    } catch (cause) {
      if (cause instanceof DOMException && ["NotAllowedError", "AbortError"].includes(cause.name)) {
        setError("Se canceló la activación. Podés continuar con tu contraseña.");
      } else {
        console.error("Passkey enrollment failure", cause);
        setError("No se pudo activar la biometría. Podés intentarlo desde Mi Perfil.");
      }
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      await logoutClient();
      setStep(null);
      setStatus(null);
      window.dispatchEvent(new Event("onlyfood:client-auth-changed"));
      router.refresh();
    } catch {
      setError("No se pudo cerrar la sesión.");
    } finally { setBusy(false); }
  }

  // No cubrir las pantallas de verificación o restablecimiento de contraseña.
  if (!step || pathname.startsWith("/verify-email") || pathname.startsWith("/reset-password")) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="account-onboarding-title"
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl space-y-4">
        {step === "EMAIL" && (
          <>
            <MailCheck className="h-9 w-9 text-orange-600" aria-hidden="true" />
            <h2 id="account-onboarding-title" className="text-2xl font-black">Para continuar, agregá tu correo</h2>
            <p className="text-sm text-slate-600">Con tu correo verificado podés iniciar sesión y recuperar tu contraseña cuando la olvides.</p>
            <form onSubmit={saveEmail} className="space-y-3">
              <label htmlFor="onboarding-email" className="block text-sm font-bold">Correo electrónico</label>
              <input id="onboarding-email" autoFocus type="email" autoComplete="email" required maxLength={254}
                disabled={busy} value={email} onChange={event => setEmail(event.target.value)}
                placeholder="tu@email.com" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-60">
                {busy ? "Enviando…" : "Guardar y enviar verificación"}
              </button>
            </form>
            <p className="text-xs text-slate-500">La recuperación y el ingreso por correo se habilitan cuando confirmes el enlace que recibís.</p>
            <button type="button" disabled={busy} onClick={signOut}
              className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Cerrar sesión
            </button>
          </>
        )}

        {step === "DNI" && (
          <>
            <IdCard className="h-9 w-9 text-orange-600" aria-hidden="true" />
            <h2 id="account-onboarding-title" className="text-2xl font-black">Completá el paso de DNI</h2>
            <p className="text-sm text-slate-600">
              Ingresá tu DNI para continuar a la configuración opcional de huella o reconocimiento facial del dispositivo.
            </p>
            <form onSubmit={saveDni} className="space-y-3">
              <label htmlFor="onboarding-dni" className="block text-sm font-bold">Número de DNI (7 u 8 dígitos)</label>
              <input id="onboarding-dni" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{7,8}"
                minLength={7} maxLength={8} required disabled={busy} value={dni}
                onChange={event => setDni(event.target.value.replace(/\\D/g, "").slice(0, 8))}
                placeholder="Solo números" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              <p className="text-xs text-slate-500">
                No almacenamos tu número de documento. Este paso no verifica identidad ni vincula el DNI a tu rostro.
              </p>
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-60">
                {busy ? "Procesando…" : "Continuar"}
              </button>
            </form>
            <button type="button" disabled={busy} onClick={skipOptional}
              className="w-full rounded-xl border px-4 py-2 text-sm font-bold">Ahora no</button>
          </>
        )}

        {step === "PASSKEY" && (
          <>
            <Fingerprint className="h-9 w-9 text-orange-600" aria-hidden="true" />
            <h2 id="account-onboarding-title" className="text-2xl font-black">¿Activar Face ID o huella?</h2>
            <p className="text-sm text-slate-600">
              Podés ingresar más rápido la próxima vez utilizando Face ID, tu huella o Windows Hello.
              Tus datos biométricos nunca salen de tu dispositivo.
            </p>
            <p className="text-xs text-slate-500 flex gap-2 items-center">
              <ShieldCheck className="h-4 w-4" /> La biometría es opcional y podés desactivarla en Mi Perfil.
            </p>
            <button type="button" disabled={busy} onClick={enablePasskey}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-60">
              {busy ? "Activando…" : "Activar en este dispositivo"}
            </button>
            <button type="button" disabled={busy} onClick={skipOptional}
              className="w-full rounded-xl border px-4 py-2 text-sm font-bold">Ahora no</button>
          </>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      </section>
    </div>
  );
}
