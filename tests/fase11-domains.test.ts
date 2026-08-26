import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { addTenantDomain, verifyTenantDomain, setPrimaryTenantDomain } from '@/lib/domains';

describe('FASE 11: Dynamic Subdomains & Custom Domains', () => {
  it('should register and verify custom domains for tenants', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const hostname = 'pedidos.beatsburgers.com.ar';

    // Cleanup from previous runs
    await prisma.tenantDomain.deleteMany({ where: { hostname } });

    const customDomain = await addTenantDomain(tenant.id, hostname, true);
    expect(customDomain.hostname).toBe(hostname);
    expect(customDomain.isCustom).toBe(true);
    expect(customDomain.verifiedAt).toBeNull();

    // Verify domain
    const verified = await verifyTenantDomain(customDomain.id);
    expect(verified.verifiedAt).not.toBeNull();

    // Set as primary
    await setPrimaryTenantDomain(tenant.id, customDomain.id);
    const updated = await prisma.tenantDomain.findUnique({ where: { id: customDomain.id } });
    expect(updated?.isPrimary).toBe(true);
  });

  it('should prevent registering the same domain across different tenants', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    const sharedHostname = 'burger-express.com';

    // Cleanup from previous runs
    await prisma.tenantDomain.deleteMany({ where: { hostname: sharedHostname } });

    // Tenant A registers domain
    await addTenantDomain(tenantA.id, sharedHostname, true);

    // Tenant B attempts to register same domain -> must throw error
    await expect(
      addTenantDomain(tenantB.id, sharedHostname, true)
    ).rejects.toThrow(/DOMAIN_ALREADY_EXISTS/);
  });
});
