"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ArrowRight, ShieldCheck, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { readGuestOrders, removeGuestOrder, guestTrackingHref, type GuestOrderLink } from "@/lib/guest-checkout";

export function GuestOrdersClient({ tenantId, isAuthenticated }: { tenantId: string; isAuthenticated: boolean }) {
  const [orders, setOrders] = useState<GuestOrderLink[]>([]);
  useEffect(() => {
    try { setOrders(readGuestOrders(sessionStorage, tenantId)); }
    catch { setOrders([]); }
  }, [tenantId]);

  const forget = (orderId: string) => {
    try {
      setOrders(removeGuestOrder(sessionStorage, tenantId, orderId));
      window.dispatchEvent(new Event("onlyfood:guest-order-changed"));
    } catch { toast.error("No se pudo quitar el enlace en este dispositivo."); }
  };

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8 space-y-5">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500"><ClipboardList className="h-4 w-4"/> Compra sin cuenta</span>
        <h1 className="text-3xl font-black">Mis pedidos de invitado</h1>
        <p className="text-sm opacity-75">Consultá tus pedidos sin ingresar ni registrarte. Estos accesos se conservan únicamente en esta sesión del navegador.</p>
      </header>
      {orders.length ? (
        <div className="space-y-3">
          {orders.map(order => (
            <article key={order.orderId} className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-base">Pedido #{order.orderId.slice(-6).toUpperCase()}</p>
                  <p className="mt-1 text-xs text-slate-500">Realizado el {new Date(order.createdAt).toLocaleString("es-AR", {dateStyle:"medium",timeStyle:"short"})}</p>
                  <p className="text-xs text-slate-600 mt-1">Pago: {order.paymentMethod === "TRANSFER" ? "Transferencia" : order.paymentMethod === "MP" ? "Mercado Pago" : "Efectivo"}</p>
                </div>
                <button type="button" onClick={() => forget(order.orderId)} aria-label="Quitar enlace de esta sesión"
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-rose-600"><Trash2 className="h-4 w-4"/></button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link href={guestTrackingHref(order)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white">
                  Ver estado <ArrowRight className="h-4 w-4"/>
                </Link>
                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(window.location.origin + guestTrackingHref(order)); toast.success("Enlace privado copiado"); }
                    catch { toast.error("No se pudo copiar el enlace."); }
                  }}>
                  <Copy className="h-4 w-4"/> Copiar enlace
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-7 text-center text-slate-900 space-y-3">
          <ClipboardList className="mx-auto h-11 w-11 text-orange-500"/>
          <h2 className="text-lg font-black">Todavía no hay pedidos guardados en esta sesión</h2>
          <p className="text-sm text-slate-600">Después de confirmar una compra sin cuenta, vas a encontrar acá su seguimiento. Si cerraste el navegador, usá el enlace privado que copiaste al realizar el pedido.</p>
          <Link href="/" className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white">Explorar menú</Link>
        </section>
      )}
      <aside className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600"/>
        <div className="space-y-1">
          <p className="text-xs font-bold">Tus pedidos son privados</p>
          <p className="text-xs">Solo se consultan con su enlace personal. No buscamos compras por número de teléfono.</p>
          {isAuthenticated && <Link href="/profile#my-orders" className="inline-block pt-1 text-xs font-black text-orange-600">Ver también los pedidos de mi cuenta →</Link>}
        </div>
      </aside>
    </main>
  );
}
