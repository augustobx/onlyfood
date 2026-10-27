/** Shared presentation policy. Server authorization remains authoritative. */
const managers = ["OWNER", "MANAGER"];
const roles: Record<string, string[]> = {
  "/admin/live": [...managers, "KITCHEN", "CASHIER", "DELIVERY", "STAFF"],
  "/admin/calendar": [...managers, "KITCHEN", "CASHIER", "DELIVERY", "STAFF"],
  "/admin/history": [...managers, "STAFF", "CASHIER"],
  "/admin/reviews": [...managers, "STAFF", "CASHIER"],
  "/admin/cash": [...managers, "CASHIER"],
};
export function canAccessAdminRoute(href: string, role: string): boolean {
  if (role === "SUPERADMIN") return true;
  return (roles[href] || managers).includes(role);
}
export function adminHome(role: string, features: string[]): string {
  if (role === "CASHIER" && features.includes("cashRegister")) return "/admin/cash";
  if (features.includes("orders")) return role === "DELIVERY" ? "/admin/calendar" : "/admin/live";
  return managers.includes(role) || role === "SUPERADMIN" ? "/admin/settings" : "/admin/unavailable";
}
