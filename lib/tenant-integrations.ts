import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptPayload, decryptPayload } from "@/lib/encryption";
import crypto from "crypto";

export type IntegrationType = "MERCADO_PAGO" | "WHATSAPP" | "PRINTNODE";

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey?: string;
  webhookSecret?: string;
}

export interface WhatsAppCredentials {
  apiToken: string;
  phoneNumberId: string;
  verifyToken: string;
  apiVersion?: string;
}

export async function setTenantIntegrationActive(tenantId: string, type: IntegrationType, isActive: boolean) {
  return prisma.tenantIntegration.updateMany({
    where: { tenantId, type },
    data: { isActive },
  });
}

export interface PrintNodeCredentials {
  apiKey: string;
  counterPrinterId?: number | null;
  kitchenPrinterId?: number | null;
  counterPrinterSize?: "58mm" | "80mm";
  kitchenPrinterSize?: "58mm" | "80mm";
}

/**
 * Guarda o actualiza las credenciales cifradas de una integración para un Tenant.
 */
export async function saveTenantIntegration(
  tenantId: string,
  type: IntegrationType,
  credentials: MercadoPagoCredentials | WhatsAppCredentials | PrintNodeCredentials
) {
  const encrypted = encryptPayload(credentials);

  return prisma.tenantIntegration.upsert({
    where: {
      tenantId_type: {
        tenantId,
        type,
      },
    },
    update: {
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isActive: true,
      externalAccountId: type === "WHATSAPP" ? (credentials as WhatsAppCredentials).phoneNumberId : undefined,
    },
    create: {
      tenantId,
      type,
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isActive: true,
      externalAccountId: type === "WHATSAPP" ? (credentials as WhatsAppCredentials).phoneNumberId : null,
    },
  });
}

/**
 * Obtiene y descifra las credenciales de una integración para un Tenant.
 */
export async function getTenantIntegration<T = any>(
  tenantId: string,
  type: IntegrationType
): Promise<T | null> {
  const record = await prisma.tenantIntegration.findUnique({
    where: {
      tenantId_type: {
        tenantId,
        type,
      },
    },
  });

  if (!record || !record.isActive) return null;

  try {
    return decryptPayload<T>({
      encryptedPayload: record.encryptedPayload,
      iv: record.iv,
      authTag: record.authTag,
    });
  } catch (error) {
    console.error(`[Integration Decryption Error] Tenant ${tenantId}, Type ${type}`, error);
    return null;
  }
}

export async function resolveWhatsAppTenant(phoneNumberId: string): Promise<string | null> {
  if (!phoneNumberId) return null;
  const direct = await prisma.tenantIntegration.findFirst({
    where: { type: "WHATSAPP", isActive: true, externalAccountId: phoneNumberId },
    select: { tenantId: true },
  });
  if (direct) return direct.tenantId;

  const legacy = await prisma.tenantIntegration.findMany({ where: { type: "WHATSAPP", isActive: true } });
  for (const record of legacy) {
    try {
      const credentials = decryptPayload<WhatsAppCredentials>(record);
      if (credentials.phoneNumberId === phoneNumberId) return record.tenantId;
    } catch {
      // Ignore corrupt legacy credentials.
    }
  }
  return null;
}

export async function resolveWhatsAppVerificationToken(token: string): Promise<boolean> {
  if (!token) return false;
  const records = await prisma.tenantIntegration.findMany({ where: { type: "WHATSAPP", isActive: true } });
  for (const record of records) {
    try {
      const credentials = decryptPayload<WhatsAppCredentials>(record);
      const left = Buffer.from(token);
      const right = Buffer.from(credentials.verifyToken || "");
      if (left.length === right.length && crypto.timingSafeEqual(left, right)) return true;
    } catch {
      // Ignore invalid integration payloads.
    }
  }
  return false;
}
