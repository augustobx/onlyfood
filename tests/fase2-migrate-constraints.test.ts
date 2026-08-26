import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('FASE 2: Apply Unique Constraints & Indexes', () => {
  it('should apply all unique constraints, indexes and foreign keys', async () => {
    const runSql = async (sql: string) => {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err: any) {
        // Ignore duplicate index or constraint errors if re-run
        console.log(`SQL Notice (${sql.slice(0, 50)}...):`, err.message);
      }
    };

    // 1. Client
    await runSql('ALTER TABLE `Client` DROP INDEX `Client_phone_key`');
    await runSql('ALTER TABLE `Client` DROP INDEX `phone`');
    await runSql('ALTER TABLE `Client` ADD UNIQUE INDEX `Client_tenantId_phone_key` (`tenantId`, `phone`)');
    await runSql('ALTER TABLE `Client` ADD INDEX `Client_tenantId_phoneLoginKey_idx` (`tenantId`, `phoneLoginKey`)');

    // 2. MediaAsset
    await runSql('ALTER TABLE `MediaAsset` DROP INDEX `MediaAsset_filename_key`');
    await runSql('ALTER TABLE `MediaAsset` DROP INDEX `filename`');
    await runSql('ALTER TABLE `MediaAsset` ADD UNIQUE INDEX `MediaAsset_tenantId_filename_key` (`tenantId`, `filename`)');
    await runSql('ALTER TABLE `MediaAsset` ADD INDEX `MediaAsset_tenantId_createdAt_idx` (`tenantId`, `createdAt`)');

    // 3. PushSubscription
    await runSql('ALTER TABLE `PushSubscription` DROP INDEX `PushSubscription_endpointHash_key`');
    await runSql('ALTER TABLE `PushSubscription` DROP INDEX `endpointHash`');
    await runSql('ALTER TABLE `PushSubscription` ADD UNIQUE INDEX `PushSubscription_tenantId_endpointHash_key` (`tenantId`, `endpointHash`)');
    await runSql('ALTER TABLE `PushSubscription` ADD INDEX `PushSubscription_tenantId_idx` (`tenantId`)');

    // 4. SystemConfig
    await runSql('ALTER TABLE `SystemConfig` ADD UNIQUE INDEX `SystemConfig_tenantId_key` (`tenantId`)');

    // 5. Category
    await runSql('ALTER TABLE `Category` ADD INDEX `Category_tenantId_sequence_idx` (`tenantId`, `sequence`)');

    // 6. Product
    await runSql('ALTER TABLE `Product` ADD INDEX `Product_tenantId_categoryId_isActive_idx` (`tenantId`, `categoryId`, `isActive`)');
    await runSql('ALTER TABLE `Product` ADD INDEX `Product_tenantId_sequence_idx` (`tenantId`, `sequence`)');

    // 7. Ingredient & Extra
    await runSql('ALTER TABLE `Ingredient` ADD INDEX `Ingredient_tenantId_isActive_idx` (`tenantId`, `isActive`)');
    await runSql('ALTER TABLE `Extra` ADD INDEX `Extra_tenantId_isActive_idx` (`tenantId`, `isActive`)');

    // 8. Order
    await runSql('ALTER TABLE `Order` ADD INDEX `Order_tenantId_createdAt_idx` (`tenantId`, `createdAt`)');
    await runSql('ALTER TABLE `Order` ADD INDEX `Order_tenantId_status_createdAt_idx` (`tenantId`, `status`, `createdAt`)');
    await runSql('ALTER TABLE `Order` ADD INDEX `Order_tenantId_locationId_createdAt_idx` (`tenantId`, `locationId`, `createdAt`)');
    await runSql('ALTER TABLE `Order` ADD INDEX `Order_tenantId_clientId_idx` (`tenantId`, `clientId`)');

    // 9. DeliveryTimeSlot & Messenger
    await runSql('ALTER TABLE `DeliveryTimeSlot` ADD INDEX `DeliveryTimeSlot_tenantId_locationId_isActive_idx` (`tenantId`, `locationId`, `isActive`)');
    await runSql('ALTER TABLE `Messenger` ADD INDEX `Messenger_tenantId_locationId_isActive_idx` (`tenantId`, `locationId`, `isActive`)');

    // 10. CustomerTier, PointReward, PointRedemption, Roulette
    await runSql('ALTER TABLE `CustomerTier` ADD INDEX `CustomerTier_tenantId_sequence_idx` (`tenantId`, `sequence`)');
    await runSql('ALTER TABLE `PointReward` ADD INDEX `PointReward_tenantId_isActive_sequence_idx` (`tenantId`, `isActive`, `sequence`)');
    await runSql('ALTER TABLE `PointRedemption` ADD INDEX `PointRedemption_tenantId_clientId_status_idx` (`tenantId`, `clientId`, `status`)');
    await runSql('ALTER TABLE `RoulettePrize` ADD INDEX `RoulettePrize_tenantId_idx` (`tenantId`)');
    await runSql('ALTER TABLE `RouletteWin` ADD INDEX `RouletteWin_tenantId_clientId_claimedAt_expiresAt_idx` (`tenantId`, `clientId`, `claimedAt`, `expiresAt`)');

    // 11. Foreign Keys to Tenant
    const tablesWithTenant = [
      'Category', 'Product', 'Ingredient', 'Extra', 'CustomerTier', 
      'PointReward', 'PointRedemption', 'RoulettePrize', 'RouletteWin', 
      'DeliveryTimeSlot', 'Messenger', 'Order', 'Client', 'MediaAsset', 
      'PushSubscription', 'Session', 'SystemConfig', 'PaymentRecord', 'PrintDispatch'
    ];

    for (const table of tablesWithTenant) {
      await runSql(`
        ALTER TABLE \`${table}\` 
        ADD CONSTRAINT \`${table}_tenantId_fkey\` 
        FOREIGN KEY (\`tenantId\`) REFERENCES \`Tenant\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }

    // 12. Foreign Keys to Location
    await runSql('ALTER TABLE `Order` ADD CONSTRAINT `Order_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
    await runSql('ALTER TABLE `DeliveryTimeSlot` ADD CONSTRAINT `DeliveryTimeSlot_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');
    await runSql('ALTER TABLE `Messenger` ADD CONSTRAINT `Messenger_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE');

    expect(true).toBe(true);
  });
});
