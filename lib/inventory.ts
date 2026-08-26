export type InventoryRequirement = {
  ingredientId: string;
  name: string;
  required: number;
  available: number;
};

export type InventoryIssue = InventoryRequirement & {
  missing: number;
};

type IngredientUsage = {
  ingredientId: string;
  quantity: number;
  ingredient: { name: string; stock: number };
};

type RemovedIngredient = { ingredientId: string };

export type InventoryOrderItem = {
  quantity: number;
  isHalfAndHalf: boolean;
  removedIngredients: RemovedIngredient[];
  product: { isCombo: boolean; ingredients: IngredientUsage[] };
  secondHalfProduct?: { ingredients: IngredientUsage[] } | null;
  comboItems: Array<{
    quantity: number;
    removedIngredients: RemovedIngredient[];
    product: { ingredients: IngredientUsage[] };
  }>;
};

const roundStock = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function calculateOrderRequirements(items: InventoryOrderItem[]): InventoryRequirement[] {
  const requirements = new Map<string, InventoryRequirement>();

  const add = (usage: IngredientUsage, amount: number) => {
    if (amount <= 0) return;
    const current = requirements.get(usage.ingredientId);
    requirements.set(usage.ingredientId, {
      ingredientId: usage.ingredientId,
      name: usage.ingredient.name,
      required: roundStock((current?.required ?? 0) + amount),
      available: usage.ingredient.stock,
    });
  };

  for (const item of items) {
    const removed = new Set(item.removedIngredients.map((entry) => entry.ingredientId));
    if (item.product.isCombo) {
      for (const comboItem of item.comboItems) {
        const comboRemoved = new Set(comboItem.removedIngredients.map((entry) => entry.ingredientId));
        for (const usage of comboItem.product.ingredients) {
          if (!comboRemoved.has(usage.ingredientId)) add(usage, usage.quantity * comboItem.quantity * item.quantity);
        }
      }
    } else if (item.isHalfAndHalf && item.secondHalfProduct) {
      for (const usage of item.product.ingredients) {
        if (!removed.has(usage.ingredientId)) add(usage, usage.quantity * item.quantity / 2);
      }
      for (const usage of item.secondHalfProduct.ingredients) {
        if (!removed.has(usage.ingredientId)) add(usage, usage.quantity * item.quantity / 2);
      }
    } else {
      for (const usage of item.product.ingredients) {
        if (!removed.has(usage.ingredientId)) add(usage, usage.quantity * item.quantity);
      }
    }
  }

  return [...requirements.values()];
}

export function getInventoryIssues(requirements: InventoryRequirement[]): InventoryIssue[] {
  return requirements
    .filter((entry) => entry.available + 0.0001 < entry.required)
    .map((entry) => ({ ...entry, missing: roundStock(entry.required - entry.available) }));
}

export function formatInventoryIssue(issue: InventoryIssue) {
  return `${issue.name}: necesitás ${issue.required.toLocaleString("es-AR")}, hay ${issue.available.toLocaleString("es-AR")} (faltan ${issue.missing.toLocaleString("es-AR")})`;
}
