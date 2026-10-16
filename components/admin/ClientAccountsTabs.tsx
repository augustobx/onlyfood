"use client";

import { useState } from "react";
import { UsersTableClient } from "@/app/admin/users/UsersTableClient";
import { ClientPasswordResetRequests } from "@/components/admin/ClientPasswordResetRequests";

type Props = {
  initialUsers: any[];
  rewards: any[];
  tiers: any[];
  resetRequests: Array<{
    id: string;
    claimedName: string;
    createdAt: string;
    client: { id: string; name: string | null; phone: string; email: string | null };
  }>;
};

export function ClientAccountsTabs({ initialUsers, rewards, tiers, resetRequests }: Props) {
  const [tab, setTab] = useState<"CLIENTS" | "RESETS">("CLIENTS");
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b pb-3" aria-label="Secciones de clientes">
        <button type="button" onClick={() => setTab("CLIENTS")}
          aria-current={tab === "CLIENTS" ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "CLIENTS"
            ? "bg-orange-600 text-white" : "bg-white text-slate-700 border"}`}>
          Clientes y cuentas
        </button>
        <button type="button" onClick={() => setTab("RESETS")}
          aria-current={tab === "RESETS" ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "RESETS"
            ? "bg-orange-600 text-white" : "bg-white text-slate-700 border"}`}>
          Solicitudes de reseteo ({resetRequests.length})
        </button>
      </nav>
      {tab === "CLIENTS" ? (
        <UsersTableClient initialUsers={initialUsers} rewards={rewards} tiers={tiers} />
      ) : (
        <ClientPasswordResetRequests initialRequests={resetRequests} />
      )}
    </div>
  );
}
