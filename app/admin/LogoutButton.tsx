"use client";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { logoutAdmin } from "@/app/actions/admin-auth";
import { useRouter } from "next/navigation";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
    const router = useRouter();

    // Limpieza agresiva: apenas carga el Admin, destrabamos la pantalla
    useEffect(() => {
        document.body.style.pointerEvents = "auto";
        document.body.removeAttribute("data-scroll-locked");
    }, []);

    const handleLogout = async () => {
        await logoutAdmin();
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
            aria-label="Cerrar sesión"
            className={`flex h-10 items-center rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 w-full transition-all mt-auto ${collapsed ? "justify-center px-2" : "gap-3 px-3 text-left"}`}
        >
            <LogOut className="h-5 w-5 shrink-0" /> {!collapsed && "Cerrar sesión"}
        </button>
    );
}
