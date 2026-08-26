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

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [mode, setMode] = useState<"ASK" | "LOGIN" | "REGISTER">("ASK");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
        toast.success(res.accountActivated ? "¡Cuenta recuperada! Tu nueva clave ya quedó guardada." : "¡Bienvenido! Ya podés sumar puntos.");
        onClose();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } else {
      const res = await loginClient(fd);
      if (res.success) {
        toast.success(res.accountActivated ? "¡Cuenta recuperada! Tu nueva clave ya quedó guardada." : "¡Hola de nuevo!");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {mode === "ASK" && (
          <div className="text-center pt-4 pb-2 space-y-6">
            <div className="w-20 h-20 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
               <Star className="w-10 h-10 fill-current" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-2">¿Querés sumar puntos con cada compra?</h3>
               <p className="text-slate-500 text-sm font-medium">Registrate gratis y acumulá puntos para jugar y ganar premios en tus próximos pedidos.</p>
            </div>
            <div className="space-y-3">
               <Button onClick={() => setMode("REGISTER")} className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-white text-lg shadow-lg shadow-orange-500/30">
                 ¡Quiero Registrarme!
               </Button>
               <Button onClick={() => setMode("LOGIN")} variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                 Ya tengo una cuenta, ingresar
               </Button>
            </div>
          </div>
        )}

        {(mode === "REGISTER" || mode === "LOGIN") && (
          <div className="pt-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-6">
              {mode === "REGISTER" ? "Crear perfil" : "Ingresar"}
            </h3>
            {mode === "LOGIN" && (
              <p className="-mt-3 mb-5 rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
                Si ya eras cliente, podés escribir tu número con 3329, +54, 011 o sin prefijo. Reconoceremos los últimos 6 números.
              </p>
            )}
            <form onSubmit={handleAction} className="space-y-4">
              {mode === "REGISTER" && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 ml-1">Tu Nombre (opcional)</Label>
                  <Input 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej. Juan" className="h-12 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 ml-1">Teléfono (Usuario)</Label>
                  <Input 
                    type="tel" required
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="Ej. 1123456789" className="h-12 rounded-xl bg-slate-50 focus:bg-white"
                  />
              </div>
              <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 ml-1">Contraseña</Label>
                  <Input 
                    type="password" required minLength={8} maxLength={128}
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="Elegí una clave fácil" className="h-12 rounded-xl bg-slate-50 focus:bg-white"
                  />
              </div>

              <div className="pt-4">
                <Button disabled={isLoading} type="submit" className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-bold text-lg text-white shadow-lg shadow-orange-500/30 group">
                  {isLoading ? "Procesando..." : (mode === "REGISTER" ? "Registrarme" : "Entrar")}
                  {!isLoading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
                <div className="text-center mt-4 mb-2">
                  <button type="button" onClick={() => setMode(mode === "REGISTER" ? "LOGIN" : "REGISTER")} className="text-slate-500 text-sm font-medium hover:text-orange-500 transition-colors">
                    {mode === "REGISTER" ? "¿Ya tenés cuenta? Ingresá aquí" : "¿No tenés cuenta? Registrate gratis"}
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
