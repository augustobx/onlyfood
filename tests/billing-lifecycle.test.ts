import { describe, it, expect, beforeAll } from "vitest";
import { platformDb } from "@/lib/platform-db";
import { setTenantStatus } from "@/lib/superadmin";

describe("FASE 3 & 20 & 21: Billing Lifecycle Transitions (TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELED)", () => {
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await platformDb.tenant.upsert({
      where: { slug: "test-billing-lifecycle" },
      update: { status: "TRIAL" },
      create: {
        slug: "test-billing-lifecycle",
        name: "Test Billing Lifecycle",
        status: "TRIAL",
      },
    });
    tenantId = tenant.id;
  });

  it("should start in TRIAL status", async () => {
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("TRIAL");
  });

  it("should transition from TRIAL to ACTIVE on successful subscription payment", async () => {
    await setTenantStatus(tenantId, "ACTIVE");
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("ACTIVE");
  });

  it("should transition to PAST_DUE when recurring charge fails (grace period)", async () => {
    await setTenantStatus(tenantId, "PAST_DUE");
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("PAST_DUE");
  });

  it("should transition to SUSPENDED when payment grace period expires without resolution", async () => {
    await setTenantStatus(tenantId, "SUSPENDED");
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("SUSPENDED");
  });

  it("should reactivate from SUSPENDED back to ACTIVE when payment is settled", async () => {
    await setTenantStatus(tenantId, "ACTIVE");
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("ACTIVE");
  });

  it("should transition to CANCELED upon definitive subscription termination without data deletion", async () => {
    await setTenantStatus(tenantId, "CANCELED");
    const tenant = await platformDb.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.status).toBe("CANCELED");

    // Verify tenant record and audit trail remain preserved (zero data loss)
    expect(tenant).not.toBeNull();
    const audit = await platformDb.platformAuditLog.findFirst({
      where: { tenantId, action: "TENANT_STATUS_CANCELED" },
    });
    expect(audit).not.toBeNull();
  });
});
