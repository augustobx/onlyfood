ALTER TABLE `Ingredient` ADD COLUMN `unit` VARCHAR(10) NOT NULL DEFAULT 'UNIT', ADD COLUMN `minimumStock` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN `inventorySnapshot` JSON NULL;
CREATE TABLE `IngredientMovement` (
 `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL, `ingredientId` VARCHAR(191) NOT NULL,
 `type` VARCHAR(24) NOT NULL, `quantity` DOUBLE NOT NULL, `balance` DOUBLE NOT NULL, `unitCost` DOUBLE NOT NULL,
 `reason` VARCHAR(250) NOT NULL, `actorId` VARCHAR(128) NULL, `orderId` VARCHAR(128) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `IngredientMovement_tenantId_ingredientId_createdAt_idx` (`tenantId`,`ingredientId`,`createdAt`),
 INDEX `IngredientMovement_tenantId_orderId_idx` (`tenantId`,`orderId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `IngredientMovement` ADD CONSTRAINT `IngredientMovement_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `Ingredient` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `IngredientMovement` ADD CONSTRAINT `IngredientMovement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `IngredientMovement` (`id`,`tenantId`,`ingredientId`,`type`,`quantity`,`balance`,`unitCost`,`reason`)
SELECT UUID(), `tenantId`, `id`, 'OPENING', `stock`, `stock`, `costPerUnit`, 'Stock disponible conservado al activar el historial' FROM `Ingredient`;
