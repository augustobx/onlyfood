-- Security, payment routing, and subscription lifecycle fields.
ALTER TABLE `Order` ADD COLUMN `trackingTokenHash` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD INDEX `Order_tenantId_trackingTokenHash_idx` (`tenantId`, `trackingTokenHash`);

ALTER TABLE `TenantIntegration` ADD COLUMN `externalAccountId` VARCHAR(191) NULL;
ALTER TABLE `TenantIntegration` ADD INDEX `TenantIntegration_type_externalAccountId_idx` (`type`, `externalAccountId`);

ALTER TABLE `Subscription` ADD COLUMN `provider` VARCHAR(191) NULL;
ALTER TABLE `Subscription` ADD COLUMN `providerSubscriptionId` VARCHAR(191) NULL;
ALTER TABLE `Subscription` ADD UNIQUE INDEX `Subscription_providerSubscriptionId_key` (`providerSubscriptionId`);

-- Enforce the Prisma invariant even when the previous multi-tenant migration
-- was already applied by an older release where these columns were nullable.
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

-- Secrets are stored only in encrypted TenantIntegration payloads from now on.
UPDATE `SystemConfig` AS sc
SET sc.`mpAccessToken` = NULL, sc.`mpPublicKey` = NULL
WHERE EXISTS (
  SELECT 1 FROM `TenantIntegration` AS ti
  WHERE ti.`tenantId` = sc.`tenantId` AND ti.`type` = 'MERCADO_PAGO' AND ti.`isActive` = true
);

UPDATE `SystemConfig` SET `vapidPrivateKey` = NULL;
UPDATE `SystemConfig` AS sc
SET sc.`metaApiToken` = NULL, sc.`metaPhoneNumberId` = NULL, sc.`metaVerifyToken` = NULL
WHERE EXISTS (
  SELECT 1 FROM `TenantIntegration` AS ti
  WHERE ti.`tenantId` = sc.`tenantId` AND ti.`type` = 'WHATSAPP' AND ti.`isActive` = true
);
