"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  History,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  MessageSquareHeart,
  TrendingUp,
  Users,
  Image as ImageIcon,
  CalendarDays,
  Sparkles,
  BadgePercent,
  WalletCards,
  Dices,
  BookOpenCheck,
  ShieldOff,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "./LogoutButton";
import { ClientResetNotificationBell } from "@/components/admin/ClientResetNotificationBell";
import { LayoutNanoLabs } from "@/components/nanolabs-visual/LayoutNanoLabs";
import { useERPTheme } from "@/components/nanolabs-visual/ThemeContext";

const routes = [
  { name: "Pedidos Hoy", href: "/admin/live", icon: LayoutDashboard, feature: "orders" },
  { name: "Agenda / Calendario", href: "/admin/calendar", icon: CalendarDays, feature: "orders" },
  { name: "Historial", href: "/admin/history", icon: History, feature: "orders" },
  { name: "Valoraciones", href: "/admin/reviews", icon: MessageSquareHeart, feature: "orders" },
  { name: "Caja diaria", href: "/admin/cash", icon: WalletCards, feature: "cashRegister" },
  { name: "Catálogo", href: "/admin/catalog", icon: ShoppingBag, feature: "orders" },
  { name: "Promociones", href: "/admin/promotions", icon: BadgePercent, feature: "quantityDiscounts" },
  { name: "Galería de Medios", href: "/admin/media", icon: ImageIcon, feature: "orders" },
  { name: "Métricas", href: "/admin/metricas", icon: TrendingUp, feature: "advancedReports" },
  { name: "Canje de Puntos", href: "/admin/rewards", icon: Gift, feature: "loyalty" },
  { name: "Ruleta de Premios", href: "/admin/games", icon: Dices, feature: "roulette" },
  { name: "Clientes y cuentas", href: "/admin/users", icon: Users },
  { name: "Puesta en Marcha", href: "/admin/wizard", icon: Sparkles },
  { name: "Guías", href: "/admin/guides", icon: BookOpenCheck },
  { name: "Configuración", href: "/admin/settings", icon: Settings },
];

function NavigationLinks({ compact = false, enabledFeatures = [] }: { compact?: boolean; enabledFeatures?: string[] }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {routes.filter((route) => !route.feature || enabledFeatures.includes(route.feature)).map((route) => {
        const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
        return (
          <Link
            key={route.href}
            href={route.href}
            title={compact ? route.name : undefined}
            aria-label={route.name}
            className={`flex h-10 items-center rounded-xl transition-all ${compact ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          >
            <route.icon className="h-5 w-5 shrink-0" />
            {!compact && <span className="truncate text-sm font-semibold">{route.name}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminShell({
  children,
  enabledFeatures = [],
  tenantName = "OnlyFood",
  tenantLogo = null,
  userName = "Administrador",
  currentRole = "ADMIN",
}: {
  children: React.ReactNode;
  enabledFeatures?: string[];
  tenantName?: string;
  tenantLogo?: string | null;
  userName?: string;
  currentRole?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useERPTheme();

  useEffect(() => {
    setCollapsed(localStorage.getItem("adminSidebarCollapsed") === "true");
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("adminSidebarCollapsed", String(next));
      return next;
    });
  };

  // El ticket debe ser el único contenido del documento. Mantener el panel y
  // su min-height montados genera una gran zona en blanco en rollos térmicos.
  if (pathname.startsWith("/admin/live/print/")) return <>{children}</>;

  // Si estamos en Tema 2 (NanoLabs Visual oficial), renderizamos con LayoutNanoLabs
  if (theme === "2") {
    return (
      <LayoutNanoLabs
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        userName={userName}
        currentRole={currentRole}
        enabledFeatures={enabledFeatures}
        onSwitchTheme={setTheme}
      >
        {children}
      </LayoutNanoLabs>
    );
  }

  // Tema 1 (Clásico): Se mantiene accesible para pruebas de compatibilidad
  const currentRoute = routes.find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`));
  const blockedRoute = currentRoute?.feature && !enabledFeatures.includes(currentRoute.feature);
  const pageContent = blockedRoute ? (
    <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <ShieldOff className="size-7" />
      </div>
      <h1 className="text-2xl font-black text-slate-900">Módulo desactivado</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {currentRoute.name} no está habilitado para este comercio. El acceso y sus operaciones están bloqueados hasta que el SuperAdmin lo active.
      </p>
      <Link href="/admin/settings" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
        Ir a configuración
      </Link>
    </div>
  ) : children;

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className={`relative hidden shrink-0 flex-col bg-slate-900 text-white transition-[width] duration-300 md:flex ${collapsed ? "w-20" : "w-64"}`}>
        <div className={`flex h-16 items-center border-b border-slate-800 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          <Link href="/admin/live" className="overflow-hidden whitespace-nowrap text-lg font-black tracking-tight" title="OnlyFood Admin">
            {collapsed ? "OF" : tenantName || "OnlyFood"}
          </Link>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Desplegar menú lateral" : "Plegar menú lateral"}
          title={collapsed ? "Desplegar menú" : "Plegar menú"}
          className="absolute -right-3 top-[4.6rem] z-20 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-transform hover:scale-105 hover:bg-slate-50 cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <nav className="flex flex-1 flex-col p-3">
          <NavigationLinks compact={collapsed} enabledFeatures={enabledFeatures} />
          <div className="mt-auto border-t border-slate-800 pt-3">
            <LogoutButton collapsed={collapsed} />
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4">
          <div className="md:hidden"><Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="shrink-0" />}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-slate-900 p-0 text-white" showCloseButton={false}>
              <div className="flex h-16 items-center border-b border-slate-800 px-4 text-xl font-black">{tenantName || "OnlyFood Admin"}</div>
              <nav className="flex flex-1 flex-col p-4">
                <NavigationLinks enabledFeatures={enabledFeatures} />
                <div className="mt-auto border-t border-slate-800 pt-4"><LogoutButton /></div>
              </nav>
            </SheetContent>
          </Sheet></div>
          <span className="font-black text-slate-900">{tenantName || "OnlyFood Admin"}</span>
          <div className="ml-auto flex items-center gap-3">
            {/* Botón para cambiar a Tema 2 */}
            <button
              type="button"
              onClick={() => setTheme("2")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-xs font-bold text-orange-800 transition-all cursor-pointer shadow-xs"
              title="Probar nuevo diseño visual NanoLabs (Tema 2)"
            >
              <Palette className="w-3.5 h-3.5 text-orange-600" />
              <span>Tema 2 (NanoLabs)</span>
            </button>
            <ClientResetNotificationBell />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{pageContent}</main>
      </div>
    </div>
  );
}
