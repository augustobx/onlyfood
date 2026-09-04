"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerClient, loginClient } from "@/app/actions/auth";
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
  const [mode, setMode] = useState<"ASK" | "LOGIN" | "REGISTER">("ASK");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Detectar tema desde el shell si no viene por prop
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

    const fd = new FormData();
    fd.append("phone", formData.phone);
    fd.append("password", formData.password);
    if (mode === "REGISTER") fd.append("name", formData.name);

    if (mode === "REGISTER") {
      const res = await registerClient(fd);
      if (res.success) {
        toast.success(
          res.accountActivated
            ? "¡Cuenta recuperada! Tu nueva clave ya quedó guardada."
            : "¡Bienvenido! Ya podés sumar puntos."
        );
        onClose();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } else {
      const res = await loginClient(fd);
      if (res.success) {
        toast.success(
          res.accountActivated
            ? "¡Cuenta recuperada! Tu nueva clave ya quedó guardada."
            : "¡Hola de nuevo!"
        );
        onClose();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
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
        {/* Luces sutiles de fondo para Sushi Zen */}
        {isSushi && (
          <>
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          </>
        )}

        <button
          onClick={onClose}
          className={`absolute right-4 top-4 p-2 rounded-full transition-colors ${
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

        {mode === "ASK" && (
          <div className="text-center pt-4 pb-2 space-y-6 relative z-10">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                isSushi
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : isDark
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-yellow-100 text-yellow-600"
              }`}
            >
              <Star className="w-10 h-10 fill-current" />
            </div>
            <div>
              <h3
                className={`text-2xl font-black tracking-tight leading-tight mb-2 ${
                  isSushi || isDark ? "text-white" : "text-slate-900"
                }`}
              >
                ¿Querés sumar puntos con cada compra?
              </h3>
              <p
                className={`text-sm font-medium ${
                  isSushi || isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Registrate gratis y acumulá puntos para jugar y ganar premios en tus próximos pedidos.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => setMode("REGISTER")}
                className={`w-full h-14 rounded-2xl font-black text-white text-lg shadow-lg ${
                  isSushi
                    ? "bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 shadow-rose-950/50"
                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30"
                }`}
              >
                ¡Quiero Registrarme!
              </Button>
              <Button
                onClick={() => setMode("LOGIN")}
                variant="ghost"
                className={`w-full h-12 rounded-xl font-bold transition-colors ${
                  isSushi
                    ? "border border-white/10 bg-[#161c28] text-slate-200 hover:bg-white/10 hover:text-white"
                    : isDark
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Ya tengo una cuenta, ingresar
              </Button>
            </div>
          </div>
        )}

        {(mode === "REGISTER" || mode === "LOGIN") && (
          <div className="pt-2 relative z-10">
            <h3
              className={`text-2xl font-black tracking-tight mb-6 ${
                isSushi || isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {mode === "REGISTER" ? "Crear perfil" : "Ingresar"}
            </h3>
            {mode === "LOGIN" && (
              <p
                className={`-mt-3 mb-5 rounded-xl px-3 py-2.5 text-xs font-semibold leading-relaxed border ${
                  isSushi
                    ? "bg-amber-950/40 border-amber-500/30 text-amber-200"
                    : isDark
                    ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                    : "bg-orange-50 border-orange-200 text-orange-950"
                }`}
              >
                Si ya eras cliente, podés escribir tu número con 3329, +54, 011 o sin prefijo.
                Reconoceremos los últimos 6 números.
              </p>
            )}
            <form onSubmit={handleAction} className="space-y-4">
              {mode === "REGISTER" && (
                <div className="space-y-1.5">
                  <Label
                    className={`font-bold ml-1 text-xs sm:text-sm ${
                      isSushi || isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Tu Nombre (opcional)
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan"
                    className={`h-12 rounded-xl font-medium ${
                      isSushi
                        ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 focus:bg-[#0f141d]"
                        : isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500"
                    }`}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label
                  className={`font-bold ml-1 text-xs sm:text-sm ${
                    isSushi || isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Teléfono (Usuario)
                </Label>
                <Input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej. 1123456789"
                  className={`h-12 rounded-xl font-medium ${
                    isSushi
                      ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 focus:bg-[#0f141d]"
                      : isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500"
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className={`font-bold ml-1 text-xs sm:text-sm ${
                    isSushi || isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Contraseña
                </Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Elegí una clave fácil"
                  className={`h-12 rounded-xl font-medium ${
                    isSushi
                      ? "bg-[#0c1017] border-white/15 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 focus:bg-[#0f141d]"
                      : isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500"
                  }`}
                />
              </div>

              <div className="pt-4">
                <Button
                  disabled={isLoading}
                  type="submit"
                  className={`w-full h-14 rounded-2xl font-bold text-lg text-white shadow-lg group ${
                    isSushi
                      ? "bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 shadow-rose-950/50"
                      : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30"
                  }`}
                >
                  {isLoading ? "Procesando..." : mode === "REGISTER" ? "Registrarme" : "Entrar"}
                  {!isLoading && (
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  )}
                </Button>
                <div className="text-center mt-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setMode(mode === "REGISTER" ? "LOGIN" : "REGISTER")}
                    className={`text-sm font-medium transition-colors ${
                      isSushi
                        ? "text-slate-400 hover:text-amber-300"
                        : isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-orange-600 font-semibold"
                    }`}
                  >
                    {mode === "REGISTER"
                      ? "¿Ya tenés cuenta? Ingresá aquí"
                      : "¿No tenés cuenta? Registrate gratis"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
