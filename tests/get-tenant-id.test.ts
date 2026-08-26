import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Backfill preparation', () => {
  it('should find or create default tenant and location', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const location = await prisma.location.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'main' } });
    expect(tenant.id).toBeDefined();
    expect(location.id).toBeDefined();
    console.log('Default Tenant ID:', tenant.id);
    console.log('Default Location ID:', location.id);
  });
});
