import "server-only";

import { getTenantContext } from "@/lib/tenant-context";
import {
  createUserSession,
  deleteUserSession,
  getLoggedUser,
  requireTenantRole,
  type UserRole,
} from "@/lib/user-auth";

const ALL_ADMIN_ROLES: UserRole[] = ["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"];
const DEFAULT_ADMIN_ROLES: UserRole[] = ["OWNER", "MANAGER"];

/**
 * Compatibility wrapper for the existing admin surface. Sessions are now tied
 * to a real User and every authorization check is bound to the current tenant.
 */
export async function createAdminSession(userId: string): Promise<void> {
  await createUserSession(userId);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const tenant = await getTenantContext();
    const user = await getLoggedUser();
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const membership = user.memberships.find((item) => item.tenantId === tenant.id);
    if (!membership || !ALL_ADMIN_ROLES.includes(membership.role)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(allowedRoles: UserRole[] = DEFAULT_ADMIN_ROLES) {
  const tenant = await getTenantContext();
  const authorization = await requireTenantRole(tenant.id, allowedRoles);
  return { tenant, ...authorization };
}

export async function deleteAdminSession(): Promise<void> {
  await deleteUserSession();
}
