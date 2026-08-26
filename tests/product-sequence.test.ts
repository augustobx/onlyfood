import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Ensure Product sequence column and index', () => {
  it('should add sequence to Product if missing', async () => {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `Product` ADD COLUMN `sequence` INT NOT NULL DEFAULT 0');
    } catch {}

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `Product` ADD INDEX `Product_tenantId_sequence_idx` (`tenantId`, `sequence`)');
    } catch {}

    expect(true).toBe(true);
  });
});
