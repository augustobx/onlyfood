"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgePercent, Banknote, BarChart3, BookOpenCheck, CalendarDays, Check,
  CircleHelp, Clock3, CreditCard, Dices, Gift, Globe2, History, Image, ListChecks,
  MapPin, MessageCircle, Printer, Rocket, Search, Settings, ShoppingBag, Users, X,
} from "lucide-react";
import { ADMIN_GUIDES, GUIDE_CATEGORIES, type AdminGuide, type GuideCategory } from "@/lib/admin-guides";

const iconMap = {
  rocket: Rocket, orders: ListChecks, calendar: CalendarDays, history: History, cash: Banknote,
  catalog: ShoppingBag, promotion: BadgePercent, media: Image, metrics: BarChart3, clients: Users,
  rewards: Gift, roulette: Dices, settings: Settings, payment: CreditCard, whatsapp: MessageCircle,
  printer: Printer, locations: MapPin, domain: Globe2,
};

export default function GuidesClient({
  tenantId,
  tenantName,
  enabledFeatures,
  guides = ADMIN_GUIDES,
}: {
  tenantId: string;
  tenantName: string;
  enabledFeatures: string[];
  guides?: AdminGuide[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<GuideCategory | "Todas">("Todas");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const storageKey = `onlyfoodGuidesCompleted:${tenantId}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored)) setCompleted(new Set(stored.filter((id): id is string => typeof id === "string")));
    } catch {
      setCompleted(new Set());
    }
  }, [storageKey]);

  const isAvailable = (guide: AdminGuide) => !guide.feature || enabledFeatures.includes(guide.feature);
  const availableGuides = guides.filter(isAvailable);
  const completedAvailable = availableGuides.filter((guide) => completed.has(guide.id)).length;
  const progress = availableGuides.length ? Math.round((completedAvailable / availableGuides.length) * 100) : 0;

  const filteredGuides = (() => {
    const needle = search.trim().toLowerCase();
    return guides.filter((guide) => {
      if (category !== "Todas" && guide.category !== category) return false;
      if (availableOnly && !isAvailable(guide)) return false;
      if (!needle) return true;
      return [guide.title, guide.summary, guide.purpose, guide.category, ...guide.keywords]
        .join(" ").toLowerCase().includes(needle);
    });
  })();

  const toggleCompleted = (guideId: string) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(guideId)) next.delete(guideId); else next.add(guideId);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-300"><BookOpenCheck className="size-4" />Centro de aprendizaje</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Guías de OnlyFood</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Todo lo que {tenantName} necesita para configurar, operar y aprovechar la plataforma sin depender de asistencia permanente.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-end justify-between"><span className="text-sm font-bold text-slate-300">Progreso del equipo</span><strong className="text-3xl text-orange-300">{progress}%</strong></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">{completedAvailable} de {availableGuides.length} guías disponibles marcadas como leídas en este dispositivo.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar: productos, caja, WhatsApp, puntos..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none focus:border-orange-400 focus:bg-white" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="size-4" /></button>}</label>
          <label className="flex items-center gap-2 rounded-xl border px-3 text-sm font-bold text-slate-600"><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} className="size-4 accent-orange-500" />Solo módulos disponibles</label>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["Todas", ...GUIDE_CATEGORIES] as const).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${category === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {filteredGuides.map((guide) => {
          const Icon = iconMap[guide.icon] || CircleHelp;
          const available = isAvailable(guide);
          const read = completed.has(guide.id);
          return (
            <details key={guide.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-orange-300 open:shadow-md">
              <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
                <div className="flex gap-4">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${available ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-400"}`}><Icon className="size-5" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-950">{guide.title}</h2>{read && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><Check className="size-3" />LEÍDA</span>}<span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${available ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{available ? "DISPONIBLE" : "NO INCLUIDA EN EL PLAN"}</span></div><p className="mt-1 text-sm leading-5 text-slate-500">{guide.summary}</p><div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-slate-400"><span>{guide.category}</span><span className="flex items-center gap-1"><Clock3 className="size-3" />{guide.minutes} min</span><span className="ml-auto text-orange-600 group-open:hidden">Abrir guía</span></div></div>
                </div>
              </summary>
              <div className="border-t bg-slate-50/70 p-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><strong className="text-sm text-blue-950">¿Para qué sirve?</strong><p className="mt-1 text-sm leading-6 text-blue-900/80">{guide.purpose}</p></div>
                <ol className="mt-5 space-y-4">{guide.steps.map((step, index) => <li key={step.title} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{index + 1}</span><div><strong className="text-sm text-slate-900">{step.title}</strong><p className="mt-0.5 text-sm leading-6 text-slate-600">{step.detail}</p></div></li>)}</ol>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="text-sm text-amber-950">Buenas prácticas</strong><ul className="mt-2 space-y-1 text-sm text-amber-900/80">{guide.tips.map((tip) => <li key={tip}>• {tip}</li>)}</ul></div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => toggleCompleted(guide.id)} className={`rounded-xl border px-4 py-2 text-xs font-black ${read ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-700"}`}>{read ? "Marcar como pendiente" : "Marcar como leída"}</button>{available ? <Link href={guide.href} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600">Ir al módulo <ArrowRight className="size-4" /></Link> : <span className="text-xs font-bold text-slate-500">Consultá al administrador de tu plan para habilitarlo.</span>}</div>
              </div>
            </details>
          );
        })}
      </div>

      {!filteredGuides.length && <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><CircleHelp className="mx-auto size-8 text-slate-300" /><h2 className="mt-3 font-black text-slate-700">No encontramos esa guía</h2><p className="mt-1 text-sm text-slate-500">Probá otra palabra o quitá los filtros.</p></div>}
    </div>
  );
}
