"use server";

import { headers } from "next/headers";
import { server } from "@passwordless-id/webauthn";
import type { AuthenticationJSON, ExtendedAuthenticatorTransport, NamedAlgo, RegistrationJSON } from "@passwordless-id/webauthn";
import { prisma } from "@/lib/prisma";
import { getTenantContext, normalizeHostname } from "@/lib/tenant-context";
import { createSession, getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp, getRequestOrigin } from "@/lib/request-security";

const ttlMs = 5 * 60_000;
const transports = new Set(["ble", "hybrid", "internal", "nfc", "smart-card", "usb"]);

async function context() {
  const tenant = await getTenantContext();
  const h = await headers();
  const origin = await getRequestOrigin();
  const rpId = normalizeHostname(h.get("host") || h.get("x-forwarded-host"));
  if (!rpId || new URL(origin).hostname !== rpId) throw new Error("UNTRUSTED_PASSKEY_ORIGIN");
  return { tenant, rpId, origin };
}

async function consume(id: string, tenantId: string, kind: string) {
  const found = await prisma.clientPasskeyChallenge.findFirst({ where: { id, tenantId, kind, expiresAt: { gt: new Date() } } });
  if (!found) return null;
  const result = await prisma.clientPasskeyChallenge.deleteMany({ where: { id: found.id, tenantId, kind, expiresAt: { gt: new Date() } } });
  return result.count === 1 ? found : null;
}

export async function listClientPasskeys() {
  const { tenant } = await context();
  const client = await getLoggedClient(tenant.id);
  if (!client) return [];
  const rows = await prisma.clientPasskey.findMany({
    where: { tenantId: tenant.id, clientId: client.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, authenticatorName: true, createdAt: true, lastUsedAt: true },
  });
  return rows.map(p => ({ id: p.id, name: p.authenticatorName || "Passkey", createdAt: p.createdAt.toISOString(), lastUsedAt: p.lastUsedAt?.toISOString() || null }));
}

export async function beginClientPasskeyRegistration() {
  try {
    const { tenant, origin, rpId } = await context();
    const client = await getLoggedClient(tenant.id);
    if (!client || client.passwordSetupRequired) return { success: false as const, error: "Iniciá sesión con tu contraseña primero." };
    const ip = await getRequestIp();
    if (!await consumeRateLimit("client-passkey-enroll", `${tenant.id}:${client.id}:${ip}`, 10, 15 * 60_000))
      return { success: false as const, error: "Demasiados intentos." };
    const challenge = server.randomChallenge();
    const row = await prisma.clientPasskeyChallenge.create({
      data: { tenantId: tenant.id, clientId: client.id, kind: "REGISTRATION", challenge, origin, rpId, expiresAt: new Date(Date.now() + ttlMs) },
    });
    return {
      success: true as const, challengeId: row.id, challenge, rpId,
      user: { id: client.id, name: client.email || client.phone, displayName: client.name || client.phone },
    };
  } catch (error) {
    console.error("Passkey registration start:", error);
    return { success: false as const, error: "No se pudo iniciar la activación." };
  }
}

export async function finishClientPasskeyRegistration(id: string, response: RegistrationJSON) {
  try {
    const { tenant } = await context();
    const client = await getLoggedClient(tenant.id);
    if (!client) return { success: false as const, error: "Sesión vencida." };
    const challenge = await consume(id, tenant.id, "REGISTRATION");
    if (!challenge || challenge.clientId !== client.id || response.user?.id !== client.id)
      return { success: false as const, error: "Solicitud inválida o vencida." };
    const verified = await server.verifyRegistration(response, {
      challenge: challenge.challenge, origin: challenge.origin, domain: challenge.rpId, userVerified: true,
    });
    if (verified.user.id !== client.id || !verified.userVerified)
      return { success: false as const, error: "No se pudo verificar el dispositivo." };
    const existing = await prisma.clientPasskey.findFirst({ where: { tenantId: tenant.id, credentialId: verified.credential.id } });
    if (existing && existing.clientId !== client.id)
      return { success: false as const, error: "Esta credencial ya pertenece a otra cuenta." };
    const data = {
      publicKey: verified.credential.publicKey, algorithm: verified.credential.algorithm,
      transports: verified.credential.transports, counter: BigInt(verified.authenticator.counter || 0),
      authenticatorName: verified.authenticator.name || "Passkey",
    };
    if (existing) await prisma.clientPasskey.update({ where: { id: existing.id }, data });
    else await prisma.clientPasskey.create({ data: { ...data, tenantId: tenant.id, clientId: client.id, credentialId: verified.credential.id } });
    return { success: true as const };
  } catch (error) {
    console.error("Passkey registration finish:", error);
    return { success: false as const, error: "No se pudo registrar la credencial." };
  }
}

export async function removeClientPasskey(id: string) {
  const { tenant } = await context();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false as const, error: "Sesión vencida." };
  const result = await prisma.clientPasskey.deleteMany({ where: { id, tenantId: tenant.id, clientId: client.id } });
  return result.count ? { success: true as const } : { success: false as const, error: "No se encontró la credencial." };
}

export async function beginClientPasskeyAuthentication() {
  try {
    const { tenant, origin, rpId } = await context();
    const ip = await getRequestIp();
    if (!await consumeRateLimit("client-passkey-login", `${tenant.id}:${ip}`, 10, 15 * 60_000))
      return { success: false as const, error: "Demasiados intentos." };
    const challenge = server.randomChallenge();
    const record = await prisma.clientPasskeyChallenge.create({
      data: { tenantId: tenant.id, kind: "AUTHENTICATION", challenge, origin, rpId, expiresAt: new Date(Date.now() + ttlMs) },
    });
    return { success: true as const, challengeId: record.id, challenge, rpId };
  } catch (error) {
    console.error("Passkey login start:", error);
    return { success: false as const, error: "No se pudo iniciar la autenticación biométrica." };
  }
}

export async function finishClientPasskeyAuthentication(id: string, response: AuthenticationJSON) {
  try {
    const { tenant } = await context();
    const challenge = await consume(id, tenant.id, "AUTHENTICATION");
    if (!challenge) return { success: false as const, error: "La solicitud venció." };
    const passkey = await prisma.clientPasskey.findFirst({
      where: { tenantId: tenant.id, credentialId: response.id },
      include: { client: true },
    });
    if (!passkey || passkey.client.passwordSetupRequired)
      return { success: false as const, error: "No existe una credencial válida para la cuenta." };
    const verified = await server.verifyAuthentication(response, {
      id: passkey.credentialId, publicKey: passkey.publicKey, algorithm: passkey.algorithm as NamedAlgo,
      transports: (Array.isArray(passkey.transports) ? passkey.transports : []).filter(
        (item): item is ExtendedAuthenticatorTransport => typeof item === "string" && transports.has(item),
      ),
    }, {
      challenge: challenge.challenge, origin: challenge.origin, domain: challenge.rpId,
      userVerified: true, counter: Number(passkey.counter),
    });
    await prisma.clientPasskey.update({
      where: { id: passkey.id },
      data: { counter: BigInt(verified.counter || 0), lastUsedAt: new Date() },
    });
    await createSession(passkey.clientId, tenant.id);
    return { success: true as const };
  } catch (error) {
    console.error("Passkey login verification:", error);
    return { success: false as const, error: "No se pudo validar el ingreso biométrico." };
  }
}
