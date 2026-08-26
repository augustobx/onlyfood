import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintTicketClient } from "./PrintTicketClient";
import { requireAdmin } from "@/lib/admin-session";

/**
 * En las versiones más recientes de Next.js, 'params' es una Promise.
 * Definirlo como Promise<{ id: string }> soluciona el error de Type Check en el build.
 */
export default async function PrintTicketPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin();
  // Esperamos a que los parámetros se resuelvan antes de usarlos
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          addedExtras: { include: { extra: true } },
          removedIngredients: { include: { ingredient: true } }
        }
      }
    }
  });

  const config = await prisma.systemConfig.findFirst();

  if (!order) return notFound();

  return <PrintTicketClient order={order} config={config} />;
}
