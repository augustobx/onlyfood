import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { platformDb } from "@/lib/platform-db";
import { getTenantFeatures } from "@/lib/features";
import {
  createPlan,
  setTenantFeatureOverride,
  updatePlan,
  updateTenantSubscription,
} from "@/lib/superadmin";
import { platformEntityIdSchema } from "@/lib/platform-validation";

describe("SuperAdmin plan and subscription control", () => {
  let tenantId: string;
  let planId: string;

  beforeAll(async () => {
    await createPlan({
      code: "CONTROL_TEST",
      name: "Control Test",
      priceMonthly: 1000,
      maxLocations: 1,
      maxProducts: 10,
      features: ["orders"],
      isActive: true,
    });
    const plan = await platformDb.plan.findUniqueOrThrow({ where: { code: "CONTROL_TEST" } });
    planId = plan.id;
    const tenant = await platformDb.tenant.create({
      data: { slug: "control-test-tenant", name: "Control Test Tenant", status: "ACTIVE" },
    });
    tenantId = tenant.id;
  });

  it("accepts both current UUIDs and preserved legacy platform identifiers", () => {
    expect(platformEntityIdSchema.safeParse("legacy-default-plan").success).toBe(true);
    expect(platformEntityIdSchema.safeParse("legacy-default-tenant").success).toBe(true);
    expect(platformEntityIdSchema.safeParse("../../otro-comercio").success).toBe(false);
  });

  afterAll(async () => {
    if (tenantId) await platformDb.tenant.deleteMany({ where: { id: tenantId } });
    if (planId) await platformDb.plan.deleteMany({ where: { id: planId } });
  });

  it("edits plan price, limits, availability and included features", async () => {
    await updatePlan({
      id: planId,
      name: "Control Total",
      priceMonthly: 27500,
      maxLocations: 4,
      maxProducts: 500,
      features: ["orders", "loyalty"],
      isActive: false,
    });
    const plan = await platformDb.plan.findUniqueOrThrow({ where: { id: planId } });
    expect(plan).toMatchObject({
      name: "Control Total",
      priceMonthly: 27500,
      maxLocations: 4,
      maxProducts: 500,
      isActive: false,
    });
    expect(plan.features).toEqual(["orders", "loyalty"]);
  });

  it("synchronizes subscription plan, dates and tenant status", async () => {
    const start = new Date(Date.now() - 60_000);
    const end = new Date(Date.now() + 30 * 86_400_000);
    await updateTenantSubscription({
      tenantId,
      planId,
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
    const tenant = await platformDb.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: true },
    });
    expect(tenant.status).toBe("ACTIVE");
    expect(tenant.subscription?.planId).toBe(planId);
    expect(tenant.subscription?.currentPeriodEnd.getTime()).toBe(end.getTime());
  });

  it("supports inherited, forced enabled and forced disabled features", async () => {
    await setTenantFeatureOverride(tenantId, "orders", "DISABLED");
    await setTenantFeatureOverride(tenantId, "whatsapp", "ENABLED");
    let result = await getTenantFeatures(tenantId);
    expect(result.features.has("orders")).toBe(false);
    expect(result.features.has("whatsapp")).toBe(true);

    await setTenantFeatureOverride(tenantId, "orders", "INHERIT");
    result = await getTenantFeatures(tenantId);
    expect(result.features.has("orders")).toBe(true);
  });
});
