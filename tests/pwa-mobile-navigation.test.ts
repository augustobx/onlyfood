import { describe, expect, it } from "vitest";
import { shouldShowActiveOrderShortcut } from "@/lib/pwa-navigation";
import { customerOrderStatusLabel } from "@/lib/pwa-order-history";

describe("PWA mobile order navigation", () => {
  it("shows the quick tracking link on discovery screens only", () => {
    expect(shouldShowActiveOrderShortcut("/")).toBe(true);
    expect(shouldShowActiveOrderShortcut("/favorites")).toBe(true);
  });

  it.each(["/checkout", "/cart", "/profile", "/track/order-id", "/product/product-id"])(
    "does not cover purchase actions or order detail at %s",
    (path) => expect(shouldShowActiveOrderShortcut(path)).toBe(false),
  );

  it("labels the tracking shortcut with persisted status, not made-up ETAs", () => {
    expect(customerOrderStatusLabel("IN_PROCESS", true)).toBe("Comenzó la preparación");
    expect(customerOrderStatusLabel("OUT_FOR_DELIVERY", true)).toBe("Salió para entrega");
    expect(customerOrderStatusLabel("FINISHED", false)).toBe("Listo para retirar");
    expect(customerOrderStatusLabel("NEW", true)).not.toMatch(/minutos|estimad[oa]/i);
  });
});
