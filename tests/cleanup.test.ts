import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Relational integrity", () => {
  it("contains no orphan reward product references", async () => {
    const [rewardOrphans, rouletteOrphans] = await Promise.all([
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total FROM PointReward pr LEFT JOIN Product p ON p.id = pr.productId
        WHERE pr.productId IS NOT NULL AND p.id IS NULL
      `,
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total FROM RoulettePrize rp LEFT JOIN Product p ON p.id = rp.productId
        WHERE rp.productId IS NOT NULL AND p.id IS NULL
      `,
    ]);
    expect(Number(rewardOrphans[0]?.total || 0)).toBe(0);
    expect(Number(rouletteOrphans[0]?.total || 0)).toBe(0);
  });
});
