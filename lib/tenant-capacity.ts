import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { lockTenant } from "./control-plane";

export function withProductCapacity<T>(tenantId: string, create: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await lockTenant(tx, tenantId);
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, include: { subscription: { include: { plan: true } } } });
    const count = await tx.product.count({ where: { tenantId } });
    if (count >= (tenant.subscription?.plan.maxProducts || 100)) throw Error("PLAN_PRODUCT_LIMIT");
    return create(tx);
  });
}
