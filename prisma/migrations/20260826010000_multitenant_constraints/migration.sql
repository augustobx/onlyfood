-- ==========================================
-- MULTI-TENANT CONSTRAINTS, INDEXES & FOREIGN KEYS
-- ==========================================

-- Drop legacy unique indexes if they exist
ALTER TABLE `Client` DROP INDEX IF EXISTS `Client_phone_key`;
ALTER TABLE `MediaAsset` DROP INDEX IF EXISTS `MediaAsset_filename_key`;
ALTER TABLE `PushSubscription` DROP INDEX IF EXISTS `PushSubscription_endpointHash_key`;

-- Create an explicit legacy tenant and backfill every pre-SaaS business row
-- before adding unique indexes and foreign keys. This keeps upgrades safe and
-- prevents rows from remaining globally visible with a NULL tenantId.
INSERT IGNORE INTO `Tenant` (`id`, `slug`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('legacy-default-tenant', 'beats', 'OnlyFood', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
INSERT IGNORE INTO `Plan` (`id`, `code`, `name`, `priceMonthly`, `maxLocations`, `maxProducts`, `features`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('legacy-default-plan', 'BUSINESS', 'Business', 0, 10, 10000, JSON_ARRAY('whatsapp','loyalty','roulette','customDomain','printNode'), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
INSERT IGNORE INTO `Subscription` (`id`, `tenantId`, `planId`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `createdAt`, `updatedAt`)
VALUES ('legacy-default-subscription', 'legacy-default-tenant', 'legacy-default-plan', 'ACTIVE', CURRENT_TIMESTAMP(3), DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 10 YEAR), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
INSERT IGNORE INTO `Location` (`id`, `tenantId`, `name`, `code`, `isMain`, `isActive`, `createdAt`, `updatedAt`)
VALUES ('legacy-default-location', 'legacy-default-tenant', 'Principal', 'main', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
INSERT IGNORE INTO `TenantDomain` (`id`, `tenantId`, `hostname`, `isPrimary`, `isCustom`, `verifiedAt`, `createdAt`, `updatedAt`)
VALUES ('legacy-default-domain', 'legacy-default-tenant', 'localhost', true, false, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

UPDATE `SystemConfig` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Category` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Product` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Ingredient` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Extra` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Order` SET `tenantId` = 'legacy-default-tenant', `locationId` = COALESCE(`locationId`, 'legacy-default-location') WHERE `tenantId` IS NULL;
UPDATE `Client` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `PushSubscription` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `RoulettePrize` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `RouletteWin` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `PointReward` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `PointRedemption` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `CustomerTier` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `DeliveryTimeSlot` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Messenger` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `PaymentRecord` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `Session` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `WhatsAppSession` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `MediaAsset` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;
UPDATE `PrintDispatch` SET `tenantId` = 'legacy-default-tenant' WHERE `tenantId` IS NULL;

-- Tenant-owned rows must never become global again. The backfill above makes
-- these changes safe for upgrades from the legacy single-tenant schema.
ALTER TABLE `SystemConfig` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Category` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Product` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Ingredient` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Extra` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Order` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Client` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `PushSubscription` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `RoulettePrize` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `RouletteWin` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `PointReward` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `PointRedemption` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `CustomerTier` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `DeliveryTimeSlot` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Messenger` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `PaymentRecord` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `Session` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `WhatsAppSession` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `MediaAsset` MODIFY `tenantId` VARCHAR(191) NOT NULL;
ALTER TABLE `PrintDispatch` MODIFY `tenantId` VARCHAR(191) NOT NULL;

-- WhatsAppSession restructure to compound key
ALTER TABLE `WhatsAppSession` DROP PRIMARY KEY;
ALTER TABLE `WhatsAppSession` ADD COLUMN IF NOT EXISTS `id` VARCHAR(191) NULL FIRST;
UPDATE `WhatsAppSession` SET `id` = UUID() WHERE `id` IS NULL OR `id` = '';
ALTER TABLE `WhatsAppSession` MODIFY `id` VARCHAR(191) NOT NULL;
ALTER TABLE `WhatsAppSession` ADD PRIMARY KEY (`id`);
ALTER TABLE `WhatsAppSession` ADD UNIQUE INDEX `WhatsAppSession_tenantId_phone_key` (`tenantId`, `phone`);
ALTER TABLE `WhatsAppSession` ADD INDEX `WhatsAppSession_tenantId_idx` (`tenantId`);

-- Compound Unique Indexes
ALTER TABLE `Client` ADD UNIQUE INDEX `Client_tenantId_phone_key` (`tenantId`, `phone`);
ALTER TABLE `Client` ADD INDEX `Client_tenantId_phoneLoginKey_idx` (`tenantId`, `phoneLoginKey`);

ALTER TABLE `MediaAsset` ADD UNIQUE INDEX `MediaAsset_tenantId_filename_key` (`tenantId`, `filename`);
ALTER TABLE `MediaAsset` ADD INDEX `MediaAsset_tenantId_createdAt_idx` (`tenantId`, `createdAt`);

ALTER TABLE `PushSubscription` ADD UNIQUE INDEX `PushSubscription_tenantId_endpointHash_key` (`tenantId`, `endpointHash`);
ALTER TABLE `PushSubscription` ADD INDEX `PushSubscription_tenantId_idx` (`tenantId`);

ALTER TABLE `SystemConfig` ADD UNIQUE INDEX `SystemConfig_tenantId_key` (`tenantId`);

-- Performance & Isolation Indexes
ALTER TABLE `Category` ADD INDEX `Category_tenantId_sequence_idx` (`tenantId`, `sequence`);

ALTER TABLE `Product` ADD INDEX `Product_tenantId_categoryId_isActive_idx` (`tenantId`, `categoryId`, `isActive`);
ALTER TABLE `Product` ADD INDEX `Product_tenantId_sequence_idx` (`tenantId`, `sequence`);

ALTER TABLE `Ingredient` ADD INDEX `Ingredient_tenantId_isActive_idx` (`tenantId`, `isActive`);
ALTER TABLE `Extra` ADD INDEX `Extra_tenantId_isActive_idx` (`tenantId`, `isActive`);

ALTER TABLE `Order` ADD INDEX `Order_tenantId_createdAt_idx` (`tenantId`, `createdAt`);
ALTER TABLE `Order` ADD INDEX `Order_tenantId_status_createdAt_idx` (`tenantId`, `status`, `createdAt`);
ALTER TABLE `Order` ADD INDEX `Order_tenantId_locationId_createdAt_idx` (`tenantId`, `locationId`, `createdAt`);
ALTER TABLE `Order` ADD INDEX `Order_tenantId_clientId_idx` (`tenantId`, `clientId`);

ALTER TABLE `DeliveryTimeSlot` ADD INDEX `DeliveryTimeSlot_tenantId_locationId_isActive_idx` (`tenantId`, `locationId`, `isActive`);
ALTER TABLE `Messenger` ADD INDEX `Messenger_tenantId_locationId_isActive_idx` (`tenantId`, `locationId`, `isActive`);

ALTER TABLE `CustomerTier` ADD INDEX `CustomerTier_tenantId_sequence_idx` (`tenantId`, `sequence`);
ALTER TABLE `PointReward` ADD INDEX `PointReward_tenantId_isActive_sequence_idx` (`tenantId`, `isActive`, `sequence`);
ALTER TABLE `PointRedemption` ADD INDEX `PointRedemption_tenantId_clientId_status_idx` (`tenantId`, `clientId`, `status`);
ALTER TABLE `RoulettePrize` ADD INDEX `RoulettePrize_tenantId_idx` (`tenantId`);
ALTER TABLE `RouletteWin` ADD INDEX `RouletteWin_tenantId_clientId_claimedAt_expiresAt_idx` (`tenantId`, `clientId`, `claimedAt`, `expiresAt`);

-- Foreign keys to Tenant (Cascade)
ALTER TABLE `SystemConfig` ADD CONSTRAINT `SystemConfig_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoulettePrize` ADD CONSTRAINT `RoulettePrize_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RouletteWin` ADD CONSTRAINT `RouletteWin_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PointReward` ADD CONSTRAINT `PointReward_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PointRedemption` ADD CONSTRAINT `PointRedemption_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CustomerTier` ADD CONSTRAINT `CustomerTier_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DeliveryTimeSlot` ADD CONSTRAINT `DeliveryTimeSlot_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Messenger` ADD CONSTRAINT `Messenger_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Category` ADD CONSTRAINT `Category_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Ingredient` ADD CONSTRAINT `Ingredient_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Extra` ADD CONSTRAINT `Extra_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PaymentRecord` ADD CONSTRAINT `PaymentRecord_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Client` ADD CONSTRAINT `Client_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Session` ADD CONSTRAINT `Session_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WhatsAppSession` ADD CONSTRAINT `WhatsAppSession_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PrintDispatch` ADD CONSTRAINT `PrintDispatch_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys to Location (Set Null)
ALTER TABLE `Order` ADD CONSTRAINT `Order_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DeliveryTimeSlot` ADD CONSTRAINT `DeliveryTimeSlot_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Messenger` ADD CONSTRAINT `Messenger_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
