import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getTenantFeatures, hasTenantFeature, requireTenantFeature, SAAS_PLANS } from '@/lib/features';

describe('FASE 9: SaaS Plans & Feature Flags System', () => {
  it('should verify standard plans structure', () => {
    expect(SAAS_PLANS.STARTER.features).toContain('orders');
    expect(SAAS_PLANS.PRO.features).toContain('loyalty');
    expect(SAAS_PLANS.PRO.features).toContain('roulette');
    expect(SAAS_PLANS.BUSINESS.features).toContain('whatsapp');
    expect(SAAS_PLANS.BUSINESS.features).toContain('customDomain');
  });

  it('should evaluate features based on plan and custom tenant flags', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });

    // Beats has PRO plan -> has loyalty & roulette
    const { features, planCode, isSubscriptionActive } = await getTenantFeatures(tenant.id);
    expect(planCode).toBe('PRO');
    expect(isSubscriptionActive).toBe(true);
    expect(features.has('loyalty')).toBe(true);
    expect(features.has('roulette')).toBe(true);

    // Add a custom feature flag for whatsapp
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureKey: {
          tenantId: tenant.id,
          featureKey: 'whatsapp',
        },
      },
      update: { isEnabled: true },
      create: {
        tenantId: tenant.id,
        featureKey: 'whatsapp',
        isEnabled: true,
      },
    });

    const hasWhatsapp = await hasTenantFeature(tenant.id, 'whatsapp');
    expect(hasWhatsapp).toBe(true);

    // requireTenantFeature should succeed
    await expect(requireTenantFeature(tenant.id, 'whatsapp')).resolves.toBeUndefined();

    // Disable whatsapp explicitly
    await prisma.tenantFeature.update({
      where: {
        tenantId_featureKey: {
          tenantId: tenant.id,
          featureKey: 'whatsapp',
        },
      },
      data: { isEnabled: false },
    });

    const hasWhatsappAfterDisable = await hasTenantFeature(tenant.id, 'whatsapp');
    expect(hasWhatsappAfterDisable).toBe(false);

    await expect(requireTenantFeature(tenant.id, 'whatsapp')).rejects.toThrow(/FEATURE_DISABLED/);
  });
});
