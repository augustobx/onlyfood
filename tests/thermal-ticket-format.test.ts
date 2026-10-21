import { describe, expect, it } from "vitest";
import { burgerAssemblyLines, pattySizeLabel } from "@/lib/burger-ticket";
import { assemblyWarnings, burgerPrintName, thermalPrinterText } from "@/lib/thermal-ticket-format";

describe("Impresion termica clara para cocina y armado", () => {
  it("no convierte separadores o emojis a signos de interrogacion", () => {
    const printed = thermalPrinterText("CHEESE BACON XXL — TRIPLE • ¡SIN BACÓN! 🥓");
    expect(printed).toContain("CHEESE BACON XXL - TRIPLE");
    expect(printed).toContain("SIN BACON!");
    expect(printed).not.toContain("?");
    expect(printed).toMatch(/^[\x20-\x7E\n]+$/);
  });

  it("no duplica el tamaño que ya figura en el nombre", () => {
    expect(burgerPrintName("TRIPLE CON CHEDDAR", "TRIPLE")).toBe("TRIPLE CON CHEDDAR");
    expect(burgerPrintName("CUÁDRUPLE CON QUESO", "CUADRUPLE")).toBe("CUÁDRUPLE CON QUESO");
    expect(burgerPrintName("DOBLE CON CHEDDAR", "TRIPLE")).toBe("DOBLE CON CHEDDAR - TRIPLE");
    expect(burgerPrintName("CHEESE BACON XXL", "TRIPLE")).toBe("CHEESE BACON XXL - TRIPLE");
  });

  it("evita texto SIN DEFINIR cuando se quito el medallon o falta receta", () => {
    const product = { name: "Cheese Bacon XXL", category: {name:"Hamburguesas"}, ingredients: [
      {ingredientId:"meat",quantity:2,ingredient:{id:"meat",name:"Medallón de carne"}},
      {ingredientId:"bread",quantity:1,ingredient:{id:"bread",name:"Pan de papa"}},
    ]};
    const removed = [{ingredientId:"meat",ingredient:{id:"meat",name:"Medallón de carne"}}];
    const lines = burgerAssemblyLines([{quantity:1,product,removedIngredients:removed}]);
    expect(lines[0].size).toBe("");
    expect(pattySizeLabel(0)).toBe("");
    expect(burgerPrintName(product.name,lines[0].size)).toBe(product.name);
    expect(assemblyWarnings(lines[0])).toEqual(["SIN: MEDALLÓN DE CARNE"]);
  });

  it("marca SIN PAN una sola vez y conserva los otros ingredientes quitados", () => {
    const warnings = assemblyWarnings({
      hasBun:false,
      removed:["Pan de papa","Bacon","Medallón de carne","Cebolla"],
    });
    expect(warnings).toEqual(["SIN PAN","SIN: BACON, MEDALLÓN DE CARNE, CEBOLLA"]);
    expect(warnings.join(" ")).not.toContain("!!!");
    expect(warnings.join(" ").match(/SIN PAN/g)).toHaveLength(1);
  });

  it("no confunde pan rallado con pan de hamburguesa", () => {
    expect(assemblyWarnings({hasBun:true,removed:["Pan rallado"]})).toEqual(["SIN: PAN RALLADO"]);
  });
});
