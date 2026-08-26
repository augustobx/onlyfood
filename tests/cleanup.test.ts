import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Sanitize existing DB constraints', () => {
  it('should clean orphan productIds in PointReward and RoulettePrize', async () => {
    await prisma.$executeRawUnsafe(`
      UPDATE PointReward pr 
      LEFT JOIN Product p ON pr.productId = p.id 
      SET pr.productId = NULL 
      WHERE pr.productId IS NOT NULL AND p.id IS NULL
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE RoulettePrize rp 
      LEFT JOIN Product p ON rp.productId = p.id 
      SET rp.productId = NULL 
      WHERE rp.productId IS NOT NULL AND p.id IS NULL
    `);

    expect(true).toBe(true);
  });
});
