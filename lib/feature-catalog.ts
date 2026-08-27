export const FEATURE_KEYS = [
  "orders",
  "loyalty",
  "roulette",
  "whatsapp",
  "customDomain",
  "multipleLocations",
  "printNode",
  "advancedReports",
  "cashRegister",
  "quantityDiscounts",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  orders: "Pedidos y catálogo",
  loyalty: "Fidelización y puntos",
  roulette: "Ruleta de premios",
  whatsapp: "Avisos por WhatsApp",
  customDomain: "Dominio personalizado",
  multipleLocations: "Múltiples sucursales",
  printNode: "Impresión automática",
  advancedReports: "Reportes avanzados",
  cashRegister: "Caja diaria",
  quantityDiscounts: "Descuentos por cantidad",
};
