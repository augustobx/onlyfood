import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("FASE 2: migration backfill", () => {
  it("left no unassigned business rows", async () => {
    const tables = ["Category", "Product", "Ingredient", "Extra", "Order", "Client", "SystemConfig", "PaymentRecord"];
    for (const table of tables) {
      const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COUNT(*) AS total FROM \`${table}\` WHERE tenantId IS NULL`,
      );
      expect(Number(rows[0]?.total || 0), `${table} contains rows without tenantId`).toBe(0);
    }
  });
});
