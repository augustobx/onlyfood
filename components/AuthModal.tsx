"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight, Eye, EyeOff, KeyRound, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerClient, loginClient } from "@/app/actions/auth";
import { requestClientPasswordReset } from "@/app/actions/client-security";
import { beginClientPasskeyAuthentication, finishClientPasskeyAuthentication } from "@/app/actions/client-passkeys";
import { client as webauthnClient } from "@passwordless-id/webauthn";
import { useRouter } from "next/navigation";
import { AssistedRecoveryPanel } from "@/components/AssistedRecoveryPanel";
import { TemporaryPasswordSetup } from "@/components/TemporaryPasswordSetup";

export function AuthModal({
  isOpen,
  onClose,
  theme: themeProp,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
}) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "RECOVERY" | "SETUP">("LOGIN");
  const [setupToken, setSetupToken] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", identifier: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryChannel, setRecoveryChannel] = useState<"EMAIL" | "ASSISTED">("EMAIL");
  useEffect(() => {
    setPasskeySupported(typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials);
  }, []);

  const router = useRouter();

  const detectedTheme =
    typeof document !== "undefined"
      ? document.querySelector(".store-shell")?.getAttribute("data-store-theme")?.toUpperCase()
      : undefined;
  const theme = (themeProp || detectedTheme || "ORIGINAL").toUpperCase();

  const isSushi = theme === "SUSHI_ZEN";
  const isDark = theme === "URBAN_DARK" || theme === "ARCADE_KITCHEN" || isSushi;

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append("phone", mode === "LOGIN" ? formData.identifier : formData.phone);
      fd.append("password", formData.password);
      if (mode === "REGISTER") { fd.append("name", formData.name); fd.append("email", formData.email); }

      if (mode === "REGISTER") {
        const res = await registerClient(fd);
        if (res.success) {
          toast.success("¡Bienvenido! Tu cuenta fue creada.");
          if (!res.verificationSent) toast.info("Tu cuenta está activa, pero aún no se envió el correo de verificación.");
          onClose();
          window.dispatchEvent(new Event("onlyfood:client-auth-changed"));
          router.refresh();
        } else {
          toast.error(res.error);
          if ((res as any).code === "PHONE_EXISTS") {
            setMode("LOGIN");
          }
        }
      } else if (mode === "LOGIN") {
        const res = await loginClient(fd);
        if (res.success) {
          if (res.requiresSetup && res.setupToken) {
            setSetupToken(res.setupToken);
            setMode("SETUP");
            toast.info("Ingresaste con clave temporal: completá correo y contraseña nueva.");
            return;
          }
          toast.success("¡Hola de nuevo! Ya iniciaste sesión.");
          onClose();
          window.dispatchEvent(new Event("onlyfood:client-auth-changed"));
          router.refresh();
        } else {
          toast.error(res.error, {
            description: "¿No recordás tu clave? Podés recuperarla con un clic.",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await requestClientPasswordReset(formData.email);
      setRecoveryMessage(result.message || "Revisá tu correo para continuar.");
    } catch {
      toast.error("No se pudo solicitar el enlace.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    try {
      const start = await beginClientPasskeyAuthentication();
      if (!start.success) { toast.error(start.error); return; }
      const response = await webauthnClient.authenticate({
        challenge: start.challenge, domain: start.rpId,
        hints: ["client-device"], userVerification: "required", timeout: 60_000,
      });
      const verified = await finishClientPasskeyAuthentication(start.challengeId, response);
      if (!verified.success) { toast.error(verified.error); return; }
      toast.success("Sesión iniciada con biometría.");
      onClose();
      window.dispatchEvent(new Event("onlyfood:client-auth-changed"));
      router.refresh();
    } catch (error) {
      if (!(error instanceof DOMException && ["NotAllowedError", "AbortError"].includes(error.name))) {
        console.error("Passkey login:", error);
        toast.error("No se pudo usar la biometría. Ingresá con tu clave.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative transition-all ${
          isSushi
            ? "bg-[#121722] border border-amber-500/35 text-slate-100 shadow-black/80"
            : isDark
            ? "bg-[#11141c] border border-slate-800 text-white shadow-black/80"
            : "bg-white border border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Ambient lighting */}
        {isSushi && (
          <>
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          </>
        )}

        <button
          onClick={onClose}
          className={`absolute right-4 top-4 p-2 rounded-full transition-colors z-20 ${
            isSushi
              ? "bg-[#1a2232] hover:bg-[#253046] text-slate-300 hover:text-white border border-white/10"
              : isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TOP TABS: LOGIN | REGISTER */}
        {mode !== "SETUP" && <div className="flex rounded-2xl p-1 bg-slate-100 dark:bg-slate-800/80 mb-5 relative z-10 border border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setRecoveryMessage("");
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              mode === "LOGIN"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("REGISTER");
              setRecoveryMessage("");
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              mode === "REGISTER"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Crear Cuenta
          </button>
        </div>}

        {mode === "SETUP" && setupToken && (
          <TemporaryPasswordSetup setupToken={setupToken} onCompleted={() => {
            setSetupToken("");
            setMode("LOGIN");
            onClose();
            window.dispatchEvent(new Event("onlyfood:client-auth-changed"));
            router.refresh();
          }} />
        )}

        {/* ═══ LOGIN / REGISTER VIEW ═══ */}
        {(mode === "LOGIN" || mode === "REGISTER") && (
          <div className="relative z-10">
            <div className="mb-4">
              <h3 className={`text-xl font-black tracking-tight ${isSushi || isDark ? "text-white" : "text-slate-900"}`}>
                {mode === "REGISTER" ? "Creá tu perfil VIP" : "¡Hola de nuevo!"}
              </h3>
              <p className={`text-xs mt-1 ${isSushi || isDark ? "text-slate-400" : "text-slate-500"}`}>
                {mode === "REGISTER"
                  ? "Acumulá puntos con cada pedido y ganá premios exclusivos."
                  : "Ingresá para canjear beneficios y girar la ruleta."}
              </p>
            </div>

            <form onSubmit={handleAction} className="space-y-3.5">
              {mode === "REGISTER" && (
                <div className="space-y-1">
                  <Label className={`font-bold ml-1 text-xs ${isSushi || isDark ? "text-slate-200" : "text-slate-700"}`}>
                    Tu Nombre
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className={`h-11 rounded-xl font-medium ${
                      isSushi
                        ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500"
                        : isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              )}

              {mode === "REGISTER" && (
                <div className="space-y-1">
                  <Label className="font-bold ml-1 text-xs">Correo electrónico para recuperar tu cuenta</Label>
                  <Input type="email" required autoComplete="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com" className="h-11 rounded-xl" />
                </div>
              )}
              <div className="space-y-1">
                <Label className={`font-bold ml-1 text-xs ${isSushi || isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {mode === "REGISTER" ? "Teléfono celular" : "Teléfono o correo electrónico"}
                </Label>
                <Input
                  type={mode === "LOGIN" ? "text" : "tel"}
                  required
                  autoComplete={mode === "LOGIN" ? "username" : "tel"}
                  value={mode === "LOGIN" ? formData.identifier : formData.phone}
                  onChange={(e) => setFormData({ ...formData, [mode === "LOGIN" ? "identifier" : "phone"]: e.target.value })}
                  placeholder={mode === "LOGIN" ? "Celular o tu@email.com" : "Ej. 11 2345 6789"}
                  className={`h-11 rounded-xl font-medium ${
                    isSushi
                      ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500"
                      : isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <Label className={`font-bold text-xs ${isSushi || isDark ? "text-slate-200" : "text-slate-700"}`}>
                    Contraseña
                  </Label>
                  {mode === "LOGIN" && (
                    <button
                      type="button"
                      onClick={() => setMode("RECOVERY")}
                      className="text-[11px] font-bold text-orange-600 dark:text-amber-400 hover:underline"
                    >
                      ¿Olvidaste tu clave?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={128}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={mode === "REGISTER" ? "Mínimo 8 caracteres" : "Tu contraseña"}
                    className={`h-11 rounded-xl font-medium pr-10 ${
                      isSushi
                        ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500"
                        : isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  disabled={isLoading}
                  type="submit"
                  className={`w-full h-12 rounded-2xl font-black text-sm text-white shadow-md group ${
                    isSushi
                      ? "bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 shadow-rose-950/50"
                      : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30"
                  }`}
                >
                  {isLoading ? "Procesando…" : mode === "REGISTER" ? "Registrarme" : "Entrar a mi cuenta"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </div>
            </form>
            {mode === "LOGIN" && passkeySupported && (
              <Button variant="outline" type="button" onClick={handlePasskeyLogin} disabled={isLoading}
                className="w-full mt-3 h-11 rounded-xl font-bold">
                <Fingerprint className="w-5 h-5 mr-2" /> Entrar con Face ID / huella
              </Button>
            )}
          </div>
        )}

        {/* ═══ RECOVERY VIEW ═══ */}
        {mode === "RECOVERY" && (
          <div className="relative z-10 space-y-4">
            <h3 className="text-xl font-black flex items-center gap-2"><KeyRound className="w-5 h-5" /> Recuperar contraseña</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" onClick={() => { setRecoveryChannel("EMAIL"); setRecoveryMessage(""); }}
                variant={recoveryChannel === "EMAIL" ? "default" : "outline"}
                className={recoveryChannel === "EMAIL" ? "bg-orange-600 text-white" : ""}>
                Tengo correo
              </Button>
              <Button type="button" size="sm" onClick={() => { setRecoveryChannel("ASSISTED"); setRecoveryMessage(""); }}
                variant={recoveryChannel === "ASSISTED" ? "default" : "outline"}
                className={recoveryChannel === "ASSISTED" ? "bg-orange-600 text-white" : ""}>
                No tengo correo
              </Button>
            </div>
            {recoveryChannel === "EMAIL" ? (
              <>
                <p className="text-xs">Ingresá el correo verificado de tu cuenta para recibir un enlace seguro.</p>
                <form onSubmit={handleCheckRecovery} className="space-y-3">
                  <Label htmlFor="recovery-email">Correo electrónico</Label>
                  <Input id="recovery-email" required type="email" autoComplete="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com" className="h-11 rounded-xl" />
                  <Button type="submit" disabled={isLoading} className="w-full bg-orange-500 text-white">
                    {isLoading ? "Enviando…" : "Enviar enlace de recuperación"}
                  </Button>
                </form>
                {recoveryMessage && <p role="status" className="text-sm font-semibold">{recoveryMessage}</p>}
              </>
            ) : (
              <AssistedRecoveryPanel initialPhone={formData.identifier} onRequested={() => {
                setMode("LOGIN");
                setRecoveryMessage("");
                setFormData(previous => ({ ...previous, password: "" }));
              }} />
            )}
            <button type="button" onClick={() => { setMode("LOGIN"); setRecoveryMessage(""); }}
              className="w-full text-xs font-bold text-slate-500 hover:text-orange-500">← Volver al inicio de sesión</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
