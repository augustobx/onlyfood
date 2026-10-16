CREATE TABLE `ClientFavorite` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ClientFavorite_tenantId_clientId_productId_key`(`tenantId`,`clientId`,`productId`),
  INDEX `ClientFavorite_tenantId_clientId_createdAt_idx`(`tenantId`,`clientId`,`createdAt`),
  CONSTRAINT `ClientFavorite_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientFavorite_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientFavorite_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
