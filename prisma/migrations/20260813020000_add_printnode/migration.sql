ALTER TABLE `SystemConfig`
  ADD COLUMN `printingMode` VARCHAR(191) NOT NULL DEFAULT 'BROWSER',
  ADD COLUMN `printNodeCounterPrinterId` INTEGER NULL,
  ADD COLUMN `printNodeKitchenPrinterId` INTEGER NULL;

CREATE TABLE `PrintDispatch` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `printNodeJobId` INTEGER NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PrintDispatch_orderId_kind_key`(`orderId`, `kind`),
  INDEX `PrintDispatch_status_updatedAt_idx`(`status`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PrintDispatch`
  ADD CONSTRAINT `PrintDispatch_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
