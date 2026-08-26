import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Database Connectivity', () => {
  it('should connect to MariaDB and execute raw query', async () => {
    const result = await prisma.$queryRawUnsafe('SELECT 1 as val');
    expect(result).toBeDefined();
  });
});
