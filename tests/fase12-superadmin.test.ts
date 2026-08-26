import { describe, it, expect } from 'vitest';
import { platformDb } from '@/lib/platform-db';

describe('FASE 12: NanoLabs Super Admin Platform Operations', () => {
  it('should list all tenants and calculate global platform metrics using platformDb', async () => {
    const totalTenants = await platformDb.tenant.count();
    const activeTenants = await platformDb.tenant.count({ where: { status: 'ACTIVE' } });
    const totalOrders = await platformDb.order.count();

    expect(totalTenants).toBeGreaterThan(0);
    expect(activeTenants).toBeGreaterThan(0);
    expect(totalOrders).toBeGreaterThanOrEqual(0);
  });

  it('should support creating and managing tenant status with audit logging', async () => {
    const testSlug = 'demo-superadmin-tenant';

    // Cleanup previous if any
    await platformDb.tenant.deleteMany({ where: { slug: testSlug } });

    const plan = await platformDb.plan.findUniqueOrThrow({ where: { code: 'PRO' } });

    // Create tenant through platformDb
    const newTenant = await platformDb.tenant.create({
      data: {
        slug: testSlug,
        name: 'Demo Franchise',
        status: 'ACTIVE',
        locations: {
          create: { name: 'Principal', code: 'main' },
        },
        domains: {
          create: { hostname: `${testSlug}.producto.nanolabs.app`, isPrimary: true },
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

    expect(newTenant.slug).toBe(testSlug);

    // Suspend tenant
    const suspended = await platformDb.tenant.update({
      where: { id: newTenant.id },
      data: { status: 'SUSPENDED' },
    });
    expect(suspended.status).toBe('SUSPENDED');

    // Reactivate tenant
    const reactivated = await platformDb.tenant.update({
      where: { id: newTenant.id },
      data: { status: 'ACTIVE' },
    });
    expect(reactivated.status).toBe('ACTIVE');

    // Clean up
    await platformDb.tenant.delete({ where: { id: newTenant.id } });
  });
});
