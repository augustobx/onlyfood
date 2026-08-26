-- ==========================================================
-- BEATSBURGERS — SEMILLA DE DATOS COMPLETA
-- ==========================================================

-- 1. SYSTEM CONFIG
INSERT INTO `SystemConfig` (
  `id`, `appName`, `logoUrl`, `splashUrl`, `splashType`, `splashVideoUrl`,
  `backgroundUrl`, `backgroundBlur`, `whatsappMessage`, `isStoreOpen`, `closedMessage`,
  `primaryColor`, `secondaryColor`, `storeTheme`, `splashEnabled`, `splashDuration`,
  `welcomeBalloonEnabled`, `welcomeBalloonText`, `welcomeBalloonDuration`, `deliveryCost`, `globalDiscount`,
  `paymentCash`, `paymentMp`, `autoPrintTickets`, `printingMode`, `isRouletteActive`, `rouletteCost`,
  `allowScheduledTomorrow`, `allowAdvanceOrders`, `advanceOrderMinDays`, `advanceOrderMaxDays`,
  `asapEstimatedMinutes`, `businessHours`, `autoScheduleEnabled`, `whatsappBotEnabled`, `printerCounterSize`, `printerKitchenSize`, `updatedAt`
) VALUES (
  'sys-config-001',
  'BeatsBurgers',
  NULL,
  NULL,
  'IMAGE',
  '/uploads/splashvid.mp4',
  NULL,
  0,
  '¡Hola {{cliente}}! Tu pedido #{{orden}} de BeatsBurgers está: {{estado}} 🍔🔥',
  1,
  'Ya cerramos por hoy. ¡Volvemos mañana con las mejores smash burgers y bowls!',
  '#f97316',
  '#9333ea',
  'NEXO',
  0,
  3,
  1,
  '¡Te damos la bienvenida a BeatsBurgers! Acumulá puntos con cada compra 🎁',
  5,
  1200,
  0,
  1,
  1,
  1,
  'BROWSER',
  1,
  50,
  1,
  1,
  1,
  30,
  40,
  '[{\"day\":0,\"dayName\":\"Domingo\",\"isOpen\":true,\"shift1Open\":\"12:00\",\"shift1Close\":\"16:00\",\"shift2Open\":\"19:30\",\"shift2Close\":\"00:00\"},{\"day\":1,\"dayName\":\"Lunes\",\"isOpen\":false,\"shift1Open\":\"19:30\",\"shift1Close\":\"23:30\",\"shift2Open\":\"\",\"shift2Close\":\"\"},{\"day\":2,\"dayName\":\"Martes\",\"isOpen\":true,\"shift1Open\":\"19:30\",\"shift1Close\":\"23:30\",\"shift2Open\":\"\",\"shift2Close\":\"\"},{\"day\":3,\"dayName\":\"Miércoles\",\"isOpen\":true,\"shift1Open\":\"19:30\",\"shift1Close\":\"23:30\",\"shift2Open\":\"\",\"shift2Close\":\"\"},{\"day\":4,\"dayName\":\"Jueves\",\"isOpen\":true,\"shift1Open\":\"19:30\",\"shift1Close\":\"00:00\",\"shift2Open\":\"\",\"shift2Close\":\"\"},{\"day\":5,\"dayName\":\"Viernes\",\"isOpen\":true,\"shift1Open\":\"12:00\",\"shift1Close\":\"15:30\",\"shift2Open\":\"19:30\",\"shift2Close\":\"01:00\"},{\"day\":6,\"dayName\":\"Sábado\",\"isOpen\":true,\"shift1Open\":\"12:00\",\"shift1Close\":\"16:00\",\"shift2Open\":\"19:30\",\"shift2Close\":\"01:30\"}]',
  0,
  0,
  '80mm',
  '80mm',
  NOW(3)
) ON DUPLICATE KEY UPDATE
  `appName` = 'BeatsBurgers',
  `isStoreOpen` = 1,
  `storeTheme` = 'NEXO',
  `allowScheduledTomorrow` = 1,
  `allowAdvanceOrders` = 1,
  `advanceOrderMinDays` = 1,
  `advanceOrderMaxDays` = 30,
  `asapEstimatedMinutes` = 40,
  `updatedAt` = NOW(3);

-- 2. FRANJAS HORARIAS
INSERT IGNORE INTO `DeliveryTimeSlot` (`id`, `time`, `capacity`, `available`, `isActive`, `sequence`) VALUES
('slot-1', '20:00 - 20:45', 15, 15, 1, 1),
('slot-2', '20:45 - 21:30', 18, 18, 1, 2),
('slot-3', '21:30 - 22:15', 20, 20, 1, 3),
('slot-4', '22:15 - 23:00', 15, 15, 1, 4),
('slot-5', '23:00 - 23:45', 12, 12, 1, 5);

-- 3. CADETES / MENSAJEROS
INSERT IGNORE INTO `Messenger` (`id`, `name`, `phone`, `isActive`) VALUES
('msg-1', 'Lucas Gómez', '1145219874', 1),
('msg-2', 'Martín Rossi', '1168931122', 1),
('msg-3', 'Sofía Fernández', '1133445566', 1);

-- 4. CATEGORÍAS
INSERT IGNORE INTO `Category` (`id`, `name`, `isActive`, `sequence`) VALUES
('cat-1', 'Hamburguesas Smash & Especiales', 1, 1),
('cat-2', 'Bowls & Ensaladas Saludables', 1, 2),
('cat-3', 'Combos Beats (Burger + Papas + Bebida)', 1, 3),
('cat-4', 'Acompañamientos & Entradas', 1, 4),
('cat-5', 'Bebidas & Cervezas', 1, 5),
('cat-6', 'Postres & Shakes', 1, 6);

-- 5. INGREDIENTES PARA CONTROL DE STOCK
INSERT IGNORE INTO `Ingredient` (`id`, `name`, `stock`, `purchaseVolume`, `isActive`, `purchasePrice`, `yieldUnits`, `costPerUnit`) VALUES
('ing-1', 'Medallón Smash Beef 120g', 250, 'un', 1, 1200, 1, 1200),
('ing-2', 'Pechuga de Pollo Crispy', 140, 'un', 1, 1000, 1, 1000),
('ing-3', 'Medallón Veggie Lentejas', 80, 'un', 1, 800, 1, 800),
('ing-4', 'Queso Cheddar Fundido', 350, 'fetas', 1, 300, 1, 300),
('ing-5', 'Queso Provolone Ahumado', 120, 'fetas', 1, 400, 1, 400),
('ing-6', 'Panceta Ahumada Crispy', 220, 'tiras', 1, 350, 1, 350),
('ing-7', 'Cebolla Caramelizada', 90, 'porciones', 1, 200, 1, 200),
('ing-8', 'Cebolla Morada Encurtida', 100, 'porciones', 1, 200, 1, 200),
('ing-9', 'Pepinillos Agridulces (Pickles)', 150, 'porciones', 1, 150, 1, 150),
('ing-10', 'Lechuga Capuchina Fresca', 100, 'porciones', 1, 100, 1, 100),
('ing-11', 'Tomate Redondo en Rodajas', 110, 'rodajas', 1, 100, 1, 100),
('ing-12', 'Huevo a la Plancha', 130, 'un', 1, 250, 1, 250),
('ing-13', 'Salsa Secreta Beats', 400, 'dips', 1, 150, 1, 150),
('ing-14', 'Salsa Barbacoa Ahumada', 300, 'dips', 1, 150, 1, 150),
('ing-15', 'Mayo Trufada', 200, 'dips', 1, 250, 1, 250),
('ing-16', 'Palta Hass Fresca', 120, 'porciones', 1, 500, 1, 500),
('ing-17', 'Arroz Yamaní Integral', 60, 'porciones', 1, 150, 1, 150),
('ing-18', 'Quinoa Roja Andina', 50, 'porciones', 1, 200, 1, 200),
('ing-19', 'Salmón Ahumado Premium', 70, 'porciones', 1, 1200, 1, 1200),
('ing-20', 'Edamame al Vapor', 80, 'porciones', 1, 300, 1, 300),
('ing-21', 'Pan de Papa Brioche', 300, 'un', 1, 400, 1, 400);

-- 6. EXTRAS
INSERT IGNORE INTO `Extra` (`id`, `name`, `price`, `isActive`) VALUES
('ext-1', 'Extra Medallón Smash Beef 120g', 2200, 1),
('ext-2', 'Extra Queso Cheddar Fundido', 1200, 1),
('ext-3', 'Extra Panceta Ahumada Crispy', 1400, 1),
('ext-4', 'Extra Palta Hass', 1500, 1),
('ext-5', 'Dip Salsa Secreta Beats', 800, 1),
('ext-6', 'Dip Barbacoa Ahumada', 800, 1),
('ext-7', 'Huevo a la Plancha Extra', 900, 1);

-- 7. PRODUCTOS
INSERT IGNORE INTO `Product` (`id`, `name`, `description`, `basePrice`, `categoryId`, `isActive`, `isCombo`, `allowHalf`, `onlyHalf`, `allowRemoveIngredients`, `points`, `suggestedCost`) VALUES
('prd-1', 'Beats Monster Triple', 'Triple medallón smash 120g, triple cheddar americano, cuádruple panceta crispy y salsa Beats en suave pan brioche de papa.', 14500, 'cat-1', 1, 0, 0, 0, 1, 145, 4500),
('prd-2', 'Oklahoma Smash Onion', 'Doble smash cocinado a la plancha con cebolla ultrafina caramelizada incrustada en la carne, doble cheddar y pepinillos agridulces.', 11800, 'cat-1', 1, 0, 0, 0, 1, 118, 3600),
('prd-3', 'Royale Deluxe', 'Doble medallón smash, queso provolone ahumado derretido, lechuga capuchina crujiente, tomate redondo, cebolla morada encurtida y mayo trufada.', 12500, 'cat-1', 1, 0, 0, 0, 1, 125, 3900),
('prd-4', 'Crispy Chicken Bacon', 'Suprema de pollo frita ultra crocante marinada en especias, queso cheddar fundido, panceta ahumada y salsa barbacoa en pan brioche.', 11200, 'cat-1', 1, 0, 0, 0, 1, 112, 3400),
('prd-5', 'Veggie Crunch Burger', 'Medallón artesanal de lentejas y hongos portobello, palta hass fresca, queso provolone, rúcula fresca y mayo vegana suave.', 10500, 'cat-1', 1, 0, 0, 0, 1, 105, 3100),
('prd-6', 'Super Protein Power Bowl', 'Base nutritiva de quinoa roja y arroz yamaní, pechuga grillada en cubos, palta hass fresca, huevo soft, tomates cherry y sésamo tostado.', 12800, 'cat-2', 1, 0, 0, 0, 1, 128, 3800),
('prd-7', 'Fresh Salmon & Avocado Bowl', 'Finas láminas de salmón ahumado premium, palta hass, edamame al vapor, pepino fresco, arroz yamaní y reducción de teriyaki cítrica.', 15900, 'cat-2', 1, 0, 0, 0, 1, 159, 4900),
('prd-8', 'Combo Individual Power', 'Beats Monster Triple + Porción de Papas Rústicas con Cheddar & Bacon + Bebida 500ml fría a elección.', 17900, 'cat-3', 1, 1, 0, 0, 1, 179, 5500),
('prd-9', 'Combo Doble Pareja Beats', '2x Oklahoma Smash Burgers + 2x Porciones de Papas Rústicas + 2x Bebidas a elección.', 27500, 'cat-3', 1, 1, 0, 0, 1, 275, 8500),
('prd-10', 'Papas Rústicas con Cheddar & Bacon', 'Papas cortadas a mano con piel, fritas al punto justo, bañadas en abundante queso cheddar caliente y lluvia de panceta crocante.', 6800, 'cat-4', 1, 0, 0, 0, 1, 68, 1800),
('prd-11', 'Aros de Cebolla Golden Crispy', 'Aros de cebolla rebozados con panko extra crujiente, servidos con dip de salsa barbacoa ahumada.', 5500, 'cat-4', 1, 0, 0, 0, 1, 55, 1400),
('prd-12', 'Coca-Cola Original 500ml', 'Botella 500ml bien fría.', 2400, 'cat-5', 1, 0, 0, 0, 0, 24, 900),
('prd-13', 'Coca-Cola Sin Azúcar 500ml', 'Botella 500ml bien fría.', 2400, 'cat-5', 1, 0, 0, 0, 0, 24, 900),
('prd-14', 'Cerveza Artesanal IPA 473ml', 'Lata 473ml, amargor balanceado y aroma cítrico lupulado.', 4200, 'cat-5', 1, 0, 0, 0, 0, 42, 1600),
('prd-15', 'Chocotorta Clásica en Vaso', 'Capas de galletitas Chocolinas embebidas en café con crema de dulce de leche y queso crema artesanal.', 4500, 'cat-6', 1, 0, 0, 0, 0, 45, 1300),
('prd-16', 'Milkshake Oreo & Dulce de Leche', 'Helado artesanal de crema americana batido con galletitas Oreo trituradas y dulce de leche repostero.', 5800, 'cat-6', 1, 0, 0, 0, 0, 58, 1700);

-- 8. PREMIOS DE RULETA
INSERT IGNORE INTO `RoulettePrize` (`id`, `name`, `probability`, `type`, `value`, `productId`, `bgColor`, `textColor`) VALUES
('prz-1', '10% OFF en tu pedido', 25, 'PERCENT', 10, NULL, '#f97316', '#ffffff'),
('prz-2', 'Papas Rústicas Gratis', 20, 'PRODUCT', NULL, 'prd-10', '#9333ea', '#ffffff'),
('prz-3', '$1.000 de Descuento', 30, 'AMOUNT', 1000, NULL, '#eab308', '#ffffff'),
('prz-4', 'Gaseosa 500ml Gratis', 15, 'PRODUCT', NULL, 'prd-12', '#3b82f6', '#ffffff'),
('prz-5', 'Chocotorta de Regalo', 10, 'PRODUCT', NULL, 'prd-15', '#ef4444', '#ffffff');

-- 9. INGREDIENTES DE PRODUCTOS (RECETAS)
INSERT IGNORE INTO `ProductIngredient` (`productId`, `ingredientId`, `quantity`, `isRemovable`) VALUES
('prd-1', 'ing-1', 3, 0),
('prd-1', 'ing-4', 3, 1),
('prd-1', 'ing-6', 4, 1),
('prd-1', 'ing-13', 1, 1),
('prd-1', 'ing-21', 1, 0),
('prd-2', 'ing-1', 2, 0),
('prd-2', 'ing-4', 2, 1),
('prd-2', 'ing-7', 1, 1),
('prd-2', 'ing-9', 1, 1),
('prd-2', 'ing-21', 1, 0),
('prd-3', 'ing-1', 2, 0),
('prd-3', 'ing-5', 2, 1),
('prd-3', 'ing-10', 1, 1),
('prd-3', 'ing-11', 1, 1),
('prd-3', 'ing-8', 1, 1),
('prd-3', 'ing-15', 1, 1),
('prd-3', 'ing-21', 1, 0),
('prd-4', 'ing-2', 1, 0),
('prd-4', 'ing-4', 1, 1),
('prd-4', 'ing-6', 2, 1),
('prd-4', 'ing-14', 1, 1),
('prd-4', 'ing-21', 1, 0),
('prd-6', 'ing-18', 1, 0),
('prd-6', 'ing-17', 1, 0),
('prd-6', 'ing-2', 1, 1),
('prd-6', 'ing-16', 1, 1),
('prd-6', 'ing-12', 1, 1),
('prd-7', 'ing-19', 1, 0),
('prd-7', 'ing-16', 1, 1),
('prd-7', 'ing-20', 1, 1),
('prd-7', 'ing-17', 1, 0),
('prd-10', 'ing-4', 2, 1),
('prd-10', 'ing-6', 2, 1);

-- 10. PRODUCT EXTRAS ASOCIADOS
INSERT IGNORE INTO `ProductExtra` (`productId`, `extraId`) VALUES
('prd-1', 'ext-1'),
('prd-1', 'ext-2'),
('prd-1', 'ext-3'),
('prd-1', 'ext-7'),
('prd-2', 'ext-1'),
('prd-2', 'ext-2'),
('prd-2', 'ext-3'),
('prd-3', 'ext-1'),
('prd-3', 'ext-2'),
('prd-3', 'ext-3'),
('prd-4', 'ext-1'),
('prd-4', 'ext-2'),
('prd-4', 'ext-3'),
('prd-6', 'ext-4'),
('prd-7', 'ext-4'),
('prd-10', 'ext-5'),
('prd-10', 'ext-6'),
('prd-11', 'ext-5'),
('prd-11', 'ext-6');

-- 11. CLIENTES DE EJEMPLO
INSERT IGNORE INTO `Client` (`id`, `phone`, `password`, `passwordSetupRequired`, `name`, `points`, `createdAt`, `updatedAt`) VALUES
('cli-1', '1155443322', '', 1, 'Juan Pérez', 120, NOW(3), NOW(3)),
('cli-2', '1166778899', '', 1, 'Camila Benítez', 250, NOW(3), NOW(3)),
('cli-3', '1144223311', '', 1, 'Rodrigo Morales', 80, NOW(3), NOW(3)),
('cli-4', '1122334455', '', 1, 'Natalia Castro', 410, NOW(3), NOW(3)),
('cli-5', '1199887766', '', 1, 'Diego Salgado', 550, NOW(3), NOW(3));

-- 12. ÓRDENES DE EJEMPLO (HOY, MAÑANA Y ENCARGO)
INSERT IGNORE INTO `Order` (
  `id`, `clientName`, `clientPhone`, `needsDelivery`, `deliveryAddress`, `deliveryTime`,
  `orderType`, `scheduledDate`, `scheduledTime`, `status`, `paymentMethod`, `paymentStatus`,
  `total`, `earnedPoints`, `pointsAwarded`, `stockCommitted`, `clientId`, `messengerId`, `createdAt`, `updatedAt`
) VALUES
(
  'ord-001-live', 'Juan Pérez', '1155443322', 1, 'Av. Corrientes 2450, Piso 4 B', '21:30',
  'IMMEDIATE', NULL, NULL, 'IN_PROCESS', 'CASH', 'PENDING',
  21300, 213, 0, 1, 'cli-1', NULL, NOW(3), NOW(3)
),
(
  'ord-002-live', 'Camila Benítez', '1166778899', 0, NULL, '22:00',
  'IMMEDIATE', NULL, NULL, 'NEW', 'MP', 'PAID',
  14200, 142, 0, 1, 'cli-2', NULL, NOW(3), NOW(3)
),
(
  'ord-003-live', 'Rodrigo Morales', '1144223311', 1, 'Juramento 1950, PB', '20:45',
  'IMMEDIATE', NULL, NULL, 'PENDING_DELIVERY', 'CASH', 'PENDING',
  12800, 128, 0, 1, 'cli-3', 'msg-1', NOW(3), NOW(3)
),
(
  'ord-004-tomorrow', 'Natalia Castro', '1122334455', 1, 'Scalabrini Ortiz 880, 2do A', '21:30',
  'SCHEDULED_TOMORROW', DATE_ADD(NOW(3), INTERVAL 1 DAY), '21:30', 'NEW', 'MP', 'PAID',
  23700, 237, 0, 1, 'cli-4', NULL, NOW(3), NOW(3)
),
(
  'ord-005-custom', 'Diego Salgado', '1199887766', 1, 'Av. Libertador 4400, Salón Eventos', '22:00',
  'CUSTOM_DATE', DATE_ADD(NOW(3), INTERVAL 5 DAY), '22:00', 'NEW', 'MP', 'PAID',
  62600, 626, 0, 1, 'cli-5', NULL, NOW(3), NOW(3)
);

-- 13. ITEMS DE LAS ÓRDENES
INSERT IGNORE INTO `OrderItem` (`id`, `orderId`, `productId`, `quantity`, `unitPrice`, `subtotal`) VALUES
('item-1-1', 'ord-001-live', 'prd-1', 1, 14500, 14500),
('item-1-2', 'ord-001-live', 'prd-10', 1, 6800, 6800),
('item-2-1', 'ord-002-live', 'prd-2', 1, 11800, 11800),
('item-2-2', 'ord-002-live', 'prd-12', 1, 2400, 2400),
('item-3-1', 'ord-003-live', 'prd-6', 1, 12800, 12800),
('item-4-1', 'ord-004-tomorrow', 'prd-1', 1, 14500, 14500),
('item-4-2', 'ord-004-tomorrow', 'prd-10', 1, 6800, 6800),
('item-4-3', 'ord-004-tomorrow', 'prd-12', 1, 2400, 2400),
('item-5-1', 'ord-005-custom', 'prd-1', 2, 14500, 29000),
('item-5-2', 'ord-005-custom', 'prd-2', 2, 11800, 23600),
('item-5-3', 'ord-005-custom', 'prd-10', 1, 6800, 6800),
('item-5-4', 'ord-005-custom', 'prd-14', 1, 4200, 4200);

-- 14. NIVELES DE FIDELIZACIÓN E INSIGNIAS (CUSTOMER TIERS)
INSERT IGNORE INTO `CustomerTier` (`id`, `name`, `badgeText`, `description`, `minOrdersCount`, `minPoints`, `minSpent`, `discountPercent`, `pointsMultiplier`, `color`, `bgGradient`, `iconName`, `sequence`, `isActive`, `createdAt`, `updatedAt`)
VALUES
('tier-club', 'Beaters Club', 'CLUB', 'Nivel de bienvenida por sumarte al club.', 0, 0, 0, 0, 1.0, '#3b82f6', 'from-blue-600 to-indigo-600', 'Star', 1, 1, NOW(3), NOW(3)),
('tier-gold', 'Beaters Gold', 'GOLD', 'Clientes frecuentes con beneficios automáticos.', 3, 150, 25000, 5, 1.25, '#f59e0b', 'from-amber-500 to-yellow-600', 'Flame', 2, 1, NOW(3), NOW(3)),
('tier-select', 'Beaters Select', 'SELECT VIP', 'Nivel exclusivo VIP con descuentos máximos y premios secretos.', 7, 400, 60000, 10, 1.5, '#9333ea', 'from-purple-600 to-pink-600', 'Crown', 3, 1, NOW(3), NOW(3));

