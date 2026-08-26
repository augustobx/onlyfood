-- Desactivar verificación de llaves foráneas para limpieza total
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Limpieza de tablas
DELETE FROM `OrderItemComboRemovedIngredient`;
DELETE FROM `OrderItemComboItem`;
DELETE FROM `OrderItemExtra`;
DELETE FROM `OrderItemRemovedIngredient`;
DELETE FROM `OrderItem`;
DELETE FROM `OrderHistory`;
DELETE FROM `Order`;
DELETE FROM `RoulettePrize`;
DELETE FROM `ProductComboItem`;
DELETE FROM `ProductIngredient`;
DELETE FROM `ProductExtra`;
DELETE FROM `IngredientCategory`;
DELETE FROM `Product`;
DELETE FROM `Ingredient`;
DELETE FROM `Category`;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. Crear Categoría "Beats Bowls"
SET @cat_id = UUID();
INSERT INTO `Category` (`id`, `name`, `isActive`, `sequence`)
VALUES (@cat_id, 'Beats Bowls', 1, 1);

-- 3. Crear Ingredientes
SET @ing_pollo_grillado = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_pollo_grillado, 'Pollo grillado', 100, 1500, 1500, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_pollo_grillado, @cat_id);

SET @ing_pasta_fusilli = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_pasta_fusilli, 'Pasta fusilli', 100, 600, 600, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_pasta_fusilli, @cat_id);

SET @ing_pasta_mostachol = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_pasta_mostachol, 'Pasta mostachol', 100, 600, 600, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_pasta_mostachol, @cat_id);

SET @ing_tomates_cherry = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_tomates_cherry, 'Tomates cherry', 100, 500, 500, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_tomates_cherry, @cat_id);

SET @ing_espinaca = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_espinaca, 'Espinaca', 100, 400, 400, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_espinaca, @cat_id);

SET @ing_zanahoria = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_zanahoria, 'Zanahoria', 100, 300, 300, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_zanahoria, @cat_id);

SET @ing_aceitunas = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_aceitunas, 'Aceitunas', 100, 450, 450, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_aceitunas, @cat_id);

SET @ing_dip_yogur = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_dip_yogur, 'Dip de yogur + limón', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_dip_yogur, @cat_id);

SET @ing_zucchini = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_zucchini, 'Zucchini salteado', 100, 500, 500, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_zucchini, @cat_id);

SET @ing_berenjena = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_berenjena, 'Berenjena salteada', 100, 500, 500, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_berenjena, @cat_id);

SET @ing_cebolla_salteada = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_cebolla_salteada, 'Cebolla salteada', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_cebolla_salteada, @cat_id);

SET @ing_zanahoria_salteada = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_zanahoria_salteada, 'Zanahoria salteada', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_zanahoria_salteada, @cat_id);

SET @ing_huevo = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_huevo, 'Huevo', 100, 300, 300, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_huevo, @cat_id);

SET @ing_mix_verdes = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_mix_verdes, 'Mix de hojas verdes', 100, 450, 450, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_mix_verdes, @cat_id);

SET @ing_merluza = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_merluza, 'Medallón de merluza con espinaca', 100, 1800, 1800, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_merluza, @cat_id);

SET @ing_arroz = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_arroz, 'Arroz blanco', 100, 400, 400, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_arroz, @cat_id);

SET @ing_repollo_morado = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_repollo_morado, 'Repollo morado', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_repollo_morado, @cat_id);

SET @ing_girasol = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_girasol, 'Semillas de girasol', 100, 300, 300, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_girasol, @cat_id);

SET @ing_bondiola = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_bondiola, 'Bondiola desmenuzada', 100, 2200, 2200, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_bondiola, @cat_id);

SET @ing_batata = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_batata, 'Batata', 100, 400, 400, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_batata, @cat_id);

SET @ing_garbanzos = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_garbanzos, 'Garbanzos', 100, 450, 450, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_garbanzos, @cat_id);

SET @ing_cebolla_caramelizada = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_cebolla_caramelizada, 'Cebolla caramelizada', 100, 400, 400, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_cebolla_caramelizada, @cat_id);

SET @ing_aceite_oliva = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_aceite_oliva, 'Aceite de oliva en los garbanzos', 100, 300, 300, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_aceite_oliva, @cat_id);

SET @ing_dip_bbq = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_dip_bbq, 'Dip de BBQ casera liviana', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_dip_bbq, @cat_id);

SET @ing_carne_salteada = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_carne_salteada, 'Carne salteada', 100, 2000, 2000, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_carne_salteada, @cat_id);

SET @ing_porotos_negros = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_porotos_negros, 'Porotos negros', 100, 400, 400, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_porotos_negros, @cat_id);

SET @ing_choclo = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_choclo, 'Choclo', 100, 450, 450, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_choclo, @cat_id);

SET @ing_lechuga_verde = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_lechuga_verde, 'Lechuga verde', 100, 350, 350, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_lechuga_verde, @cat_id);

SET @ing_dip_guacamole = UUID();
INSERT INTO `Ingredient` (`id`, `name`, `stock`, `costPerUnit`, `purchasePrice`, `yieldUnits`, `isActive`)
VALUES (@ing_dip_guacamole, 'Dip de guacamole', 100, 500, 500, 1, 1);
INSERT INTO `IngredientCategory` (`ingredientId`, `categoryId`) VALUES (@ing_dip_guacamole, @cat_id);

-- 4. Crear los 5 Productos (Bowls del Menú Semanal)

-- 4.1 LUNES: Chicken Pasta Bowl
SET @prod_lunes = UUID();
INSERT INTO `Product` (`id`, `name`, `basePrice`, `suggestedCost`, `points`, `description`, `availableDays`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `isActive`, `showImage`, `isCombo`, `categoryId`)
VALUES (@prod_lunes, 'Chicken Pasta Bowl', 7800, 4100, 50, 'Pollo grillado, pasta fusilli, tomates cherry, espinaca, zanahoria, aceitunas y dip de yogur + limón.', 'MONDAY', 0, 0, 1, 1, 0, 0, @cat_id);

INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
(@prod_lunes, @ing_pollo_grillado, 1, 1),
(@prod_lunes, @ing_pasta_fusilli, 1, 1),
(@prod_lunes, @ing_tomates_cherry, 1, 1),
(@prod_lunes, @ing_espinaca, 1, 1),
(@prod_lunes, @ing_zanahoria, 1, 1),
(@prod_lunes, @ing_aceitunas, 1, 1),
(@prod_lunes, @ing_dip_yogur, 1, 1);

-- 4.2 MARTES: Chicken Veggie Bowl
SET @prod_martes = UUID();
INSERT INTO `Product` (`id`, `name`, `basePrice`, `suggestedCost`, `points`, `description`, `availableDays`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `isActive`, `showImage`, `isCombo`, `categoryId`)
VALUES (@prod_martes, 'Chicken Veggie Bowl', 7800, 4450, 50, 'Pollo grillado, pasta mostachol, zucchini salteado, berenjena salteada, cebolla salteada, zanahoria salteada, huevo y mix de hojas verdes.', 'TUESDAY', 0, 0, 1, 1, 0, 0, @cat_id);

INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
(@prod_martes, @ing_pollo_grillado, 1, 1),
(@prod_martes, @ing_pasta_mostachol, 1, 1),
(@prod_martes, @ing_zucchini, 1, 1),
(@prod_martes, @ing_berenjena, 1, 1),
(@prod_martes, @ing_cebolla_salteada, 1, 1),
(@prod_martes, @ing_zanahoria_salteada, 1, 1),
(@prod_martes, @ing_huevo, 1, 1),
(@prod_martes, @ing_mix_verdes, 1, 1);

-- 4.3 MIÉRCOLES: Ocean Bowl
SET @prod_miercoles = UUID();
INSERT INTO `Product` (`id`, `name`, `basePrice`, `suggestedCost`, `points`, `description`, `availableDays`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `isActive`, `showImage`, `isCombo`, `categoryId`)
VALUES (@prod_miercoles, 'Ocean Bowl', 8200, 4450, 50, 'Medallón de merluza con espinaca, huevo, arroz blanco, repollo morado, tomates cherry, mix de hojas verdes, semillas de girasol y dip de yogur + limón.', 'WEDNESDAY', 0, 0, 1, 1, 0, 0, @cat_id);

INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
(@prod_miercoles, @ing_merluza, 1, 1),
(@prod_miercoles, @ing_huevo, 1, 1),
(@prod_miercoles, @ing_arroz, 1, 1),
(@prod_miercoles, @ing_repollo_morado, 1, 1),
(@prod_miercoles, @ing_tomates_cherry, 1, 1),
(@prod_miercoles, @ing_mix_verdes, 1, 1),
(@prod_miercoles, @ing_girasol, 1, 1),
(@prod_miercoles, @ing_dip_yogur, 1, 1);

-- 4.4 JUEVES: Smoky Pork Bowl
SET @prod_jueves = UUID();
INSERT INTO `Product` (`id`, `name`, `basePrice`, `suggestedCost`, `points`, `description`, `availableDays`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `isActive`, `showImage`, `isCombo`, `categoryId`)
VALUES (@prod_jueves, 'Smoky Pork Bowl', 8500, 4900, 50, 'Bondiola desmenuzada, batata, garbanzos, repollo morado, mix de hojas verdes, cebolla caramelizada, aceite de oliva en los garbanzos y dip de BBQ casera liviana.', 'THURSDAY', 0, 0, 1, 1, 0, 0, @cat_id);

INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
(@prod_jueves, @ing_bondiola, 1, 1),
(@prod_jueves, @ing_batata, 1, 1),
(@prod_jueves, @ing_garbanzos, 1, 1),
(@prod_jueves, @ing_repollo_morado, 1, 1),
(@prod_jueves, @ing_mix_verdes, 1, 1),
(@prod_jueves, @ing_cebolla_caramelizada, 1, 1),
(@prod_jueves, @ing_aceite_oliva, 1, 1),
(@prod_jueves, @ing_dip_bbq, 1, 1);

-- 4.5 VIERNES: Mexican Bowl
SET @prod_viernes = UUID();
INSERT INTO `Product` (`id`, `name`, `basePrice`, `suggestedCost`, `points`, `description`, `availableDays`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `isActive`, `showImage`, `isCombo`, `categoryId`)
VALUES (@prod_viernes, 'Mexican Bowl', 8500, 4450, 50, 'Carne salteada, arroz blanco, porotos negros, choclo, lechuga verde, tomates cherry y dip de guacamole.', 'FRIDAY', 0, 0, 1, 1, 0, 0, @cat_id);

INSERT INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
(@prod_viernes, @ing_carne_salteada, 1, 1),
(@prod_viernes, @ing_arroz, 1, 1),
(@prod_viernes, @ing_porotos_negros, 1, 1),
(@prod_viernes, @ing_choclo, 1, 1),
(@prod_viernes, @ing_lechuga_verde, 1, 1),
(@prod_viernes, @ing_tomates_cherry, 1, 1),
(@prod_viernes, @ing_dip_guacamole, 1, 1);

-- 5. Actualizar SystemConfig
UPDATE `SystemConfig`
SET `appName` = 'Beats Bowls',
    `closedMessage` = 'Ya cerramos por hoy. ¡Hacé tu reserva para el menú semanal de bowls!'
LIMIT 1;
