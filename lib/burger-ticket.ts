import { countOrderBuns } from "@/lib/bun-count";
import { countOrderPatties } from "@/lib/patty-count";

type Ingredient = { ingredientId?: string; quantity?: number; ingredient?: { id?: string; name?: string } | null };
type Removed = { ingredientId?: string; ingredient?: { id?: string; name?: string } | null };
type Product = {
  name: string; isCombo?: boolean;
  category?: { name?: string } | null;
  ingredients?: Ingredient[] | null;
};
type Extra = { extra?: { name?: string } | null };
export type AssemblyItem = {
  quantity: number; product: Product; secondHalfProduct?: Product | null; isHalfAndHalf?: boolean;
  addedExtras?: Extra[] | null; removedIngredients?: Removed[] | null; notes?: string | null;
  comboItems?: Array<{ quantity: number; pieces?: number | null; product: Product; removedIngredients?: Removed[] | null }> | null;
};
export type BurgerTicketLine = {
  name: string; quantity: number; pattyCount: number; size: string;
  removed: string[]; extras: string[]; notes: string | null; source?: string; hasBun: boolean;
};

const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function words(value?: string) { return normalize(value||""); }
const burgerWords = /\b(?:hamburgues\w*|burger\w*|cheeseburger\w*|smash\w*)\b/;
function burgerProduct(product: Product, keywords?: string | null) {
  if (product.isCombo) return false;
  const names = [product.name,product.category?.name].map(words);
  if (names.some(v=>burgerWords.test(v))) return true;
  const ingredients=(product.ingredients||[]).map(i=>words(i.ingredient?.name));
  const hasBun=ingredients.some(v=>/^(?:pan\b|bun\b|brioche\b)/.test(v) && !/^pan rallado\b/.test(v));
  const pattyWords=(keywords||"medallón,medallon").split(/[,;\n]/).map(words).filter(Boolean);
  return hasBun && ingredients.some(v=>pattyWords.some(k=>v.includes(k)));
}
export function pattySizeLabel(patties: number): string {
  const rounded = Math.round(patties * 100)/100;
  const names: Record<number,string> = {1:"SIMPLE",2:"DOBLE",3:"TRIPLE",4:"CUADRUPLE",5:"QUINTUPLE",6:"SEXTUPLE"};
  if (!Number.isFinite(rounded) || rounded <= 0) return ""; // No inventar un tamaño cuando se quitaron todos los medallones o falta receta.
  return names[rounded] || `${rounded.toLocaleString("es-AR")} MEDALLONES`;
}
function line(product: Product, qty: number, removed?: Removed[] | null, addedExtras?: Extra[] | null,
  notes?: string | null, source?: string, keywords?: string | null, secondHalfProduct?: Product | null, half?: boolean): BurgerTicketLine | null {
  if (!burgerProduct(product,keywords) && !(secondHalfProduct && burgerProduct(secondHalfProduct,keywords))) return null;
  const cleanQty=Math.max(0,Math.floor(qty));
  if (!cleanQty) return null;
  const one = {quantity:1, product, secondHalfProduct, isHalfAndHalf: Boolean(half), removedIngredients:removed||[],
    addedExtras:addedExtras||[],comboItems:[]};
  const patties=countOrderPatties([one],keywords);
  return {
    name: half && secondHalfProduct ? `${product.name} / ${secondHalfProduct.name}` : product.name,
    quantity:cleanQty, pattyCount:patties, size:pattySizeLabel(patties),
    removed:(removed||[]).map(x=>x.ingredient?.name).filter((x):x is string=>Boolean(x)),
    extras:(addedExtras||[]).map(x=>x.extra?.name).filter((x):x is string=>Boolean(x)),
    notes:notes?.trim()||null, source,
    hasBun:countOrderBuns([one],keywords)>0,
  };
}
/** Single canonical recipe-based model consumed by browser, PrintNode and NanoLabs Agent. */
export function burgerAssemblyLines(items: AssemblyItem[] | null | undefined, keywords?: string | null): BurgerTicketLine[] {
  const result: BurgerTicketLine[]=[];
  for(const item of items||[]) {
    const parent=line(item.product,item.quantity,item.removedIngredients,item.addedExtras,item.notes,undefined,keywords,
      item.secondHalfProduct,item.isHalfAndHalf);
    if(parent)result.push(parent);
    for(const combo of item.comboItems||[]){
      const part=line(combo.product,item.quantity*combo.quantity,combo.removedIngredients,[],null,item.product.name,keywords);
      if(part)result.push(part);
    }
  }
  return result;
}
export function burgerTicketTotals(items: AssemblyItem[] | null | undefined, keywords?: string | null) {
 return { patties:countOrderPatties(items,keywords), buns:countOrderBuns(items,keywords) };
}
