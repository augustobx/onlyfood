import { describe, it, expect } from 'vitest';
import { generateTenantObjectKey, validateMediaFile, objectStorage } from '@/lib/storage';

describe('FASE 8: Cloudflare R2 / S3 Object Storage Abstraction', () => {
  const tenantAId = '42006ad4-a69d-4a30-bb7d-4d7d3d7e6dad';
  const tenantBId = '88888888-bbbb-4a30-bb7d-4d7d3d7e6dad';

  it('should generate object keys strictly namespaced by tenantId', () => {
    const key = generateTenantObjectKey(tenantAId, 'products', 'Hamburguesa Especial.png');
    expect(key.startsWith(`tenants/${tenantAId}/products/`)).toBe(true);
    expect(key).toContain('hamburguesa_especial');
    expect(key.endsWith('.png')).toBe(true);
  });

  it('should validate allowed MIME types and reject unsupported formats', () => {
    const valid = validateMediaFile('image/webp', 1024 * 500);
    expect(valid.valid).toBe(true);

    const invalidMime = validateMediaFile('application/x-msdownload', 1024);
    expect(invalidMime.valid).toBe(false);
    expect(invalidMime.error).toContain('Formato de archivo no admitido');
  });

  it('should reject files exceeding maximum size limit', () => {
    const oversizedImage = validateMediaFile('image/jpeg', 15 * 1024 * 1024); // 15MB
    expect(oversizedImage.valid).toBe(false);
    expect(oversizedImage.error).toContain('supera el tamaño máximo');

    const validVideo = validateMediaFile('video/mp4', 30 * 1024 * 1024); // 30MB
    expect(validVideo.valid).toBe(true);
  });

  it('should prevent Tenant A from deleting or accessing Tenant B objects', async () => {
    const keyTenantB = generateTenantObjectKey(tenantBId, 'branding', 'logo.png');

    expect(objectStorage.isKeyOwnedByTenant(tenantBId, keyTenantB)).toBe(true);
    expect(objectStorage.isKeyOwnedByTenant(tenantAId, keyTenantB)).toBe(false);

    // Tenant A attempts to delete Tenant B object -> must throw error
    await expect(objectStorage.delete(tenantAId, keyTenantB)).rejects.toThrow(/STORAGE_FORBIDDEN/);

    // Tenant B deleting its own object -> succeeds
    const result = await objectStorage.delete(tenantBId, keyTenantB);
    expect(result).toBe(true);
  });
});
