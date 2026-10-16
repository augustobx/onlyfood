-- Direcciones guardadas por usuario y por tenant. Aditiva, sin alterar pedidos existentes.
CREATE TABLE `ClientSavedAddress` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(40) NOT NULL,
  `street` VARCHAR(180) NOT NULL,
  `unit` VARCHAR(60) NOT NULL DEFAULT '',
  `reference` VARCHAR(80) NOT NULL DEFAULT '',
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ClientSavedAddress_tenantId_clientId_isDefault_idx` (`tenantId`, `clientId`, `isDefault`),
  INDEX `ClientSavedAddress_tenantId_clientId_updatedAt_idx` (`tenantId`, `clientId`, `updatedAt`),
  CONSTRAINT `ClientSavedAddress_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientSavedAddress_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
