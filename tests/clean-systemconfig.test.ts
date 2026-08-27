import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("SystemConfig tenant constraint", () => {
  it("has no duplicate non-null tenant rows", async () => {
    const duplicates = await prisma.$queryRaw<Array<{ tenantId: string; total: bigint }>>`
      SELECT tenantId, COUNT(*) AS total FROM SystemConfig
      WHERE tenantId IS NOT NULL GROUP BY tenantId HAVING COUNT(*) > 1
    `;
    expect(duplicates).toEqual([]);
  });
});
