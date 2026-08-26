import { requireAdmin } from "@/lib/admin-session";
import { fetchAdminRewards, fetchCustomerRanking } from "@/app/actions/admin-rewards";
import { RewardsClient } from "./RewardsClient";

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  await requireAdmin();
  const [{ rewards, products, tiers, isPointsCatalogActive }, rankingRes] = await Promise.all([
    fetchAdminRewards(),
    fetchCustomerRanking(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" /> Fidelización, Insignias & Beneficios VIP
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Fidelización & Ranking de Compradores</h1>
        <p className="text-muted-foreground text-sm">
          Configurá los niveles de membresía (Beaters Select, Gold, Club), gestioná el ranking de los mejores compradores y asigná recompensas exclusivas.
        </p>
      </div>

      <RewardsClient
        initialRewards={rewards}
        products={products}
        initialTiers={tiers}
        initialRanking={rankingRes.success ? rankingRes.ranking || [] : []}
        isPointsCatalogActive={isPointsCatalogActive}
      />
    </div>
  );
}
