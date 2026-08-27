"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { recordAuditLog } from "@/lib/audit";
import { getTenantDb } from "@/lib/tenant-db";
import { requireTenantFeature } from "@/lib/features";

const idSchema = z.string().uuid();
const promotionSchema = z.object({
  id: idSchema.optional().nullable(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  minQuantity: z.coerce.number().int().min(2).max(1000),
  type: z.enum(["PERCENT", "FINAL_PRICE"]),
  value: z.coerce.number().positive().max(100_000_000),
  priority: z.coerce.number().int().min(-10_000).max(10_000).default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean(),
  productIds: z.array(idSchema).min(1).max(500),
}).superRefine((value, context) => {
  if (value.type === "PERCENT" && value.value > 100) {
    context.addIssue({ code: "custom", path: ["value"], message: "El porcentaje no puede superar 100." });
  }
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "La fecha final debe ser posterior al inicio." });
  }
});

export async function upsertQuantityDiscountAction(input: unknown) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "quantityDiscounts");
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." };

  try {
    const db = await getTenantDb();
    const data = parsed.data;
    const productIds = [...new Set(data.productIds)];
    const productCount = await db.product.count({ where: { id: { in: productIds } } });
    if (productCount !== productIds.length) return { success: false, error: "Uno de los productos no pertenece al comercio." };

    const basePayload = {
      name: data.name,
      description: data.description || null,
      minQuantity: data.minQuantity,
      type: data.type,
      value: data.value,
      priority: data.priority,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
    };

    const promotion = data.id
      ? await db.quantityDiscount.update({
          where: { id: data.id },
          data: {
            ...basePayload,
            products: {
              deleteMany: {},
              create: productIds.map((productId) => ({ productId })),
            },
          },
        })
      : await db.quantityDiscount.create({
          data: {
            ...basePayload,
            tenantId: tenant.id,
            products: { create: productIds.map((productId) => ({ productId })) },
          },
        });

    await recordAuditLog({
      tenantId: tenant.id,
      userId: user.id,
      action: data.id ? "QUANTITY_DISCOUNT_UPDATED" : "QUANTITY_DISCOUNT_CREATED",
      resource: "QuantityDiscount",
      details: { id: promotion.id, name: data.name, minQuantity: data.minQuantity, type: data.type, value: data.value, productIds },
    });
    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidatePath("/cart");
    revalidatePath("/checkout");
    return { success: true };
  } catch (error) {
    console.error("Quantity discount save error:", error);
    return { success: false, error: "No se pudo guardar la promoción." };
  }
}

export async function toggleQuantityDiscountAction(id: string, isActive: boolean) {
  const { tenant, user } = await requireAdmin(["OWNER", "MANAGER"]);
  await requireTenantFeature(tenant.id, "quantityDiscounts");
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos inválidos." };
  try {
    const db = await getTenantDb();
    await db.quantityDiscount.update({ where: { id }, data: { isActive } });
    await recordAuditLog({ tenantId: tenant.id, userId: user.id, action: "QUANTITY_DISCOUNT_STATUS_CHANGED", resource: "QuantityDiscount", details: { id, isActive } });
    revalidatePath("/admin/promotions");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar la promoción." };
  }
}
