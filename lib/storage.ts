import "server-only";

import path from "path";
import crypto from "crypto";

export interface StorageUploadOptions {
  tenantId: string;
  folder: "branding" | "products" | "promotions" | "general";
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StorageUploadResult {
  objectKey: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

/**
 * Valida tipo MIME y tamaño de archivo.
 */
export function validateMediaFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  const cleanMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
    return {
      valid: false,
      error: `Formato de archivo no admitido (${mimeType}). Formatos válidos: JPG, PNG, WEBP, GIF, SVG, AVIF, MP4, WEBM.`,
    };
  }

  const isVideo = cleanMime.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido (${isVideo ? "50 MB" : "10 MB"}).`,
    };
  }

  return { valid: true };
}

/**
 * Genera la clave del objeto en R2/S3 aislada estrictamente por Tenant.
 */
export function generateTenantObjectKey(tenantId: string, folder: string, originalFileName: string): string {
  if (!tenantId) throw new Error("STORAGE_ERROR: tenantId es requerido.");
  const safeName = sanitizeFileName(originalFileName);
  const ext = path.extname(safeName) || ".webp";
  const base = path.basename(safeName, ext);
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const timestamp = Date.now();

  return `tenants/${tenantId}/${folder}/${timestamp}_${randomSuffix}_${base}${ext}`;
}

/**
 * Servicio de almacenamiento Object Storage (Cloudflare R2 / AWS S3 / Local Provider).
 */
export class ObjectStorageService {
  private publicCdnBase: string;

  constructor() {
    this.publicCdnBase = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_CDN_URL || "/uploads";
  }

  /**
   * Sube un archivo al almacenamiento bajo el namespace del tenant.
   */
  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { tenantId, folder, fileName, mimeType, buffer } = options;

    const validation = validateMediaFile(mimeType, buffer.length);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const objectKey = generateTenantObjectKey(tenantId, folder, fileName);

    // En producción con R2_BUCKET / AWS_S3_BUCKET se enviaría con S3Client (@aws-sdk/client-s3 PutObjectCommand).
    // La URL pública se resuelve a través del dominio CDN o proxy configurado.
    const url = `${this.publicCdnBase.replace(/\/$/, "")}/${objectKey}`;

    return {
      objectKey,
      url,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Verifica si un objectKey pertenece al tenant especificado para prevenir borrado o acceso cruzado.
   */
  isKeyOwnedByTenant(tenantId: string, objectKey: string): boolean {
    if (!tenantId || !objectKey) return false;
    return objectKey.startsWith(`tenants/${tenantId}/`);
  }

  /**
   * Elimina un archivo verificando que pertenezca al tenant.
   */
  async delete(tenantId: string, objectKey: string): Promise<boolean> {
    if (!this.isKeyOwnedByTenant(tenantId, objectKey)) {
      throw new Error("STORAGE_FORBIDDEN: No tienes permisos para eliminar archivos de otro comercio.");
    }

    // Aquí se ejecutaría DeleteObjectCommand de S3/R2
    return true;
  }
}

export const objectStorage = new ObjectStorageService();
