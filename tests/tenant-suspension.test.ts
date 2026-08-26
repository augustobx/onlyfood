import { describe, it, expect, beforeAll } from "vitest";
import { platformDb } from "@/lib/platform-db";
import { setTenantStatus } from "@/lib/superadmin";

describe("FASE 8: Tenant Status & Suspension Management", () => {
  let testTenantId: string;

  beforeAll(async () => {
    const tenant = await platformDb.tenant.upsert({
      where: { slug: "test-suspension-tenant" },
      update: { status: "ACTIVE" },
      create: { slug: "test-suspension-tenant", name: "Test Suspension Tenant", status: "ACTIVE" },
    });
    testTenantId = tenant.id;
  });

  it("should update tenant status to SUSPENDED with audit log", async () => {
    await setTenantStatus(testTenantId, "SUSPENDED");

    const tenant = await platformDb.tenant.findUnique({ where: { id: testTenantId } });
    expect(tenant?.status).toBe("SUSPENDED");

    const audit = await platformDb.platformAuditLog.findFirst({
      where: { tenantId: testTenantId, action: "TENANT_STATUS_SUSPENDED" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
  });

  it("should reactivate tenant to ACTIVE status", async () => {
    await setTenantStatus(testTenantId, "ACTIVE");

    const tenant = await platformDb.tenant.findUnique({ where: { id: testTenantId } });
    expect(tenant?.status).toBe("ACTIVE");
  });
});
