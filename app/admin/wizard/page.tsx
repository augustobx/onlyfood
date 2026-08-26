import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import WizardClient from "./WizardClient";

export const dynamic = "force-dynamic";

export default async function AdminWizardPage() {
  await requireAdmin();
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  const [config, productsCount] = await Promise.all([
    db.systemConfig.findFirst(),
    db.product.count(),
  ]);

  return <WizardClient tenant={tenant} config={config} productsCount={productsCount} />;
}
