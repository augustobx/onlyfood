import AdminLoginForm from "./AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { AdminShell } from "./AdminShell";
import { getTenantContext } from "@/lib/tenant-context";
import { ShieldAlert } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isAdminAuthenticated();

  if (!isAdmin) {
    return <AdminLoginForm />;
  }

  const tenant = await getTenantContext();

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELED") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full text-center space-y-5 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Panel Suspendido</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            La suscripción del comercio <strong className="text-white">{tenant.name}</strong> se encuentra temporalmente suspendida.
            Tus datos de catálogo, pedidos y clientes están seguros y preservados.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Para reactivar el acceso y la recepción de pedidos, contactá al soporte de <span className="text-orange-400 font-semibold">NanoLabs OnlyFood SaaS</span>.
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
