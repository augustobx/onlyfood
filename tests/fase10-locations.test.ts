import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTenantLocation, getTenantLocations } from '@/lib/locations';

describe('FASE 10: Multi-Branch & Location Architecture', () => {
  it('should allow multiple branches for a tenant while sharing catalog', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'beats' },
      include: { locations: true },
    });

    // Ensure Branch 2 (norte)
    const branchNorte = await prisma.location.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: 'norte',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Sucursal Zona Norte',
        code: 'norte',
        address: 'Av. Libertador 4500',
        phone: '+5491133334444',
        isMain: false,
      },
    });

    const locations = await getTenantLocations(tenant.id);
    expect(locations.length).toBeGreaterThanOrEqual(2);

    const mainLoc = locations.find((l) => l.isMain);
    expect(mainLoc).toBeDefined();

    // Create Order in Branch Norte
    const orderNorte = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        locationId: branchNorte.id,
        clientName: 'Cliente Norte',
        clientPhone: '+5491177778888',
        needsDelivery: true,
        deliveryAddress: 'Av. Libertador 4520',
        total: 14000,
        paymentMethod: 'CASH',
        status: 'NEW',
      },
    });

    expect(orderNorte.locationId).toBe(branchNorte.id);

    // Query orders for Branch Norte only
    const ordersNorte = await prisma.order.findMany({
      where: { tenantId: tenant.id, locationId: branchNorte.id },
    });
    expect(ordersNorte.some((o) => o.id === orderNorte.id)).toBe(true);

    // Query orders for Main Location -> should NOT include orderNorte
    const ordersMain = await prisma.order.findMany({
      where: { tenantId: tenant.id, locationId: mainLoc!.id },
    });
    expect(ordersMain.some((o) => o.id === orderNorte.id)).toBe(false);
  });

  it('should enforce plan maxLocations limits', async () => {
    // Create a single-location tenant on STARTER plan
    const starterPlan = await prisma.plan.upsert({
      where: { code: 'STARTER' },
      update: { maxLocations: 1 },
      create: {
        code: 'STARTER',
        name: 'Plan Inicial',
        maxLocations: 1,
        maxProducts: 50,
        features: ['orders'],
      },
    });

    const singleLocTenant = await prisma.tenant.upsert({
      where: { slug: 'singleloc' },
      update: {},
      create: {
        slug: 'singleloc',
        name: 'Comercio Una Sucursal',
        status: 'ACTIVE',
        subscription: {
          create: {
            planId: starterPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        locations: {
          create: { name: 'Sede Única', code: 'main', isMain: true },
        },
      },
    });

    // Attempt to add a 2nd location -> must throw PLAN_LIMIT_REACHED
    await expect(
      createTenantLocation(singleLocTenant.id, {
        name: 'Segunda Sucursal Prohibida',
        code: 'segunda',
      })
    ).rejects.toThrow(/PLAN_LIMIT_REACHED/);
  });
});
