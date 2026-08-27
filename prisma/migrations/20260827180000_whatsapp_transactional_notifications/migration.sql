ALTER TABLE `SystemConfig`
  ADD COLUMN `whatsappNotificationsEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `whatsappNotifyOrderConfirmed` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappNotifyOrderPreparing` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappNotifyOrderReady` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappTemplateLanguage` VARCHAR(191) NOT NULL DEFAULT 'es_AR',
  ADD COLUMN `whatsappConfirmedTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_confirmed',
  ADD COLUMN `whatsappPreparingTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_preparing',
  ADD COLUMN `whatsappReadyPickupTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_ready_pickup',
  ADD COLUMN `whatsappReadyDeliveryTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_ready_delivery',
  ADD COLUMN `whatsappDefaultCountryCode` VARCHAR(191) NOT NULL DEFAULT '549';

ALTER TABLE `Order`
  ADD COLUMN `whatsappOptIn` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `whatsappOptInAt` DATETIME(3) NULL;

ALTER TABLE `TenantSettings`
  ADD COLUMN `whatsappNotificationsEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `whatsappNotifyOrderConfirmed` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappNotifyOrderPreparing` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappNotifyOrderReady` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `whatsappTemplateLanguage` VARCHAR(191) NOT NULL DEFAULT 'es_AR',
  ADD COLUMN `whatsappConfirmedTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_confirmed',
  ADD COLUMN `whatsappPreparingTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_preparing',
  ADD COLUMN `whatsappReadyPickupTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_ready_pickup',
  ADD COLUMN `whatsappReadyDeliveryTemplate` VARCHAR(191) NOT NULL DEFAULT 'onlyfood_order_ready_delivery',
  ADD COLUMN `whatsappDefaultCountryCode` VARCHAR(191) NOT NULL DEFAULT '549';

CREATE TABLE `WhatsAppNotification` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `event` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `recipient` VARCHAR(191) NOT NULL,
  `templateName` VARCHAR(191) NOT NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `WhatsAppNotification_providerMessageId_key`(`providerMessageId`),
  UNIQUE INDEX `WhatsAppNotification_orderId_event_key`(`orderId`, `event`),
  INDEX `WhatsAppNotification_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt`),
  INDEX `WhatsAppNotification_tenantId_orderId_idx`(`tenantId`, `orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WhatsAppNotification`
  ADD CONSTRAINT `WhatsAppNotification_tenantId_fkey`
  FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WhatsAppNotification_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
