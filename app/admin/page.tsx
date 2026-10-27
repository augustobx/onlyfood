import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedUser } from "@/lib/user-auth";
import { adminHome } from "@/lib/admin-navigation";
export default async function AdminPage() {
 const tenant = await getTenantContext(); const user = await getLoggedUser();
 const role = user?.isSuperAdmin ? "SUPERADMIN" : user?.memberships.find(item => item.tenantId === tenant.id)?.role || "STAFF";
 redirect(adminHome(role, [...tenant.features]));
}
