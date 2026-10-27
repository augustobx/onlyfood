import { describe, expect, it } from "vitest";
import { adminHome, canAccessAdminRoute } from "@/lib/admin-navigation";
import { launchReadiness } from "@/lib/launch-readiness";
import { historyFromSearchParams, historyQuerySchema, historyWhere } from "@/lib/history-query";

describe("launch readiness follows actual selling requirements", () => {
  it("requires active slots for orders today, including today-only stores", () => {
    expect(launchReadiness({allowImmediateOrders:true,paymentCash:true},0,false).scheduling).toBe(false);
    expect(launchReadiness({allowImmediateOrders:true,paymentCash:true},1,false).scheduling).toBe(true);
  });
  it("accepts a complete transfer-only setup", () => {
    expect(launchReadiness({paymentTransfer:true,transferAlias:"MI.LOCAL",transferCbu:"",transferHolder:"Comercio",transferWhatsApp:"5491112345678"},0,false).payments).toBe(true);
  });
  it("does not let cash hide an incomplete enabled integration", () => {
    expect(launchReadiness({paymentCash:true,paymentMp:true},1,false).payments).toBe(false);
    expect(launchReadiness({paymentCash:true,paymentTransfer:true},1,false).payments).toBe(false);
    expect(launchReadiness({paymentCash:true,paymentMp:true},1,true).payments).toBe(true);
  });
  it("does not imply automatic opening from an absent schedule", () => {
    expect(launchReadiness({allowImmediateOrders:true,autoScheduleEnabled:true,businessHours:null},1,false).scheduling).toBe(false);
  });
});
describe("navigation follows role capabilities", () => {
  it("keeps kitchen and delivery away from owner settings without hiding their work", () => {
    for (const role of ["KITCHEN","DELIVERY"]) {
      expect(canAccessAdminRoute("/admin/settings",role)).toBe(false);
      expect(canAccessAdminRoute("/admin/calendar",role)).toBe(true);
      expect(canAccessAdminRoute("/admin/live",role)).toBe(true);
    }
    expect(canAccessAdminRoute("/admin/history","KITCHEN")).toBe(false);
    expect(canAccessAdminRoute("/admin/history","CASHIER")).toBe(true);
    expect(canAccessAdminRoute("/admin/settings","SUPERADMIN")).toBe(true);
  });
  it("chooses a usable entry for each role and enabled module", () => {
    expect(adminHome("CASHIER",["orders","cashRegister"])).toBe("/admin/cash");
    expect(adminHome("DELIVERY",["orders"])).toBe("/admin/calendar");
    expect(adminHome("KITCHEN",[])).toBe("/admin/unavailable");
    expect(adminHome("OWNER",[])).toBe("/admin/settings");
  });
});
describe("history filters query complete tenant data", () => {
  it("restores URL filters and handles malformed shared links", () => {
    expect(historyFromSearchParams({q:"Cliente",payment:"TRANSFER",page:"12"})).toMatchObject({search:"Cliente",payment:"TRANSFER",page:12});
    expect(historyFromSearchParams({page:"invalid"}).page).toBe(1);
    expect(historyFromSearchParams({range:"CUSTOM",from:"2026-10-28",to:"2026-10-27"}).range).toBe("ALL");
  });
  it("builds business-day boundaries across UTC midnight", () => {
    const where = historyWhere(historyQuerySchema.parse({range:"TODAY"}),new Date("2026-10-28T01:00:00Z"));
    expect(where.createdAt).toEqual({gte:new Date("2026-10-27T03:00:00Z"),lt:new Date("2026-10-28T03:00:00Z")});
  });
  it("includes the whole selected end date", () => {
    expect(historyWhere(historyQuerySchema.parse({range:"CUSTOM",from:"2026-10-01",to:"2026-10-27"})).createdAt).toEqual({gte:new Date("2026-10-01T03:00:00Z"),lt:new Date("2026-10-28T03:00:00Z")});
  });
  it("supports transfer filtering and order identifiers prefixed with #", () => {
    const where = historyWhere(historyQuerySchema.parse({search:"#ABC123",payment:"TRANSFER",page:30}));
    expect(where.paymentMethod).toBe("TRANSFER");
    expect(where.OR).toContainEqual({id:{contains:"ABC123"}});
  });
  it("rejects unreasonable pagination and reversed date bounds", () => {
    expect(historyQuerySchema.safeParse({page:-1}).success).toBe(false);
    expect(() => historyWhere(historyQuerySchema.parse({range:"CUSTOM",from:"2026-10-28",to:"2026-10-27"}))).toThrow();
  });
});
