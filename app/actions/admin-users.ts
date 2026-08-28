"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

export async function updateUserPoints(clientId: string, points: number) {
  await requireAdmin();
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "loyalty");
  const parsed = z.object({ clientId: z.string().min(1).max(100), points: z.number().int().min(0).max(100_000_000) }).safeParse({ clientId, points });
  if (!parsed.success) return { success: false, error: "Datos inválidos." };
  try {
    const db = await getTenantDb();
    await db.client.update({ where: { id: parsed.data.clientId }, data: { points: parsed.data.points } });
    revalidatePath("/admin/users"); return { success: true };
  } catch { return { success: false, error: "No se pudieron actualizar los puntos." }; }
}
