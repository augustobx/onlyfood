-- Make the new modules available on the canonical plans. SuperAdmin can later
-- remove either capability from a plan or override it for an individual tenant.
UPDATE `Plan`
SET `features` = JSON_ARRAY_APPEND(`features`, '$', 'cashRegister')
WHERE `code` IN ('STARTER', 'PRO', 'BUSINESS')
  AND JSON_CONTAINS(`features`, JSON_QUOTE('cashRegister')) = 0;

UPDATE `Plan`
SET `features` = JSON_ARRAY_APPEND(`features`, '$', 'quantityDiscounts')
WHERE `code` IN ('STARTER', 'PRO', 'BUSINESS')
  AND JSON_CONTAINS(`features`, JSON_QUOTE('quantityDiscounts')) = 0;
