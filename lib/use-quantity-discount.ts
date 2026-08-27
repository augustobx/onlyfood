"use client";

import { startTransition, useEffect, useState } from "react";
import { previewQuantityDiscountAction } from "@/app/actions/checkout";
import type { AppliedQuantityDiscount } from "@/lib/quantity-discounts";

export function useQuantityDiscountPreview(items: Array<{ product: { id: string }; quantity: number; unitPrice: number }>) {
  const [discount, setDiscount] = useState<AppliedQuantityDiscount | null>(null);

  useEffect(() => {
    let active = true;
    if (items.length === 0) {
      setDiscount(null);
      return;
    }
    startTransition(() => {
      previewQuantityDiscountAction(items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))).then((result) => {
        if (active) setDiscount(result);
      }).catch(() => {
        if (active) setDiscount(null);
      });
    });
    return () => { active = false; };
  }, [items]);

  return discount;
}
