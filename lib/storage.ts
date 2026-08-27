import "server-only";

import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export interface StorageProvider {
  upload(options: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(tenantId: string, objectKey: string): Promise<boolean>;
  isKeyOwnedByTenant(tenantId: string, objectKey: string): boolean;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
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
      error: `Formato de archivo no admitido (${mimeType}). Formatos válidos: JPG, PNG, WEBP, GIF, AVIF, MP4 y WEBM.`,
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

export function validateMediaBuffer(mimeType: string, buffer: Buffer): { valid: boolean; error?: string } {
  const basic = validateMediaFile(mimeType, buffer.length);
  if (!basic.valid) return basic;
  const mime = mimeType.toLowerCase();
  const ascii = buffer.subarray(0, 16).toString("ascii");
  const validSignature =
    (mime === "image/jpeg" || mime === "image/jpg") ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff :
    mime === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) :
    mime === "image/gif" ? ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a") :
    mime === "image/webp" ? ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP" :
    mime === "image/avif" ? ascii.includes("ftypavif") || ascii.includes("ftypavis") :
    mime === "video/mp4" || mime === "video/quicktime" ? ascii.slice(4, 8) === "ftyp" :
    mime === "video/webm" ? buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) :
    false;
  return validSignature ? { valid: true } : { valid: false, error: "El contenido del archivo no coincide con su formato declarado." };
}

/**
 * Genera la clave del objeto aislada estrictamente por Tenant.
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
 * Provider de almacenamiento en disco local (desarrollo y Docker Desktop local).
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  isKeyOwnedByTenant(tenantId: string, objectKey: string): boolean {
    if (!tenantId || !objectKey) return false;
    return objectKey.startsWith(`tenants/${tenantId}/`);
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { tenantId, folder, fileName, mimeType, buffer } = options;
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE !== "true") {
      throw new Error("STORAGE_ERROR: El almacenamiento local no está permitido en producción.");
    }
    const validation = validateMediaBuffer(mimeType, buffer);
    if (!validation.valid) throw new Error(validation.error);

    const objectKey = generateTenantObjectKey(tenantId, folder, fileName);
    const targetPath = path.join(this.uploadDir, objectKey);
    const dir = path.dirname(targetPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, buffer);

    const url = `/uploads/${objectKey}`;
    return {
      objectKey,
      url,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  async delete(tenantId: string, objectKey: string): Promise<boolean> {
    if (!this.isKeyOwnedByTenant(tenantId, objectKey)) {
      throw new Error("STORAGE_FORBIDDEN: No tienes permisos para eliminar archivos de otro comercio.");
    }
    const targetPath = path.join(this.uploadDir, objectKey);
    try {
      await fs.unlink(targetPath);
      return true;
    } catch (err: any) {
      if (err?.code === "ENOENT") return true; // Idempotent deletion
      return false;
    }
  }
}

/**
 * Provider de almacenamiento Cloudflare R2 / AWS S3 para Producción.
 */
export class R2S3StorageProvider implements StorageProvider {
  private publicCdnBase: string;
  private bucket: string;
  private client: S3Client;

  constructor() {
    this.publicCdnBase = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_CDN_URL || "";
    this.bucket = process.env.S3_BUCKET || process.env.R2_BUCKET || "";
    const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "";
    if (!this.publicCdnBase || !this.bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("STORAGE_ERROR: Faltan URL pública, bucket o credenciales de R2/S3.");
    }
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  isKeyOwnedByTenant(tenantId: string, objectKey: string): boolean {
    if (!tenantId || !objectKey) return false;
    return objectKey.startsWith(`tenants/${tenantId}/`);
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { tenantId, folder, fileName, mimeType, buffer } = options;
    const validation = validateMediaBuffer(mimeType, buffer);
    if (!validation.valid) throw new Error(validation.error);

    const objectKey = generateTenantObjectKey(tenantId, folder, fileName);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    const url = `${this.publicCdnBase.replace(/\/$/, "")}/${objectKey}`;

    return {
      objectKey,
      url,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  async delete(tenantId: string, objectKey: string): Promise<boolean> {
    if (!this.isKeyOwnedByTenant(tenantId, objectKey)) {
      throw new Error("STORAGE_FORBIDDEN: No tienes permisos para eliminar archivos de otro comercio.");
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    return true;
  }
}

const providerType = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
export const objectStorage: StorageProvider =
  providerType === "r2" || providerType === "s3"
    ? new R2S3StorageProvider()
    : new LocalStorageProvider();
