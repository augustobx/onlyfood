"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient } from "@/lib/auth";
import { createTenantDb } from "@/lib/tenant-db";
import { getRequestIp, consumeRateLimit } from "@/lib/request-security";
import { canQuickReorder } from "@/lib/pwa-order-helpers";
import { isDailyProduct } from "@/lib/weekly-menu";

const idSchema = z.string().uuid();

export async function getFavoriteProductIds() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return [];
  const db = createTenantDb(tenant.id);
  const favorite = await db.clientFavorite.findMany({
    where: { clientId: client.id }, select: { productId: true }, take: 100,
  });
  return favorite.map(f => f.productId);
}

export async function toggleProductFavorite(idInput: string) {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false as const, error: "Iniciá sesión para guardar favoritos." };
  const id = idSchema.safeParse(idInput);
  if (!id.success) return { success: false as const, error: "Producto inválido." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-favorite", `${tenant.id}:${client.id}:${ip}`, 50, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados cambios. Probá más tarde." };
  }
  const db = createTenantDb(tenant.id);
  const old = await db.clientFavorite.findFirst({
    where: { clientId: client.id, productId: id.data }, select: { id: true },
  });
  if (old) {
    await db.clientFavorite.deleteMany({ where: { id: old.id, clientId: client.id } });
    revalidatePath("/favorites");
    return { success: true as const, favorite: false };
  }
  const product = await db.product.findFirst({
    where: { id: id.data, isActive: true }, select: { id: true },
  });
  if (!product) return { success: false as const, error: "El producto ya no está disponible." };
  try {
    await db.clientFavorite.create({ data: { clientId: client.id, productId: product.id } });
  } catch {
    return { success: false as const, error: "No se pudo guardar este favorito." };
  }
  revalidatePath("/favorites");
  return { success: true as const, favorite: true };
}

export async function getReorderPreview(orderIdInput: string) {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return { success: false as const, error: "Iniciá sesión para repetir un pedido." };
  const id = idSchema.safeParse(orderIdInput);
  if (!id.success) return { success: false as const, error: "Pedido inválido." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("reorder-preview", `${tenant.id}:${client.id}:${ip}`, 30, 60 * 60_000)) {
    return { success: false as const, error: "Demasiadas consultas. Probá más tarde." };
  }
  const db = createTenantDb(tenant.id);
  const order = await db.order.findFirst({
    where: { id: id.data, clientId: client.id },
    select: {
      id: true,
      items: {
        select: {
          id: true, productId: true, quantity: true, isHalfAndHalf: true, notes: true,
          addedExtras: { select: { extraId: true } },
          removedIngredients: { select: { ingredientId: true } },
          comboItems: { select: { id: true } },
          product: { select: { name: true } },
        },
      },
    },
  });
  if (!order) return { success: false as const, error: "No encontramos ese pedido en tu cuenta." };
  const productIds = [...new Set(order.items.map(i => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: {
      ingredients: { include: { ingredient: true } },
      extras: { include: { extra: true } },
      comboItemsConfig: {
        include: { product: { include: { ingredients: { include: { ingredient: true } } } } },
      },
    },
  });
  const byId = new Map(products.map(p => [p.id, p]));
  const rows = order.items.map(item => {
    const product = byId.get(item.productId);
    const quick = Boolean(product && canQuickReorder({
      isActive: product.isActive,
      availableToday: isDailyProduct(product.availableDays),
      isHalfAndHalf: item.isHalfAndHalf,
      hasExtras: item.addedExtras.length > 0,
      hasRemovedIngredients: item.removedIngredients.length > 0,
      hasCombo: item.comboItems.length > 0 || product.isCombo,
    }));
    return {
      id: item.id,
      name: product?.name || item.product.name,
      quantity: Math.min(item.quantity, 50),
      quick,
      reason: !product?.isActive ? "No disponible" : quick ? null : "Revisar personalización y disponibilidad",
      productId: item.productId,
      // Precio y producto siempre desde el catálogo actual, nunca de la compra anterior.
      product: quick ? product : null,
    };
  });
  return { success: true as const, items: rows };
}
