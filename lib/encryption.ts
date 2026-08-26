import "server-only";

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Obtiene la clave de cifrado maestra de 32 bytes (256 bits).
 * Utiliza ENCRYPTION_MASTER_KEY o deriva una clave criptográfica a partir de AUTH_SALT.
 */
function getMasterKey(): Buffer {
  const envKey = process.env.ENCRYPTION_MASTER_KEY || process.env.AUTH_SALT || "nanolabs-multitenant-saas-master-key-2026-secure";
  return crypto.createHash("sha256").update(envKey).digest();
}

export interface EncryptedData {
  encryptedPayload: string; // Base64
  iv: string; // Hex
  authTag: string; // Hex
}

/**
 * Cifra un payload (objeto o string) utilizando AES-256-GCM.
 */
export function encryptPayload(data: unknown): EncryptedData {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  const textToEncrypt = typeof data === "string" ? data : JSON.stringify(data);
  let encrypted = cipher.update(textToEncrypt, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Descifra un payload cifrado con AES-256-GCM y valida la autenticidad con authTag.
 */
export function decryptPayload<T = any>(encrypted: EncryptedData): T {
  const masterKey = getMasterKey();
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("ENCRYPTION_ERROR: Parámetros de descifrado inválidos.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.encryptedPayload, "base64", "utf8");
  decrypted += decipher.final("utf8");

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}
