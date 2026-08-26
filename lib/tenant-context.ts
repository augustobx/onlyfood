import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "PAST_DUE" | "CANCELED" | "NOT_FOUND";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  isSuspended: boolean;
  plan: {
    code: string;
    name: string;
    maxLocations: number;
    maxProducts: number;
    features: string[];
  };
  features: Set<string>;
  settings?: {
    appName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    storeTheme: string;
    isStoreOpen: boolean;
  } | null;
  primaryLocationId?: string;
}

export type TenantResolutionResult =
  | { success: true; tenant: ResolvedTenant }
  | { success: false; reason: "NOT_FOUND" | "SUSPENDED" | "INVALID_HOSTNAME" | "INTERNAL_ERROR"; message: string };

/**
 * Normaliza un hostname eliminando puertos y convirtiendo a minúsculas.
 */
export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0].trim().toLowerCase();
}

/**
 * Extrae el slug de un subdominio conocido (ej: beats.producto.nanolabs.app -> beats)
 * o de un dominio local (ej: beats.localhost -> beats).
 */
export function extractSubdomainSlug(hostname: string, baseDomain = process.env.BASE_DOMAIN || "producto.nanolabs.app"): string | null {
  const cleanHost = normalizeHostname(hostname);
  if (!cleanHost) return null;

  // Soporte para desarrollo local (ej: beats.localhost, roma.localhost)
  if (cleanHost.endsWith(".localhost")) {
    const parts = cleanHost.split(".");
    return parts.length === 2 && parts[0] ? parts[0] : null;
  }

  // Soporte para dominios de la plataforma (ej: beats.producto.nanolabs.app)
  const normalizedBase = normalizeHostname(baseDomain);
  if (cleanHost.endsWith(`.${normalizedBase}`)) {
    const prefix = cleanHost.slice(0, -(normalizedBase.length + 1));
    const parts = prefix.split(".");
    return parts[parts.length - 1] || null;
  }

  return null;
}

/**
 * Resuelve el Tenant de forma confiable a partir de un hostname o slug explícito del servidor.
 */
export async function resolveTenantByHostname(hostname: string): Promise<TenantResolutionResult> {
  const cleanHost = normalizeHostname(hostname);
  if (!cleanHost || cleanHost.length > 253) {
    return { success: false, reason: "INVALID_HOSTNAME", message: "Hostname inválido o vacío." };
  }

  try {
    // 1. Buscar coincidencia exacta en TenantDomain (para dominios personalizados o subdominios registrados)
    const domainRecord = await prisma.tenantDomain.findUnique({
      where: { hostname: cleanHost },
      include: {
        tenant: {
          include: {
            subscription: { include: { plan: true } },
            features: true,
            settings: true,
            locations: { where: { isMain: true }, take: 1 },
          },
        },
      },
    });

    let tenantData = domainRecord?.tenant;

    // 2. Si no se encontró por dominio exacto, intentar extraer subdominio slug
    if (!tenantData) {
      const slugCandidate = extractSubdomainSlug(cleanHost);
      if (slugCandidate) {
        tenantData = (await prisma.tenant.findUnique({
          where: { slug: slugCandidate },
          include: {
            subscription: { include: { plan: true } },
            features: true,
            settings: true,
            locations: { where: { isMain: true }, take: 1 },
          },
        })) || undefined;
      }
    }

    // 3. Fallback en desarrollo para "localhost" o "127.0.0.1" -> tenant por defecto "beats"
    if (!tenantData && (cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost === "::1")) {
      tenantData = (await prisma.tenant.findUnique({
        where: { slug: "beats" },
        include: {
          subscription: { include: { plan: true } },
          features: true,
          settings: true,
          locations: { where: { isMain: true }, take: 1 },
        },
      })) || undefined;
    }

    if (!tenantData) {
      return { success: false, reason: "NOT_FOUND", message: `No se encontró ningún comercio para el host ${cleanHost}.` };
    }

    // 4. Validar estado del tenant
    const isSuspended = tenantData.status === "SUSPENDED" || tenantData.subscription?.status === "SUSPENDED";
    if (isSuspended) {
      return {
        success: false,
        reason: "SUSPENDED",
        message: "Este comercio se encuentra temporalmente suspendido.",
      };
    }

    // 5. Mapear plan y features
    const plan = tenantData.subscription?.plan;
    const planFeatures: string[] = Array.isArray(plan?.features) ? (plan?.features as string[]) : [];
    const tenantSpecificFeatures = tenantData.features.filter((f) => f.isEnabled).map((f) => f.featureKey);
    const combinedFeatures = new Set<string>([...planFeatures, ...tenantSpecificFeatures]);

    const resolved: ResolvedTenant = {
      id: tenantData.id,
      slug: tenantData.slug,
      name: tenantData.name,
      status: (tenantData.status as TenantStatus) || "ACTIVE",
      isSuspended: false,
      plan: {
        code: plan?.code || "STARTER",
        name: plan?.name || "Plan Básico",
        maxLocations: plan?.maxLocations || 1,
        maxProducts: plan?.maxProducts || 100,
        features: Array.from(combinedFeatures),
      },
      features: combinedFeatures,
      settings: tenantData.settings
        ? {
            appName: tenantData.settings.appName,
            logoUrl: tenantData.settings.logoUrl,
            primaryColor: tenantData.settings.primaryColor,
            secondaryColor: tenantData.settings.secondaryColor,
            storeTheme: tenantData.settings.storeTheme,
            isStoreOpen: tenantData.settings.isStoreOpen,
          }
        : null,
      primaryLocationId: tenantData.locations[0]?.id,
    };

    return { success: true, tenant: resolved };
  } catch (error) {
    console.error("[Tenant Resolution Error]", error);
    return { success: false, reason: "INTERNAL_ERROR", message: "Error interno al resolver el comercio." };
  }
}

/**
 * Resuelve el TenantContext actual a partir de los headers de la request.
 */
export async function getTenantContext(): Promise<ResolvedTenant> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    requestHeaders.get("x-tenant-host") ||
    "localhost";

  const result = await resolveTenantByHostname(host);
  if (!result.success) {
    throw new Error(`TENANT_RESOLUTION_FAILED:${result.reason}:${result.message}`);
  }

  return result.tenant;
}
