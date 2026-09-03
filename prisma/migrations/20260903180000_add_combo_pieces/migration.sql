-- AlterTable
ALTER TABLE `ProductComboItem` ADD COLUMN `pieces` INTEGER NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `OrderItemComboItem` ADD COLUMN `pieces` INTEGER NULL DEFAULT 0;
