import { describe, expect, it } from "vitest";
import {
  buildDeliveryAddress, checkoutActionLabel,
  checkoutPaymentLabel, isDeliveryAddressValid, isSlotSelectable,
} from "@/lib/checkout-presentation";

describe("Checkout 2.0 — UI policy", () => {
  it("conserva dirección completa en el contrato actual", () => {
    expect(buildDeliveryAddress({
      street: "  San Martín   123  ", unit: " 2 B ", reference: " Timbre   rojo ",
    })).toBe("San Martín 123, Piso/Depto: 2 B, Referencia: Timbre rojo");
  });
  it("no incorpora extras si el cliente no los ingresó", () => {
    expect(buildDeliveryAddress({ street: "Mitre 135", unit: "", reference: "" })).toBe("Mitre 135");
    expect(buildDeliveryAddress({ street: "   ", unit: "1", reference: "casa" })).toBe("");
  });
  it("verifica el límite del backend de 5–250 caracteres", () => {
    expect(isDeliveryAddressValid("C 1")).toBe(false);
    expect(isDeliveryAddressValid("Mitre 135")).toBe(true);
    expect(isDeliveryAddressValid("a".repeat(251))).toBe(false);
  });
  it("marca sin cupo los horarios indisponibles", () => {
    expect(isSlotSelectable(0)).toBe(false);
    expect(isSlotSelectable(-1)).toBe(false);
    expect(isSlotSelectable(2)).toBe(true);
  });
  it("diferencia confirmación local y pasarela MP", () => {
    expect(checkoutPaymentLabel("CASH")).toBe("Efectivo");
    expect(checkoutPaymentLabel("MP")).toBe("Mercado Pago");
    expect(checkoutActionLabel("CASH", 12000)).toBe("Confirmar pedido");
    expect(checkoutActionLabel("MP", 12000)).toBe("Ir a pagar con Mercado Pago");
    expect(checkoutActionLabel("MP", 0)).toBe("Confirmar pedido");
  });
});
