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
  listAllPlans,
  updatePlan,
  createPlan,
  updateTenantSubscription,
  setTenantFeatureOverride,
  updateTenantUserAccess,
  createSaaSPayment,
  updateSaaSPaymentStatus,
  type ProvisionTenantInput,
} from "@/lib/superadmin";
import { FEATURE_KEYS } from "@/lib/features";
import { platformEntityIdSchema } from "@/lib/platform-validation";
import { z } from "zod";

const idSchema = platformEntityIdSchema;
const statusSchema = z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"]);
const featureSchema = z.enum(FEATURE_KEYS);
const subscriptionDateSchema = z.union([z.date(), z.string().min(1)]).pipe(z.coerce.date());

const planUpdateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(100),
  priceMonthly: z.number().finite().min(0).max(1_000_000_000),
  maxLocations: z.number().int().min(1).max(10_000),
  maxProducts: z.number().int().min(1).max(1_000_000),
  features: z.array(featureSchema).max(FEATURE_KEYS.length),
  isActive: z.boolean(),
});

const planCreateSchema = planUpdateSchema.omit({ id: true }).extend({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_-]{1,29}$/),
});

const subscriptionUpdateSchema = z.object({
  tenantId: idSchema,
  planId: idSchema,
  status: statusSchema,
  trialEndsAt: subscriptionDateSchema.nullable(),
  currentPeriodStart: subscriptionDateSchema,
  currentPeriodEnd: subscriptionDateSchema,
});

const subscriptionFieldLabels: Record<string, string> = {
  tenantId: "comercio",
  planId: "plan",
  status: "estado",
  trialEndsAt: "fin de prueba",
  currentPeriodStart: "inicio del período",
  currentPeriodEnd: "fin del período",
};

const featureOverrideSchema = z.object({
  tenantId: idSchema,
  featureKey: featureSchema,
  state: z.enum(["INHERIT", "ENABLED", "DISABLED"]),
});

const tenantUserAccessSchema = z.object({
  tenantId: idSchema,
  userId: idSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(120).nullable().optional(),
  password: z.string().min(12).max(200).nullable().optional(),
});

const paymentStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE", "REFUNDED", "VOID"]);
const saasPaymentSchema = z.object({
  tenantId: idSchema,
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("ARS"),
  status: paymentStatusSchema,
  method: z.string().trim().max(100).nullable().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  dueAt: subscriptionDateSchema.nullable().optional(),
  paidAt: subscriptionDateSchema.nullable().optional(),
  periodStart: subscriptionDateSchema,
  periodEnd: subscriptionDateSchema,
});

const paymentStatusUpdateSchema = z.object({
  paymentId: idSchema,
  status: paymentStatusSchema,
  paidAt: subscriptionDateSchema.nullable().optional(),
});

export async function loginSuperAdminAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  if (!email || !password) return { success: false, error: "Correo y contraseña requeridos." };
  const success = await loginSuperAdmin(email, password);
  if (!success) return { success: false, error: "Credenciales de SuperAdmin incorrectas." };
  return { success: true };
}

export async function logoutSuperAdminAction() {
  await logoutSuperAdmin();
  return { success: true };
}

export async function fetchSuperAdminDashboardAction(search?: string) {
  await requireSuperAdmin();
  const [metrics, tenants, plans] = await Promise.all([
    getPlatformMetrics(),
    listAllTenants(search),
    listAllPlans(),
  ]);
  return { success: true, metrics, tenants, plans };
}

export async function updatePlanAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = planUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos del plan no son válidos." };
  try {
    await updatePlan(parsed.data);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin plan update error:", error);
    return { success: false, error: "No se pudo actualizar el plan." };
  }
}

export async function createPlanAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = planCreateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos del nuevo plan no son válidos." };
  try {
    await createPlan(parsed.data);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error: any) {
    console.error("SuperAdmin plan creation error:", error);
    return {
      success: false,
      error: error?.message === "PLAN_CODE_EXISTS" ? "Ya existe un plan con ese código." : "No se pudo crear el plan.",
    };
  }
}

export async function updateTenantSubscriptionAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = subscriptionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] || "datos");
    return { success: false, error: `Revisá el campo ${subscriptionFieldLabels[field] || field} de la suscripción.` };
  }
  try {
    await updateTenantSubscription({
      ...parsed.data,
      trialEndsAt: parsed.data.trialEndsAt,
      currentPeriodStart: parsed.data.currentPeriodStart,
      currentPeriodEnd: parsed.data.currentPeriodEnd,
    });
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error: any) {
    console.error("SuperAdmin subscription update error:", error);
    const message = error?.message === "INVALID_PERIOD"
      ? "La fecha de fin debe ser posterior al inicio."
      : error?.message === "INVALID_TRIAL_END"
      ? "Una suscripción en prueba necesita fecha de finalización."
      : "No se pudo actualizar la suscripción.";
    return { success: false, error: message };
  }
}

export async function updateTenantFeatureOverrideAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = featureOverrideSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "La excepción de funcionalidad no es válida." };
  try {
    await setTenantFeatureOverride(parsed.data.tenantId, parsed.data.featureKey, parsed.data.state);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin feature override error:", error);
    return { success: false, error: "No se pudo actualizar la funcionalidad." };
  }
}

export async function updateTenantUserAccessAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = tenantUserAccessSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Revisá el correo y la contraseña (mínimo 12 caracteres)." };
  try {
    await updateTenantUserAccess(parsed.data);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error: any) {
    console.error("SuperAdmin tenant user update error:", error);
    const message = error?.message === "EMAIL_ALREADY_EXISTS"
      ? "Ese correo ya pertenece a otro usuario."
      : error?.message === "SUPERADMIN_PROTECTED"
        ? "La cuenta SuperAdmin no se modifica desde un comercio."
        : error?.message === "MEMBERSHIP_NOT_FOUND"
          ? "El usuario ya no pertenece a este comercio."
          : "No se pudo actualizar el acceso del usuario.";
    return { success: false, error: message };
  }
}

export async function createSaaSPaymentAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = saasPaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Revisá importe, estado y período del pago." };
  try {
    await createSaaSPayment(parsed.data);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error: any) {
    console.error("SuperAdmin SaaS payment creation error:", error);
    return { success: false, error: error?.message === "INVALID_PERIOD" ? "El fin del período debe ser posterior al inicio." : "No se pudo registrar el pago." };
  }
}

export async function updateSaaSPaymentStatusAction(input: unknown) {
  await requireSuperAdmin();
  const parsed = paymentStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "El estado del pago no es válido." };
  try {
    await updateSaaSPaymentStatus(parsed.data.paymentId, parsed.data.status, parsed.data.paidAt);
    revalidatePath("/superadmin");
    return { success: true };
  } catch (error) {
    console.error("SuperAdmin SaaS payment status error:", error);
    return { success: false, error: "No se pudo actualizar el pago." };
  }
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
        : error.message === "OWNER_EMAIL_EXISTS"
        ? "El correo ya existe y la contraseña indicada no coincide."
        : error.message === "OWNER_PASSWORD_WEAK"
        ? "La contraseña del propietario debe tener al menos 12 caracteres."
        : error.message === "SLUG_INVALID"
          ? "Slug inválido. Usá solo letras minúsculas, números y guiones."
        : error.message === "PLAN_NOT_FOUND"
          ? "El plan seleccionado ya no existe. Actualizá la página y elegí un plan activo."
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

export async function changeTenantPlanAction(tenantId: string, planCode: string) {
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
