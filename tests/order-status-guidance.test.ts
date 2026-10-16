import { describe, expect, it } from "vitest";
import { orderHelpText } from "@/lib/order-status-guidance";
describe("Order guidance", () => {
  it("never fabricates an arrival estimate", () => {
    expect(orderHelpText("IN_PROCESS",true)).toMatch(/comercio confirmará/);
    expect(orderHelpText("FINISHED",false)).toMatch(/retirar/);
    expect(orderHelpText("CANCELLED",true)).toMatch(/cancelado/);
  });
});
