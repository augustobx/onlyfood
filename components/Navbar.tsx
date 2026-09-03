"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Menu, Home, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function Navbar({ config }: { config?: any }) {
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Dynamic branding
  const appName = config?.appName || 'BeatsBurgers';
  const primaryColor = config?.primaryColor || '#f97316';
  const secondaryColor = config?.secondaryColor || '#9333ea';
  const theme = config?.storeTheme;

  // URBAN_DARK, FAST_NEO y CLEAN_BOUTIQUE manejan su propia navegación
  // dentro de sus storefronts → no renderizar ningún Navbar global.
  if (["URBAN_DARK", "FAST_NEO", "CLEAN_BOUTIQUE", "FRESH_MARKET", "RETRO_DINER", "COMIC_FOOD_POP", "ARCADE_KITCHEN", "SUSHI_ZEN"].includes(theme)) {
    return null;
  }

  // NEXO NAVBAR
  if (theme === "NEXO") {
    const navItems = [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/profile", label: "Mis pedidos", icon: UserRound },
    ];
    return (
      <>
        <nav className="nexo-nav sticky top-0 z-50 w-full">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 md:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              {config?.logoUrl && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  <img src={config.logoUrl} alt={appName} className="h-full w-full object-cover" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-lg font-black tracking-[-0.04em] text-slate-950">{appName}</span>
                <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${config?.isStoreOpen === false ? "text-rose-600" : "text-emerald-600"}`}><i className={`h-1.5 w-1.5 rounded-full ${config?.isStoreOpen === false ? "bg-rose-500" : "bg-emerald-500"}`} /> {config?.isStoreOpen === false ? "Cerrado ahora" : "Abierto ahora"}</span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm md:flex">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${pathname === item.href ? "bg-slate-950 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}>
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
            </div>

            <Link href="/cart" aria-label="Abrir carrito" className="relative flex h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-white shadow-lg transition-transform hover:scale-[1.03]">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden text-sm font-extrabold sm:inline">Carrito</span>
              {totalItems > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black text-slate-950" style={{ backgroundColor: primaryColor }}>{totalItems}</span>}
            </Link>
          </div>
        </nav>

        <nav className="nexo-mobile-dock fixed bottom-3 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-[1.4rem] border border-white/50 bg-slate-950/95 p-1.5 text-white shadow-2xl backdrop-blur-xl md:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex min-w-[76px] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[10px] font-bold ${pathname === item.href ? "bg-white text-slate-950" : "text-slate-300"}`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
          <Link href="/cart" className={`relative flex min-w-[76px] flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[10px] font-bold ${pathname === "/cart" ? "bg-white text-slate-950" : "text-slate-300"}`}>
            <ShoppingCart className="h-4 w-4" /> Carrito
            {totalItems > 0 && <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] text-white">{totalItems}</span>}
          </Link>
        </nav>
      </>
    );
  }

  // ORIGINAL (fallback) NAVBAR
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              }
            />
            <SheetContent side="left" className="w-[85vw] max-w-sm flex flex-col p-6">
              <SheetHeader className="text-left mb-4">
                <SheetTitle className="text-2xl font-black flex items-center gap-2" style={{ color: primaryColor }}>
                  {config?.logoUrl && <img src={config.logoUrl} className="h-8 object-contain" alt={`Logo de ${appName}`} />}
                  <span>{appName}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 mt-4 flex-1">
                <Link href="/" onClick={() => setOpen(false)} className="text-lg font-bold p-4 hover:brightness-95 transition-colors rounded-2xl flex items-center gap-2" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                   🛍️ Menú de Productos
                </Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="text-lg font-bold p-4 hover:brightness-95 transition-colors rounded-2xl flex items-center gap-2" style={{ backgroundColor: `${secondaryColor}15`, color: secondaryColor }}>
                   🧾 Mis Pedidos / Puntos
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            {config?.logoUrl ? (
               <img src={config.logoUrl} alt={appName} className="max-h-8 object-contain" />
            ) : (
               <span className="font-black text-2xl tracking-tighter" style={{ color: primaryColor }}>{appName}</span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/cart">
            <Button variant="outline" size="icon" className="relative rounded-full">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 min-w-[1.25rem] h-5 py-0 flex items-center justify-center rounded-full text-xs bg-red-500">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
