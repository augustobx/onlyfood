-- Script para agregar las hamburguesas Pink Floyd y AC/DC con sus ingredientes y categoría Burgers

START TRANSACTION;

-- 1. Crear categoría Burgers si no existe
INSERT INTO `Category` (`id`, `name`, `isActive`, `sequence`)
VALUES (UUID(), 'Burgers', 1, 1)
ON DUPLICATE KEY UPDATE `name` = 'Burgers';

SET @cat_burgers_id = (SELECT `id` FROM `Category` WHERE `name` = 'Burgers' LIMIT 1);

-- Actualizar secuencia de Beats Bowls para que aparezca ordenada
UPDATE `Category` SET `sequence` = 2 WHERE `name` = 'Beats Bowls';

-- 2. Insertar los nuevos ingredientes (o actualizar su stock a 100)
INSERT INTO `Ingredient` (`id`, `name`, `unitCost`, `stock`, `createdAt`, `updatedAt`)
VALUES 
  (UUID(), 'Pan de papa', 800, 100, NOW(), NOW()),
  (UUID(), 'Salsa garlic', 400, 100, NOW(), NOW()),
  (UUID(), 'Repollo aliñado', 350, 100, NOW(), NOW()),
  (UUID(), 'Medallón smash', 1800, 100, NOW(), NOW()),
  (UUID(), 'Cheddar', 600, 100, NOW(), NOW()),
  (UUID(), 'Champiñones salteados', 700, 100, NOW(), NOW()),
  (UUID(), 'Salsa barbacoa', 400, 100, NOW(), NOW()),
  (UUID(), 'Panceta', 900, 100, NOW(), NOW()),
  (UUID(), 'Papas fritas tipo lays', 500, 100, NOW(), NOW())
ON DUPLICATE KEY UPDATE `stock` = 100;

-- 3. Crear Producto: Pink Floyd
SET @prod_pink_id = UUID();

INSERT INTO `Product` (
  `id`, `name`, `categoryId`, `basePrice`, `description`, `imageUrl`, `showImage`, `isActive`, `isCombo`, 
  `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `availableDays`, `points`, `suggestedCost`, `createdAt`, `updatedAt`
) VALUES (
  @prod_pink_id,
  'Pink Floyd',
  @cat_burgers_id,
  9800,
  'Pan de papa, salsa garlic, repollo aliñado, medallón smash, cheddar y champiñones salteados.',
  '/uploads/burger_pink_floyd.png',
  1, 1, 0, 0, 0, 1, '', 50, 4650, NOW(), NOW()
);

-- Vincular ingredientes a Pink Floyd
INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `isRemovable`, `quantity`)
SELECT @prod_pink_id, `id`, 1, 1 FROM `Ingredient` WHERE `name` IN (
  'Pan de papa', 'Salsa garlic', 'Repollo aliñado', 'Medallón smash', 'Cheddar', 'Champiñones salteados'
);

-- 4. Crear Producto: AC/DC
SET @prod_acdc_id = UUID();

INSERT INTO `Product` (
  `id`, `name`, `categoryId`, `basePrice`, `description`, `imageUrl`, `showImage`, `isActive`, `isCombo`, 
  `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `availableDays`, `points`, `suggestedCost`, `createdAt`, `updatedAt`
) VALUES (
  @prod_acdc_id,
  'AC/DC',
  @cat_burgers_id,
  9800,
  'Pan de papa, salsa barbacoa, medallón smash, cheddar, panceta y papas fritas tipo lays.',
  '/uploads/burger_acdc.png',
  1, 1, 0, 0, 0, 1, '', 50, 4800, NOW(), NOW()
);

-- Vincular ingredientes a AC/DC
INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `isRemovable`, `quantity`)
SELECT @prod_acdc_id, `id`, 1, 1 FROM `Ingredient` WHERE `name` IN (
  'Pan de papa', 'Salsa barbacoa', 'Medallón smash', 'Cheddar', 'Panceta', 'Papas fritas tipo lays'
);

COMMIT;
