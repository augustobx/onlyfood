import { checkIsSuperAdmin, getPlatformMetrics, listAllPlans, listAllTenants } from "@/lib/superadmin";
import SuperAdminDashboardClient from "./SuperAdminDashboardClient";
import SuperAdminLoginClient from "./SuperAdminLoginClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const isAuthorized = await checkIsSuperAdmin();

  if (!isAuthorized) {
    return <SuperAdminLoginClient />;
  }

  const [metrics, tenants, plans] = await Promise.all([
    getPlatformMetrics(),
    listAllTenants(),
    listAllPlans(),
  ]);

  return <SuperAdminDashboardClient initialMetrics={metrics} initialTenants={tenants} initialPlans={plans} />;
}
