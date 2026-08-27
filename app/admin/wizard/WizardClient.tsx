"use client";

import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Palette,
  Clock,
  CreditCard,
  Utensils,
  ArrowRight,
  ExternalLink,
  Store,
  BookOpenCheck,
} from "lucide-react";

interface WizardProps {
  tenant: any;
  config: any;
  productsCount: number;
}

export default function WizardClient({ tenant, config, productsCount }: WizardProps) {
  const steps = [
    {
      id: "catalog",
      title: "Configurar tus Productos",
      desc: "Revisá los precios, fotos e ingredientes de tu menú.",
      completed: productsCount > 0,
      href: "/admin/catalog",
      icon: Utensils,
    },
    {
      id: "branding",
      title: "Personalizar Marca y Colores",
      desc: "Subí tu logo, foto de portada y elegí el color de tu tienda.",
      completed: !!config?.logoUrl || !!config?.primaryColor,
      href: "/admin/settings",
      icon: Palette,
    },
    {
      id: "payments",
      title: "Medios de Pago",
      desc: "Configurá cobro en efectivo o vinculá tu Mercado Pago.",
      completed: config?.paymentCash || !!config?.mpAccessToken,
      href: "/admin/settings",
      icon: CreditCard,
    },
    {
      id: "hours",
      title: "Horarios y Cupos de Entrega",
      desc: "Establecé tus franjas horarias para delivery o retiro.",
      completed: !!config?.businessHours,
      href: "/admin/settings",
      icon: Clock,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Guía de Puesta en Marcha
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¡Bienvenido a OnlyFood, {tenant.name}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Completá estos pasos recomendados para dejar tu tienda 100% lista para vender al público.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shrink-0 text-center min-w-36">
            <div className="text-2xl font-extrabold text-orange-400">{progressPercent}%</div>
            <div className="text-xs text-slate-400 mt-0.5">{completedCount} de {steps.length} listos</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                s.completed
                  ? "bg-slate-900/40 border-slate-800/80"
                  : "bg-slate-900 border-slate-800 hover:border-orange-500/50 shadow-lg"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${s.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {s.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">Paso {idx + 1}</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <Link
                  href={s.href}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 group"
                >
                  <span>{s.completed ? "Revisar Ajustes" : "Configurar Ahora"}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Link to Storefront */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 sm:flex sm:items-center sm:justify-between">
        <div><h4 className="flex items-center gap-2 text-sm font-black text-orange-950"><BookOpenCheck className="size-5" />¿Necesitás aprender algún módulo?</h4><p className="mt-1 text-xs text-orange-900/70">El Centro de Guías explica paso a paso pedidos, caja, catálogo, promociones, clientes, puntos, ruleta e integraciones.</p></div>
        <Link href="/admin/guides" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white sm:mt-0">Ver todas las guías <ArrowRight className="size-4" /></Link>
      </div>

      {/* Direct Link to Storefront */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-white">¿Querés probar la experiencia de tus clientes?</h4>
          <p className="text-xs text-slate-400">Podés navegar tu tienda online pública en cualquier momento.</p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shrink-0"
        >
          <Store className="w-4 h-4 text-orange-400" />
          <span>Ver Mi Tienda Online</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>
    </div>
  );
}
