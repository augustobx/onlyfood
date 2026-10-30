import { requireAdmin } from "@/lib/admin-session";
import { requireTenantFeature } from "@/lib/features";
import { getTenantDb } from "@/lib/tenant-db";
import { stockOverview } from "@/lib/stock-overview";
import { IngredientsPanel } from "../catalog/IngredientsPanel";
export const dynamic = "force-dynamic";
export default async function StockPage() {
  const { tenant } = await requireAdmin(["OWNER","MANAGER"]);
  await requireTenantFeature(tenant.id,"orders");
  const db = await getTenantDb();
  const [stock,categories] = await Promise.all([stockOverview(),db.category.findMany({orderBy:{sequence:"asc"},select:{id:true,name:true}})]);
  return <div className="max-w-6xl mx-auto space-y-5"><div><h1 className="text-3xl font-bold">Ingredientes y stock</h1><p className="mt-2 text-slate-600">Qué tenés disponible, qué necesitás reponer y qué cambió.</p></div><IngredientsPanel ingredients={stock.ingredients} categories={categories} reserved={stock.reserved}/></div>;
}
