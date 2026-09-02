import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Ingredient, Extra } from '@prisma/client';

export type CartItem = {
  id: string; // Unique transient ID for cart
  product: Product | any;
  quantity: number;
  removedIngredients: string[]; // IDs of ingredients
  addedExtras: Extra[] | any[];
  unitPrice: number;
  subtotal: number;
  notes?: string;
  isHalfAndHalf?: boolean;
  secondHalfProduct?: Product | any;
  comboRemovedIngredients?: Record<string, string[]>;
  rewardRedemptionId?: string; // ID of PointRedemption if this item is a redeemed reward
  isReward?: boolean;
};

interface CartState {
  items: CartItem[];
  dailyPrize: any | null;
  appliedCoupon: any | null;
  setDailyPrize: (prize: any) => void;
  setAppliedCoupon: (coupon: any | null) => void;
  clearCoupon: () => void;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      dailyPrize: null,
      appliedCoupon: null,
      setDailyPrize: (prize) => set({ dailyPrize: prize }),
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),
      addItem: (item) => set((state) => {
        const unitPrice = item.isReward ? 0 : item.unitPrice;
        const subtotal = unitPrice * item.quantity;
        return { items: [...state.items, { ...item, unitPrice, id: crypto.randomUUID(), subtotal }] };
      }),
      removeItem: (id) => set((state) => {
        const removedItem = state.items.find((i) => i.id === id);
        const shouldClearCoupon = removedItem?.rewardRedemptionId && state.appliedCoupon?.id === removedItem.rewardRedemptionId;
        return {
          items: state.items.filter((item) => item.id !== id),
          ...(shouldClearCoupon ? { appliedCoupon: null } : {}),
        };
      }),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id) {
            const finalQty = item.isReward ? Math.min(item.quantity, quantity) : quantity;
            const unitPrice = item.isReward ? 0 : item.unitPrice;
            return { ...item, quantity: finalQty, subtotal: unitPrice * finalQty };
          }
          return item;
        })
      })),
      clearCart: () => set({ items: [], dailyPrize: null, appliedCoupon: null }),
      getTotal: () => get().items.reduce((total, item) => total + (item.isReward ? 0 : item.subtotal), 0),
    }),
    {
      name: 'nfood-cart',
    }
  )
);
