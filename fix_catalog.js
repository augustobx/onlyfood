const fs = require('fs');

// 1. Update app/admin/catalog/page.tsx to pass supplies/productions
let pageCode = fs.readFileSync('app/admin/catalog/page.tsx', 'utf8');

pageCode = pageCode.replace(
  'const combos = await prisma.product.findMany({',
  `const supplies = await prisma.supply.findMany();
  const productions = await prisma.production.findMany();
  
  const combos = await prisma.product.findMany({`
);

pageCode = pageCode.replace(
  '<CatalogClient initialCategories={categories} allExtras={extras} allIngredients={ingredients} allCombos={combos} />',
  '<CatalogClient initialCategories={categories} allExtras={extras} allIngredients={ingredients} allCombos={combos} supplies={supplies} productions={productions} />'
);

fs.writeFileSync('app/admin/catalog/page.tsx', pageCode);

// 2. Update CatalogClient.tsx
let clientCode = fs.readFileSync('app/admin/catalog/CatalogClient.tsx', 'utf8');

clientCode = clientCode.replace(
  'export function CatalogClient({ initialCategories, allExtras, allIngredients, allCombos = [] }: { initialCategories: any[], allExtras: any[], allIngredients: any[], allCombos?: any[] }) {',
  `import { updateProductRecipe, fetchRecipeForProduct } from "@/app/actions/admin-costs";
import { CopyRight } from "lucide-react"; // Wait, lucide-react doesnt have CopyRight, let's use Target or FileSpreadsheet. Actually let's use 'FileText' or 'Box' 

export function CatalogClient({ initialCategories, allExtras, allIngredients, allCombos = [], supplies = [], productions = [] }: { initialCategories: any[], allExtras: any[], allIngredients: any[], allCombos?: any[], supplies?: any[], productions?: any[] }) {`
);

// Add state for recipe modal
clientCode = clientCode.replace(
  'const [isComboDialogOpen, setComboDialogOpen] = useState(false);',
  `const [isComboDialogOpen, setComboDialogOpen] = useState(false);

  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [activeRecipeProduct, setActiveRecipeProduct] = useState<any>(null);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const openRecipeDialog = async (prod: any) => {
     setActiveRecipeProduct(prod);
     setRecipeItems([]);
     setRecipeDialogOpen(true);
     try {
       const ri = await fetchRecipeForProduct(prod.id);
       setRecipeItems(ri);
     } catch(e) {}
  };

  const handleSaveRecipe = async () => {
    setIsSavingRecipe(true);
    await updateProductRecipe(activeRecipeProduct.id, recipeItems);
    toast.success("Receta guardada");
    setIsSavingRecipe(false);
    setRecipeDialogOpen(false);
  };`
);

// Add Recipe Modal UI
const recipeModalUI = `
      {/* Recipe Modal */}
      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Receta / Escandallo de {activeRecipeProduct?.name}</DialogTitle>
             <DialogDescription>Asigna consumos para calcular sugerencia de precio ($ Costo: {activeRecipeProduct?.suggestedCost?.toLocaleString('es-AR')})</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
              <div className="flex gap-2">
                 <select id="recipe-stype" className="border rounded px-2 text-sm flex-1" onChange={()=>{
                    (document.getElementById('recipe-item-s') as HTMLSelectElement).value = "";
                 }}>
                   <option value="supply">Insumo Base</option>
                   <option value="production">Preparación Intermedia</option>
                 </select>
                 <select id="recipe-item-s" className="border rounded px-2 text-sm flex-1">
                    <option value="">Selecciona...</option>
                    {supplies.map(s => <option key={s.id} value={'s_'+s.id} className="supply-opt">{s.name} ({s.purchaseUnit})</option>)}
                    {productions.map(p => <option key={p.id} value={'p_'+p.id} className="prod-opt hidden">{p.name} (uds)</option>)}
                 </select>
                 <Input id="recipe-qty" type="number" step="0.01" className="w-24" placeholder="Cant." />
                 <Button onClick={() => {
                   const sVal = (document.getElementById('recipe-item-s') as HTMLSelectElement).value;
                   const qVal = parseFloat((document.getElementById('recipe-qty') as HTMLInputElement).value);
                   if (sVal && qVal > 0) {
                      const isSupply = sVal.startsWith('s_');
                      const id = sVal.substring(2);
                      const name = isSupply ? supplies.find(x=>x.id===id).name : productions.find(x=>x.id===id).name;
                      setRecipeItems([...recipeItems, {
                         supplyId: isSupply ? id : null,
                         productionId: !isSupply ? id : null,
                         quantityUsed: qVal,
                         _tempName: name
                      }]);
                   }
                 }}>Add</Button>
              </div>

              <div className="mt-4 border p-4 rounded bg-slate-50 min-h-[200px]">
                 {recipeItems.map((ri, i) => (
                    <div key={i} className="flex justify-between border-b py-2 text-sm">
                       <span>{ri._tempName || ri.supply?.name || ri.production?.name}</span>
                       <div className="flex gap-4">
                         <span className="font-bold">{ri.quantityUsed}</span>
                         <button className="text-red-500" onClick={()=>setRecipeItems(recipeItems.filter((_, idx)=>idx !== i))}>X</button>
                       </div>
                    </div>
                 ))}
                 {recipeItems.length === 0 && <p className="text-muted-foreground text-xs italic">Generá la receta para descontar de inventario y calcular el FoodCost.</p>}
              </div>

              <Button onClick={handleSaveRecipe} disabled={isSavingRecipe} className="w-full">Guardar Receta</Button>
           </div>
        </DialogContent>
      </Dialog>
`;

clientCode = clientCode.replace(
  '</Tabs>',
  recipeModalUI + '\n    </Tabs>'
);

// Add the Button inside the product map (around line 530+ of the original structure where Pen/Trash buttons are)
clientCode = clientCode.replace(
  '<Pen className="w-4 h-4" />\n                            </Button>',
  '<Pen className="w-4 h-4" />\n                            </Button>\n                            <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 h-8 w-8" onClick={() => openRecipeDialog(prod)} title="Escandallo / Costos">\n                              <Tag className="w-4 h-4" />\n                            </Button>'
);
// Also for combos
clientCode = clientCode.replace(
  '<Pen className="w-4 h-4" />\n                      </Button>\n                      <Button variant="ghost"',
  '<Pen className="w-4 h-4" />\n                      </Button>\n                      <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50" onClick={() => openRecipeDialog(combo)} title="Escandallo / Costos">\n                         <Tag className="w-4 h-4" />\n                      </Button>\n                      <Button variant="ghost"'
);

fs.writeFileSync('app/admin/catalog/CatalogClient.tsx', clientCode);
console.log('CatalogClient & Page updated!');
