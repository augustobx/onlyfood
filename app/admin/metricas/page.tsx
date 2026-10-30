import { getTenantDb } from "@/lib/tenant-db";
import { MetricsClient } from "./MetricsClient";
import { requireAdmin } from "@/lib/admin-session";
import { requireTenantFeature } from "@/lib/features";
import { resultsWindow, summarizeResults } from "@/lib/business-results";
export const dynamic = "force-dynamic";
export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "advancedReports");
  const window = resultsWindow((await searchParams).range || "30");
  const db = await getTenantDb();
  const [orders, products] = await Promise.all([
    db.order.findMany({ where: { status: { not: "CANCELLED" }, createdAt: { gte: window.gte, lt: window.lt } }, include: { items: { include: {
      removedIngredients: true, product: { include: { ingredients: { include: { ingredient: true } } } },
      secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
      comboItems: { include: { removedIngredients: true, product: { include: { ingredients: { include: { ingredient: true } } } } } },
    } } }, orderBy: { createdAt: "asc" } }),
    db.product.findMany({ where: { isActive: true }, include: { ingredients: { include: { ingredient: true } }, comboItemsConfig: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } } }, orderBy: { name:"asc" } }),
  ]);
  const productCosts = products.map(p => {
    const components = p.isCombo ? p.comboItemsConfig.map(c => ({ quantity:c.quantity, ingredients:c.product.ingredients })) : [{ quantity:1, ingredients:p.ingredients }];
    const cost = components.reduce((sum,c) => sum + c.quantity * c.ingredients.reduce((s,i) => s + i.quantity * i.ingredient.costPerUnit, 0), 0);
    const incomplete = !components.length || components.some(c => !c.ingredients.length || c.ingredients.some(i => !i.ingredient.costPerUnit));
    return { id:p.id, name:p.name, price:p.basePrice, cost, incomplete };
  });
  return <div className="max-w-6xl mx-auto space-y-5"><div><h1 className="text-3xl font-bold">Resultados</h1><p className="mt-2 text-slate-600">Primero tus pedidos y pagos. Abrí el detalle cuando necesites revisar costos.</p></div><MetricsClient results={summarizeResults(orders)} range={window.range} productCosts={productCosts}/></div>;
}
