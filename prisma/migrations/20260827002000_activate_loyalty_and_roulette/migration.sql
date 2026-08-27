-- Activate the existing loyalty modules once for subscribed tenants whose
-- effective plan includes them. Later changes made by an administrator remain
-- untouched because migrations only run once.
UPDATE `SystemConfig` AS sc
JOIN `Subscription` AS s ON s.`tenantId` = sc.`tenantId`
JOIN `Plan` AS p ON p.`id` = s.`planId`
SET sc.`isPointsCatalogActive` = TRUE
WHERE JSON_CONTAINS(p.`features`, JSON_QUOTE('loyalty')) = 1;

UPDATE `SystemConfig` AS sc
JOIN `Subscription` AS s ON s.`tenantId` = sc.`tenantId`
JOIN `Plan` AS p ON p.`id` = s.`planId`
SET sc.`isRouletteActive` = TRUE,
    sc.`rouletteCost` = CASE WHEN sc.`rouletteCost` <= 0 THEN 100 ELSE sc.`rouletteCost` END
WHERE JSON_CONTAINS(p.`features`, JSON_QUOTE('roulette')) = 1;

-- Provide an immediately usable catalog only where none was configured.
INSERT INTO `PointReward`
  (`id`, `tenantId`, `name`, `description`, `pointsCost`, `type`, `value`, `badgeText`, `isActive`, `sequence`, `createdAt`, `updatedAt`)
SELECT UUID(), t.`id`, defaults.`name`, defaults.`description`, defaults.`pointsCost`, defaults.`type`, defaults.`value`, defaults.`badgeText`, TRUE, defaults.`sequence`, NOW(3), NOW(3)
FROM `Tenant` AS t
JOIN `Subscription` AS s ON s.`tenantId` = t.`id`
JOIN `Plan` AS p ON p.`id` = s.`planId`
CROSS JOIN (
  SELECT '10% de descuento' AS `name`, 'Canjeable en tu próximo pedido.' AS `description`, 250 AS `pointsCost`, 'PERCENT' AS `type`, 10.0 AS `value`, 'POPULAR' AS `badgeText`, 1 AS `sequence`
  UNION ALL
  SELECT '$1.000 de descuento', 'Descuento directo en tu próximo pedido.', 400, 'AMOUNT', 1000.0, 'AHORRO', 2
) AS defaults
WHERE JSON_CONTAINS(p.`features`, JSON_QUOTE('loyalty')) = 1
  AND NOT EXISTS (SELECT 1 FROM `PointReward` existing WHERE existing.`tenantId` = t.`id`);

-- Products that never had a points value now earn roughly one point per $100,
-- with a minimum of 10. Explicitly configured non-zero values are preserved.
UPDATE `Product` AS product
JOIN `Subscription` AS s ON s.`tenantId` = product.`tenantId`
JOIN `Plan` AS p ON p.`id` = s.`planId`
SET product.`points` = GREATEST(10, ROUND(product.`basePrice` / 100))
WHERE product.`points` = 0
  AND JSON_CONTAINS(p.`features`, JSON_QUOTE('loyalty')) = 1;

-- Seed a balanced wheel only where the merchant has no prizes yet.
INSERT INTO `RoulettePrize`
  (`id`, `tenantId`, `name`, `probability`, `type`, `value`, `bgColor`, `textColor`)
SELECT UUID(), t.`id`, defaults.`name`, defaults.`probability`, defaults.`type`, defaults.`value`, defaults.`bgColor`, '#ffffff'
FROM `Tenant` AS t
JOIN `Subscription` AS s ON s.`tenantId` = t.`id`
JOIN `Plan` AS p ON p.`id` = s.`planId`
CROSS JOIN (
  SELECT '5% OFF' AS `name`, 50.0 AS `probability`, 'PERCENT' AS `type`, 5.0 AS `value`, '#7c3aed' AS `bgColor`
  UNION ALL
  SELECT '$500 OFF', 30.0, 'AMOUNT', 500.0, '#ea580c'
  UNION ALL
  SELECT '10% OFF', 20.0, 'PERCENT', 10.0, '#db2777'
) AS defaults
WHERE JSON_CONTAINS(p.`features`, JSON_QUOTE('roulette')) = 1
  AND NOT EXISTS (SELECT 1 FROM `RoulettePrize` existing WHERE existing.`tenantId` = t.`id`);
