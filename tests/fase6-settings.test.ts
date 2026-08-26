import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getPublicConfig } from '@/lib/public-config';

describe('FASE 6: Tenant Settings Isolation', () => {
  it('should maintain completely independent settings for each tenant', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    // 1. Setup settings for Tenant A
    const configA = await prisma.systemConfig.upsert({
      where: { tenantId: tenantA.id },
      update: {
        appName: 'BeatsBurgers Oficial',
        primaryColor: '#f97316',
        secondaryColor: '#9333ea',
        deliveryCost: 1500,
        isStoreOpen: true,
      },
      create: {
        tenantId: tenantA.id,
        appName: 'BeatsBurgers Oficial',
        primaryColor: '#f97316',
        secondaryColor: '#9333ea',
        deliveryCost: 1500,
        isStoreOpen: true,
      },
    });

    // 2. Setup settings for Tenant B
    const configB = await prisma.systemConfig.upsert({
      where: { tenantId: tenantB.id },
      update: {
        appName: 'Pizzeria Roma Artesanal',
        primaryColor: '#dc2626',
        secondaryColor: '#16a34a',
        deliveryCost: 2200,
        isStoreOpen: false,
      },
      create: {
        tenantId: tenantB.id,
        appName: 'Pizzeria Roma Artesanal',
        primaryColor: '#dc2626',
        secondaryColor: '#16a34a',
        deliveryCost: 2200,
        isStoreOpen: false,
      },
    });

    expect(configA.appName).toBe('BeatsBurgers Oficial');
    expect(configB.appName).toBe('Pizzeria Roma Artesanal');

    // 3. Query through getPublicConfig(tenantId)
    const publicA = await getPublicConfig(tenantA.id);
    const publicB = await getPublicConfig(tenantB.id);

    expect(publicA?.appName).toBe('BeatsBurgers Oficial');
    expect(publicA?.deliveryCost).toBe(1500);
    expect(publicA?.isStoreOpen).toBe(true);

    expect(publicB?.appName).toBe('Pizzeria Roma Artesanal');
    expect(publicB?.deliveryCost).toBe(2200);
    expect(publicB?.isStoreOpen).toBe(false);

    // 4. Update Tenant A settings and verify Tenant B remains unchanged
    await prisma.systemConfig.update({
      where: { tenantId: tenantA.id },
      data: { deliveryCost: 1800, isStoreOpen: false },
    });

    const updatedA = await getPublicConfig(tenantA.id);
    const untouchedB = await getPublicConfig(tenantB.id);

    expect(updatedA?.deliveryCost).toBe(1800);
    expect(updatedA?.isStoreOpen).toBe(false);

    expect(untouchedB?.deliveryCost).toBe(2200);
    expect(untouchedB?.isStoreOpen).toBe(false);
  });
});
