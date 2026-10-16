import { describe, it, expect } from "vitest";
import { realOrderEvents, customerOrderStatusLabel } from "@/lib/pwa-order-history";
describe("PWA order history",()=>{
  it("shows creation when no status history exists", ()=>{
    const x = realOrderEvents("2026-10-16T10:00:00Z",[],true);
    expect(x).toHaveLength(1);
    expect(x[0].label).toBe("Pedido recibido");
  });
  it("orders real events and does not duplicate a recorded NEW", ()=>{
    const x = realOrderEvents("2026-10-16T10:00:00Z",[
      {status:"IN_PROCESS",createdAt:"2026-10-16T10:12:00Z"},
      {status:"NEW",createdAt:"2026-10-16T10:01:00Z"},
    ],false);
    expect(x.map(e=>e.status)).toEqual(["NEW","IN_PROCESS"]);
    expect(x[1].createdAt).toBe("2026-10-16T10:12:00.000Z");
  });
  it("uses pickup-specific labels and no ETA", ()=>{
    expect(customerOrderStatusLabel("FINISHED",false)).toBe("Listo para retirar");
    expect(customerOrderStatusLabel("OUT_FOR_DELIVERY",true)).toBe("Salió para entrega");
    expect(realOrderEvents("2026-10-16T10:00:00Z",[],false)[0].label).not.toMatch(/minutos|estimado/);
  });
  it("ignores invalid timestamps", ()=>{
    expect(realOrderEvents("2026-10-16T10:00:00Z",[{status:"DELIVERED",createdAt:"bad"}],true)).toHaveLength(1);
  });
});
