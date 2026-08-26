-- AlterTable
ALTER TABLE `SystemConfig`
  ADD COLUMN `allowImmediateOrders` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowScheduledTomorrow` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowAdvanceOrders` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `advanceOrderMinDays` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `advanceOrderMaxDays` INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN `asapEstimatedMinutes` INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN `businessHours` TEXT NULL,
  ADD COLUMN `autoScheduleEnabled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Order`
  ADD COLUMN `orderType` VARCHAR(191) NOT NULL DEFAULT 'IMMEDIATE',
  ADD COLUMN `scheduledDate` DATETIME(3) NULL,
  ADD COLUMN `scheduledTime` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Order_orderType_scheduledDate_idx` ON `Order`(`orderType`, `scheduledDate`);
