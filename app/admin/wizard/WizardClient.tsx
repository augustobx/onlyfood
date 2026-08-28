"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, ExternalLink, Rocket, Store } from "lucide-react";

type LaunchStep = { id: string; title: string; description: string; completed: boolean; href: string; action: string; external?: boolean };

export default function WizardClient({ tenantName, steps, isStoreOpen, ordersEnabled }: { tenantName: string; steps: LaunchStep[]; isStoreOpen: boolean; ordersEnabled: boolean }) {
  const completed = steps.filter((step) => step.completed).length;
  const ready = ordersEnabled && completed === steps.length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-300"><Rocket className="size-4" /> Puesta en marcha real</div><h1 className="text-3xl font-black tracking-tight">Preparar {tenantName} para vender</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Este control valida información y operaciones reales. No marca pasos por colores predeterminados ni por campos opcionales.</p></div>
          <div className="min-w-44 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-end justify-between"><span className="text-3xl font-black text-orange-400">{progress}%</span><span className="text-xs text-slate-400">{completed}/{steps.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-orange-500" style={{ width: `${progress}%` }} /></div></div>
        </div>
      </section>
      {!ordersEnabled && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">El módulo Pedidos está desactivado por el SuperAdmin. No se puede publicar una tienda operativa hasta habilitarlo.</div>}
      <section className="grid gap-4 sm:grid-cols-2">
        {steps.map((step, index) => (
          <article key={step.id} className={`rounded-2xl border p-5 ${step.completed ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-white shadow-sm"}`}>
            <div className="flex items-start justify-between gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${step.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{step.completed ? <CheckCircle2 className="size-5" /> : <CircleAlert className="size-5" />}</div><span className="text-xs font-black uppercase tracking-wider text-slate-400">Control {index + 1}</span></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">{step.title}</h2><p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-600">{step.description}</p>
            <Link href={step.href} target={step.external ? "_blank" : undefined} className="mt-5 inline-flex items-center gap-1 text-xs font-black text-orange-700">{step.completed ? "Volver a revisar" : step.action}{step.external ? <ExternalLink className="size-3.5" /> : <ArrowRight className="size-3.5" />}</Link>
          </article>
        ))}
      </section>
      <section className={`rounded-3xl border p-6 ${ready ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Store className="size-5" />{ready ? "La operación está lista" : "Todavía no está lista para publicar"}</h2><p className="mt-1 text-sm text-slate-600">{ready ? (isStoreOpen ? "Todos los controles pasaron y la tienda está abierta recibiendo pedidos." : "Todos los controles pasaron. La tienda sigue cerrada; abrila desde Pedidos Hoy cuando quieras comenzar.") : `Faltan ${steps.length - completed} controles obligatorios. Resolvelos antes de enviar el enlace a clientes.`}</p></div><Link href={ready ? "/admin/live" : "/admin/guides"} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white">{ready ? "Ir a operar" : "Consultar guías"}</Link></div>
      </section>
    </div>
  );
}
