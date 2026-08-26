"use server";

import { createAdminSession, deleteAdminSession } from "@/lib/admin-session";
import { constantTimeEqual, consumeRateLimit, getRequestIp } from "@/lib/request-security";

export async function loginAdmin(password: string) {
  const ip = await getRequestIp();
  if (!(await consumeRateLimit("admin-login", ip, 5, 15 * 60 * 1000))) {
    return { success: false, error: "Demasiados intentos. Esperá 15 minutos." };
  }

  const correctPassword = process.env.ADMIN_PASSWORD;
  if (!correctPassword || correctPassword.length < 12) {
    return { success: false, error: "ADMIN_PASSWORD no está configurada de forma segura." };
  }

  if (constantTimeEqual(password, correctPassword)) {
    await createAdminSession();
    return { success: true };
  }

  return { success: false, error: "Contraseña incorrecta" };
}

export async function logoutAdmin() {
  await deleteAdminSession();
  return { success: true };
}
