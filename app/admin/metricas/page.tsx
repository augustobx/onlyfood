import { getTenantDb } from "@/lib/tenant-db";
import { MetricsClient } from "./MetricsClient";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "advancedReports");
  const db = await getTenantDb();
  const [orders, products, ingredients] = await Promise.all([
     db.order.findMany({
       where: { status: { not: 'CANCELLED' } },
       include: {
         items: {
           include: {
             removedIngredients: true,
             product: { include: { ingredients: true } },
             secondHalfProduct: { include: { ingredients: true } },
             comboItems: {
               include: {
                 removedIngredients: true,
                 product: { include: { ingredients: true } }
               }
             }
           }
         }
       },
       orderBy: { createdAt: 'asc' }
     }),
     db.product.findMany({
       where: { isActive: true },
       include: {
         ingredients: true,
         comboItemsConfig: {
            include: {
               product: {
                  include: {
                     ingredients: true
                  }
               }
            }
         }
       },
       orderBy: { name: 'asc' }
     }),
     db.ingredient.findMany({
       orderBy: { name: 'asc' }
     })
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Métricas y Rentabilidad</h2>
        <p className="text-muted-foreground hidden sm:block">
           Inteligencia de negocios y Food Cost general.
        </p>
      </div>    
      <MetricsClient orders={orders} products={products} ingredients={ingredients} />
    </div>
  );
}
