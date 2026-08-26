import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptPayload, decryptPayload } from "@/lib/encryption";

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
    },
    create: {
      tenantId,
      type,
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isActive: true,
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
