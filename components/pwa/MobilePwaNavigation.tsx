"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { House, Heart, ClipboardList, UserRound, ShoppingCart, Download, X, ChevronRight } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { customerOrderStatusLabel } from "@/lib/pwa-order-history";
import { shouldShowActiveOrderShortcut } from "@/lib/pwa-navigation";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome: string}> };
const links = [
  {href:"/",name:"Inicio",icon:House},
  {href:"/favorites",name:"Favoritos",icon:Heart},
  {href:"/profile#my-orders",name:"Pedidos",icon:ClipboardList},
  {href:"/profile",name:"Perfil",icon:UserRound},
] as const;

export function MobilePwaNavigation({
  dark = false, activeOrderId, activeOrderStatus, activeOrderNeedsDelivery = false,
}: { dark?: boolean; activeOrderId?: string | null; activeOrderStatus?: string | null; activeOrderNeedsDelivery?: boolean }) {
  const path = usePathname();
  const items = useCartStore(s => s.items);
  const count = items.reduce((sum,item)=>sum+item.quantity,0);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hash, setHash] = useState("");
  const activeOrderLabel = activeOrderStatus
    ? customerOrderStatusLabel(activeOrderStatus, activeOrderNeedsDelivery)
    : "Pedido en curso";

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const handleInstalled = () => { setInstalled(true); setInstall(null); };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [path]);

  return (
    <>
      {activeOrderId && shouldShowActiveOrderShortcut(path) && (
        <Link href={`/track/${activeOrderId}`}
          className={`fixed bottom-[calc(4.3rem+env(safe-area-inset-bottom))] left-3 right-3 z-[65] mx-auto flex max-w-xs items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black shadow-xl sm:hidden ${
            dark ? "border-orange-500/40 bg-[#281b32] text-orange-200" : "border-orange-300 bg-orange-50 text-orange-900"
          }`}>
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true"/>
          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="block truncate text-[11px] font-black">{activeOrderLabel}</span>
            <span className="block text-[10px] font-semibold opacity-80">Ver seguimiento del pedido</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true"/>
        </Link>
      )}
      {install && !installed && !dismissed && !activeOrderId && path === "/" && (
        <aside className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto flex max-w-sm items-center gap-2 rounded-2xl border p-3 shadow-xl sm:hidden ${
          dark ? "border-orange-500/40 bg-[#24172c] text-white" : "border-orange-200 bg-white text-slate-900"
        }`}>
          <Download className="h-5 w-5 shrink-0 text-orange-500"/>
          <span className="min-w-0 flex-1 text-xs font-semibold">Instalá la tienda para pedir más rápido.</span>
          <button type="button" onClick={async () => {
            try { await install.prompt(); await install.userChoice; } catch {}
            setInstall(null);
          }} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-black text-white">Instalar</button>
          <button type="button" aria-label="Cerrar invitación" onClick={() => setDismissed(true)}
            className="p-1"><X className="h-4 w-4"/></button>
        </aside>
      )}
      <nav aria-label="Navegación principal de la tienda"
        className={`onlyfood-mobile-navigation fixed inset-x-0 bottom-0 z-[70] border-t px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(0,0,0,.12)] backdrop-blur-xl sm:hidden ${
          dark ? "border-white/10 bg-[#17101e]/95 text-slate-300" : "border-slate-200 bg-white/95 text-slate-600"
        }`}>
        <div className="mx-auto flex h-[62px] max-w-lg items-stretch justify-around">
          {links.map(item => {
            const Icon = item.icon;
            const active = item.href === "/" ? path === "/" :
              item.href === "/profile#my-orders" ? path === "/profile" && hash === "#my-orders" :
              item.href === "/profile" ? path === "/profile" && hash !== "#my-orders" :
              path.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold focus-visible:outline-2 focus-visible:outline-orange-500 ${
                  active ? "text-orange-500" : ""
                }`}>
                <Icon className="h-5 w-5" aria-hidden="true"/>{item.name}
              </Link>
            );
          })}
          <Link href="/cart" aria-label={`Carrito, ${count} productos`}
            aria-current={path.startsWith("/cart") || path.startsWith("/checkout") ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold text-orange-500">
            <span className="relative">
              <ShoppingCart className="h-5 w-5"/>
              {count>0 && <span className="absolute -right-3 -top-2 rounded-full bg-orange-600 px-1 text-[9px] text-white">
                {count>99?"99+":count}
              </span>}
            </span>
            Carrito
          </Link>
        </div>
      </nav>
    </>
  );
}
