ALTER TABLE `SystemConfig`
  ADD COLUMN `noticeBoardEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `noticeBoardTitle` VARCHAR(191) NOT NULL DEFAULT 'Novedades',
  ADD COLUMN `noticeBoardMessage` TEXT NOT NULL DEFAULT '',
  ADD COLUMN `noticeBoardAutoClose` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `noticeBoardDuration` INTEGER NOT NULL DEFAULT 8;

ALTER TABLE `TenantSettings`
  ADD COLUMN `noticeBoardEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `noticeBoardTitle` VARCHAR(191) NOT NULL DEFAULT 'Novedades',
  ADD COLUMN `noticeBoardMessage` TEXT NOT NULL DEFAULT '',
  ADD COLUMN `noticeBoardAutoClose` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `noticeBoardDuration` INTEGER NOT NULL DEFAULT 8;
