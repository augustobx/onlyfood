import { expect, describe, it } from "vitest";
import { canPlanDelivery, composeDeliveryBatch } from "@/lib/delivery-batch";

const base={id:"d7593b67-2c60-4019-8189-77e68308c21e",needsDelivery:true,status:"NEW",paymentMethod:"CASH",paymentStatus:"PENDING",clientName:"Juan",clientPhone:"1123456789",deliveryAddress:"San Martín 42",deliveryTime:"21:00",total:10000};
describe("Planificación previa de mensajería",()=>{
 it("permite ordenar pedidos nuevos, cocina y listos, sin marcarlos en reparto",()=>{
  for(const status of ["NEW","IN_PROCESS","PENDING_DELIVERY","FINISHED"])expect(canPlanDelivery({...base,status})).toBe(true);
  const msg=composeDeliveryBatch([base],"Cadete 1");
  expect(msg).toContain("PRE-RUTA");
  expect(msg).toContain("San Martín 42");
  expect(msg).toContain("A cobrar: $10.000");
  expect(msg).toContain("NO cambian");
 });
 it("rechaza entregados, cancelados, retiros e impagos electrónicos",()=>{
  for(const status of ["OUT_FOR_DELIVERY","DELIVERED","CANCELLED"])expect(canPlanDelivery({...base,status})).toBe(false);
  expect(canPlanDelivery({...base,needsDelivery:false})).toBe(false);
  expect(canPlanDelivery({...base,paymentMethod:"TRANSFER",paymentStatus:"PENDING"})).toBe(false);
  expect(canPlanDelivery({...base,paymentMethod:"MP",paymentStatus:"PENDING"})).toBe(false);
  expect(canPlanDelivery({...base,paymentMethod:"MP",paymentStatus:"PAID"})).toBe(true);
 });
});
