-- CreateTable PointReward
CREATE TABLE IF NOT EXISTS `PointReward` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `pointsCost` INTEGER NOT NULL DEFAULT 100,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NULL,
    `productId` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `badgeText` VARCHAR(191) NULL,
    `minTierId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sequence` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable PointRedemption
CREATE TABLE IF NOT EXISTS `PointRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `rewardId` VARCHAR(191) NOT NULL,
    `pointsSpent` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `usedOrderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `usedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable CustomerTier
CREATE TABLE IF NOT EXISTS `CustomerTier` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `badgeText` VARCHAR(191) NOT NULL DEFAULT 'VIP',
    `description` VARCHAR(191) NULL,
    `minOrdersCount` INTEGER NOT NULL DEFAULT 0,
    `minPoints` INTEGER NOT NULL DEFAULT 0,
    `minSpent` DOUBLE NOT NULL DEFAULT 0,
    `discountPercent` DOUBLE NOT NULL DEFAULT 0,
    `pointsMultiplier` DOUBLE NOT NULL DEFAULT 1.0,
    `color` VARCHAR(191) NOT NULL DEFAULT '#f97316',
    `bgGradient` VARCHAR(191) NULL DEFAULT 'from-amber-500 to-yellow-600',
    `iconName` VARCHAR(191) NOT NULL DEFAULT 'Crown',
    `sequence` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable PointReward
ALTER TABLE `PointReward`
    ADD COLUMN IF NOT EXISTS `minTierId` VARCHAR(191) NULL;

-- AlterTable Client
ALTER TABLE `Client`
    ADD COLUMN IF NOT EXISTS `customTierId` VARCHAR(191) NULL;

-- AddForeignKeys (using stored procedure style or safe checks)
SET @fk_reward = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'PointReward_minTierId_fkey');
SET @sql_reward = IF(@fk_reward = 0, 'ALTER TABLE `PointReward` ADD CONSTRAINT `PointReward_minTierId_fkey` FOREIGN KEY (`minTierId`) REFERENCES `CustomerTier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;', 'SELECT 1;');
PREPARE stmt_reward FROM @sql_reward;
EXECUTE stmt_reward;
DEALLOCATE PREPARE stmt_reward;

SET @fk_client = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'Client_customTierId_fkey');
SET @sql_client = IF(@fk_client = 0, 'ALTER TABLE `Client` ADD CONSTRAINT `Client_customTierId_fkey` FOREIGN KEY (`customTierId`) REFERENCES `CustomerTier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;', 'SELECT 1;');
PREPARE stmt_client FROM @sql_client;
EXECUTE stmt_client;
DEALLOCATE PREPARE stmt_client;

-- Seed initial tiers if none exist
INSERT IGNORE INTO `CustomerTier` (`id`, `name`, `badgeText`, `description`, `minOrdersCount`, `minPoints`, `minSpent`, `discountPercent`, `pointsMultiplier`, `color`, `bgGradient`, `iconName`, `sequence`, `isActive`, `createdAt`, `updatedAt`)
VALUES
('tier-club', 'Beaters Club', 'CLUB', 'Nivel de bienvenida por sumarte al club.', 0, 0, 0, 0, 1.0, '#3b82f6', 'from-blue-600 to-indigo-600', 'Star', 1, 1, NOW(3), NOW(3)),
('tier-gold', 'Beaters Gold', 'GOLD', 'Clientes frecuentes con beneficios automáticos.', 3, 150, 25000, 5, 1.25, '#f59e0b', 'from-amber-500 to-yellow-600', 'Flame', 2, 1, NOW(3), NOW(3)),
('tier-select', 'Beaters Select', 'SELECT VIP', 'Nivel exclusivo VIP con descuentos máximos y premios secretos.', 7, 400, 60000, 10, 1.5, '#9333ea', 'from-purple-600 to-pink-600', 'Crown', 3, 1, NOW(3), NOW(3));
