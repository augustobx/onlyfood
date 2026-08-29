import { getTenantDb } from "@/lib/tenant-db";
import { notFound } from "next/navigation";
import { PrintTicketClient } from "./PrintTicketClient";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";

/**
 * En las versiones más recientes de Next.js, 'params' es una Promise.
 * Definirlo como Promise<{ id: string }> soluciona el error de Type Check en el build.
 */
export default async function PrintTicketPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin(["OWNER", "MANAGER", "STAFF", "KITCHEN", "CASHIER"]);
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "orders");
  const db = await getTenantDb();
  // Esperamos a que los parámetros se resuelvan antes de usarlos
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { include: { ingredients: { include: { ingredient: true } } } },
          secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
          addedExtras: { include: { extra: true } },
          removedIngredients: { include: { ingredient: true } },
          comboItems: {
            include: {
              product: { include: { ingredients: { include: { ingredient: true } } } },
              removedIngredients: { include: { ingredient: true } },
            },
          },
        }
      }
    }
  });

  const config = await db.systemConfig.findFirst();

  if (!order) return notFound();

  return <PrintTicketClient order={order} config={config} />;
}
