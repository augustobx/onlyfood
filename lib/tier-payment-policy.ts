export type TierPaymentMode = "BOTH" | "CASH" | "MP";
export type PaymentMethod = "CASH" | "MP" | "TRANSFER" | "ADMIN";
export type TierBenefit = {
  sequence: number;
  discountPercent: number;
  pointsMultiplier: number;
  paymentMode?: string | null;
};

export function allowsTierBenefit(mode: string | null | undefined, paymentMethod: PaymentMethod): boolean {
  // Transferencia y ADMIN solo reciben beneficios habilitados para TODOS los medios.
  if (paymentMethod === "ADMIN") return false;
  return (mode || "BOTH") === "BOTH" || mode === paymentMethod;
}

/** Sólo se heredan beneficios de niveles permitidos para ese medio de pago. */
export function calculateTierPaymentBenefits(
  active: TierBenefit | null | undefined,
  tiers: TierBenefit[],
  paymentMethod: PaymentMethod,
) {
  if (!active) return { discountPercent: 0, pointsMultiplier: 1 };
  const unlocked = tiers.filter(t => t.sequence <= active.sequence);
  if (!unlocked.some(t => t === active || (
    t.sequence === active.sequence &&
    t.paymentMode === active.paymentMode &&
    t.discountPercent === active.discountPercent &&
    t.pointsMultiplier === active.pointsMultiplier
  ))) unlocked.push(active);
  const eligible = unlocked.filter(t => allowsTierBenefit(t.paymentMode, paymentMethod));
  return {
    discountPercent: eligible.length ? Math.max(0, ...eligible.map(t => t.discountPercent || 0)) : 0,
    pointsMultiplier: eligible.length ? Math.max(1, ...eligible.map(t => t.pointsMultiplier || 1)) : 1,
  };
}
