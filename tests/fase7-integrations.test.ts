import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { encryptPayload, decryptPayload } from '@/lib/encryption';
import { saveTenantIntegration, getTenantIntegration, type MercadoPagoCredentials } from '@/lib/tenant-integrations';

describe('FASE 7: Tenant Integrations & AES-256-GCM Encryption', () => {
  it('should encrypt and decrypt arbitrary payloads correctly', () => {
    const original = {
      secretToken: 'APP_USR-1234567890-abcdef',
      publicKey: 'APP_USR-pub-key-987654',
      expiresIn: 3600,
    };

    const encrypted = encryptPayload(original);
    expect(encrypted.encryptedPayload).toBeDefined();
    expect(encrypted.encryptedPayload).not.toBe(JSON.stringify(original));
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    const decrypted = decryptPayload<typeof original>(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should detect tampering or corrupted ciphertext', () => {
    const original = { test: 'secret_data' };
    const encrypted = encryptPayload(original);

    // Corrupt authTag
    const tampered = {
      ...encrypted,
      authTag: '00112233445566778899aabbccddeeff',
    };

    expect(() => decryptPayload(tampered)).toThrow();
  });

  it('should store and isolate encrypted integrations per tenant', async () => {
    const tenantA = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const tenantB = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'roma' } });

    const credsA: MercadoPagoCredentials = {
      accessToken: 'TEST-TOKEN-BEATSBURGERS-111111',
      publicKey: 'TEST-PUB-BEATSBURGERS-111111',
    };

    const credsB: MercadoPagoCredentials = {
      accessToken: 'TEST-TOKEN-ROMA-222222',
      publicKey: 'TEST-PUB-ROMA-222222',
    };

    // Save for Tenant A
    await saveTenantIntegration(tenantA.id, 'MERCADO_PAGO', credsA);

    // Save for Tenant B
    await saveTenantIntegration(tenantB.id, 'MERCADO_PAGO', credsB);

    // Verify DB does NOT store plaintext tokens
    const rawRecordA = await prisma.tenantIntegration.findUnique({
      where: { tenantId_type: { tenantId: tenantA.id, type: 'MERCADO_PAGO' } },
    });
    expect(rawRecordA).not.toBeNull();
    expect(rawRecordA?.encryptedPayload).not.toContain('TEST-TOKEN-BEATSBURGERS');

    // Retrieve and decrypt
    const decryptedA = await getTenantIntegration<MercadoPagoCredentials>(tenantA.id, 'MERCADO_PAGO');
    const decryptedB = await getTenantIntegration<MercadoPagoCredentials>(tenantB.id, 'MERCADO_PAGO');

    expect(decryptedA).toEqual(credsA);
    expect(decryptedB).toEqual(credsB);
    expect(decryptedA?.accessToken).not.toBe(decryptedB?.accessToken);
  });
});
