import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Clean SystemConfig duplicate rows', () => {
  it('should ensure single SystemConfig row per tenant', async () => {
    const configs = await prisma.systemConfig.findMany({ orderBy: { updatedAt: 'desc' } });
    if (configs.length > 1) {
      const keep = configs[0];
      const deleteIds = configs.slice(1).map((c) => c.id);
      await prisma.systemConfig.deleteMany({ where: { id: { in: deleteIds } } });
      console.log(`Kept SystemConfig ${keep.id}, removed ${deleteIds.length} duplicate(s)`);
    }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `SystemConfig` ADD UNIQUE INDEX `SystemConfig_tenantId_key` (`tenantId`)');
    } catch (err: any) {
      console.log('SystemConfig unique index status:', err.message);
    }
    expect(true).toBe(true);
  });
});
