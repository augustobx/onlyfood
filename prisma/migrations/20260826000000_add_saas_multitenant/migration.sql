-- ==========================================
-- SAAS MULTI-TENANT COMPLETE MIGRATION
-- ==========================================

-- 1. Create Tenant Table
CREATE TABLE IF NOT EXISTS `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    INDEX `Tenant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create Plan Table
CREATE TABLE IF NOT EXISTS `Plan` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceMonthly` DOUBLE NOT NULL DEFAULT 0,
    `maxLocations` INTEGER NOT NULL DEFAULT 1,
    `maxProducts` INTEGER NOT NULL DEFAULT 100,
    `features` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Plan_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Create Subscription Table
CREATE TABLE IF NOT EXISTS `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `trialEndsAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subscription_tenantId_key`(`tenantId`),
    INDEX `Subscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create TenantDomain Table
CREATE TABLE IF NOT EXISTS `TenantDomain` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `hostname` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TenantDomain_hostname_key`(`hostname`),
    INDEX `TenantDomain_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Create Location Table
CREATE TABLE IF NOT EXISTS `Location` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Principal',
    `code` VARCHAR(191) NOT NULL DEFAULT 'main',
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `isMain` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Location_tenantId_code_key`(`tenantId`, `code`),
    INDEX `Location_tenantId_isActive_idx`(`tenantId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. Create TenantFeature Table
CREATE TABLE IF NOT EXISTS `TenantFeature` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `featureKey` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TenantFeature_tenantId_featureKey_key`(`tenantId`, `featureKey`),
    INDEX `TenantFeature_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. Create TenantSettings Table
CREATE TABLE IF NOT EXISTS `TenantSettings` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `appName` VARCHAR(191) NOT NULL DEFAULT 'OnlyFood',
    `logoUrl` VARCHAR(191) NULL,
    `splashUrl` VARCHAR(191) NULL,
    `splashType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    `splashVideoUrl` VARCHAR(191) NULL DEFAULT '/uploads/splashvid.mp4',
    `backgroundUrl` VARCHAR(191) NULL,
    `backgroundBlur` BOOLEAN NOT NULL DEFAULT false,
    `whatsappMessage` VARCHAR(191) NOT NULL DEFAULT 'Hola, tu pedido está en estado: {{estado}}. Gracias por elegirnos!',
    `isStoreOpen` BOOLEAN NOT NULL DEFAULT true,
    `closedMessage` VARCHAR(191) NOT NULL DEFAULT 'Lo sentimos, actualmente nuestro local se encuentra cerrado.',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#f97316',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#9333ea',
    `storeTheme` VARCHAR(191) NOT NULL DEFAULT 'ORIGINAL',
    `splashEnabled` BOOLEAN NOT NULL DEFAULT false,
    `splashDuration` INTEGER NOT NULL DEFAULT 3,
    `welcomeBalloonEnabled` BOOLEAN NOT NULL DEFAULT false,
    `welcomeBalloonText` VARCHAR(191) NOT NULL DEFAULT '¡Te damos la bienvenida!',
    `welcomeBalloonDuration` INTEGER NOT NULL DEFAULT 5,
    `deliveryCost` DOUBLE NOT NULL DEFAULT 0,
    `globalDiscount` DOUBLE NOT NULL DEFAULT 0,
    `paymentCash` BOOLEAN NOT NULL DEFAULT true,
    `paymentMp` BOOLEAN NOT NULL DEFAULT true,
    `autoPrintTickets` BOOLEAN NOT NULL DEFAULT true,
    `printingMode` VARCHAR(191) NOT NULL DEFAULT 'BROWSER',
    `printNodeCounterPrinterId` INTEGER NULL,
    `printNodeKitchenPrinterId` INTEGER NULL,
    `printerCounterName` VARCHAR(191) NULL DEFAULT '',
    `printerCounterSize` VARCHAR(191) NULL DEFAULT '80mm',
    `printerKitchenName` VARCHAR(191) NULL DEFAULT '',
    `printerKitchenSize` VARCHAR(191) NULL DEFAULT '80mm',
    `isRouletteActive` BOOLEAN NOT NULL DEFAULT false,
    `rouletteCost` INTEGER NOT NULL DEFAULT 100,
    `isPointsCatalogActive` BOOLEAN NOT NULL DEFAULT true,
    `allowImmediateOrders` BOOLEAN NOT NULL DEFAULT true,
    `allowScheduledTomorrow` BOOLEAN NOT NULL DEFAULT true,
    `allowAdvanceOrders` BOOLEAN NOT NULL DEFAULT true,
    `advanceOrderMinDays` INTEGER NOT NULL DEFAULT 1,
    `advanceOrderMaxDays` INTEGER NOT NULL DEFAULT 30,
    `asapEstimatedMinutes` INTEGER NOT NULL DEFAULT 40,
    `businessHours` TEXT NULL,
    `autoScheduleEnabled` BOOLEAN NOT NULL DEFAULT false,
    `vapidPublicKey` VARCHAR(191) NULL,
    `vapidPrivateKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TenantSettings_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 8. Create TenantIntegration Table
CREATE TABLE IF NOT EXISTS `TenantIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `encryptedPayload` TEXT NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `authTag` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TenantIntegration_tenantId_type_key`(`tenantId`, `type`),
    INDEX `TenantIntegration_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 9. Create User Table
CREATE TABLE IF NOT EXISTS `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 10. Create TenantMembership Table
CREATE TABLE IF NOT EXISTS `TenantMembership` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `permissions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TenantMembership_tenantId_userId_key`(`tenantId`, `userId`),
    INDEX `TenantMembership_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 11. Create UserSession Table
CREATE TABLE IF NOT EXISTS `UserSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserSession_tokenHash_key`(`tokenHash`),
    INDEX `UserSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 12. Create PlatformAuditLog Table
CREATE TABLE IF NOT EXISTS `PlatformAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformAuditLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `PlatformAuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 13. Add columns to SystemConfig
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `splashType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE';
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `splashVideoUrl` VARCHAR(191) NULL DEFAULT '/uploads/splashvid.mp4';
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `isPointsCatalogActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `printingMode` VARCHAR(191) NOT NULL DEFAULT 'BROWSER';
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `printNodeCounterPrinterId` INTEGER NULL;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `printNodeKitchenPrinterId` INTEGER NULL;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `allowImmediateOrders` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `allowScheduledTomorrow` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `allowAdvanceOrders` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `advanceOrderMinDays` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `advanceOrderMaxDays` INTEGER NOT NULL DEFAULT 30;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `asapEstimatedMinutes` INTEGER NOT NULL DEFAULT 40;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `businessHours` TEXT NULL;
ALTER TABLE `SystemConfig` ADD COLUMN IF NOT EXISTS `autoScheduleEnabled` BOOLEAN NOT NULL DEFAULT false;

-- 14. Add columns to Category
ALTER TABLE `Category` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Category` ADD COLUMN IF NOT EXISTS `sequence` INTEGER NOT NULL DEFAULT 0;

-- 15. Add columns to Product
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `suggestedCost` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `isCombo` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `allowHalf` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `onlyHalf` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `allowRemoveIngredients` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `availableDays` VARCHAR(191) NULL DEFAULT '';
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `sequence` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Product` ADD COLUMN IF NOT EXISTS `points` INTEGER NOT NULL DEFAULT 0;

-- 16. Add columns to Client
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `points` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `pointsSpent` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `ordersCount` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `totalSpent` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Client` ADD COLUMN IF NOT EXISTS `customTierId` VARCHAR(191) NULL;

-- 17. Add columns to Order
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `locationId` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `pointsEarned` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `pointsUsed` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `pointsDiscountAmount` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `isScheduled` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `scheduledDate` DATETIME(3) NULL;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `slotId` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `messengerId` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `orderType` VARCHAR(191) NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `origin` VARCHAR(191) NOT NULL DEFAULT 'WEB';
ALTER TABLE `Order` ADD COLUMN IF NOT EXISTS `channel` VARCHAR(191) NOT NULL DEFAULT 'WEB';

-- 18. Add tenantId and locationId to other models
ALTER TABLE `PushSubscription` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `RoulettePrize` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `RouletteWin` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `PointReward` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `PointRedemption` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `CustomerTier` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `DeliveryTimeSlot` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `DeliveryTimeSlot` ADD COLUMN IF NOT EXISTS `locationId` VARCHAR(191) NULL;
ALTER TABLE `Messenger` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Messenger` ADD COLUMN IF NOT EXISTS `locationId` VARCHAR(191) NULL;
ALTER TABLE `Ingredient` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Extra` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `PaymentRecord` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `Session` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `WhatsAppSession` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `MediaAsset` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;
ALTER TABLE `PrintDispatch` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(191) NULL;

-- 19. Create foreign key constraints
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TenantDomain` ADD CONSTRAINT `TenantDomain_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Location` ADD CONSTRAINT `Location_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantFeature` ADD CONSTRAINT `TenantFeature_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantSettings` ADD CONSTRAINT `TenantSettings_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantIntegration` ADD CONSTRAINT `TenantIntegration_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantMembership` ADD CONSTRAINT `TenantMembership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TenantMembership` ADD CONSTRAINT `TenantMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserSession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PlatformAuditLog` ADD CONSTRAINT `PlatformAuditLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlatformAuditLog` ADD CONSTRAINT `PlatformAuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
