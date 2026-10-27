'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  History,
  MessageSquareHeart,
  WalletCards,
  ShoppingBag,
  BadgePercent,
  Image as ImageIcon,
  TrendingUp,
  Gift,
  Dices,
  Users,
  Sparkles,
  BookOpenCheck,
  Settings,
  ShieldOff,
  DollarSign,
  RefreshCw,
  Loader2,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  LogOut,
  UtensilsCrossed,
  Menu,
} from 'lucide-react';
import { logoutAdmin } from '@/app/actions/admin-auth';
import { PaletteSelector } from './PaletteSelector';
import { useERPTheme } from './ThemeContext';
import { ClientResetNotificationBell } from '@/components/admin/ClientResetNotificationBell';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import './nanolabs-theme.css';
import './nanolabs-theme-extra.css';

const CLAVE_PLEGADO = 'nl-sidebar-plegado';
const PLEGADO_W = 76;

function iniciales(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OF'
  );
}

export interface AdminRouteItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  feature?: string;
}

export const ADMIN_ROUTES: AdminRouteItem[] = [
  { name: 'Pedidos Hoy', href: '/admin/live', icon: LayoutDashboard, feature: 'orders' },
  { name: 'Agenda / Calendario', href: '/admin/calendar', icon: CalendarDays, feature: 'orders' },
  { name: 'Historial', href: '/admin/history', icon: History, feature: 'orders' },
  { name: 'Valoraciones', href: '/admin/reviews', icon: MessageSquareHeart, feature: 'orders' },
  { name: 'Caja diaria', href: '/admin/cash', icon: WalletCards, feature: 'cashRegister' },
  { name: 'Catálogo', href: '/admin/catalog', icon: ShoppingBag, feature: 'orders' },
  { name: 'Promociones', href: '/admin/promotions', icon: BadgePercent, feature: 'quantityDiscounts' },
  { name: 'Galería de Medios', href: '/admin/media', icon: ImageIcon, feature: 'orders' },
  { name: 'Métricas', href: '/admin/metricas', icon: TrendingUp, feature: 'advancedReports' },
  { name: 'Canje de Puntos', href: '/admin/rewards', icon: Gift, feature: 'loyalty' },
  { name: 'Ruleta de Premios', href: '/admin/games', icon: Dices, feature: 'roulette' },
  { name: 'Clientes y cuentas', href: '/admin/users', icon: Users },
  { name: 'Puesta en Marcha', href: '/admin/wizard', icon: Sparkles },
  { name: 'Guías', href: '/admin/guides', icon: BookOpenCheck },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export interface LayoutNanoLabsProps {
  tenantName?: string;
  tenantLogo?: string | null;
  userName?: string;
  userEmail?: string;
  currentRole?: string;
  enabledFeatures?: string[];
  onSwitchTheme?: (theme: '1' | '2') => void;
  children: ReactNode;
}

export function LayoutNanoLabs({
  tenantName = 'OnlyFood',
  userName = 'Administrador',
  userEmail = '',
  currentRole = 'ADMIN',
  enabledFeatures = [],
  onSwitchTheme,
  children,
}: LayoutNanoLabsProps) {
  const pathname = usePathname();
  const { palette, isDark, toggleDarkMode } = useERPTheme();
  const [plegado, setPlegado] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{ texto: string; top: number } | null>(null);

  // Live Dólar Quotation
  const [dolarCotiz, setDolarCotiz] = useState<number | null>(null);
  const [isSyncingDolar, setIsSyncingDolar] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlegado(localStorage.getItem(CLAVE_PLEGADO) === '1');

    // Fetch live dollar quotation
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue');
        if (res.ok) {
          const data = await res.json();
          if (data && data.venta) {
            setDolarCotiz(data.venta);
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener cotización del dólar', err);
      }
    };
    fetchDolar();
  }, []);

  const togglePlegado = () => {
    setPlegado((prev) => {
      const next = !prev;
      localStorage.setItem(CLAVE_PLEGADO, next ? '1' : '0');
      return next;
    });
  };

  const handleSyncDolar = async () => {
    setIsSyncingDolar(true);
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/blue');
      if (res.ok) {
        const data = await res.json();
        if (data && data.venta) {
          setDolarCotiz(data.venta);
        }
      }
    } catch (err) {
      console.warn('Error sincronizando cotización', err);
    } finally {
      setIsSyncingDolar(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    window.location.reload();
  };

  const visibleItems = ADMIN_ROUTES.filter(
    (item) => !item.feature || enabledFeatures.includes(item.feature)
  );

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // El ticket térmico debe renderizarse limpio sin sidebar ni header
  if (pathname.startsWith('/admin/live/print/')) {
    return <>{children}</>;
  }

  // Comprobar si la ruta actual está deshabilitada para este tenant
  const currentRoute = ADMIN_ROUTES.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`)
  );
  const isBlocked = currentRoute?.feature && !enabledFeatures.includes(currentRoute.feature);

  const mainContent = isBlocked ? (
    <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
        <ShieldOff className="size-7" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Módulo desactivado</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {currentRoute.name} no está habilitado para este comercio. El acceso y sus operaciones están bloqueados hasta que el SuperAdmin lo active.
      </p>
      <Link
        href="/admin/settings"
        className="mt-6 inline-flex rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
      >
        Ir a configuración
      </Link>
    </div>
  ) : (
    children
  );

  return (
    <div className="bh-layout theme-nanolabs" data-nl-theme="2">
      {/* HEADER 80px */}
      <header className="bh-header bh-header--retail">
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="shrink-0" />}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-none bg-slate-900 p-0 text-white" showCloseButton={false}>
                <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4 text-xl font-black">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ background: palette.gradient }}
                  >
                    <UtensilsCrossed size={16} />
                  </div>
                  <span>{tenantName}</span>
                </div>
                <nav className="flex flex-1 flex-col p-4 space-y-1 overflow-y-auto">
                  {visibleItems.map((route) => {
                    const active = isActive(route.href);
                    const Icon = route.icon;
                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={`flex h-10 items-center gap-3 rounded-xl px-3 transition-all ${
                          active
                            ? 'bg-white text-slate-950 font-bold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-sm truncate">{route.name}</span>
                      </Link>
                    );
                  })}
                  <div className="mt-auto border-t border-slate-800 pt-4">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-bold transition-colors cursor-pointer"
                    >
                      <LogOut size={18} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/admin/live" className="bh-logo" style={{ textDecoration: 'none' }}>
            <div className="bh-logo__mark">
              <span
                className="ot-mark nl-mark"
                style={{
                  background: palette.gradient,
                  boxShadow: `0 4px 14px ${palette.glow}`,
                }}
              >
                <UtensilsCrossed size={22} strokeWidth={2.2} />
              </span>
            </div>
            <div className="bh-logo__text">
              {tenantName}
              <span>NanoLabs Food & SaaS Cloud</span>
            </div>
          </Link>
        </div>

        <div className="bh-header__actions">
          {/* Live Dólar Quotation Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
            <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Dólar Blue</span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {dolarCotiz ? `$ ${dolarCotiz.toLocaleString('es-AR')}` : '---'}
            </span>
            <button
              type="button"
              onClick={handleSyncDolar}
              disabled={isSyncingDolar}
              title="Actualizar cotización"
              className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSyncingDolar ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : <RefreshCw size={13} />}
            </button>
          </div>

          {/* Color Palette Selector */}
          <PaletteSelector />

          {/* Theme Switcher Button */}
          {onSwitchTheme && (
            <button
              type="button"
              onClick={() => onSwitchTheme('1')}
              className="bh-btn bh-btn-secondary bh-btn--small flex items-center gap-2 font-bold cursor-pointer"
              title="Estás en Tema 2 (NanoLabs Visual). Clic para volver a Tema 1 (Clásico)"
            >
              <Palette size={14} className="text-amber-500 shrink-0" />
              <span className="hidden md:inline text-xs">Tema 2</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold uppercase tracking-wider">
                Volver a Tema 1
              </span>
            </button>
          )}

          {/* Password Reset Requests Bell */}
          <ClientResetNotificationBell />

          {/* User info */}
          <div className="ot-usuario" title={userEmail}>
            <div className="bh-list-primary font-bold">{userName}</div>
            <div className="bh-list-secondary text-xs uppercase tracking-wider font-semibold opacity-75">
              {currentRole}
            </div>
          </div>

          {/* Avatar initials */}
          <div className="bh-avatar" title={userName}>
            {iniciales(userName)}
          </div>

          {/* Logout button */}
          <button
            type="button"
            className="bh-header__icon-btn text-red-500 hover:text-red-700 cursor-pointer"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* BODY WITH COLLAPSIBLE SIDEBAR */}
      <div className="bh-layout__body">
        <aside
          className={`bh-sidebar${plegado ? ' bh-sidebar--collapsed' : ''}`}
          aria-label="Pantallas"
          style={plegado ? { ['--bh-sidebar-width' as string]: `${PLEGADO_W}px` } : undefined}
        >
          <div className="flex-1 overflow-y-auto space-y-1">
            {visibleItems.map(({ href, name, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={name}
                  className={`bh-sidebar__item${active ? ' active' : ''}${plegado ? ' bh-sidebar__item--collapsed' : ''}`}
                  onMouseEnter={(e) => {
                    if (!plegado) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setTooltip({ texto: name, top: r.top + r.height / 2 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="bh-sidebar__icon-chip">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  {!plegado && <span className="truncate">{name}</span>}
                </Link>
              );
            })}
          </div>

          {/* SIDEBAR FOOTER: THEME (LIGHT/DARK) + COLLAPSE */}
          <div className={`bh-sidebar__footer${plegado ? ' bh-sidebar__footer--collapsed' : ''}`}>
            <button
              type="button"
              className="bh-sidebar__icon-btn cursor-pointer"
              onClick={toggleDarkMode}
              aria-label="Cambiar tema claro u oscuro"
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="bh-sidebar__icon-btn bh-sidebar__desktop-only cursor-pointer"
              onClick={togglePlegado}
              aria-label={plegado ? 'Expandir menú' : 'Plegar menú'}
              title={plegado ? 'Expandir menú' : 'Plegar menú'}
            >
              {plegado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="bh-main bh-cascada ot-pagina min-w-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {mainContent}
        </main>
      </div>

      {/* PORTAL TOOLTIP WHEN SIDEBAR IS COLLAPSED */}
      {mounted &&
        tooltip &&
        createPortal(
          <span
            className="bh-sidebar__tooltip ot-tooltip"
            style={{ top: tooltip.top, left: PLEGADO_W + 10, zIndex: 1000 }}
          >
            {tooltip.texto}
          </span>,
          document.body
        )}
    </div>
  );
}
