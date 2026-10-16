import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient } from "@/lib/auth";
import { createTenantDb } from "@/lib/tenant-db";
import { FavoriteButton } from "@/components/pwa/FavoriteButton";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-10">
      <section className="rounded-3xl border border-orange-300/30 bg-white p-8 text-center text-slate-900 shadow-lg">
        <Heart className="mx-auto h-11 w-11 text-rose-500"/>
        <h1 className="mt-3 text-2xl font-black">Tus favoritos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Iniciá sesión desde la tienda para guardar tus platos preferidos y encontrarlos acá.
        </p>
        <Link href="/" className="mt-4 inline-flex rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white">
          Ir a la tienda
        </Link>
      </section>
    </main>
  );
  const db = createTenantDb(tenant.id);
  const favorites = await db.clientFavorite.findMany({
    where: { clientId: client.id, product: { isActive: true } },
    include: { product: { select: {
      id: true, name: true, description: true, imageUrl: true,
      showImage: true, basePrice: true, availableDays: true,
    } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <main className="mx-auto max-w-3xl px-4 pb-36 pt-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-widest text-orange-500">Para tu próxima compra</p>
        <h1 className="mt-1 text-3xl font-black">Mis favoritos</h1>
        <p className="mt-2 text-sm opacity-75">Encontrá y personalizá tus pedidos preferidos.</p>
      </div>
      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-black/10 p-8 text-center">
          <Heart className="mx-auto mb-2 h-9 w-9 text-rose-500"/>
          <p className="font-bold">Todavía no tenés favoritos.</p>
          <Link href="/" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-500">
            Explorar el menú <ArrowRight className="h-4 w-4"/>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map(({ id, product }) => (
            <article key={id} className="min-w-0 rounded-2xl border border-white/15 bg-black/10 p-4">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-black">{product.name}</h2>
                  <p className="mt-1 line-clamp-2 text-xs opacity-70">{product.description}</p>
                </div>
                <FavoriteButton productId={product.id} compact/>
              </div>
              <p className="mt-3 text-sm font-black text-orange-500">
                ${product.basePrice.toLocaleString("es-AR")}
              </p>
              <Link href={`/product/${product.id}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black text-white">
                Ver y personalizar <ArrowRight className="h-4 w-4"/>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
