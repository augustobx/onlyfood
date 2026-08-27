import { describe, expect, it } from "vitest";
import {
  formatOrderDetailForWhatsApp,
  normalizeWhatsAppRecipient,
  notificationEventForStatus,
} from "@/lib/whatsapp-message-utils";

describe("WhatsApp transactional notifications", () => {
  it("normalizes Argentine mobile numbers for Meta", () => {
    expect(normalizeWhatsAppRecipient("+54 9 11 5555-1234", "549")).toBe("5491155551234");
    expect(normalizeWhatsAppRecipient("54 11 5555-1234", "549")).toBe("5491155551234");
    expect(normalizeWhatsAppRecipient("11 5555-1234", "549")).toBe("5491155551234");
    expect(normalizeWhatsAppRecipient("", "549")).toBeNull();
  });

  it("maps only the requested order transitions", () => {
    expect(notificationEventForStatus("IN_PROCESS", false)).toBe("ORDER_PREPARING");
    expect(notificationEventForStatus("PENDING_DELIVERY", true)).toBe("ORDER_READY_DELIVERY");
    expect(notificationEventForStatus("FINISHED", false)).toBe("ORDER_READY_PICKUP");
    expect(notificationEventForStatus("DELIVERED", true)).toBeNull();
    expect(notificationEventForStatus("FINISHED", true)).toBeNull();
  });

  it("builds a complete, bounded order detail", () => {
    const detail = formatOrderDetailForWhatsApp([{
      quantity: 2,
      subtotal: 15000,
      notes: "Bien cocido",
      product: { name: "Hamburguesa" },
      secondHalfProduct: null,
      addedExtras: [{ extra: { name: "Cheddar" } }],
      removedIngredients: [{ ingredient: { name: "Cebolla" } }],
      comboItems: [{ quantity: 1, product: { name: "Papas" } }],
    }]);
    expect(detail).toContain("2x Hamburguesa");
    expect(detail).toContain("Cheddar");
    expect(detail).toContain("Cebolla");
    expect(detail).toContain("Papas");
    expect(detail).toContain("Bien cocido");
    expect(formatOrderDetailForWhatsApp([{ quantity: 1, subtotal: 1, product: { name: "X".repeat(100) } }], 30)).toHaveLength(30);
  });
});
