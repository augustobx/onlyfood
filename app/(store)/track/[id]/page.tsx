import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TrackOrderClient } from "./TrackOrderClient";

export default async function TrackOrderPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status?: string; payment_id?: string }>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const [order, config] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            addedExtras: { include: { extra: true } },
            removedIngredients: { include: { ingredient: true } },
          },
        },
        messenger: true,
      },
    }),
    prisma.systemConfig.findFirst(),
  ]);

  if (!order) return notFound();

  // Find related active or scheduled orders (e.g. from the same weekly bowl plan or client)
  let relatedOrders: any[] = [];
  try {
    relatedOrders = await prisma.order.findMany({
      where: {
        AND: [
          { id: { not: order.id } },
          { status: { not: "CANCELLED" } },
          {
            OR: [
              ...(order.mpPreferenceId ? [{ mpPreferenceId: order.mpPreferenceId }] : []),
              ...(order.clientId ? [{ clientId: order.clientId }] : []),
              ...(order.clientPhone ? [{ clientPhone: order.clientPhone }] : []),
            ],
          },
        ],
      },
      orderBy: [
        { scheduledDate: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        scheduledDate: true,
        scheduledTime: true,
        orderType: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
      take: 10,
    });
  } catch (err) {
    console.error("Error finding related orders:", err);
  }

  const deliveryCost = order.needsDelivery
    ? config?.deliveryCost || 0
    : 0;

  return (
    <TrackOrderClient
      order={order}
      relatedOrders={relatedOrders}
      config={config}
      deliveryCost={deliveryCost}
      searchParams={searchParams}
    />
  );
}
