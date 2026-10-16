"use server";

import { z } from "zod";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { isDailyProduct } from "@/lib/weekly-menu";

const idsSchema = z.array(z.string().uuid()).max(40);
export async function getOptionalCartSuggestions(excludedIds: string[]) {
  const parsed = idsSchema.safeParse(excludedIds);
  if (!parsed.success) return [];
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);
  const currentProducts = parsed.data.length ? await db.product.findMany({
    where: { id: { in: parsed.data } }, select: { categoryId: true },
  }) : [];
  const occupied = new Set(currentProducts.map(p => p.categoryId));
  const candidates = await db.product.findMany({
    where: { isActive: true, isCombo: false, id: { notIn: parsed.data } },
    select: { id:true,name:true,basePrice:true,availableDays:true,categoryId:true },
    orderBy: [{ sequence:"asc" }],
    take: 50,
  });
  const daily = candidates.filter(p => isDailyProduct(p.availableDays));
  // Productos de otras categorías primero para proponer acompañamientos,
  // sin prometer que existe una recomendación personalizada por IA.
  const ranked = [...daily.filter(p => !occupied.has(p.categoryId)), ...daily.filter(p => occupied.has(p.categoryId))];
  return ranked.slice(0,4).map(({id,name,basePrice}) => ({id,name,basePrice}));
}
