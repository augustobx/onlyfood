import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import WizardClient from "./WizardClient";

export const dynamic = "force-dynamic";

export default async function AdminWizardPage() {
  await requireAdmin();
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  const [config, productsCount, mercadoPagoConfigured] = await Promise.all([
    db.systemConfig.findFirst(),
    db.product.count(),
    db.tenantIntegration.count({ where: { type: "MERCADO_PAGO", isActive: true } }),
  ]);

  const safeConfig = config ? {
    logoUrl: config.logoUrl,
    primaryColor: config.primaryColor,
    paymentCash: config.paymentCash,
    mpAccessToken: mercadoPagoConfigured > 0 ? "configured" : null,
    businessHours: config.businessHours,
  } : null;
  return <WizardClient tenant={tenant} config={safeConfig} productsCount={productsCount} />;
}
