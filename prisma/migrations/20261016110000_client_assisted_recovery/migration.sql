CREATE TABLE `ClientRecoveryCode` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `phoneAtIssue` VARCHAR(32) NOT NULL,
  `codeHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ClientRecoveryCode_codeHash_key` (`codeHash`),
  INDEX `ClientRecoveryCode_tenantId_clientId_expiresAt_idx` (`tenantId`, `clientId`, `expiresAt`),
  INDEX `ClientRecoveryCode_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `ClientRecoveryCode_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientRecoveryCode_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
