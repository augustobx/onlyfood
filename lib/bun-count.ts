import { DEFAULT_PATTY_KEYWORDS } from "@/lib/patty-count";

/**
 * Una hamburguesa armada lleva UN pan, sin importar cuántos medallones tenga.
 * Se cuenta la cantidad de hamburguesas (también las de combos), no la receta
 * de carne ni el número de piezas de acompañamientos.
 */
type IngredientUsage = {
  ingredientId?: string;
  ingredient?: { id?: string; name?: string } | null;
};
type RemovedIngredient = {
  ingredientId?: string;
  ingredient?: { id?: string } | null;
};
type BurgerProduct = {
  name?: string;
  isCombo?: boolean;
  category?: { name?: string } | null;
  ingredients?: IngredientUsage[] | null;
};
type BunOrderItem = {
  quantity?: number;
  isHalfAndHalf?: boolean;
  product?: BurgerProduct | null;
  secondHalfProduct?: BurgerProduct | null;
  removedIngredients?: RemovedIngredient[] | null;
  comboItems?: Array<{
    quantity?: number;
    pieces?: number | null;
    product?: BurgerProduct | null;
    removedIngredients?: RemovedIngredient[] | null;
  }> | null;
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const burgerName = (name: string) =>
  /\b(hamburgues\w*|burger\w*|cheeseburger\w*|smash\w*)\b/.test(normalize(name));

const bunIngredient = (name: string) =>
  /^(pan(?:\s|$)|bun(?:\s|$)|brioche(?:\s|$))/.test(normalize(name))
  && !/^pan\s+rallado\b/.test(normalize(name));

function activeIngredientNames(product?: BurgerProduct | null, removed?: RemovedIngredient[] | null) {
  const excluded = new Set((removed ?? [])
    .map((entry) => entry.ingredientId || entry.ingredient?.id)
    .filter(Boolean));
  return (product?.ingredients ?? [])
    .filter((entry) => !excluded.has(entry.ingredientId || entry.ingredient?.id))
    .map((entry) => normalize(entry.ingredient?.name ?? ""));
}

function hasBurgerBun(product?: BurgerProduct | null, removed?: RemovedIngredient[] | null, pattyKeywords?: string | null) {
  if (!product || product.isCombo) return false;
  const originalBuns = (product.ingredients ?? []).filter((entry) => bunIngredient(entry.ingredient?.name ?? ""));
  const ingredients = activeIngredientNames(product, removed);
  // Si expresamente se pide SIN PAN, no agregarlo al total de preparación.
  if (originalBuns.length && !ingredients.some(bunIngredient)) return false;

  if (burgerName(product.name ?? "") || burgerName(product.category?.name ?? "")) return true;
  // Algunos comercios nombran sus hamburguesas "Pink Floyd", "AC/DC", etc.
  // Reconocerlas por su receta sin contar sandwiches u otros productos con pan.
  const keywords = (pattyKeywords || DEFAULT_PATTY_KEYWORDS)
    .split(/[,;\n]/).map(normalize).filter(Boolean);
  return ingredients.some(bunIngredient)
    && ingredients.some((name) => keywords.some((keyword) => name.includes(keyword)));
}

function positiveQuantity(value?: number) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value!) : 0;
}

export function countOrderBuns(items: BunOrderItem[] | null | undefined, pattyKeywords?: string | null): number {
  return (items ?? []).reduce((count, item) => {
    const ordered = positiveQuantity(item.quantity);
    if (!ordered) return count;

    let buns = 0;
    // Las opciones mitad/mitad constituyen una unidad, no dos panes.
    if (item.isHalfAndHalf && item.secondHalfProduct) {
      if (hasBurgerBun(item.product, item.removedIngredients, pattyKeywords)
          || hasBurgerBun(item.secondHalfProduct, item.removedIngredients, pattyKeywords)) {
        buns += ordered;
      }
    } else if (hasBurgerBun(item.product, item.removedIngredients, pattyKeywords)) {
      buns += ordered;
    }

    for (const component of item.comboItems ?? []) {
      if (hasBurgerBun(component.product, component.removedIngredients, pattyKeywords)) {
        // quantity es por combo; pieces es el número de piezas (ej. sushi),
        // no una cantidad adicional de hamburguesas.
        buns += ordered * positiveQuantity(component.quantity);
      }
    }
    return count + buns;
  }, 0);
}
