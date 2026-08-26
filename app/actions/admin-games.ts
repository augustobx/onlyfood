"use server";

import { z } from "zod";
import { getTenantDb } from "@/lib/tenant-db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";

const idSchema = z.string().uuid();
const refresh = () => { revalidatePath("/admin/games"); revalidatePath("/"); };

export async function toggleRoulette(isActive: boolean) {
  await requireAdmin();
  if (typeof isActive !== "boolean") return { success: false, error: "Estado invalido." };
  const db = await getTenantDb();
  const config = await db.systemConfig.findFirst({ select: { id: true } });
  if (!config) return { success: false, error: "Falta la configuracion del sistema." };
  await db.systemConfig.update({ where: { id: config.id }, data: { isRouletteActive: isActive } });
  refresh(); return { success: true };
}

export async function updateRouletteCost(cost: number) {
  await requireAdmin();
  const parsed = z.number().int().min(0).max(1_000_000).safeParse(cost);
  if (!parsed.success) return { success: false, error: "Costo invalido." };
  const db = await getTenantDb();
  const config = await db.systemConfig.findFirst({ select: { id: true } });
  if (!config) return { success: false, error: "Falta la configuracion del sistema." };
  await db.systemConfig.update({ where: { id: config.id }, data: { rouletteCost: parsed.data } });
  refresh(); return { success: true };
}

export async function addRoulettePrize(data: unknown) {
  await requireAdmin();
  const parsed = z.object({
    name: z.string().trim().min(1).max(100), probability: z.coerce.number().positive().max(100),
    type: z.enum(["PRODUCT", "PERCENT", "AMOUNT"]), value: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
    productId: idSchema.nullable().optional(), bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }).strict().safeParse(data);
  if (!parsed.success) return { success: false, error: "Premio invalido." };
  if (parsed.data.type === "PRODUCT" && !parsed.data.productId) return { success: false, error: "Selecciona el producto del premio." };
  if (parsed.data.type !== "PRODUCT" && parsed.data.value == null) return { success: false, error: "Ingresa el valor del premio." };
  const db = await getTenantDb();
  const totalProbability = await db.roulettePrize.aggregate({ _sum: { probability: true } });
  if ((totalProbability._sum.probability || 0) + parsed.data.probability > 100.0001) return { success: false, error: "La probabilidad total no puede superar 100%." };
  await db.roulettePrize.create({ data: { ...parsed.data, value: parsed.data.type === "PRODUCT" ? null : parsed.data.value, productId: parsed.data.type === "PRODUCT" ? parsed.data.productId : null } });
  refresh(); return { success: true };
}

export async function deleteRoulettePrize(id: string) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido." };
  try { const db = await getTenantDb(); await db.roulettePrize.delete({ where: { id } }); refresh(); return { success: true }; }
  catch { return { success: false, error: "No se puede eliminar un premio que ya fue ganado." }; }
}
