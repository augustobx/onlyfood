import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { resolveTenantByHostname, extractSubdomainSlug, normalizeHostname } from '@/lib/tenant-context';

describe('FASE 3: Tenant Context & Hostname Resolution', () => {
  it('should normalize hostnames and extract subdomains', () => {
    expect(normalizeHostname('BEATS.producto.nanolabs.app:3000')).toBe('beats.producto.nanolabs.app');
    expect(extractSubdomainSlug('beats.producto.nanolabs.app', 'producto.nanolabs.app')).toBe('beats');
    expect(extractSubdomainSlug('roma.localhost')).toBe('roma');
    expect(extractSubdomainSlug('invalid-domain.com')).toBeNull();
  });

  it('should resolve tenant by subdomain beats.producto.nanolabs.app', async () => {
    const result = await resolveTenantByHostname('beats.producto.nanolabs.app');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tenant.slug).toBe('beats');
      expect(result.tenant.name).toBe('BeatsBurgers');
      expect(result.tenant.status).toBe('ACTIVE');
      expect(result.tenant.plan.code).toBe('PRO');
      expect(result.tenant.features.has('loyalty')).toBe(true);
    }
  });

  it('should resolve tenant by custom domain', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    
    // Register custom domain
    await prisma.tenantDomain.upsert({
      where: { hostname: 'pedidos.beatsburgers.com' },
      update: { verifiedAt: new Date() },
      create: {
        tenantId: tenant.id,
        hostname: 'pedidos.beatsburgers.com',
        isCustom: true,
        isPrimary: false,
        verifiedAt: new Date(),
      },
    });

    const result = await resolveTenantByHostname('pedidos.beatsburgers.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tenant.slug).toBe('beats');
    }
  });

  it('should return NOT_FOUND for non-existent tenants', async () => {
    const result = await resolveTenantByHostname('inexistente.producto.nanolabs.app');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('NOT_FOUND');
    }
  });

  it('should return SUSPENDED for suspended tenants', async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: 'PRO' } });

    // Create a suspended tenant
    const suspended = await prisma.tenant.upsert({
      where: { slug: 'suspendido' },
      update: { status: 'SUSPENDED' },
      create: {
        slug: 'suspendido',
        name: 'Comercio Suspendido',
        status: 'SUSPENDED',
        domains: {
          create: { hostname: 'suspendido.producto.nanolabs.app', isPrimary: true },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: 'SUSPENDED',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    const result = await resolveTenantByHostname('suspendido.producto.nanolabs.app');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('SUSPENDED');
    }
  });

  it('should handle invalid or empty hostnames', async () => {
    const result = await resolveTenantByHostname('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('INVALID_HOSTNAME');
    }
  });
});
