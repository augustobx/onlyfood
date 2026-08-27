import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { ADMIN_GUIDES } from "@/lib/admin-guides";
import GuidesClient from "./GuidesClient";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  await requireAdmin();
  const tenant = await getTenantContext();
  return <GuidesClient tenantId={tenant.id} tenantName={tenant.name} enabledFeatures={[...tenant.features]} guides={ADMIN_GUIDES} />;
}
