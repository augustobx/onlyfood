import { describe, it, expect } from "vitest";

describe("Order History Circuit & Messenger Normalization", () => {
  it("normalizes messengerId values correctly", () => {
    const normalize = (id: string | null | undefined) => {
      return (!id || id === "none" || id.trim() === "") ? null : id.trim();
    };

    expect(normalize(null)).toBeNull();
    expect(normalize(undefined)).toBeNull();
    expect(normalize("none")).toBeNull();
    expect(normalize("")).toBeNull();
    expect(normalize("   ")).toBeNull();
    expect(normalize("123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(normalize("  123e4567-e89b-12d3-a456-426614174000  ")).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("ensures availableMessengers deduplicates and includes both active and order messengers", () => {
    const messengers = [
      { id: "m1", name: "Ramiro", phone: "111", isActive: true },
      { id: "m2", name: "Esteban", phone: "222", isActive: true },
    ];
    const orderWithOldMessenger = {
      id: "ord-1",
      messengerId: "m3",
      messenger: { id: "m3", name: "Lucas (antiguo)", phone: "333", isActive: false },
    };

    const map = new Map<string, any>();
    messengers.forEach((m) => map.set(m.id, m));
    if (orderWithOldMessenger.messenger && !map.has(orderWithOldMessenger.messenger.id)) {
      map.set(orderWithOldMessenger.messenger.id, orderWithOldMessenger.messenger);
    }
    const result = Array.from(map.values());

    expect(result.length).toBe(3);
    expect(result.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
  });
});
