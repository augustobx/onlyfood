-- Optional third station: existing stores continue with their two tickets until enabled.
ALTER TABLE `SystemConfig`
  ADD COLUMN `assemblyPrintEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `printNodeAssemblyPrinterId` INT NULL;
ALTER TABLE `TenantSettings`
  ADD COLUMN `assemblyPrintEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `printNodeAssemblyPrinterId` INT NULL;
