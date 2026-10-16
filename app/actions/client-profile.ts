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
