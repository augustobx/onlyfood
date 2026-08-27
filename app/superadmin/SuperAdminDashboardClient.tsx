"use client";

import { useState } from "react";
import {
  createTenantAction,
  logoutSuperAdminAction,
} from "@/app/actions/superadmin";
import { PlanManagementModal, TenantControlModal } from "./SuperAdminControlModals";
import {
  Building2,
  Store,
  DollarSign,
  TrendingUp,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  LogOut,
  Shield,
  Loader2,
  Sliders,
  X,
} from "lucide-react";

interface SuperAdminDashboardProps {
  initialMetrics: any;
  initialTenants: any[];
  initialPlans: any[];
}

export default function SuperAdminDashboardClient({
  initialMetrics,
  initialTenants,
  initialPlans,
}: SuperAdminDashboardProps) {
  const [metrics] = useState(initialMetrics);
  const [tenants] = useState(initialTenants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlanManagementOpen, setIsPlanManagementOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<any | null>(null);

  // New Tenant Form State
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formPlan, setFormPlan] = useState("PRO");
  const [formEmail, setFormEmail] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formLocationName, setFormLocationName] = useState("Sucursal Centro");
  const [formError, setFormError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const handleSlugify = (val: string) => {
    setFormName(val);
    setFormSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setFormError(null);

    const res = await createTenantAction({
      name: formName,
      slug: formSlug,
      customDomain: formDomain || undefined,
      planCode: formPlan,
      ownerEmail: formEmail,
      ownerName: formOwnerName,
      ownerPassword: formPassword,
      locationName: formLocationName,
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      window.location.reload();
    } else {
      setFormError(res.error || "Error al crear comercio");
      setCreateLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutSuperAdminAction();
    window.location.reload();
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Activo
          </span>
        );
      case "TRIAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> En Prueba
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Suspendido
          </span>
        );
      case "PAST_DUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Pago Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPlanBadge = (code?: string) => {
    switch (code) {
      case "BUSINESS":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wide">
            Business
          </span>
        );
      case "PRO":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase tracking-wide">
            Pro
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wide">
            {code || "Sin plan"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">OnlyFood SuperAdmin</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full">
                  NanoLabs Platform
                </span>
              </div>
              <p className="text-xs text-slate-400">Control Multi-Tenant Central</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlanManagementOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700"
            >
              <Sliders className="w-4 h-4" />
              Planes y opciones
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Comercio</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comercios Activos</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{metrics.totalTenants}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{metrics.activeTenants} activos</span>
              <span>•</span>
              <span className="text-blue-400 font-semibold">{metrics.trialTenants} en prueba</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MRR Estimado</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">${metrics.mrr.toLocaleString("es-AR")}</div>
            <div className="mt-2 text-xs text-slate-400">
              Cobrado este mes: <span className="font-semibold text-emerald-400">${(metrics.collectedThisMonth || 0).toLocaleString("es-AR")}</span>
              <span className="mx-1">•</span>
              Pendiente: <span className="font-semibold text-amber-400">${(metrics.pendingCollection || 0).toLocaleString("es-AR")}</span>
              {metrics.overduePayments > 0 && <span className="ml-1 text-rose-400">({metrics.overduePayments} vencido/s)</span>}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sucursales / Locales</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{metrics.totalLocations}</div>
            <div className="mt-2 text-xs text-slate-400">
              Ubicaciones físicas operando
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pedidos Totales</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{metrics.totalOrders}</div>
            <div className="mt-2 text-xs text-slate-400">
              Transacciones procesadas en plataforma
            </div>
          </div>
        </div>

        {/* Plans Distribution Ribbon */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Distribución de Planes SaaS:</span>
          </div>
          <div className="flex items-center gap-4">
            {metrics.planDistribution.map((p: any) => (
              <div key={p.code} className="flex items-center gap-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-white">{p.name}:</span>
                <span className="text-orange-400 font-bold">{p.count} comercios</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant Table Section */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Comercios Registrados</h2>
              <p className="text-xs text-slate-400">Tenants y clientes en la infraestructura OnlyFood</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar comercio o slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 w-52"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="TRIAL">En Prueba</option>
                <option value="SUSPENDED">Suspendidos</option>
                <option value="PAST_DUE">Pago Pendiente</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Comercio</th>
                  <th className="py-3.5 px-4">Dominio / Host</th>
                  <th className="py-3.5 px-4">Plan SaaS</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Vigencia</th>
                  <th className="py-3.5 px-4">Sucursales</th>
                  <th className="py-3.5 px-4">Pedidos</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No se encontraron comercios con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const primaryDomain = t.domains.find((d: any) => d.isPrimary) || t.domains[0];
                    const planCode = t.subscription?.plan?.code || "STARTER";

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-xs">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white">{t.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">slug: {t.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          {primaryDomain ? (
                            <a
                              href={`https://${primaryDomain.hostname}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:text-orange-400 transition-colors"
                            >
                              <span>{primaryDomain.hostname}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">Sin dominio</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setSelectedTenantForPlan(t)}
                            className="hover:opacity-80 transition-opacity"
                            title="Cambiar plan"
                          >
                            {getPlanBadge(planCode)}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          <div className="font-semibold text-slate-200">
                            {t.subscription?.currentPeriodEnd
                              ? new Date(t.subscription.currentPeriodEnd).toLocaleDateString("es-AR")
                              : "Sin período"}
                          </div>
                          {t.subscription?.status === "TRIAL" && t.subscription?.trialEndsAt && (
                            <div className="text-blue-400">Prueba hasta {new Date(t.subscription.trialEndsAt).toLocaleDateString("es-AR")}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {t.locations?.length || 1} sucursal(es)
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {t._count?.orders || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedTenantForPlan(t)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-semibold text-[11px]"
                            >
                              Control
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manual Tenant Provisioning Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-white">Alta Manual de Comercio</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="mt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Beats Burgers"
                    value={formName}
                    onChange={(e) => handleSlugify(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Slug / Subdominio *</label>
                  <input
                    type="text"
                    required
                    placeholder="beats"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Plan SaaS Asignado *</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {initialPlans.filter((plan) => plan.isActive).map((plan) => (
                      <option key={plan.id} value={plan.code}>
                        {plan.code} — {plan.name} ({plan.maxLocations} suc., {plan.maxProducts} productos)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Dominio Propio (Opcional)</label>
                  <input
                    type="text"
                    placeholder="pedidos.mimarca.com"
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Usuario Administrador del Local
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Email Propietario *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@mimarca.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Nombre del Contacto</label>
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      value={formOwnerName}
                      onChange={(e) => setFormOwnerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Contraseña Inicial</label>
                    <input
                      type="text"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Nombre Sucursal Principal</label>
                    <input
                      type="text"
                      value={formLocationName}
                      onChange={(e) => setFormLocationName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear y Provisionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPlanManagementOpen && (
        <PlanManagementModal
          plans={initialPlans}
          onClose={() => setIsPlanManagementOpen(false)}
          onSaved={() => window.location.reload()}
        />
      )}

      {selectedTenantForPlan && (
        <TenantControlModal
          tenant={selectedTenantForPlan}
          plans={initialPlans}
          onClose={() => setSelectedTenantForPlan(null)}
          onSaved={() => window.location.reload()}
        />
      )}
    </div>
  );
}
