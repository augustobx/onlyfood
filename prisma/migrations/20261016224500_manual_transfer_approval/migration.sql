-- Transferencia manual: opt-in por comercio y auditoria del pago.
ALTER TABLE `SystemConfig`
  ADD COLUMN `paymentTransfer` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `transferAlias` VARCHAR(60) NOT NULL DEFAULT '',
  ADD COLUMN `transferCbu` VARCHAR(22) NOT NULL DEFAULT '',
  ADD COLUMN `transferHolder` VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN `transferWhatsApp` VARCHAR(20) NOT NULL DEFAULT '';

ALTER TABLE `Order`
  ADD COLUMN `transferInstructions` JSON NULL,
  ADD COLUMN `transferApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `transferApprovedBy` VARCHAR(100) NULL;

CREATE INDEX `Order_tenantId_paymentMethod_paymentStatus_idx`
  ON `Order`(`tenantId`, `paymentMethod`, `paymentStatus`);
