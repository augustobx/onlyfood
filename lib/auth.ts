import "server-only";

import crypto from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { constantTimeEqual } from "@/lib/request-security";

const scryptAsync = promisify(crypto.scrypt);
const SESSION_NAME = "onlyfood_client_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<{ valid: boolean; legacy: boolean }> {
  if (stored.startsWith("scrypt$")) {
    const [, salt, expectedHex] = stored.split("$");
    if (!salt || !expectedHex) return { valid: false, legacy: false };
    const actual = (await scryptAsync(password, salt, 64)) as Buffer;
    const expected = Buffer.from(expectedHex, "hex");
    return { valid: actual.length === expected.length && crypto.timingSafeEqual(actual, expected), legacy: false };
  }

  const legacySalt = process.env.AUTH_SALT;
  if (!legacySalt) return { valid: false, legacy: true };
  const legacyHash = crypto.createHmac("sha256", legacySalt).update(password).digest("hex");
  return { valid: constantTimeEqual(stored, legacyHash), legacy: true };
}

export async function createSession(clientId: string, tenantId?: string) {
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    try {
      const { getTenantContext } = await import("@/lib/tenant-context");
      const tenant = await getTenantContext();
      resolvedTenantId = tenant.id;
    } catch {}
  }
  if (!resolvedTenantId) throw new Error("TENANT_CONTEXT_REQUIRED");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { clientId, expiresAt: { lt: new Date() } } });
    await tx.session.create({ data: { clientId, tenantId: resolvedTenantId, token, expiresAt } });
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  cookieStore.delete(SESSION_NAME);
}

export async function getLoggedClient(expectedTenantId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  if (!token) return null;

  let targetTenantId = expectedTenantId;
  if (!targetTenantId) {
    try {
      const { getTenantContext } = await import("@/lib/tenant-context");
      const tenant = await getTenantContext();
      targetTenantId = tenant.id;
    } catch {}
  }

  const session = await prisma.session.findUnique({ where: { token }, include: { client: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Validar aislamiento de tenant estricto
  if (targetTenantId && (session.tenantId !== targetTenantId || session.client.tenantId !== targetTenantId)) {
    return null;
  }

  return session.client;
}
