import { describe, it, expect } from "vitest";
import { parseAvailableDays, getNextAvailableDate, groupCartItemsByDeliveryDate, WEEK_DAYS } from "@/lib/weekly-menu";
import { z } from "zod";

// Schema extract matching app/actions/admin-settings.ts
const settingsSchemaFragment = z.object({
  allowImmediateOrders: z.boolean().default(true),
  allowScheduledTomorrow: z.boolean().default(true),
  allowAdvanceOrders: z.boolean().default(true),
  advanceOrderMinDays: z.number().int().min(0).max(365).default(1),
  advanceOrderMaxDays: z.number().int().min(1).max(365).default(30),
});

describe("Advance Orders & Scheduling Settings", () => {
  it("should allow 0 days of anticipation for same-day advance orders", () => {
    const parsed = settingsSchemaFragment.safeParse({
      advanceOrderMinDays: 0,
      advanceOrderMaxDays: 30,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.advanceOrderMinDays).toBe(0);
    }
  });

  it("should reject negative days of anticipation", () => {
    const parsed = settingsSchemaFragment.safeParse({
      advanceOrderMinDays: -1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("Weekly Menu Day Matching & Separation", () => {
  const testNow = new Date("2026-09-03T12:00:00Z"); // 2026-09-03 is a Thursday
  const thursdayDayIndex = 4; // Thursday

  it("identifies today correctly when product matches current day of the week", () => {
    const thursdayInfo = WEEK_DAYS.find(w => w.dayIndex === thursdayDayIndex);
    expect(thursdayInfo?.id).toBe("THURSDAY");

    const nextAvail = getNextAvailableDate("THURSDAY", testNow);
    expect(nextAvail).not.toBeNull();
    expect(nextAvail?.dayOffset).toBe(0);
    expect(nextAvail?.dateStr).toBe("2026-09-03");
    expect(nextAvail?.dayName).toBe("Jueves");
  });

  it("identifies tomorrow correctly when product matches tomorrow's day of the week", () => {
    const nextAvail = getNextAvailableDate("FRIDAY", testNow);
    expect(nextAvail).not.toBeNull();
    expect(nextAvail?.dayOffset).toBe(1);
    expect(nextAvail?.dateStr).toBe("2026-09-04");
    expect(nextAvail?.dayName).toBe("Viernes");
  });

  it("separates items of today and tomorrow into two distinct groups with their respective dates", () => {
    const items = [
      { product: { id: "p-today", name: "Bowl de Jueves (Hoy)", availableDays: "THURSDAY" }, quantity: 1 },
      { product: { id: "p-tomorrow", name: "Bowl de Viernes (Mañana)", availableDays: "FRIDAY" }, quantity: 1 },
    ];

    // Simulate now as Thursday
    const originalDate = global.Date;
    // @ts-ignore
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super("2026-09-03T12:00:00.000Z");
        } else {
          // @ts-ignore
          super(...args);
        }
      }
    };

    try {
      const groups = groupCartItemsByDeliveryDate(items);
      expect(groups.length).toBe(2);

      const todayGroup = groups.find(g => g.dayOffset === 0);
      const tomorrowGroup = groups.find(g => g.dayOffset === 1);

      expect(todayGroup).toBeDefined();
      expect(todayGroup?.dateStr).toBe("2026-09-03");
      expect(todayGroup?.items[0].product.name).toBe("Bowl de Jueves (Hoy)");

      expect(tomorrowGroup).toBeDefined();
      expect(tomorrowGroup?.dateStr).toBe("2026-09-04");
      expect(tomorrowGroup?.items[0].product.name).toBe("Bowl de Viernes (Mañana)");
    } finally {
      global.Date = originalDate;
    }
  });
});
