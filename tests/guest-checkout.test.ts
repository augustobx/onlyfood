import { expect, describe, it } from "vitest";
import { guestOrdersFromJson, guestOrdersKey, guestTrackingHref, readGuestOrders, removeGuestOrder, saveGuestOrder } from "@/lib/guest-checkout";
const id = "f997d77b-0fd2-445f-85f4-adae421ff10a";
const token = "x".repeat(43);
const now = 1792170000000;
const makeStorage = () => { const d = new Map<string,string>(); return {getItem:(k:string)=>d.get(k)||null,setItem:(k:string,v:string)=>{d.set(k,v)},removeItem:(k:string)=>{d.delete(k)}}; };
describe("guest checkout browsing-session order receipts", () => {
  it("keeps bearer token links scoped to tenant, not personal details", () => {
    const store=makeStorage();
    saveGuestOrder(store,"tenant-a",{orderId:id,token,createdAt:now,paymentMethod:"TRANSFER"},now);
    expect(readGuestOrders(store,"tenant-a",now)).toHaveLength(1);
    expect(readGuestOrders(store,"tenant-b",now)).toHaveLength(0);
    expect(guestTrackingHref({orderId:id,token})).toContain("?token=");
    expect(store.getItem(guestOrdersKey("tenant-a"))).not.toContain("phone");
    expect(removeGuestOrder(store,"tenant-a",id)).toHaveLength(0);
  });
  it("rejects malformed, stale, future or duplicate links", () => {
    const item={orderId:id,token,createdAt:now,paymentMethod:"CASH"};
    expect(guestOrdersFromJson("oops",now)).toEqual([]);
    expect(guestOrdersFromJson(JSON.stringify([{...item,createdAt:0}]),now)).toEqual([]);
    expect(guestOrdersFromJson(JSON.stringify([{...item,createdAt:now-15*86400000}]),now)).toEqual([]);
    expect(guestOrdersFromJson(JSON.stringify([{...item,token:"bad"}]),now)).toEqual([]);
    expect(guestOrdersFromJson(JSON.stringify([item,item]),now)).toHaveLength(1);
  });
});
