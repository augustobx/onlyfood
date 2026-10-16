"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getPendingClientPasswordResetCount } from "@/app/actions/client-admin-reset";

export function ClientResetNotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const result = await getPendingClientPasswordResetCount();
        if (active) setCount(result);
      } catch {}
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("onlyfood:reset-requests-changed", refresh);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("onlyfood:reset-requests-changed", refresh);
    };
  }, []);
  return (
    <Link href="/admin/users?tab=resets"
      title="Solicitudes de reseteo" aria-label={count ? `${count} solicitudes pendientes` : "Ver solicitudes de reseteo"}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-slate-700 hover:bg-orange-50">
      <Bell className="h-5 w-5" />
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
