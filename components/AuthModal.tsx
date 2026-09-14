"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight, Eye, EyeOff, KeyRound, MessageCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerClient, loginClient, requestPasswordResetStatus, resetClientPasswordWithSetup } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export function AuthModal({
  isOpen,
  onClose,
  theme: themeProp,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
}) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "RECOVERY">("LOGIN");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", newPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryState, setRecoveryState] = useState<{
    verified: boolean;
    canSelfReset: boolean;
    phone: string;
    clientName: string | null;
  } | null>(null);

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
      fd.append("phone", formData.phone);
      fd.append("password", formData.password);
      if (mode === "REGISTER") fd.append("name", formData.name);

      if (mode === "REGISTER") {
        const res = await registerClient(fd);
        if (res.success) {
          toast.success(
            res.accountActivated
              ? "¡Cuenta activada! Tu nueva clave ya quedó guardada."
              : "¡Bienvenido! Ya podés acumular puntos y beneficios."
          );
          onClose();
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
          toast.success(
            res.accountActivated
              ? "¡Cuenta activada! Tu clave ya quedó registrada."
              : "¡Hola de nuevo! Ya iniciaste sesión."
          );
          onClose();
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

  const handleCheckRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      toast.error("Por favor, ingresá tu número de teléfono.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordResetStatus(formData.phone);
      if (res.success) {
        setRecoveryState({
          verified: true,
          canSelfReset: Boolean(res.canSelfReset),
          phone: res.phone || formData.phone,
          clientName: res.clientName || null,
        });
      } else {
        toast.error(res.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetClientPasswordWithSetup(recoveryState?.phone || formData.phone, formData.newPassword);
      if (res.success) {
        toast.success("¡Contraseña restablecida con éxito! Ya estás conectado.");
        onClose();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all ${
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
        <div className="flex rounded-2xl p-1 bg-slate-100 dark:bg-slate-800/80 mb-5 relative z-10 border border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setRecoveryState(null);
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
              setRecoveryState(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              mode === "REGISTER"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

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

              <div className="space-y-1">
                <Label className={`font-bold ml-1 text-xs ${isSushi || isDark ? "text-slate-200" : "text-slate-700"}`}>
                  Teléfono celular
                </Label>
                <Input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej. 11 2345 6789"
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
          </div>
        )}

        {/* ═══ RECOVERY VIEW ═══ */}
        {mode === "RECOVERY" && (
          <div className="relative z-10 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-amber-950/50 text-orange-600 dark:text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className={`text-xl font-black tracking-tight ${isSushi || isDark ? "text-white" : "text-slate-900"}`}>
                  Recuperar Contraseña
                </h3>
              </div>
              <p className={`text-xs ${isSushi || isDark ? "text-slate-400" : "text-slate-500"}`}>
                Ingresá el número de celular que utilizás para tus pedidos.
              </p>
            </div>

            {!recoveryState?.verified ? (
              <form onSubmit={handleCheckRecovery} className="space-y-3">
                <div className="space-y-1">
                  <Label className={`font-bold ml-1 text-xs ${isSushi || isDark ? "text-slate-200" : "text-slate-700"}`}>
                    Tu Celular
                  </Label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej. 11 2345 6789"
                    className="h-11 rounded-xl font-medium"
                  />
                </div>

                <Button
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-11 rounded-xl font-black text-xs text-white bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? "Buscando…" : "Verificar Cuenta"}
                </Button>
              </form>
            ) : recoveryState.canSelfReset ? (
              <form onSubmit={handleApplyNewPassword} className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tu cuenta fue habilitada para crear una nueva clave ahora.</span>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-xs">Nueva Contraseña (mínimo 8 caracteres)</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Elegí tu nueva clave"
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-11 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? "Guardando…" : "Guardar e Iniciar Sesión"}
                </Button>
              </form>
            ) : (
              <div className="space-y-3.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Cuenta de {recoveryState.clientName || recoveryState.phone}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Tu cuenta ya tiene una contraseña activa. Por seguridad, el local puede habilitar tu restablecimiento de clave al instante con 1 clic.
                  </p>
                </div>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hola! Soy cliente de la tienda con el teléfono ${recoveryState.phone}. Olvidé mi contraseña y necesito que restablezcan mi acceso para poder ingresar.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Pedir desbloqueo por WhatsApp al local
                </a>

                <p className="text-[11px] text-center text-slate-400">
                  Una vez que el local presione "Restablecer Clave", podrás ingresar directamente.
                </p>
              </div>
            )}

            <div className="text-center pt-2 border-t border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode("LOGIN");
                  setRecoveryState(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
