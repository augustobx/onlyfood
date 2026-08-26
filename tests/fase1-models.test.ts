import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('FASE 1: Base SaaS Models', () => {
  it('should seed or retrieve the default Plan', async () => {
    const plan = await prisma.plan.upsert({
      where: { code: 'PRO' },
      update: {},
      create: {
        code: 'PRO',
        name: 'Plan Profesional',
        priceMonthly: 15000,
        maxLocations: 3,
        maxProducts: 500,
        features: ['loyalty', 'roulette', 'whatsapp', 'customDomain', 'printNode'],
        isActive: true,
      },
    });

    expect(plan).toBeDefined();
    expect(plan.code).toBe('PRO');
  });

  it('should seed or retrieve the default Tenant BeatsBurgers', async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: 'PRO' } });

    const tenant = await prisma.tenant.upsert({
      where: { slug: 'beats' },
      update: {},
      create: {
        slug: 'beats',
        name: 'BeatsBurgers',
        status: 'ACTIVE',
        locations: {
          create: {
            name: 'Principal',
            code: 'main',
            isMain: true,
            isActive: true,
          },
        },
        domains: {
          createMany: {
            data: [
              { hostname: 'beats.producto.nanolabs.app', isPrimary: true, isCustom: false },
              { hostname: 'localhost', isPrimary: false, isCustom: false },
            ],
          },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        settings: {
          create: {
            appName: 'BeatsBurgers',
            primaryColor: '#f97316',
            secondaryColor: '#9333ea',
            storeTheme: 'ORIGINAL',
          },
        },
      },
      include: {
        locations: true,
        domains: true,
        subscription: { include: { plan: true } },
        settings: true,
      },
    });

    expect(tenant).toBeDefined();
    expect(tenant.slug).toBe('beats');
    expect(tenant.locations.length).toBeGreaterThan(0);
    expect(tenant.domains.length).toBeGreaterThan(0);
    expect(tenant.subscription?.plan.code).toBe('PRO');
  });

  it('should allow creating a multi-tenant User and TenantMembership', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });

    const user = await prisma.user.upsert({
      where: { email: 'admin@beatsburgers.com' },
      update: {},
      create: {
        email: 'admin@beatsburgers.com',
        passwordHash: 'scrypt$dummyhash',
        name: 'Admin Beats',
        isSuperAdmin: false,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    expect(user).toBeDefined();
    expect(user.memberships.some((m) => m.tenantId === tenant.id)).toBe(true);
  });
});
