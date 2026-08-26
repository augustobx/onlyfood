import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { sanitizeLogDetails, recordAuditLog, getTenantAuditLogs } from '@/lib/audit';

describe('FASE 13: Multi-Tenant Audit & Logs', () => {
  it('should automatically redact sensitive fields from audit details', () => {
    const rawDetails = {
      action: 'UPDATE_INTEGRATION',
      mpAccessToken: 'APP_USR-998877665544-secret',
      webhookSecret: 'whsec_my_super_secret_signature',
      normalField: 'Mercado Pago Config',
      user: {
        email: 'admin@beatsburgers.com',
        password: 'PlainTextPassword123',
      },
    };

    const sanitized = sanitizeLogDetails(rawDetails);
    expect(sanitized.mpAccessToken).toBe('[REDACTED]');
    expect(sanitized.webhookSecret).toBe('[REDACTED]');
    expect(sanitized.normalField).toBe('Mercado Pago Config');
    expect(sanitized.user.password).toBe('[REDACTED]');
    expect(sanitized.user.email).toBe('admin@beatsburgers.com');
  });

  it('should record audit logs and isolate queries by tenantId', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    // Record log for Tenant A
    const logA = await recordAuditLog({
      tenantId: tenantA.id,
      action: 'CONFIG_UPDATED',
      resource: 'TenantSettings',
      details: { field: 'deliveryCost', oldValue: 1500, newValue: 1800, secretToken: 'hidden' },
      ipAddress: '192.168.1.100',
    });

    expect(logA.tenantId).toBe(tenantA.id);
    expect(logA.action).toBe('CONFIG_UPDATED');
    expect((logA.details as any).secretToken).toBe('[REDACTED]');

    // Query logs for Tenant A and Tenant B
    const logsA = await getTenantAuditLogs(tenantA.id);
    const logsB = await getTenantAuditLogs(tenantB.id);

    expect(logsA.some((l) => l.id === logA.id)).toBe(true);
    expect(logsB.some((l) => l.id === logA.id)).toBe(false);
  });
});
