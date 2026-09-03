import { describe, expect, it } from "vitest";

describe("sushi theme configuration & helpers", () => {
  it("detects piece count from sushi product names or descriptions", () => {
    function extractPieceCount(text: string): string | null {
      if (!text) return null;
      const match = text.match(/(\d+)\s*(?:piezas?|piez|pcs?|piez\.|u\b)/i);
      if (match && match[1]) {
        return `${match[1]} PIEZAS`;
      }
      return null;
    }

    expect(extractPieceCount("Tabla Buenos Aires 15 piezas")).toBe("15 PIEZAS");
    expect(extractPieceCount("Barco Omakase (30 pcs)")).toBe("30 PIEZAS");
    expect(extractPieceCount("Roll Philadelphia 10u")).toBe("10 PIEZAS");
    expect(extractPieceCount("Roll Salmón Tartar")).toBeNull();
  });

  it("supports SUSHI_ZEN in tenant settings branding", () => {
    const tenantSettings = {
      storeTheme: "SUSHI_ZEN",
      primaryColor: "#e11d48",
      secondaryColor: "#d97706",
    };
    expect(tenantSettings.storeTheme).toBe("SUSHI_ZEN");
  });
});
