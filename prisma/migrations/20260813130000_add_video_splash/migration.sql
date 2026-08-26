ALTER TABLE `SystemConfig`
  ADD COLUMN `splashType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN `splashVideoUrl` VARCHAR(191) NULL DEFAULT '/uploads/splashvid.mp4';
