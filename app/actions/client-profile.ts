"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient } from "@/lib/auth";
import { createTenantDb } from "@/lib/tenant-db";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";

const nameSchema = z.string().trim().min(1).max(80);

export async function saveClientProfileName(nameInput: string) {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false as const, error: "Iniciá sesión para editar tus datos." };
  const parsed = nameSchema.safeParse(nameInput);
  if (!parsed.success) return { success: false as const, error: "Ingresá un nombre de hasta 80 caracteres." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-profile-edit", `${tenant.id}:${client.id}:${ip}`, 12, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados cambios. Probá más tarde." };
  }
  const db = createTenantDb(tenant.id);
  await db.client.update({ where: { id: client.id }, data: { name: parsed.data } });
  revalidatePath("/profile");
  return { success: true as const, name: parsed.data };
}


/** Retorna solo datos necesarios para el alta guiada, nunca contraseñas ni DNI. */
export async function getClientOnboardingStatus() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return null;
  const db = createTenantDb(tenant.id);
  const passkeyCount = await db.clientPasskey.count({ where: { clientId: client.id } });
  return {
    clientId: client.id,
    email: client.email,
    emailVerified: Boolean(client.emailVerifiedAt),
    dniProvided: Boolean(client.dniProvidedAt),
    hasPasskey: passkeyCount > 0,
  };
}

/**
 * DNI ingresado sin conservar el número. El paso NO implica validación
 * de identidad ni reconocimiento facial del titular del documento.
 */
export async function completeClientDniStep(dniInput: string) {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false as const, error: "Iniciá sesión para continuar." };
  const dni = z.string().trim().regex(/^[0-9]{7,8}$/).safeParse(dniInput);
  if (!dni.success) return { success: false as const, error: "Ingresá un DNI de 7 u 8 dígitos." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-dni-step", `${tenant.id}:${client.id}:${ip}`, 6, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados intentos. Probá más tarde." };
  }
  const db = createTenantDb(tenant.id);
  await db.client.updateMany({
    where: { id: client.id, dniProvidedAt: null },
    data: { dniProvidedAt: new Date() },
  });
  revalidatePath("/profile");
  return { success: true as const };
}
