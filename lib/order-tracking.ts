import "server-only";

import crypto from "crypto";

export function createOrderTrackingToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOrderTrackingToken(token) };
}

export function hashOrderTrackingToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isValidOrderTrackingToken(token: string | undefined, expectedHash: string | null): boolean {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashOrderTrackingToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
