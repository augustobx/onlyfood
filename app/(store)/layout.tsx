import { Navbar } from "@/components/Navbar";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { publicConfigSelect } from "@/lib/public-config";
import type { Metadata } from "next";
import { buildTenantMetadata } from "@/lib/tenant-branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantContext();
  const branding = await createTenantDb(tenant.id).systemConfig.findFirst({
    select: { appName: true, logoUrl: true },
  });
  return buildTenantMetadata(tenant, undefined, branding);
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenantContext();

  // FASE 8: Verificación estricta de estado de suscripción del Tenant
  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELED") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{tenant.name || "Comercio"}</h1>
          <p className="text-sm text-slate-400">
            Esta tienda se encuentra temporalmente inactiva por administración. Por favor comunicate con el comercio para más información.
          </p>
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 font-medium">
            NanoLabs OnlyFood SaaS Platform
          </div>
        </div>
      </div>
    );
  }

  const db = createTenantDb(tenant.id);
  const config = await db.systemConfig.findFirst({ select: publicConfigSelect });
  
  const primary = config?.primaryColor || '#f97316';
  const secondary = config?.secondaryColor || '#9333ea';
  const theme = config?.storeTheme || "URBAN_DARK";
  const isNexo = theme === "NEXO";
  const isUrbanDark = theme === "URBAN_DARK";
  const isCleanBoutique = theme === "CLEAN_BOUTIQUE";
  const isFastNeo = theme === "FAST_NEO";
  const isFreshMarket = theme === "FRESH_MARKET";
  const isRetroDiner = theme === "RETRO_DINER";

  const themeBgClass = isFreshMarket
    ? "bg-[#f4f0e6] text-[#173b2c]"
    : isRetroDiner
    ? "bg-[#f8d84a] text-[#251a32]"
    : isUrbanDark
    ? "bg-[#080a0f] text-white"
    : isCleanBoutique
    ? "bg-[#f6f3ee] text-stone-900"
    : isFastNeo
    ? "bg-slate-50 text-slate-900"
    : isNexo
    ? "theme-nexo bg-neutral-50"
    : "theme-original bg-neutral-50";

  return (
    <div
      className={`store-shell flex flex-col min-h-screen relative ${themeBgClass}`}
      data-store-theme={theme.toLowerCase()}
    >
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --brand-primary: ${primary};
          --brand-secondary: ${secondary};
        }
        
        /* Overrides for Primary */
        .bg-orange-50 { background-color: color-mix(in srgb, var(--brand-primary) 10%, white) !important; }
        .bg-orange-100 { background-color: color-mix(in srgb, var(--brand-primary) 20%, white) !important; }
        .bg-orange-500, .bg-orange-600, .hover\\:bg-orange-600:hover { background-color: var(--brand-primary) !important; }
        .text-orange-500, .text-orange-600 { color: var(--brand-primary) !important; }
        .border-orange-200, .border-orange-300, .border-orange-500 { border-color: var(--brand-primary) !important; }
        .ring-orange-500 { --tw-ring-color: var(--brand-primary) !important; }
        .shadow-orange-500\\/20, .shadow-orange-500\\/30, .shadow-[0_0_100px_rgba(249,115,22,0.4)] { 
            box-shadow: 0 10px 15px -3px color-mix(in srgb, var(--brand-primary) 30%, transparent) !important; 
        }

        /* Overrides for Secondary */
        .bg-purple-50 { background-color: color-mix(in srgb, var(--brand-secondary) 10%, white) !important; }
        .bg-purple-100 { background-color: color-mix(in srgb, var(--brand-secondary) 20%, white) !important; }
        .bg-purple-600, .bg-purple-700, .hover\\:bg-purple-700:hover { background-color: var(--brand-secondary) !important; }
        .text-purple-600, .text-purple-700, .text-purple-800 { color: var(--brand-secondary) !important; }
        .border-purple-200, .border-purple-400 { border-color: var(--brand-secondary) !important; }
        .ring-purple-600 { --tw-ring-color: var(--brand-secondary) !important; }
        
        .bg-brand-primary { background-color: var(--brand-primary) !important; }
      `}} />
      
      {/* Background with optional blur */}
      {config?.backgroundUrl && (
         <div className="fixed inset-0 z-[-1] pointer-events-none">
            <img src={config.backgroundUrl} alt="bg" className={`w-full h-full object-cover ${config.backgroundBlur ? 'blur-md backdrop-blur-md opacity-80' : 'opacity-100'}`} />
         </div>
      )}
      
      <Navbar config={config} />
      <main className="store-main flex-1 w-full">
        {children}
      </main>
      <footer
        className={`store-footer w-full py-6 mt-12 border-t ${
          isUrbanDark
            ? "bg-[#060810] text-slate-600 border-slate-800/50"
            : isCleanBoutique
            ? "bg-[#f0ede6] text-stone-500 border-stone-300/50"
            : isFastNeo
            ? "bg-white text-slate-400 border-slate-200"
            : "bg-white text-muted-foreground border-slate-200"
        }`}
      >
        <div className="container max-w-7xl mx-auto px-4 text-center text-xs font-bold">
          <p>&copy; {new Date().getFullYear()} {tenant.name || config?.appName || 'OnlyFood'} Online. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
