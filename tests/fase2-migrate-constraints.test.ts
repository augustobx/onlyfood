import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("FASE 2: database constraints", () => {
  it("has the critical tenant indexes installed", async () => {
    const expected = ["Client_tenantId_phone_key", "MediaAsset_tenantId_filename_key", "PushSubscription_tenantId_endpointHash_key", "SystemConfig_tenantId_key", "Order_tenantId_status_createdAt_idx"];
    const rows = await prisma.$queryRaw<Array<{ INDEX_NAME: string }>>`
      SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()
    `;
    const installed = new Set(rows.map((row) => row.INDEX_NAME));
    for (const name of expected) expect(installed.has(name), `${name} is missing`).toBe(true);
  });
});
