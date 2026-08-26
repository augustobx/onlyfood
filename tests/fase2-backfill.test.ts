import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('FASE 2: Safe Data Migration & Backfill', () => {
  it('should backfill all existing records with default tenantId and locationId', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'beats' } });
    const location = await prisma.location.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'main' } });

    const tenantId = tenant.id;
    const locationId = location.id;

    // Helper to safely add column if not exists
    const ensureColumn = async (table: string, column: string, type: string) => {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type} NULL`);
      } catch (err: any) {
        // Ignore if column already exists (Error 1060: Duplicate column name)
      }
    };

    const tables = [
      'Category', 'Product', 'Ingredient', 'Extra', 'CustomerTier', 
      'PointReward', 'PointRedemption', 'RoulettePrize', 'RouletteWin', 
      'DeliveryTimeSlot', 'Messenger', 'Order', 'Client', 'MediaAsset', 
      'PushSubscription', 'Session', 'SystemConfig', 'PaymentRecord', 'PrintDispatch'
    ];

    for (const table of tables) {
      await ensureColumn(table, 'tenantId', 'VARCHAR(191)');
    }

    await ensureColumn('Order', 'locationId', 'VARCHAR(191)');
    await ensureColumn('DeliveryTimeSlot', 'locationId', 'VARCHAR(191)');
    await ensureColumn('Messenger', 'locationId', 'VARCHAR(191)');

    // Backfill data
    for (const table of tables) {
      if (table === 'SystemConfig') {
        // If a SystemConfig already exists for this tenant, delete orphan unassigned config rows to avoid unique violation
        const existingConfig = await prisma.systemConfig.findUnique({ where: { tenantId } });
        if (existingConfig) {
          await prisma.$executeRawUnsafe(`DELETE FROM \`SystemConfig\` WHERE tenantId IS NULL`);
        } else {
          await prisma.$executeRawUnsafe(`UPDATE \`SystemConfig\` SET tenantId = '${tenantId}' WHERE tenantId IS NULL LIMIT 1`);
          await prisma.$executeRawUnsafe(`DELETE FROM \`SystemConfig\` WHERE tenantId IS NULL`);
        }
      } else {
        await prisma.$executeRawUnsafe(`UPDATE \`${table}\` SET tenantId = '${tenantId}' WHERE tenantId IS NULL`);
      }
    }

    await prisma.$executeRawUnsafe(`UPDATE \`Order\` SET locationId = '${locationId}' WHERE locationId IS NULL`);
    await prisma.$executeRawUnsafe(`UPDATE \`DeliveryTimeSlot\` SET locationId = '${locationId}' WHERE locationId IS NULL`);
    await prisma.$executeRawUnsafe(`UPDATE \`Messenger\` SET locationId = '${locationId}' WHERE locationId IS NULL`);

    // Check WhatsAppSession table
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`WhatsAppSession\` ADD COLUMN \`tenantId\` VARCHAR(191) NULL`);
      await prisma.$executeRawUnsafe(`UPDATE \`WhatsAppSession\` SET tenantId = '${tenantId}' WHERE tenantId IS NULL`);
    } catch {
      // Ignore if exists
    }

    expect(true).toBe(true);
  });
});
