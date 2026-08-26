import "server-only";

import crypto from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { constantTimeEqual } from "@/lib/request-security";
import type { ResolvedTenant } from "@/lib/tenant-context";

const scryptAsync = promisify(crypto.scrypt);
const USER_SESSION_COOKIE = "nfood_user_session";
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 días

export type UserRole = "OWNER" | "MANAGER" | "KITCHEN" | "CASHIER" | "DELIVERY" | "STAFF";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{
    tenantId: string;
    role: UserRole;
    permissions: any;
    tenant: {
      id: string;
      slug: string;
      name: string;
    };
  }>;
}

export async function hashUserPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyUserPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith("scrypt$")) return false;
  const [, salt, expectedHex] = storedHash.split("$");
  if (!salt || !expectedHex) return false;
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHashed = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: tokenHashed,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function deleteUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.userSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
  cookieStore.delete(USER_SESSION_COOKIE);
}

export async function getLoggedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              tenant: { select: { id: true, slug: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } });
    }
    cookieStore.delete(USER_SESSION_COOKIE);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isSuperAdmin: session.user.isSuperAdmin,
    memberships: session.user.memberships.map((m) => ({
      tenantId: m.tenantId,
      role: m.role as UserRole,
      permissions: m.permissions,
      tenant: m.tenant,
    })),
  };
}

export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  const user = await getLoggedUser();
  if (!user || !user.isSuperAdmin) {
    throw new Error("UNAUTHORIZED_SUPERADMIN: Acceso exclusivo a Plataforma NanoLabs.");
  }
  return user;
}

export async function requireTenantRole(
  tenantId: string,
  allowedRoles: UserRole[] = ["OWNER", "MANAGER", "STAFF"]
): Promise<{ user: AuthenticatedUser; role: UserRole }> {
  const user = await getLoggedUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Debes iniciar sesión.");
  }

  // Si es SuperAdmin, tiene acceso de plataforma concedido
  if (user.isSuperAdmin) {
    return { user, role: "OWNER" };
  }

  const membership = user.memberships.find((m) => m.tenantId === tenantId);
  if (!membership) {
    throw new Error("FORBIDDEN: No tienes acceso a este comercio.");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(`FORBIDDEN_ROLE: Tu rol (${membership.role}) no tiene permisos para esta acción.`);
  }

  return { user, role: membership.role };
}
