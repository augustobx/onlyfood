import "server-only";
import { getTenantDb } from "./tenant-db";
import { orderRequirements } from "./inventory-snapshot";
export async function stockOverview() {
  const db = await getTenantDb();
  const [ingredients, orders] = await Promise.all([
    db.ingredient.findMany({ orderBy:{name:"asc"}, include:{categories:true} }),
    db.order.findMany({ where:{stockCommitted:true,status:{notIn:["CANCELLED","DELIVERED"]}}, include:{items:{include:{removedIngredients:true,product:{include:{ingredients:{include:{ingredient:true}}}},secondHalfProduct:{include:{ingredients:{include:{ingredient:true}}}},comboItems:{include:{removedIngredients:true,product:{include:{ingredients:{include:{ingredient:true}}}}}}}}} }),
  ]);
  const reserved: Record<string,number> = {};
  for (const order of orders) for (const entry of orderRequirements(order)) reserved[entry.ingredientId] = (reserved[entry.ingredientId] || 0) + entry.required;
  return { ingredients, reserved };
}
