const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const newModels = `
model Supply {
  id               String   @id @default(uuid())
  name             String
  purchaseUnit     String   // ej: Kg, Litro, Pack, Unidad
  purchasePrice    Float    // Precio total de la compra
  purchaseQuantity Float    // Cantidad total comprada en esa unidad
  wastePercentage  Float    @default(0) // % de merma (0-100)
  stockQuantity    Float    @default(0) // Stock actual para ponderar promedios
  
  recipeItems      RecipeItem[]
  productionItems  ProductionItem[]
  expenses         Expense[]
}

model Production {
  id           String   @id @default(uuid())
  name         String
  yieldUnits   Float    // Cantidad de unidades resultantes
  
  items        ProductionItem[]
  recipeItems  RecipeItem[]
}

model ProductionItem {
  id           String @id @default(uuid())
  productionId String
  supplyId     String
  quantityUsed Float  // Cantidad del insumo utilizada
  
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  supply       Supply     @relation(fields: [supplyId], references: [id], onDelete: Restrict)
}

model RecipeItem {
  id           String @id @default(uuid())
  productId    String
  supplyId     String?
  productionId String?
  quantityUsed Float    // Cantidad de insumo/produccion para la venta de 1 producto
  
  product      Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  supply       Supply?     @relation(fields: [supplyId], references: [id], onDelete: Restrict)
  production   Production? @relation(fields: [productionId], references: [id], onDelete: Restrict)
}

model Expense {
  id          String   @id @default(uuid())
  supplyId    String
  amount      Float    
  quantity    Float    
  date        DateTime @default(now())
  
  supply      Supply   @relation(fields: [supplyId], references: [id], onDelete: Cascade)
}
`;

if (!schema.includes('model Supply {')) {
  schema += '\n' + newModels;
}

schema = schema.replace(
  'model Product {',
  'model Product {\n  suggestedCost Float @default(0)'
);

schema = schema.replace(
  'roulettePrizes        RoulettePrize[]\n}',
  'roulettePrizes        RoulettePrize[]\n  recipeItems           RecipeItem[]\n}'
);

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated');
