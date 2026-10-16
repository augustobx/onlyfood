-- Se registra solo la finalización del paso DNI.
-- No se almacena el número de documento; no implica validación de identidad.
ALTER TABLE `Client` ADD COLUMN `dniProvidedAt` DATETIME(3) NULL;
