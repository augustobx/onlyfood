"use server";

import { getTenantDb } from "@/lib/tenant-db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { z } from "zod";

const idSchema = z.string().min(1).max(128);
const nameSchema = z.string().trim().min(1).max(250);

export async function addCategory(name: string) {
  await requireAdmin();
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) return { success: false, error: "Nombre inválido" };
  try {
    const db = await getTenantDb();
    await db.category.create({ data: { name: parsedName.data, isActive: true } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al crear categoría" }; }
}

export async function toggleCategory(id: string, isActive: boolean) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos inválidos" };
  try {
    const db = await getTenantDb();
    await db.category.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al actualizar categoría" }; }
}

export async function upsertProduct(data: {
  id?: string,
  name: string,
  basePrice: number,
  suggestedCost?: number,
  points?: number,
  description?: string,
  categoryId?: string | null,
  imageUrl?: string | null,
  ingredientsData?: { id: string, quantity: number }[],
  extraIds?: string[],
  allowHalf?: boolean,
  onlyHalf?: boolean,
  allowRemoveIngredients?: boolean,
  availableDays?: string | string[] | null,
  isCombo?: boolean,
  comboItemsData?: { id: string, quantity: number }[]
}) {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER"]);
  const parsed = z.object({
    id: idSchema.optional().nullable(),
    name: nameSchema,
    basePrice: z.coerce.number().min(0).max(10_000_000),
    suggestedCost: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
    points: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
    description: z.string().max(4000).optional().nullable().default(""),
    categoryId: idSchema.nullable().optional(),
    imageUrl: z.string().max(2048).optional().nullable().default(""),
    ingredientsData: z.array(z.object({ id: idSchema, quantity: z.coerce.number().positive().max(10000) })).max(200).optional().default([]),
    extraIds: z.array(idSchema).max(200).optional().default([]),
    allowHalf: z.boolean().optional().default(false),
    onlyHalf: z.boolean().optional().default(false),
    allowRemoveIngredients: z.boolean().optional().default(true),
    availableDays: z.union([z.string(), z.array(z.string())]).optional().nullable().default(""),
    isCombo: z.boolean().optional().default(false),
    comboItemsData: z.array(z.object({ id: idSchema, quantity: z.coerce.number().int().min(1).max(100) })).max(100).optional().default([]),
  }).safeParse(data);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join("; ");
    console.error("Error validando producto:", errorDetails);
    return { success: false, error: `Datos de producto inválidos (${errorDetails})` };
  }
  const cleanData = parsed.data;
  try {
    const db = await getTenantDb();
    const relationIds = {
      ingredients: [...new Set(cleanData.ingredientsData.map((item) => item.id))],
      extras: [...new Set(cleanData.extraIds)],
      comboProducts: [...new Set(cleanData.comboItemsData.map((item) => item.id))],
    };
    const [categoryCount, ingredientCount, extraCount, comboProductCount, existingProduct, productCount] = await Promise.all([
      cleanData.categoryId ? db.category.count({ where: { id: cleanData.categoryId } }) : 0,
      relationIds.ingredients.length ? db.ingredient.count({ where: { id: { in: relationIds.ingredients } } }) : 0,
      relationIds.extras.length ? db.extra.count({ where: { id: { in: relationIds.extras } } }) : 0,
      relationIds.comboProducts.length ? db.product.count({ where: { id: { in: relationIds.comboProducts }, isCombo: false } }) : 0,
      cleanData.id ? db.product.findFirst({ where: { id: cleanData.id }, select: { id: true } }) : null,
      cleanData.id ? 0 : db.product.count(),
    ]);
    if (
      (cleanData.categoryId && categoryCount !== 1) ||
      ingredientCount !== relationIds.ingredients.length ||
      extraCount !== relationIds.extras.length ||
      comboProductCount !== relationIds.comboProducts.length ||
      (cleanData.id && !existingProduct)
    ) throw new Error("INVALID_TENANT_RELATION");
    if (!cleanData.id && productCount >= tenant.plan.maxProducts) throw new Error("PLAN_PRODUCT_LIMIT");
    const daysString = Array.isArray(cleanData.availableDays)
      ? cleanData.availableDays.join(",")
      : (cleanData.availableDays || "");

    const payload = {
      name: cleanData.name,
      basePrice: cleanData.basePrice,
      suggestedCost: cleanData.suggestedCost || 0,
      points: cleanData.points,
      description: cleanData.description,
      imageUrl: cleanData.imageUrl || "",
      allowHalf: cleanData.allowHalf,
      onlyHalf: cleanData.onlyHalf,
      allowRemoveIngredients: cleanData.allowRemoveIngredients,
      availableDays: daysString,
      isCombo: cleanData.isCombo,
    };

    if (cleanData.id) {
      // Update logic: clear previous relations and update
      await db.$transaction([
        db.productIngredient.deleteMany({ where: { productId: cleanData.id } }),
        db.productExtra.deleteMany({ where: { productId: cleanData.id } }),
        db.productComboItem.deleteMany({ where: { comboId: cleanData.id } }),
        db.product.update({
          where: { id: cleanData.id },
          data: {
             ...payload,
             categoryId: cleanData.categoryId || null,
             ingredients: { create: cleanData.ingredientsData.map(ing => ({ ingredientId: ing.id, isRemovable: true, quantity: ing.quantity })) },
             extras: { create: cleanData.extraIds.map(id => ({ extraId: id })) },
             comboItemsConfig: cleanData.isCombo ? { create: cleanData.comboItemsData.map(item => ({ productId: item.id, quantity: item.quantity })) } : undefined
          }
        })
      ]);
    } else {
      // Create logic
      await db.product.create({
        data: {
          ...payload,
          tenantId: tenant.id,
          isActive: true,
          sequence: productCount,
          categoryId: cleanData.categoryId || null,
          ingredients: { create: cleanData.ingredientsData.map(ing => ({ ingredientId: ing.id, isRemovable: true, quantity: ing.quantity })) },
          extras: { create: cleanData.extraIds.map(id => ({ extraId: id })) },
          comboItemsConfig: cleanData.isCombo ? { create: cleanData.comboItemsData.map(item => ({ productId: item.id, quantity: item.quantity })) } : undefined
        }
      });
    }

    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar producto en BD:", error);
    const message = error?.message === "PLAN_PRODUCT_LIMIT"
      ? `Alcanzaste el límite de ${tenant.plan.maxProducts} productos de tu plan.`
      : error?.message === "INVALID_TENANT_RELATION"
        ? "Una categoría, ingrediente, extra o producto pertenece a otro comercio o ya no existe."
        : "Error al guardar producto en base de datos";
    return { success: false, error: message };
  }
}

export async function toggleProduct(id: string, isActive: boolean) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos invalidos" };
  try {
    const db = await getTenantDb();
    await db.product.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al actualizar producto" }; }
}

export async function toggleProductImage(id: string, showImage: boolean) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof showImage !== "boolean") return { success: false, error: "Datos invalidos" };
  try {
    const db = await getTenantDb();
    await db.product.update({ where: { id }, data: { showImage } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al actualizar mostrar imagen" }; }
}

export async function reorderProducts(input: { categoryId?: string | null; isCombo?: boolean; productIds: string[] }) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsed = z.object({
    categoryId: idSchema.nullable().optional(),
    isCombo: z.boolean().optional().default(false),
    productIds: z.array(idSchema).max(10_000),
  }).safeParse(input);
  if (!parsed.success || new Set(parsed.data.productIds).size !== parsed.data.productIds.length) {
    return { success: false, error: "El orden de productos no es válido." };
  }
  try {
    const db = await getTenantDb();
    const where = parsed.data.isCombo
      ? { isCombo: true }
      : { isCombo: false, categoryId: parsed.data.categoryId || null };
    const existing = await db.product.findMany({ where, select: { id: true } });
    const existingIds = new Set(existing.map((product) => product.id));
    if (existing.length !== parsed.data.productIds.length || parsed.data.productIds.some((id) => !existingIds.has(id))) {
      return { success: false, error: "El catálogo cambió. Recargá la página antes de ordenar." };
    }
    await db.$transaction(parsed.data.productIds.map((id, sequence) => db.product.update({ where: { id }, data: { sequence } })));
    revalidatePath("/admin/catalog");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error al ordenar productos:", error);
    return { success: false, error: "No se pudo guardar el orden de productos." };
  }
}

export async function addIngredient(data: { name: string, categoryIds: string[], purchaseVolume: string, purchasePrice: number, yieldUnits: number }) {
  await requireAdmin();
  const parsed = z.object({ name: nameSchema, categoryIds: z.array(idSchema).max(100), purchaseVolume: z.string().trim().max(100), purchasePrice: z.number().min(0).max(10_000_000), yieldUnits: z.number().positive().max(1_000_000) }).strict().safeParse(data);
  if (!parsed.success) return { success: false, error: "Datos de ingrediente invalidos." };
  data = parsed.data;
  try {
    const db = await getTenantDb();
    const costPerUnit = data.yieldUnits > 0 ? data.purchasePrice / data.yieldUnits : 0;

    await db.ingredient.create({
      data: {
        name: data.name,
        purchaseVolume: data.purchaseVolume,
        purchasePrice: data.purchasePrice,
        yieldUnits: data.yieldUnits,
        costPerUnit: costPerUnit,
        stock: data.yieldUnits,
        categories: {
          create: data.categoryIds.map(id => ({ categoryId: id }))
        }
      }
    });
    revalidatePath("/admin/catalog");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al crear ingrediente." };
  }
}

export async function restockIngredient(id: string, purchasePrice: number, yieldUnits: number, purchaseVolume: string) {
  await requireAdmin();
  const parsed = z.object({ id: idSchema, purchasePrice: z.number().min(0).max(10_000_000), yieldUnits: z.number().positive().max(1_000_000), purchaseVolume: z.string().trim().max(100) }).safeParse({ id, purchasePrice, yieldUnits, purchaseVolume });
  if (!parsed.success) return { success: false, error: "Datos de reposicion invalidos." };
  try {
    const db = await getTenantDb();
    const costPerUnit = yieldUnits > 0 ? purchasePrice / yieldUnits : 0;
    await db.ingredient.update({
      where: { id },
      data: {
        purchasePrice,
        yieldUnits,
        purchaseVolume,
        costPerUnit,
        stock: { increment: yieldUnits }
      }
    });
    revalidatePath("/admin/catalog");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al recargar stock." };
  }
}

export async function toggleIngredient(id: string, isActive: boolean) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos invalidos" };
  try {
    const db = await getTenantDb();
    await db.ingredient.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al actualizar ingrediente" }; }
}

export async function upsertExtra(
  name: string,
  price: number,
  id?: string,
  groupName: string = "Extras",
  selectionType: "SINGLE" | "MULTIPLE" = "MULTIPLE"
) {
  await requireAdmin();
  const parsed = z.object({
    name: nameSchema,
    price: z.number().min(0).max(10_000_000),
    id: idSchema.optional(),
    groupName: z.string().trim().min(1).max(100).default("Extras"),
    selectionType: z.enum(["SINGLE", "MULTIPLE"]).default("MULTIPLE"),
  }).safeParse({ name, price, id, groupName, selectionType });

  if (!parsed.success) return { success: false, error: "Datos de extra invalidos" };
  const data = parsed.data;

  try {
    const db = await getTenantDb();
    if (data.id) {
      await db.extra.update({
        where: { id: data.id },
        data: {
          name: data.name,
          price: data.price,
          groupName: data.groupName,
          selectionType: data.selectionType,
        },
      });
    } else {
      await db.extra.create({
        data: {
          name: data.name,
          price: data.price,
          groupName: data.groupName,
          selectionType: data.selectionType,
          isActive: true,
        },
      });
    }
    revalidatePath("/admin/catalog");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al guardar extra" };
  }
}

export async function toggleExtra(id: string, isActive: boolean) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return { success: false, error: "Datos invalidos" };
  try {
    const db = await getTenantDb();
    await db.extra.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al actualizar extra" }; }
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido" };
  try {
    const db = await getTenantDb();
    await db.category.delete({ where: { id } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al eliminar categoría. Verifica si tiene productos." }; }
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido" };
  try {
    const db = await getTenantDb();
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al eliminar producto." }; }
}

export async function deleteIngredient(id: string) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido" };
  try {
    const db = await getTenantDb();
    await db.ingredient.delete({ where: { id } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al eliminar ingrediente." }; }
}

export async function deleteExtra(id: string) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "ID invalido" };
  try {
    const db = await getTenantDb();
    await db.extra.delete({ where: { id } });
    revalidatePath("/admin/catalog"); revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false, error: "Error al eliminar extra." }; }
}
