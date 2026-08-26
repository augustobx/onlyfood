"use client";
import { useState, useEffect } from "react";
import { loginAdmin } from "@/app/actions/admin-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Limpieza preventiva: aseguramos que el body no esté bloqueado
    useEffect(() => {
        document.body.style.pointerEvents = "auto";
        document.body.removeAttribute("data-scroll-locked");
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await loginAdmin(password);
        if (res.success) {
            toast.success("Acceso concedido");
            // Transición suave nativa de Next.js (evita el bug de la pantalla oscura)
            router.refresh();
        } else {
            toast.error(res.error);
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-2xl border border-slate-200">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Lock className="w-6 h-6 text-slate-700" />
                    </div>
                    <h1 className="text-2xl font-black text-center text-slate-800">Acceso Restringido</h1>
                    <p className="text-sm text-slate-500 mt-1">Panel de Administración</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Input
                            type="password"
                            placeholder="Ingresar contraseña..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 text-center text-lg tracking-widest bg-slate-50"
                            autoFocus
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg rounded-xl transition-all">
                        Ingresar
                    </Button>
                </form>
            </div>
        </div>
    );
}