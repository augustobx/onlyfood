import "server-only";

import { prisma } from "@/lib/prisma";

export interface AuditLogOptions {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "accesstoken",
  "publickey",
  "webhooksecret",
  "metapitoken",
  "metaverifytoken",
  "printnodeapikey",
  "cvv",
  "cardnumber",
]);

/**
 * Sanitiza recursivamente cualquier objeto para ocultar secretos antes de guardarlo en logs.
 */
export function sanitizeLogDetails(details: any): any {
  if (!details || typeof details !== "object") return details;

  if (Array.isArray(details)) {
    return details.map(sanitizeLogDetails);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("password") || lowerKey.includes("token")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Registra un evento de auditoría en la base de datos de forma segura.
 */
export async function recordAuditLog(options: AuditLogOptions) {
  const { tenantId, userId, action, resource, details, ipAddress } = options;

  const safeDetails = details ? sanitizeLogDetails(details) : null;

  return prisma.platformAuditLog.create({
    data: {
      tenantId: tenantId || null,
      userId: userId || null,
      action,
      resource,
      details: safeDetails,
      ipAddress: ipAddress || null,
    },
  });
}

/**
 * Consulta logs de auditoría para un Tenant específico.
 */
export async function getTenantAuditLogs(tenantId: string, limit = 50) {
  return prisma.platformAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}
