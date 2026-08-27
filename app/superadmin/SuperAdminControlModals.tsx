"use client";

import { useMemo, useState } from "react";
import { CreditCard, KeyRound, Loader2, Save, Settings2, ShieldCheck, UserCog, X } from "lucide-react";
import {
  createPlanAction,
  updatePlanAction,
  updateTenantFeatureOverrideAction,
  updateTenantSubscriptionAction,
  updateTenantUserAccessAction,
  createSaaSPaymentAction,
  updateSaaSPaymentStatusAction,
} from "@/app/actions/superadmin";
import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/feature-catalog";

const SUBSCRIPTION_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE", "REFUNDED", "VOID"] as const;
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
  const tenantUsers = (tenant.memberships || []).filter((membership: any) => !membership.user?.isSuperAdmin);
  const [selectedUserId, setSelectedUserId] = useState(tenantUsers[0]?.userId || tenantUsers[0]?.user?.id || "");
  const initialUser = tenantUsers.find((membership: any) => (membership.userId || membership.user?.id) === selectedUserId)?.user;
  const [userEmail, setUserEmail] = useState(initialUser?.email || "");
  const [userName, setUserName] = useState(initialUser?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(String(subscription?.plan?.priceMonthly || ""));
  const [paymentStatus, setPaymentStatus] = useState<(typeof PAYMENT_STATUSES)[number]>("PAID");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFERENCIA");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDueAt, setPaymentDueAt] = useState(toDateTimeLocal(subscription?.currentPeriodEnd));
  const [paymentPaidAt, setPaymentPaidAt] = useState(toDateTimeLocal(new Date()));
  const [paymentPeriodStart, setPaymentPeriodStart] = useState(toDateTimeLocal(subscription?.currentPeriodStart));
  const [paymentPeriodEnd, setPaymentPeriodEnd] = useState(toDateTimeLocal(subscription?.currentPeriodEnd));
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

  const chooseUser = (userId: string) => {
    const user = tenantUsers.find((membership: any) => (membership.userId || membership.user?.id) === userId)?.user;
    setSelectedUserId(userId);
    setUserEmail(user?.email || "");
    setUserName(user?.name || "");
    setNewPassword("");
    setMessage(null);
  };

  const saveUserAccess = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateTenantUserAccessAction({
      tenantId: tenant.id,
      userId: selectedUserId,
      email: userEmail,
      name: userName || null,
      password: newPassword || null,
    });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo actualizar el usuario.");
    onSaved();
  };

  const registerPayment = async () => {
    setSaving(true);
    setMessage(null);
    const result = await createSaaSPaymentAction({
      tenantId: tenant.id,
      amount: Number(paymentAmount),
      currency: "ARS",
      status: paymentStatus,
      method: paymentMethod || null,
      reference: paymentReference || null,
      notes: paymentNotes || null,
      dueAt: paymentDueAt ? toIso(paymentDueAt) : null,
      paidAt: paymentStatus === "PAID" && paymentPaidAt ? toIso(paymentPaidAt) : null,
      periodStart: toIso(paymentPeriodStart),
      periodEnd: toIso(paymentPeriodEnd),
    });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo registrar el pago.");
    onSaved();
  };

  const changePaymentStatus = async (paymentId: string, nextStatus: string) => {
    setSaving(true);
    setMessage(null);
    const result = await updateSaaSPaymentStatusAction({ paymentId, status: nextStatus, paidAt: nextStatus === "PAID" ? new Date().toISOString() : null });
    setSaving(false);
    if (!result.success) return setMessage(result.error || "No se pudo actualizar el pago.");
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
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2"><UserCog className="size-4 text-blue-400" /><h3 className="font-black text-white">Acceso de usuarios del comercio</h3></div>
            <p className="mb-4 text-xs text-slate-400">Podés cambiar correo, nombre o contraseña. Al guardar se cierran todas las sesiones de ese usuario.</p>
            {tenantUsers.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-slate-400">Usuario<select value={selectedUserId} onChange={(e) => chooseUser(e.target.value)} className={`${fieldClass} mt-1`}>{tenantUsers.map((membership: any) => <option key={membership.user.id} value={membership.user.id}>{membership.role} — {membership.user.email}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400">Correo<input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Nombre<input value={userName} onChange={(e) => setUserName(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Nueva contraseña<input type="password" minLength={12} placeholder="Dejar vacía para conservar" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><button disabled={saving || !selectedUserId || !userEmail} onClick={saveUserAccess} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"><KeyRound className="size-4" />Restablecer acceso</button></div>
            </div> : <p className="text-sm text-slate-500">Este comercio todavía no tiene usuarios administradores.</p>}
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2"><CreditCard className="size-4 text-emerald-400" /><h3 className="font-black text-white">Control de pagos SaaS</h3></div>
            <p className="mb-4 text-xs text-slate-400">Historial independiente de las ventas del comercio. Un pago confirmado activa la suscripción y aplica el período indicado; un vencido la marca como pendiente.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-slate-400">Importe ARS<input type="number" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Estado<select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} className={`${fieldClass} mt-1`}>{PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400">Método<input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Referencia<input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Vencimiento<input type="datetime-local" value={paymentDueAt} onChange={(e) => setPaymentDueAt(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Fecha de pago<input type="datetime-local" disabled={paymentStatus !== "PAID"} value={paymentPaidAt} onChange={(e) => setPaymentPaidAt(e.target.value)} className={`${fieldClass} mt-1 disabled:opacity-40`} /></label>
              <label className="text-xs font-bold text-slate-400">Período desde<input type="datetime-local" value={paymentPeriodStart} onChange={(e) => setPaymentPeriodStart(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400">Período hasta<input type="datetime-local" value={paymentPeriodEnd} onChange={(e) => setPaymentPeriodEnd(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-400 sm:col-span-2 lg:col-span-3">Notas<input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className={`${fieldClass} mt-1`} /></label>
              <div className="flex items-end"><button disabled={saving || !paymentAmount || !paymentPeriodStart || !paymentPeriodEnd} onClick={registerPayment} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"><Save className="size-4" />Registrar pago</button></div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Creado</th><th className="p-3">Período</th><th className="p-3">Importe</th><th className="p-3">Método / referencia</th><th className="p-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-800">{(subscription?.payments || []).map((payment: any) => <tr key={payment.id} className="text-slate-300"><td className="p-3">{new Date(payment.createdAt).toLocaleDateString("es-AR")}</td><td className="p-3">{new Date(payment.periodStart).toLocaleDateString("es-AR")} — {new Date(payment.periodEnd).toLocaleDateString("es-AR")}</td><td className="p-3 font-black text-white">${payment.amount.toLocaleString("es-AR")} {payment.currency}</td><td className="p-3">{payment.method || "—"}<span className="block text-slate-500">{payment.reference || "Sin referencia"}</span></td><td className="p-3"><select value={payment.status} disabled={saving} onChange={(e) => changePaymentStatus(payment.id, e.target.value)} className={fieldClass}>{PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></td></tr>)}{!(subscription?.payments || []).length && <tr><td colSpan={5} className="p-5 text-center text-slate-500">Todavía no hay pagos registrados.</td></tr>}</tbody></table>
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
