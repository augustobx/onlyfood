import { cleanPhoneNumber } from "@/lib/phone";

export function isEmailLoginIdentifier(value: string): boolean {
  return value.includes("@");
}

/** El correo es case-insensitive; los teléfonos conservan el formato anterior. */
export function normalizeClientLoginIdentifier(value: string): string {
  const trimmed = value.trim();
  return isEmailLoginIdentifier(trimmed)
    ? trimmed.toLowerCase()
    : cleanPhoneNumber(trimmed);
}
