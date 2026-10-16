import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient } from "@/lib/auth";
import { GuestOrdersClient } from "./GuestOrdersClient";

export const dynamic = "force-dynamic";

/** Invitados: enlaces temporales de seguimiento, no búsqueda por teléfono. */
export default async function GuestOrdersPage() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  return <GuestOrdersClient tenantId={tenant.id} isAuthenticated={Boolean(client)} />;
}
