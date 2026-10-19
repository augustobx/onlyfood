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

    const pattyExtras = (item.addedExtras || []).reduce((count, entry) => {
      const name = normalize(entry.extra?.name || "");
      // Algunos comercios llaman al extra "Agregar 2 hamburguesas", otros
      // "2 medallones" o "Medallón x2". No confundir "180 g" con cantidad.
      const isPattyExtra = keywords.some((keyword) => name.includes(keyword))
        || /\b(?:hamburgues\w*|burger\w*)\b/.test(name);
      if (!isPattyExtra) return count;
      const match = name.match(/\b(?:x\s*(\d+)|(\d+)\s*x\b|(\d+)\s*(?:medallones?|hamburguesas?|burgers?)\b|(?:medallones?|hamburguesas?|burgers?)\s*x?\s*(\d+)\b)/)
        || name.match(/\b(doble|triple)\s+(?:medallon|hamburguesa|burger)\b/);
      const units = match ? (match[5] === "doble" ? 2 : match[5] === "triple" ? 3
        : Number(match[1] || match[2] || match[3] || match[4])) : 1;
      // No aceptar cifras arbitrarias (pesos o gramos), ni cantidades absurdas.
      return count + (Number.isInteger(units) && units >= 1 && units <= 20 ? units : 1);
    }, 0);

    return orderTotal + itemTotal + pattyExtras * itemQuantity;
  }, 0);

  return Math.round(total * 100) / 100;
}

export function formatPattyCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}
