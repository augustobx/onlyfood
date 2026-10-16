-- Aditivo: autenticación de clientes por comercio.
ALTER TABLE `SystemConfig` ADD COLUMN `requireLoginForCheckout` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Client` ADD COLUMN `email` VARCHAR(254) NULL,
  ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `Client_tenantId_email_key` ON `Client`(`tenantId`, `email`);

CREATE TABLE `ClientPasskey` (
  `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL, `credentialId` VARCHAR(512) NOT NULL,
  `publicKey` TEXT NOT NULL, `algorithm` VARCHAR(16) NOT NULL,
  `transports` JSON NULL, `counter` BIGINT NOT NULL DEFAULT 0,
  `authenticatorName` VARCHAR(120) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, `lastUsedAt` DATETIME(3) NULL,
  PRIMARY KEY(`id`), UNIQUE INDEX `ClientPasskey_tenantId_credentialId_key`(`tenantId`,`credentialId`),
  INDEX `ClientPasskey_tenantId_clientId_idx`(`tenantId`,`clientId`),
  CONSTRAINT `ClientPasskey_tenantId_fkey` FOREIGN KEY(`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientPasskey_clientId_fkey` FOREIGN KEY(`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `ClientPasskeyChallenge` (
  `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `clientId` VARCHAR(191) NULL,
  `kind` VARCHAR(24) NOT NULL, `challenge` VARCHAR(255) NOT NULL,
  `origin` VARCHAR(255) NOT NULL, `rpId` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY(`id`), INDEX `ClientPasskeyChallenge_tenantId_kind_expiresAt_idx`(`tenantId`,`kind`,`expiresAt`),
  CONSTRAINT `ClientPasskeyChallenge_tenantId_fkey` FOREIGN KEY(`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `ClientSecurityToken` (
  `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL, `purpose` VARCHAR(24) NOT NULL,
  `email` VARCHAR(254) NOT NULL, `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL, `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY(`id`), UNIQUE INDEX `ClientSecurityToken_tokenHash_key`(`tokenHash`),
  INDEX `ClientSecurityToken_tenantId_clientId_purpose_idx`(`tenantId`,`clientId`,`purpose`),
  INDEX `ClientSecurityToken_expiresAt_idx`(`expiresAt`),
  CONSTRAINT `ClientSecurityToken_tenantId_fkey` FOREIGN KEY(`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClientSecurityToken_clientId_fkey` FOREIGN KEY(`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
