import "server-only";

import { prisma } from "@/lib/prisma";
export { FEATURE_KEYS } from "@/lib/feature-catalog";
export type { FeatureKey } from "@/lib/feature-catalog";
import type { FeatureKey } from "@/lib/feature-catalog";

export type PlanCode = "STARTER" | "PRO" | "BUSINESS";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  priceMonthly: number;
  maxLocations: number;
  maxProducts: number;
  features: FeatureKey[];
}

export const SAAS_PLANS: Record<PlanCode, PlanDefinition> = {
  STARTER: {
    code: "STARTER",
    name: "Plan Starter",
    priceMonthly: 25000,
    maxLocations: 1,
    maxProducts: 50,
    features: ["orders", "cashRegister", "quantityDiscounts"],
  },
  PRO: {
    code: "PRO",
    name: "Plan Profesional",
    priceMonthly: 45000,
    maxLocations: 3,
    maxProducts: 300,
    features: ["orders", "loyalty", "roulette", "printNode", "cashRegister", "quantityDiscounts"],
  },
  BUSINESS: {
    code: "BUSINESS",
    name: "Plan Business",
    priceMonthly: 85000,
    maxLocations: 10,
    maxProducts: 2000,
    features: [
      "orders",
      "loyalty",
      "roulette",
      "whatsapp",
      "customDomain",
      "multipleLocations",
      "printNode",
      "advancedReports",
      "cashRegister",
      "quantityDiscounts",
    ],
  },
};

export const PLANS = SAAS_PLANS;
export const PLAN_FEATURES: Record<PlanCode, FeatureKey[]> = {
  STARTER: SAAS_PLANS.STARTER.features,
  PRO: SAAS_PLANS.PRO.features,
  BUSINESS: SAAS_PLANS.BUSINESS.features,
};

/**
 * Verifica si un objeto Tenant ya resuelto en memoria posee una feature/capability activa.
 */
export function hasFeature(
  tenant: { features?: Set<string> | string[] | any; isSuspended?: boolean; status?: string } | null | undefined,
  feature: FeatureKey | string
): boolean {
  if (!tenant) return false;
  if (tenant.isSuspended) return false;
  if (tenant.status && tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") return false;
  if (!tenant.features) return false;
  if (tenant.features instanceof Set) {
    return tenant.features.has(feature);
  }
  if (Array.isArray(tenant.features)) {
    return tenant.features.includes(feature);
  }
  return false;
}

/**
 * Obtiene todas las features habilitadas para un Tenant considerando su Plan y flags individuales.
 */
export async function getTenantFeatures(tenantId: string): Promise<{
  features: Set<FeatureKey>;
  planCode: string;
  isSubscriptionActive: boolean;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: { include: { plan: true } },
      features: true,
    },
  });

  if (!tenant) {
    return { features: new Set(), planCode: "NONE", isSubscriptionActive: false };
  }

  const sub = tenant.subscription;
  const now = new Date();
  const isSubscriptionActive =
    (sub?.status === "ACTIVE" && sub.currentPeriodEnd > now) ||
    (sub?.status === "TRIAL" && Boolean(sub.trialEndsAt && sub.trialEndsAt > now));

  const planFeatures = (Array.isArray(sub?.plan?.features)
    ? (sub?.plan?.features as FeatureKey[])
    : []) as FeatureKey[];

  const customEnabled = tenant.features
    .filter((f) => f.isEnabled)
    .map((f) => f.featureKey as FeatureKey);

  const customDisabled = new Set(
    tenant.features.filter((f) => !f.isEnabled).map((f) => f.featureKey)
  );

  const combined = new Set<FeatureKey>();
  for (const f of [...planFeatures, ...customEnabled]) {
    if (!customDisabled.has(f)) {
      combined.add(f);
    }
  }

  return {
    features: combined,
    planCode: sub?.plan?.code || "STARTER",
    isSubscriptionActive,
  };
}

/**
 * Verifica si un Tenant tiene habilitada una feature específica.
 */
export async function hasTenantFeature(tenantId: string, feature: FeatureKey): Promise<boolean> {
  const { features, isSubscriptionActive } = await getTenantFeatures(tenantId);
  if (!isSubscriptionActive) return false;
  return features.has(feature);
}

/**
 * Lanza un error si la feature no está habilitada o la suscripción no está activa.
 */
export async function requireTenantFeature(tenantId: string, feature: FeatureKey): Promise<void> {
  const isEnabled = await hasTenantFeature(tenantId, feature);
  if (!isEnabled) {
    throw new Error(`FEATURE_DISABLED: La funcionalidad '${feature}' no está incluida en tu plan actual.`);
  }
}
