import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { platformDb } from "@/lib/platform-db";
import { getTenantFeatures } from "@/lib/features";
import {
  createPlan,
  createSaaSPayment,
  setTenantFeatureOverride,
  updateSaaSPaymentStatus,
  updateTenantUserAccess,
  updatePlan,
  updateTenantSubscription,
} from "@/lib/superadmin";
import { platformEntityIdSchema } from "@/lib/platform-validation";
import { hashUserPassword, verifyUserPassword } from "@/lib/user-auth";

describe("SuperAdmin plan and subscription control", () => {
  let tenantId: string;
  let planId: string;
  let userId: string;

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
    const user = await platformDb.user.create({
      data: { email: "control-owner-before@example.com", name: "Owner Before", passwordHash: await hashUserPassword("Initial-control-password-2026") },
    });
    userId = user.id;
    await platformDb.tenantMembership.create({ data: { tenantId, userId, role: "OWNER" } });
  });

  it("accepts both current UUIDs and preserved legacy platform identifiers", () => {
    expect(platformEntityIdSchema.safeParse("legacy-default-plan").success).toBe(true);
    expect(platformEntityIdSchema.safeParse("legacy-default-tenant").success).toBe(true);
    expect(platformEntityIdSchema.safeParse("../../otro-comercio").success).toBe(false);
  });

  afterAll(async () => {
    if (tenantId) await platformDb.tenant.deleteMany({ where: { id: tenantId } });
    if (userId) await platformDb.user.deleteMany({ where: { id: userId } });
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

  it("lets SuperAdmin replace tenant user identity and revoke sessions", async () => {
    await platformDb.userSession.create({ data: { userId, tokenHash: `control-session-${Date.now()}`, expiresAt: new Date(Date.now() + 86_400_000) } });
    await updateTenantUserAccess({
      tenantId,
      userId,
      email: "control-owner-after@example.com",
      name: "Owner After",
      password: "Replacement-control-password-2026",
    });
    const user = await platformDb.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.email).toBe("control-owner-after@example.com");
    expect(await verifyUserPassword("Replacement-control-password-2026", user.passwordHash)).toBe(true);
    expect(await platformDb.userSession.count({ where: { userId } })).toBe(0);
  });

  it("records SaaS payments and synchronizes a confirmed billing period", async () => {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 86_400_000);
    const payment = await createSaaSPayment({
      tenantId,
      amount: 27500,
      currency: "ARS",
      status: "PENDING",
      method: "TRANSFERENCIA",
      reference: "TEST-001",
      periodStart,
      periodEnd,
    });
    await updateSaaSPaymentStatus(payment.id, "PAID", new Date());
    const stored = await platformDb.saaSPayment.findUniqueOrThrow({ where: { id: payment.id } });
    const subscription = await platformDb.subscription.findUniqueOrThrow({ where: { tenantId } });
    expect(stored.status).toBe("PAID");
    expect(subscription.status).toBe("ACTIVE");
    expect(subscription.currentPeriodEnd.getTime()).toBe(periodEnd.getTime());
  });
});
