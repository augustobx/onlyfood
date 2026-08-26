"use client";

import { LogOut } from "lucide-react";
import { logoutClient } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutClient();
    toast.success("Sesión cerrada");
    router.push("/");
    router.refresh();
  };

  return (
    <button onClick={handleLogout} className="p-2 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-full transition-colors" title="Cerrar sesión">
      <LogOut className="w-5 h-5" />
    </button>
  );
}
