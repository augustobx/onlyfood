import { getTenantDb } from "@/lib/tenant-db";
import { notFound } from "next/navigation";
import { PrintTicketClient } from "./PrintTicketClient";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { requireTenantFeature } from "@/lib/features";
import { canDispatchPaidOrder } from "@/lib/order-integrity-policy";

/**
 * En las versiones más recientes de Next.js, 'params' es una Promise.
 * Definirlo como Promise<{ id: string }> soluciona el error de Type Check en el build.
 */
export default async function PrintTicketPage({
  params, searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ kind?: string }>
}) {
  await requireAdmin(["OWNER", "MANAGER", "STAFF", "KITCHEN", "CASHIER"]);
  const tenant = await getTenantContext();
  await requireTenantFeature(tenant.id, "orders");
  const db = await getTenantDb();
  // Esperamos a que los parámetros se resuelvan antes de usarlos
  const { id } = await params;
  const requested = (await searchParams)?.kind;
  const ticketKind = ["KITCHEN","COUNTER","ASSEMBLY"].includes(requested || "") ? requested as "KITCHEN"|"COUNTER"|"ASSEMBLY" : "ALL";

  const order = await db.order.findUnique({
    where: { id, tenantId: tenant.id },
    include: {
      items: {
        include: {
          product: { include: { category: true, ingredients: { include: { ingredient: true } } } },
          secondHalfProduct: { include: { category: true, ingredients: { include: { ingredient: true } } } },
          addedExtras: { include: { extra: true } },
          removedIngredients: { include: { ingredient: true } },
          comboItems: {
            include: {
              product: { include: { category: true, ingredients: { include: { ingredient: true } } } },
              removedIngredients: { include: { ingredient: true } },
            },
          },
        }
      }
    }
  });

  const config = await db.systemConfig.findFirst();

  if (!order || !canDispatchPaidOrder(order) || (ticketKind==="ASSEMBLY" && !config?.assemblyPrintEnabled)) return notFound();

  return <PrintTicketClient order={order} config={config} ticketKind={ticketKind} />;
}
