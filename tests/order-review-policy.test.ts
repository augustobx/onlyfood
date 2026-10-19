import { describe,it,expect } from "vitest";
import {canReviewOrder,decodeGuestReviewReceipts,guestReviewKey} from "@/lib/order-review-policy";
const now=Date.now(),id="e720dbf6-d0d9-44d5-bc5c-c105f4d904c1";
describe("resenas solo tras entrega",()=>{
 it("se activa al entregar y se bloquea si ya está valorado/cancelado",()=>{
  expect(canReviewOrder({status:"DELIVERED",createdAt:new Date(now-86400000)},now)).toBe(true);
  expect(canReviewOrder({status:"NEW",createdAt:new Date(now-86400000)},now)).toBe(false);
  expect(canReviewOrder({status:"CANCELLED",createdAt:new Date(now-86400000)},now)).toBe(false);
  expect(canReviewOrder({status:"DELIVERED",createdAt:new Date(now-86400000),review:{id:"x"}},now)).toBe(false);
  expect(canReviewOrder({status:"DELIVERED",createdAt:new Date(now-46*86400000)},now)).toBe(false);
 });
 it("recibos anónimos se validan, limitan y aíslan por tenant",()=>{
  const ticket={id,token:"x".repeat(43),createdAt:now};
  expect(decodeGuestReviewReceipts(JSON.stringify([ticket,ticket]),now)).toHaveLength(1);
  expect(decodeGuestReviewReceipts(JSON.stringify([{...ticket,token:"bad"}]),now)).toHaveLength(0);
  expect(guestReviewKey("uno")).not.toEqual(guestReviewKey("dos"));
 });
});
