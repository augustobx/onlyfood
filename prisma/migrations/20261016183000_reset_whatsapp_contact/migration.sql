-- Permite al comercio definir el número WhatsApp receptor de solicitudes de reseteo.
-- Independiente de la integración oficial de WhatsApp y sin afectar otros tenants.
ALTER TABLE `SystemConfig`
  ADD COLUMN `passwordResetWhatsAppPhone` VARCHAR(30) NOT NULL DEFAULT '';
