"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, Settings2, ShieldCheck, X } from "lucide-react";
import {
  createPlanAction,
  updatePlanAction,
  updateTenantFeatureOverrideAction,
  updateTenantSubscriptionAction,
} from "@/app/actions/superadmin";
import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/feature-catalog";

const SUBSCRIPTION_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const;
type FeatureState = "INHERIT" | "ENABLED" | "DISABLED";

function toDateTimeLocal(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500";

export function PlanManagementModal({ plans, onClose, onSaved }: { plans: any[]; onClose: () => void; onSaved: () => void }) {
  const [selectedId, setSelectedId] = useState(plans[0]?.id || "");
  const selected = plans.find((plan) => plan.id === selectedId) || plans[0];
  const [draft, setDraft] = useState<any>(selected ? { ...selected, features: Array.isArray(selected.features) ? selected.features : [] } : null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const choosePlan = (plan: any) => {
    setSelectedId(plan.id);
    setDraft({ ...plan, features: Array.isArray(plan.features) ? plan.features : [] });
    setMessage(null);
  };

  const startNewPlan = () => {
    setSelectedId("");
    setDraft({ id: null, code: "", name: "", priceMonthly: 0, maxLocations: 1, maxProducts: 50, features: ["orders"], isActive: true, _count: { subscriptions: 0 } });
    setMessage(null);
  };

  const toggleFeature = (feature: FeatureKey) => {
    setDraft((current: any) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item: string) => item !== feature)
        : [...current.features, feature],
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      name: draft.name,
      priceMonthly: Number(draft.priceMonthly),
      maxLocations: Number(draft.maxLocations),
      maxProducts: Number(draft.maxProducts),
      features: draft.features,
      isActive: Boolean(draft.isActive),
    };
    const result = draft.id
      ? await updatePlanAction({ id: draft.id, ...payload })
      : await createPlanAction({ code: draft.code, ...payload });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo guardar.");
    onSaved();
  };

  if (!draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur">
          <div><h2 className="text-xl font-black text-white">Gestión de planes</h2><p className="text-xs text-slate-400">Los cambios afectan inmediatamente a los comercios que heredan el plan.</p></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="size-5" /></button>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            <button onClick={startNewPlan} className="w-full rounded-2xl border border-dashed border-orange-500/60 bg-orange-500/5 p-3 text-sm font-black text-orange-300 hover:bg-orange-500/10">+ Crear nuevo plan</button>
            {plans.map((plan) => (
              <button key={plan.id} onClick={() => choosePlan(plan)} className={`w-full rounded-2xl border p-4 text-left ${plan.id === draft.id ? "border-orange-500 bg-orange-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-700"}`}>
                <div className="flex items-center justify-between"><span className="font-black text-white">{plan.code}</span><span className={`size-2 rounded-full ${plan.isActive ? "bg-emerald-400" : "bg-slate-600"}`} /></div>
                <p className="mt-1 text-sm text-slate-300">{plan.name}</p>
                <p className="mt-2 text-xs text-slate-500">{plan._count?.subscriptions || 0} suscripciones</p>
              </button>
            ))}
          </div>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-400">Código<input value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} className={`${fieldClass} mt-1 ${draft.id ? "opacity-60" : ""}`} /></label>
              <label className="text-xs font-bold text-slate-400">Nombre<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Precio mensual<input type="number" min="0" value={draft.priceMonthly} onChange={(e) => setDraft({ ...draft, priceMonthly: e.target.value })} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Máximo de sucursales<input type="number" min="1" value={draft.maxLocations} onChange={(e) => setDraft({ ...draft, maxLocations: e.target.value })} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Máximo de productos<input type="number" min="1" value={draft.maxProducts} onChange={(e) => setDraft({ ...draft, maxProducts: e.target.value })} className={`${fieldClass} mt-1`} /></label>
              <label className="flex items-center gap-3 self-end rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm font-bold text-white"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="size-4 accent-orange-500" />Plan disponible</label>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-white">Opciones incluidas</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {FEATURE_KEYS.map((feature) => (
                  <label key={feature} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${draft.features.includes(feature) ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950 text-slate-400"}`}>
                    <input type="checkbox" checked={draft.features.includes(feature)} onChange={() => toggleFeature(feature)} className="size-4 accent-emerald-500" />
                    <span><strong className="block">{FEATURE_LABELS[feature]}</strong><small className="font-mono opacity-60">{feature}</small></span>
                  </label>
                ))}
              </div>
            </div>
            {message && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{message}</p>}
            <div className="flex justify-end"><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{draft.id ? "Guardar plan" : "Crear plan"}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TenantControlModal({ tenant, plans, onClose, onSaved }: { tenant: any; plans: any[]; onClose: () => void; onSaved: () => void }) {
  const subscription = tenant.subscription;
  const [planId, setPlanId] = useState(subscription?.planId || plans[0]?.id || "");
  const [status, setStatus] = useState(subscription?.status || tenant.status || "ACTIVE");
  const [trialEndsAt, setTrialEndsAt] = useState(toDateTimeLocal(subscription?.trialEndsAt));
  const [periodStart, setPeriodStart] = useState(toDateTimeLocal(subscription?.currentPeriodStart));
  const [periodEnd, setPeriodEnd] = useState(toDateTimeLocal(subscription?.currentPeriodEnd));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const planFeatures = useMemo(() => new Set(Array.isArray(selectedPlan?.features) ? selectedPlan.features : []), [selectedPlan]);

  const overrideFor = (feature: FeatureKey): FeatureState => {
    const override = tenant.features?.find((item: any) => item.featureKey === feature);
    return override ? (override.isEnabled ? "ENABLED" : "DISABLED") : "INHERIT";
  };

  const saveSubscription = async () => {
    setSaving(true);
    setMessage(null);
    const currentPeriodStart = toIso(periodStart);
    const currentPeriodEnd = toIso(periodEnd);
    const parsedTrialEnd = status === "TRIAL" && trialEndsAt ? toIso(trialEndsAt) : null;
    if (!currentPeriodStart || !currentPeriodEnd) {
      setSaving(false);
      return setMessage("Completá fechas válidas para el inicio y fin del período.");
    }
    if (new Date(currentPeriodEnd) <= new Date(currentPeriodStart)) {
      setSaving(false);
      return setMessage("La fecha de fin debe ser posterior al inicio del período.");
    }
    if (status === "TRIAL" && !parsedTrialEnd) {
      setSaving(false);
      return setMessage("Completá una fecha válida para el fin de la prueba.");
    }
    const result = await updateTenantSubscriptionAction({
      tenantId: tenant.id,
      planId,
      status,
      trialEndsAt: parsedTrialEnd,
      currentPeriodStart,
      currentPeriodEnd,
    });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo guardar.");
    onSaved();
  };

  const changeFeature = async (featureKey: FeatureKey, state: FeatureState) => {
    setSaving(true);
    setMessage(null);
    const result = await updateTenantFeatureOverrideAction({ tenantId: tenant.id, featureKey, state });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo actualizar la función.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur">
          <div><h2 className="text-xl font-black text-white">Control total: {tenant.name}</h2><p className="text-xs text-slate-400">Suscripción, vigencia y excepciones individuales.</p></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="size-5" /></button>
        </div>
        <div className="space-y-7 p-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-4 flex items-center gap-2"><Settings2 className="size-4 text-orange-400" /><h3 className="font-black text-white">Suscripción</h3></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-bold text-slate-400">Plan<select value={planId} onChange={(e) => setPlanId(e.target.value)} className={`${fieldClass} mt-1`}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.code} — {plan.name}{plan.isActive ? "" : " (inactivo)"}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className={`${fieldClass} mt-1`}>{SUBSCRIPTION_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400">Fin de prueba<input type="datetime-local" disabled={status !== "TRIAL"} value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} className={`${fieldClass} mt-1 disabled:opacity-40`} /></label>
              <label className="text-xs font-bold text-slate-400">Inicio del período<input type="datetime-local" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Fin del período<input type="datetime-local" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <div className="flex items-end"><button disabled={saving || !periodStart || !periodEnd} onClick={saveSubscription} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Guardar suscripción</button></div>
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-400" /><h3 className="font-black text-white">Opciones y excepciones</h3></div>
            <p className="mb-4 text-xs text-slate-400">“Heredar” sigue el plan. Una excepción permite habilitar o bloquear una función solo para este comercio.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURE_KEYS.map((feature) => {
                const inherited = planFeatures.has(feature);
                return <div key={feature} className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><div className="mb-2 flex items-center justify-between gap-2"><div><strong className="text-sm text-white">{FEATURE_LABELS[feature]}</strong><p className="text-[11px] text-slate-500">Plan: {inherited ? "habilitada" : "deshabilitada"}</p></div><span className={`size-2 rounded-full ${inherited ? "bg-emerald-400" : "bg-slate-600"}`} /></div><select defaultValue={overrideFor(feature)} disabled={saving} onChange={(e) => changeFeature(feature, e.target.value as FeatureState)} className={fieldClass}><option value="INHERIT">Heredar del plan</option><option value="ENABLED">Forzar habilitada</option><option value="DISABLED">Forzar deshabilitada</option></select></div>;
              })}
            </div>
          </section>
          {message && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{message}</p>}
        </div>
      </div>
    </div>
  );
}
