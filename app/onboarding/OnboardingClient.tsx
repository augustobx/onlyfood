"use client";

import { useState } from "react";
import { registerMerchantOnboarding, type OnboardingInput } from "@/lib/../app/actions/onboarding";
import type { PlanCode } from "@/lib/features";
import {
  Utensils,
  Store,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Rocket,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Flame,
  Pizza,
  Fish,
  Coffee,
  Salad,
  ShoppingBag,
} from "lucide-react";

const CATEGORIES = [
  { id: "BURGER", title: "Hamburguesería", icon: Flame, desc: "Smash burgers, combos y papas" },
  { id: "PIZZA", title: "Pizzería & Empanadas", icon: Pizza, desc: "Pizzas a la piedra, al molde y minutas" },
  { id: "SUSHI", title: "Sushi & Nikkei", icon: Fish, desc: "Rolls, combos y piezas premium" },
  { id: "CAFE", title: "Cafetería & Pastelería", icon: Coffee, desc: "Brunch, café de especialidad y dulces" },
  { id: "VIANDAS", title: "Viandas & Saludable", icon: Salad, desc: "Platos semanales, bowls y viandas fitness" },
  { id: "GENERAL", title: "Gastronomía General", icon: ShoppingBag, desc: "Restaurantes, bares y delivery rápido" },
];

export default function OnboardingClient() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryType, setCategoryType] = useState<OnboardingInput["categoryType"]>("BURGER");
  const [planCode, setPlanCode] = useState<PlanCode>("PRO");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Result state
  const [createdTenant, setCreatedTenant] = useState<{ id: string; slug: string; name: string } | null>(null);

  const handleNameChange = (val: string) => {
    setBusinessName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);
    setSlug(generatedSlug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await registerMerchantOnboarding({
      businessName,
      slug,
      categoryType,
      planCode,
      email,
      password,
      phone,
      locationAddress: address,
    });

    if (res.success && res.tenant) {
      setCreatedTenant(res.tenant);
      setStep(4);
    } else {
      setError(res.error || "Ocurrió un error al registrar.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">OnlyFood</span>
            <span className="text-orange-400 font-semibold text-xs ml-1">SaaS</span>
          </div>
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className={step >= 1 ? "text-orange-400 font-bold" : ""}>1. Tu Local</span>
            <span>•</span>
            <span className={step >= 2 ? "text-orange-400 font-bold" : ""}>2. Tu Plan</span>
            <span>•</span>
            <span className={step >= 3 ? "text-orange-400 font-bold" : ""}>3. Cuenta</span>
          </div>
        )}
      </header>

      {/* Main Form Container */}
      <main className="max-w-3xl mx-auto w-full my-auto py-8">
        {step === 1 && (
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Lanzamiento en 2 Minutos
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Contanos sobre tu local gastronómico
              </h2>
              <p className="text-sm text-slate-400">
                Vamos a preparar tu menú digital, avisos de pedidos por WhatsApp y delivery propio.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre de tu Comercio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Big Burger Factory"
                  value={businessName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Enlace Web de tu Menú (Slug) *
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-400 font-mono">
                  <span>https://</span>
                  <input
                    type="text"
                    required
                    placeholder="bigburger"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-transparent text-white font-bold focus:outline-none flex-1 px-1"
                  />
                  <span>.nanolabs.app</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Rubro Gastronómico
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = categoryType === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryType(cat.id as any)}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? "bg-orange-500/10 border-orange-500 text-white ring-1 ring-orange-500/50"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-orange-500 text-white" : "bg-slate-900 text-slate-400"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">{cat.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                disabled={!businessName.trim() || !slug.trim()}
                onClick={() => setStep(2)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <span>Continuar a Planes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Elegí el plan para tu negocio
              </h2>
              <p className="text-sm text-slate-400">
                Probá 14 días gratis sin comisiones por pedido. Cancelá cuando quieras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* STARTER */}
              <div
                onClick={() => setPlanCode("STARTER")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  planCode === "STARTER"
                    ? "bg-slate-950 border-orange-500 ring-2 ring-orange-500/40 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-base text-white">STARTER</div>
                  <div className="text-2xl font-extrabold text-white mt-2">$25.000 <span className="text-xs font-normal text-slate-400">/mes</span></div>
                  <div className="text-xs text-slate-400 mt-1">Ideal para 1 local</div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1 Sucursal</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Menú digital interactivo</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Mercado Pago & Efectivo</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Hoja de ruta repartidores</li>
                  </ul>
                </div>
                <div className={`mt-6 text-center py-2 rounded-xl text-xs font-bold ${planCode === "STARTER" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                  {planCode === "STARTER" ? "Seleccionado" : "Elegir Starter"}
                </div>
              </div>

              {/* PRO */}
              <div
                onClick={() => setPlanCode("PRO")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                  planCode === "PRO"
                    ? "bg-slate-950 border-orange-500 ring-2 ring-orange-500/40 text-white shadow-xl shadow-orange-500/10"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
                  Más Popular
                </div>
                <div>
                  <div className="font-bold text-base text-white">PRO</div>
                  <div className="text-2xl font-extrabold text-white mt-2">$45.000 <span className="text-xs font-normal text-slate-400">/mes</span></div>
                  <div className="text-xs text-slate-400 mt-1">Multi-sucursal & Fidelización</div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-sucursal (hasta 3)</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Puntos & Niveles (Ranking)</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Ruleta de Premios</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Impresión térmica PrintNode</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Notificaciones WebPush</li>
                  </ul>
                </div>
                <div className={`mt-6 text-center py-2 rounded-xl text-xs font-bold ${planCode === "PRO" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                  {planCode === "PRO" ? "Seleccionado" : "Elegir Pro"}
                </div>
              </div>

              {/* BUSINESS */}
              <div
                onClick={() => setPlanCode("BUSINESS")}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  planCode === "BUSINESS"
                    ? "bg-slate-950 border-purple-500 ring-2 ring-purple-500/40 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-base text-white">BUSINESS</div>
                  <div className="text-2xl font-extrabold text-white mt-2">$85.000 <span className="text-xs font-normal text-slate-400">/mes</span></div>
                  <div className="text-xs text-slate-400 mt-1">Automatización total</div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /> Sucursales ilimitadas</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /> Avisos automáticos por WhatsApp</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /> Dominio Propio SSL</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400" /> Soporte prioritario 24/7</li>
                  </ul>
                </div>
                <div className={`mt-6 text-center py-2 rounded-xl text-xs font-bold ${planCode === "BUSINESS" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"}`}>
                  {planCode === "BUSINESS" ? "Seleccionado" : "Elegir Business"}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 text-sm"
              >
                <span>Continuar a Crear Cuenta</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Creá tu cuenta de administrador
              </h2>
              <p className="text-sm text-slate-400">
                Con estos datos vas a acceder a tu panel de pedidos en vivo y catálogo.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contraseña *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+54911..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dirección del Local</label>
                  <input
                    type="text"
                    placeholder="Av. Principal 123"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Tus datos y catálogo están 100% aislados bajo tecnología multi-tenant de NanoLabs.</span>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Lanzando tu tienda...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      <span>¡Crear mi Tienda Ahora!</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 4 && createdTenant && (
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                ¡Felicitaciones! Tu tienda {createdTenant.name} ya está en vivo
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Hemos creado tu catálogo inicial y configurado tu entorno seguro. Ya podés comenzar a recibir pedidos.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto space-y-2">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tu Enlace Público:</div>
              <div className="text-sm font-bold text-orange-400 font-mono">
                {createdTenant.slug}.nanolabs.app
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <a
                href={`/admin`}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Store className="w-4 h-4" />
                <span>Ingresar a mi Panel Admin</span>
              </a>

              <a
                href={`/`}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Ver Tienda Online</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-800/60">
        NanoLabs OnlyFood SaaS Platform • Todos los derechos reservados.
      </footer>
    </div>
  );
}
