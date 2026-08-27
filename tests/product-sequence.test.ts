import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Product sequence schema", () => {
  it("contains the sequence column and tenant index", async () => {
    const [columns, indexes] = await Promise.all([
      prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'sequence'
      `,
      prisma.$queryRaw<Array<{ INDEX_NAME: string }>>`
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Product' AND INDEX_NAME = 'Product_tenantId_sequence_idx'
      `,
    ]);
    expect(columns).toHaveLength(1);
    expect(indexes.length).toBeGreaterThan(0);
  });
});
