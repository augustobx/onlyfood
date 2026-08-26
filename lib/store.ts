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
};

interface CartState {
  items: CartItem[];
  dailyPrize: any | null;
  setDailyPrize: (prize: any) => void;
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
      setDailyPrize: (prize) => set({ dailyPrize: prize }),
      addItem: (item) => set((state) => {
        const subtotal = item.unitPrice * item.quantity;
        return { items: [...state.items, { ...item, id: crypto.randomUUID(), subtotal }] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => {
          if (item.id === id) {
            return { ...item, quantity, subtotal: item.unitPrice * quantity };
          }
          return item;
        })
      })),
      clearCart: () => set({ items: [], dailyPrize: null }),
      getTotal: () => get().items.reduce((total, item) => total + item.subtotal, 0),
    }),
    {
      name: 'nfood-cart',
    }
  )
);
