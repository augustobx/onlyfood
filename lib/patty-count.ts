export const DEFAULT_PATTY_KEYWORDS = "medallón,medallon";

type NamedIngredient = {
  ingredientId?: string;
  quantity?: number;
  ingredient?: { id?: string; name?: string } | null;
};

type RemovedIngredient = {
  ingredientId?: string;
  ingredient?: { id?: string } | null;
};

type PattyProduct = {
  ingredients?: NamedIngredient[] | null;
};

type PattyOrderItem = {
  quantity?: number;
  isHalfAndHalf?: boolean;
  product?: PattyProduct | null;
  secondHalfProduct?: PattyProduct | null;
  removedIngredients?: RemovedIngredient[] | null;
  addedExtras?: Array<{ extra?: { name?: string } | null }> | null;
  comboItems?: Array<{
    quantity?: number;
    product?: PattyProduct | null;
    removedIngredients?: RemovedIngredient[] | null;
  }> | null;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseKeywords(value?: string | null) {
  const configured = (value || DEFAULT_PATTY_KEYWORDS)
    .split(/[,;\n]/)
    .map(normalize)
    .filter(Boolean);
  return [...new Set(configured.length ? configured : ["medallon"])];
}

function removedIds(entries?: RemovedIngredient[] | null) {
  return new Set((entries || []).map((entry) => entry.ingredientId || entry.ingredient?.id).filter(Boolean));
}

function productPattyCount(product: PattyProduct | null | undefined, removed: Set<string | undefined>, multiplier: number, keywords: string[]) {
  return (product?.ingredients || []).reduce((total, entry) => {
    const ingredientId = entry.ingredientId || entry.ingredient?.id;
    const ingredientName = normalize(entry.ingredient?.name || "");
    if ((ingredientId && removed.has(ingredientId)) || !keywords.some((keyword) => ingredientName.includes(keyword))) return total;
    return total + Math.max(0, Number(entry.quantity) || 0) * multiplier;
  }, 0);
}

export function countOrderPatties(items: PattyOrderItem[] | null | undefined, keywordConfig?: string | null) {
  const keywords = parseKeywords(keywordConfig);
  const total = (items || []).reduce((orderTotal, item) => {
    const itemQuantity = Math.max(0, Number(item.quantity) || 0);
    const removed = removedIds(item.removedIngredients);
    const baseMultiplier = item.isHalfAndHalf && item.secondHalfProduct ? itemQuantity / 2 : itemQuantity;
    let itemTotal = productPattyCount(item.product, removed, baseMultiplier, keywords);

    if (item.isHalfAndHalf && item.secondHalfProduct) {
      itemTotal += productPattyCount(item.secondHalfProduct, removed, itemQuantity / 2, keywords);
    }

    for (const comboItem of item.comboItems || []) {
      const comboMultiplier = itemQuantity * Math.max(0, Number(comboItem.quantity) || 0);
      itemTotal += productPattyCount(comboItem.product, removedIds(comboItem.removedIngredients), comboMultiplier, keywords);
    }

    const pattyExtras = (item.addedExtras || []).filter((entry) => {
      const extraName = normalize(entry.extra?.name || "");
      return keywords.some((keyword) => extraName.includes(keyword));
    }).length;

    return orderTotal + itemTotal + pattyExtras * itemQuantity;
  }, 0);

  return Math.round(total * 100) / 100;
}

export function formatPattyCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}
