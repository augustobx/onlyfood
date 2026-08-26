"use server";

import { revalidatePath } from "next/cache";
import {
  requireSuperAdmin,
  loginSuperAdmin,
  logoutSuperAdmin,
  getPlatformMetrics,
  listAllTenants,
  provisionNewTenant,
  setTenantStatus,
  setTenantPlan,
  type ProvisionTenantInput,
} from "@/lib/superadmin";
import type { PlanCode } from "@/lib/features";

export async function loginSuperAdminAction(formData: FormData) {
  const password = formData.get("password") as string;
  if (!password) return { success: false, error: "Contraseña requerida." };
  const success = await loginSuperAdmin(password);
  if (!success) return { success: false, error: "Contraseña de SuperAdmin incorrecta." };
  return { success: true };
}

export async function logoutSuperAdminAction() {
  await logoutSuperAdmin();
  return { success: true };
}

export async function fetchSuperAdminDashboardAction(search?: string) {
  await requireSuperAdmin();
  const [metrics, tenants] = await Promise.all([
    getPlatformMetrics(),
    listAllTenants(search),
  ]);
  return { success: true, metrics, tenants };
}

export async function createTenantAction(input: ProvisionTenantInput) {
  await requireSuperAdmin();
  try {
    const tenant = await provisionNewTenant(input);
    revalidatePath("/superadmin");
    return { success: true, tenant };
  } catch (error: any) {
    console.error("SuperAdmin tenant creation error:", error);
    const msg =
      error.message === "SLUG_ALREADY_EXISTS"
        ? "El subdominio / slug ya está en uso."
        : error.message === "SLUG_INVALID"
        ? "Slug inválido. Usá solo letras minúsculas, números y guiones."
        : "Error al crear comercio.";
    return { success: false, error: msg };
  }
}

export async function updateTenantStatusAction(tenantId: string, status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED") {
  await requireSuperAdmin();
  try {
    await setTenantStatus(tenantId, status);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin tenant status error:", error);
    return { success: false, error: "No se pudo actualizar el estado del comercio." };
  }
}

export async function changeTenantPlanAction(tenantId: string, planCode: PlanCode) {
  await requireSuperAdmin();
  try {
    await setTenantPlan(tenantId, planCode);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin tenant plan change error:", error);
    return { success: false, error: "No se pudo actualizar el plan del comercio." };
  }
}
