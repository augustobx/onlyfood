import { checkIsSuperAdmin, getPlatformMetrics, listAllTenants } from "@/lib/superadmin";
import SuperAdminDashboardClient from "./SuperAdminDashboardClient";
import SuperAdminLoginClient from "./SuperAdminLoginClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const isAuthorized = await checkIsSuperAdmin();

  if (!isAuthorized) {
    return <SuperAdminLoginClient />;
  }

  const [metrics, tenants] = await Promise.all([
    getPlatformMetrics(),
    listAllTenants(),
  ]);

  return <SuperAdminDashboardClient initialMetrics={metrics} initialTenants={tenants} />;
}
