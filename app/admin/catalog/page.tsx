import { getTenantDb } from "@/lib/tenant-db";
import { CatalogClient } from "./CatalogClient";
import { requireAdmin } from "@/lib/admin-session";

export default async function CatalogPage({ searchParams }: { searchParams?: Promise<{ tab?: string, restock?: string }> }) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const db = await getTenantDb();
  const params = await searchParams;
  const requestedTab = params?.tab;
  const initialTab = ["products", "combos", "ingredients", "extras"].includes(requestedTab || "") ? requestedTab! : undefined;
  const categories = await db.category.findMany({
    orderBy: { sequence: 'asc' },
    include: {
      products: {
        orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
        include: {
          ingredients: { include: { ingredient: true } },
          extras: { include: { extra: true } },
          comboItemsConfig: true
        }
      }
    }
  });

  const allExtras = await db.extra.findMany({
    orderBy: { name: 'asc' }
  });

  const allIngredients = await db.ingredient.findMany({
    orderBy: { name: 'asc' },
    include: { categories: true }
  });
  const initialRestockId = allIngredients.some((ingredient) => ingredient.id === params?.restock) ? params?.restock : undefined;

  const allCombos = await db.product.findMany({
    where: { isCombo: true },
    orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
    include: { comboItemsConfig: { include: { product: true } } }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="text-muted-foreground">Administra tus categorías, productos, ingredientes y extras.</p>
      </div>

      <CatalogClient 
        initialCategories={categories} 
        allExtras={allExtras} 
        allIngredients={allIngredients} 
        allCombos={allCombos}
        initialTab={initialTab}
        initialRestockId={initialRestockId}
      />
    </div>
  );
}
