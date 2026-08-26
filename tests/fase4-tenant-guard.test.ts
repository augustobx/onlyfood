import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTenantDb } from '@/lib/tenant-db';

describe('FASE 4: Prisma Tenant Guard Isolation Tests', () => {
  it('should auto-inject tenantId on create and isolate reads/writes/deletes between tenants', async () => {
    // 1. Get Tenant A and Tenant B
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    const tenantDbA = createTenantDb(tenantA.id);
    const tenantDbB = createTenantDb(tenantB.id);

    // 2. Tenant A creates Category and Product WITHOUT manually passing tenantId
    const catA = await tenantDbA.category.create({
      data: {
        name: 'Categoría Auto Tenant A',
        sequence: 10,
      } as any,
    });

    expect(catA.tenantId).toBe(tenantA.id);

    const prodA = await tenantDbA.product.create({
      data: {
        categoryId: catA.id,
        name: 'Super Burger Tenant A',
        basePrice: 9500,
      } as any,
    });

    expect(prodA.tenantId).toBe(tenantA.id);

    // 3. Tenant B attempts to read Product A
    const tenantBProducts = await tenantDbB.product.findMany();
    expect(tenantBProducts.some((p) => p.id === prodA.id)).toBe(false);

    const findResultFromB = await tenantDbB.product.findUnique({
      where: { id: prodA.id },
    });
    expect(findResultFromB).toBeNull();

    // 4. Tenant B attempts to UPDATE Product A -> must fail with ACCESO_DENEGADO
    await expect(
      tenantDbB.product.update({
        where: { id: prodA.id },
        data: { name: 'Nombre Modificado Ilegalmente' },
      })
    ).rejects.toThrow(/ACCESO_DENEGADO/);

    // 5. Tenant B attempts to DELETE Product A -> must fail with ACCESO_DENEGADO
    await expect(
      tenantDbB.product.delete({
        where: { id: prodA.id },
      })
    ).rejects.toThrow(/ACCESO_DENEGADO/);

    // 6. Tenant A reads, updates, and deletes Product A successfully
    const findResultFromA = await tenantDbA.product.findUnique({
      where: { id: prodA.id },
    });
    expect(findResultFromA).not.toBeNull();
    expect(findResultFromA?.name).toBe('Super Burger Tenant A');

    const updatedByA = await tenantDbA.product.update({
      where: { id: prodA.id },
      data: { name: 'Super Burger Tenant A Editada' },
    });
    expect(updatedByA.name).toBe('Super Burger Tenant A Editada');

    const deletedByA = await tenantDbA.product.delete({
      where: { id: prodA.id },
    });
    expect(deletedByA.id).toBe(prodA.id);

    const verifyDeleted = await tenantDbA.product.findUnique({
      where: { id: prodA.id },
    });
    expect(verifyDeleted).toBeNull();
  });

  it('should isolate orders between tenants in tenantDb', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    const tenantDbA = createTenantDb(tenantA.id);
    const tenantDbB = createTenantDb(tenantB.id);

    const orderA = await tenantDbA.order.create({
      data: {
        clientName: 'Cliente Guard Test',
        clientPhone: '+5491100001111',
        needsDelivery: false,
        total: 5000,
        paymentMethod: 'CASH',
        status: 'NEW',
      } as any,
    });

    expect(orderA.tenantId).toBe(tenantA.id);

    const ordersFromB = await tenantDbB.order.findMany();
    expect(ordersFromB.some((o) => o.id === orderA.id)).toBe(false);

    const orderFromB = await tenantDbB.order.findUnique({ where: { id: orderA.id } });
    expect(orderFromB).toBeNull();
  });
});
