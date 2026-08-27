"use server";

import { createAdminSession, deleteAdminSession } from "@/lib/admin-session";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { verifyUserPassword } from "@/lib/user-auth";

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const ip = await getRequestIp();
  if (!(await consumeRateLimit("admin-login", `${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000))) {
    return { success: false, error: "Demasiados intentos. Esperá 15 minutos." };
  }

  try {
    const tenant = await getTenantContext();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { memberships: { where: { tenantId: tenant.id } } },
    });
    const validPassword = user ? await verifyUserPassword(password, user.passwordHash) : false;
    const membership = user?.memberships[0];
    if (
      user &&
      validPassword &&
      (user.isSuperAdmin || (membership && ["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"].includes(membership.role)))
    ) {
      await createAdminSession(user.id);
      return { success: true };
    }
  } catch (error) {
    console.error("Admin login failed", error);
  }

  return { success: false, error: "Correo, contraseña o comercio incorrectos." };
}

export async function logoutAdmin() {
  await deleteAdminSession();
  return { success: true };
}
