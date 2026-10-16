-- Aditivo: solicitudes administrativas de recuperación para clientes sin email.
ALTER TABLE `Client`
  ADD COLUMN `forcePasswordChange` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `temporaryPasswordExpiresAt` DATETIME(3) NULL;

CREATE TABLE `ClientPasswordResetRequest` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `claimedName` VARCHAR(80) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `ClientPasswordResetRequest_tenantId_status_createdAt_idx` (`tenantId`, `status`, `createdAt`),
  INDEX `ClientPasswordResetRequest_tenantId_clientId_createdAt_idx` (`tenantId`, `clientId`, `createdAt`),
  CONSTRAINT `ClientPasswordResetRequest_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientPasswordResetRequest_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
