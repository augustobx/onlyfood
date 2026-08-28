import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-context";

export default async function AdminPage() {
  const tenant = await getTenantContext();
  redirect(tenant.features.has("orders") ? "/admin/live" : "/admin/settings");
}
