import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { assertTenantOwnership } from '@/lib/security-guard';
import { constantTimeEqual, consumeRateLimit } from '@/lib/request-security';

describe('FASE 14: Security & IDOR Protection Suite', () => {
  it('should prevent IDOR attacks across different tenants', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    // Create Order in Tenant A
    const orderA = await prisma.order.create({
      data: {
        tenantId: tenantA.id,
        clientName: 'Juan Target',
        clientPhone: '+5491100002222',
        needsDelivery: false,
        total: 7500,
        paymentMethod: 'CASH',
        status: 'NEW',
      },
    });

    // Tenant A validating ownership -> succeeds
    await expect(assertTenantOwnership(tenantA.id, 'order', orderA.id)).resolves.toBeUndefined();

    // Tenant B attempting IDOR with orderA.id -> must fail
    await expect(assertTenantOwnership(tenantB.id, 'order', orderA.id)).rejects.toThrow(/IDOR_PREVENTED/);
  });

  it('should verify constant-time equality against timing attacks', () => {
    expect(constantTimeEqual('super-secret-signature', 'super-secret-signature')).toBe(true);
    expect(constantTimeEqual('super-secret-signature', 'wrong-signature')).toBe(false);
  });

  it('should enforce rate limits per key and window', async () => {
    const testKey = `security-test-ip-${Date.now()}`;

    // Consume up to limit (3 allowed)
    const first = await consumeRateLimit('test-action', testKey, 3, 60000);
    const second = await consumeRateLimit('test-action', testKey, 3, 60000);
    const third = await consumeRateLimit('test-action', testKey, 3, 60000);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(true);

    // 4th request must be blocked
    const fourth = await consumeRateLimit('test-action', testKey, 3, 60000);
    expect(fourth).toBe(false);
  });
});
