CREATE TABLE `PrintAgentPairingCode` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PrintAgentPairingCode_codeHash_key`(`codeHash`),
  INDEX `PrintAgentPairingCode_tenantId_expiresAt_idx`(`tenantId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PrintAgentPairingCode_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PrintAgentDevice` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `platform` VARCHAR(191) NOT NULL,
  `version` VARCHAR(191) NOT NULL,
  `printers` JSON NULL,
  `lastSeenAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PrintAgentDevice_tokenHash_key`(`tokenHash`),
  INDEX `PrintAgentDevice_tenantId_revokedAt_idx`(`tenantId`, `revokedAt`),
  INDEX `PrintAgentDevice_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PrintAgentDevice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PrintAgentJob` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `destination` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `contentType` VARCHAR(191) NOT NULL DEFAULT 'RAW_BASE64',
  `payload` LONGTEXT NOT NULL,
  `copies` INTEGER NOT NULL DEFAULT 1,
  `widthMm` INTEGER NOT NULL DEFAULT 80,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `leasedById` VARCHAR(191) NULL,
  `leaseUntil` DATETIME(3) NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `printedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PrintAgentJob_idempotencyKey_key`(`idempotencyKey`),
  INDEX `PrintAgentJob_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt`),
  INDEX `PrintAgentJob_leasedById_leaseUntil_idx`(`leasedById`, `leaseUntil`),
  INDEX `PrintAgentJob_orderId_destination_idx`(`orderId`, `destination`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PrintAgentJob_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
