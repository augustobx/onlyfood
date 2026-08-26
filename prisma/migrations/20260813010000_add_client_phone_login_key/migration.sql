-- Permite reconocer el mismo teléfono aunque se escriba como 3329..., 03329...,
-- +543329..., +5493329..., 011... o con espacios/guiones.
ALTER TABLE `Client`
  ADD COLUMN `phoneLoginKey` VARCHAR(6) NULL;

UPDATE `Client`
SET `phoneLoginKey` = RIGHT(REGEXP_REPLACE(`phone`, '[^0-9]', ''), 6)
WHERE CHAR_LENGTH(REGEXP_REPLACE(`phone`, '[^0-9]', '')) >= 6;

CREATE INDEX `Client_phoneLoginKey_idx` ON `Client`(`phoneLoginKey`);
