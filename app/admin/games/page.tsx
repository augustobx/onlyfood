import { requireAdmin } from "@/lib/admin-session";
import { requireTenantFeature } from "@/lib/features";
import { getTenantDb } from "@/lib/tenant-db";
import { GamesClient } from "./GamesClient";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage() {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "roulette");
  const db = await getTenantDb();
  const [config, prizes, products] = await Promise.all([
    db.systemConfig.findFirst({ select: { isRouletteActive: true, rouletteCost: true } }),
    db.roulettePrize.findMany({ include: { product: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Ruleta de premios</h1>
        <p className="text-sm text-muted-foreground">Activá el juego, definí su costo en puntos y administrá las probabilidades de cada premio.</p>
      </div>
      <GamesClient
        initialActive={config?.isRouletteActive ?? false}
        initialCost={config?.rouletteCost ?? 100}
        prizes={prizes}
        products={products}
      />
    </div>
  );
}
