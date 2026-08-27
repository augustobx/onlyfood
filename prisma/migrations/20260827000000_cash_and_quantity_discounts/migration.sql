-- Daily cash register sessions and movements
CREATE TABLE `CashSession` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `locationId` VARCHAR(191) NOT NULL,
  `businessDate` DATE NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
  `openingBalance` DOUBLE NOT NULL DEFAULT 0,
  `expectedBalance` DOUBLE NULL,
  `closingBalance` DOUBLE NULL,
  `difference` DOUBLE NULL,
  `openingNotes` TEXT NULL,
  `closingNotes` TEXT NULL,
  `openedByUserId` VARCHAR(191) NULL,
  `openedByName` VARCHAR(191) NULL,
  `closedByUserId` VARCHAR(191) NULL,
  `closedByName` VARCHAR(191) NULL,
  `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `CashSession_tenantId_locationId_businessDate_key`(`tenantId`, `locationId`, `businessDate`),
  INDEX `CashSession_tenantId_businessDate_idx`(`tenantId`, `businessDate`),
  INDEX `CashSession_tenantId_status_idx`(`tenantId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CashMovement` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `cashSessionId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DOUBLE NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdByUserId` VARCHAR(191) NULL,
  `createdByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `CashMovement_tenantId_occurredAt_idx`(`tenantId`, `occurredAt`),
  INDEX `CashMovement_tenantId_cashSessionId_idx`(`tenantId`, `cashSessionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Quantity-based promotions
CREATE TABLE `QuantityDiscount` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `minQuantity` INTEGER NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `value` DOUBLE NOT NULL,
  `priority` INTEGER NOT NULL DEFAULT 0,
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `QuantityDiscount_tenantId_isActive_startsAt_endsAt_idx`(`tenantId`, `isActive`, `startsAt`, `endsAt`),
  INDEX `QuantityDiscount_tenantId_priority_idx`(`tenantId`, `priority`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QuantityDiscountProduct` (
  `quantityDiscountId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,

  INDEX `QuantityDiscountProduct_productId_idx`(`productId`),
  PRIMARY KEY (`quantityDiscountId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Order`
  ADD COLUMN `quantityDiscountAmount` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `discountDetails` JSON NULL;

ALTER TABLE `CashSession`
  ADD CONSTRAINT `CashSession_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CashSession_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CashMovement`
  ADD CONSTRAINT `CashMovement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CashMovement_cashSessionId_fkey` FOREIGN KEY (`cashSessionId`) REFERENCES `CashSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `QuantityDiscount`
  ADD CONSTRAINT `QuantityDiscount_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuantityDiscountProduct`
  ADD CONSTRAINT `QuantityDiscountProduct_quantityDiscountId_fkey` FOREIGN KEY (`quantityDiscountId`) REFERENCES `QuantityDiscount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `QuantityDiscountProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
