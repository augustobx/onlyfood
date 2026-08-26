import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('FASE 2: Multi-Tenant Entities & Scoped Uniqueness', () => {
  it('should allow two tenants to have customers with the same phone number', async () => {
    // 1. Ensure Tenant A (beats)
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });

    // 2. Create Tenant B (roma)
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: 'PRO' } });
    const tenantB = await prisma.tenant.upsert({
      where: { slug: 'roma' },
      update: {},
      create: {
        slug: 'roma',
        name: 'Pizzeria Roma',
        status: 'ACTIVE',
        locations: {
          create: { name: 'Central', code: 'main' },
        },
        domains: {
          create: { hostname: 'roma.producto.nanolabs.app', isPrimary: true },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const sharedPhone = '+5491199998888';

    // 3. Create customer in Tenant A
    const clientA = await prisma.client.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenantA.id,
          phone: sharedPhone,
        },
      },
      update: { points: 150 },
      create: {
        tenantId: tenantA.id,
        phone: sharedPhone,
        password: 'hashPasswordA',
        name: 'Cliente Beats',
        points: 150,
      },
    });

    // 4. Create customer in Tenant B with the SAME phone number
    const clientB = await prisma.client.upsert({
      where: {
        tenantId_phone: {
          tenantId: tenantB.id,
          phone: sharedPhone,
        },
      },
      update: { points: 50 },
      create: {
        tenantId: tenantB.id,
        phone: sharedPhone,
        password: 'hashPasswordB',
        name: 'Cliente Roma',
        points: 50,
      },
    });

    expect(clientA.id).not.toBe(clientB.id);
    expect(clientA.tenantId).toBe(tenantA.id);
    expect(clientB.tenantId).toBe(tenantB.id);
    expect(clientA.points).toBe(150);
    expect(clientB.points).toBe(50);
  });

  it('should isolate categories and products between tenants', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    // Category in Tenant A
    const catA = await prisma.category.create({
      data: {
        tenantId: tenantA.id,
        name: 'Hamburguesas Especiales',
        sequence: 1,
      },
    });

    // Category in Tenant B
    const catB = await prisma.category.create({
      data: {
        tenantId: tenantB.id,
        name: 'Pizzas a la Piedra',
        sequence: 1,
      },
    });

    // Product in Tenant A
    const prodA = await prisma.product.create({
      data: {
        tenantId: tenantA.id,
        categoryId: catA.id,
        name: 'Doble Bacon Cheddar',
        basePrice: 12500,
      },
    });

    // Product in Tenant B
    const prodB = await prisma.product.create({
      data: {
        tenantId: tenantB.id,
        categoryId: catB.id,
        name: 'Muzzarella Especial',
        basePrice: 11000,
      },
    });

    // Query Tenant A products
    const tenantAProducts = await prisma.product.findMany({
      where: { tenantId: tenantA.id },
    });
    expect(tenantAProducts.some((p) => p.id === prodA.id)).toBe(true);
    expect(tenantAProducts.some((p) => p.id === prodB.id)).toBe(false);

    // Query Tenant B products
    const tenantBProducts = await prisma.product.findMany({
      where: { tenantId: tenantB.id },
    });
    expect(tenantBProducts.some((p) => p.id === prodB.id)).toBe(true);
    expect(tenantBProducts.some((p) => p.id === prodA.id)).toBe(false);
  });

  it('should isolate orders and link them to locations', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({
      where: { slug: 'beats' },
      include: { locations: true },
    });
    const locA = tenantA.locations[0];

    const order = await prisma.order.create({
      data: {
        tenantId: tenantA.id,
        locationId: locA.id,
        clientName: 'Juan Perez',
        clientPhone: '+5491144445555',
        needsDelivery: false,
        total: 12500,
        paymentMethod: 'CASH',
        status: 'NEW',
      },
    });

    expect(order.tenantId).toBe(tenantA.id);
    expect(order.locationId).toBe(locA.id);

    const ordersA = await prisma.order.findMany({ where: { tenantId: tenantA.id, id: order.id } });
    expect(ordersA.length).toBe(1);

    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });
    const ordersB = await prisma.order.findMany({ where: { tenantId: tenantB.id, id: order.id } });
    expect(ordersB.length).toBe(0);
  });
});
