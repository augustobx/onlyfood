import { requireAdmin } from "@/lib/admin-session";
import { getTenantDb } from "@/lib/tenant-db";
import { PromotionsClient } from "./PromotionsClient";
import { requireTenantFeature } from "@/lib/features";

export default async function PromotionsPage() {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "quantityDiscounts");
  const db = await getTenantDb();
  const [products, promotions] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, basePrice: true, category: { select: { name: true } } } }),
    db.quantityDiscount.findMany({ include: { products: { select: { productId: true } } }, orderBy: [{ isActive: "desc" }, { priority: "desc" }, { createdAt: "desc" }] }),
  ]);
  return <PromotionsClient products={products} promotions={promotions} />;
}
