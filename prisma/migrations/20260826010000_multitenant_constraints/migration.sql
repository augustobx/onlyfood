-- ==========================================
-- MULTI-TENANT CONSTRAINTS, INDEXES & FOREIGN KEYS
-- ==========================================

-- Drop legacy unique indexes if they exist
ALTER TABLE `Client` DROP INDEX `Client_phone_key`;
ALTER TABLE `MediaAsset` DROP INDEX `MediaAsset_filename_key`;
ALTER TABLE `PushSubscription` DROP INDEX `PushSubscription_endpointHash_key`;

-- WhatsAppSession restructure to compound key
ALTER TABLE `WhatsAppSession` DROP PRIMARY KEY;
ALTER TABLE `WhatsAppSession` ADD COLUMN IF NOT EXISTS `id` VARCHAR(191) NOT NULL FIRST;
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
