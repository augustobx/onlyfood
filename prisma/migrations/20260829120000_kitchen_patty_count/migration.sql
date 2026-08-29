ALTER TABLE `SystemConfig`
  ADD COLUMN `kitchenPattyCountEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `kitchenPattyKeywords` VARCHAR(191) NOT NULL DEFAULT 'medallón,medallon';

ALTER TABLE `TenantSettings`
  ADD COLUMN `kitchenPattyCountEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `kitchenPattyKeywords` VARCHAR(191) NOT NULL DEFAULT 'medallón,medallon';
