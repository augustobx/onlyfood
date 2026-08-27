import "server-only";

import { platformDb } from "@/lib/platform-db";
import { setTenantStatus, setTenantPlan } from "@/lib/superadmin";
import { recordAuditLog } from "@/lib/audit";
import type { PlanCode } from "@/lib/features";
import crypto from "crypto";

export interface SubscriptionResult {
  providerSubscriptionId: string;
  initPoint?: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export interface BillingProvider {
  createSubscription(tenantId: string, planCode: PlanCode, email: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  handleWebhook(payload: any, signature?: string, requestId?: string): Promise<{ handled: boolean; event?: string }>;
}

export class MercadoPagoSaaSBillingProvider implements BillingProvider {
  private accessToken: string;
  private webhookSecret: string;

  constructor(accessToken?: string, webhookSecret?: string) {
    this.accessToken = accessToken || process.env.PLATFORM_MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
    this.webhookSecret = webhookSecret || process.env.PLATFORM_MP_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET || "";
  }

  async createSubscription(tenantId: string, planCode: PlanCode, email: string): Promise<SubscriptionResult> {
    const plan = await platformDb.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new Error("PLAN_NOT_FOUND");

    if (!this.accessToken) {
      throw new Error("PLATFORM_BILLING_NOT_CONFIGURED");
    }

    try {
      const baseUrl = process.env.BASE_URL || "https://nanolabs.app";
      const response = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: `NanoLabs OnlyFood SaaS - Plan ${plan.name}`,
          payer_email: email,
          external_reference: tenantId,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: plan.priceMonthly,
            currency_id: "ARS",
          },
          back_url: `${baseUrl}/admin`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("MP SaaS Preapproval Error:", data);
        throw new Error(data.message || "Error al crear suscripción en Mercado Pago");
      }

      await platformDb.subscription.upsert({
        where: { tenantId },
        update: { planId: plan.id, status: "PENDING", provider: "MERCADO_PAGO", providerSubscriptionId: data.id },
        create: {
          tenantId,
          planId: plan.id,
          status: "PENDING",
          provider: "MERCADO_PAGO",
          providerSubscriptionId: data.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      });

      return {
        providerSubscriptionId: data.id,
        initPoint: data.init_point,
        status: "PENDING",
      };
    } catch (error) {
      console.error("Billing Provider Error:", error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (subscriptionId.startsWith("manual_")) return true;
    if (!this.accessToken) return true;

    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to cancel MP SaaS subscription:", error);
      return false;
    }
  }

  async handleWebhook(payload: any, signature?: string, requestId?: string): Promise<{ handled: boolean; event?: string }> {
    const type = payload.type || payload.action || payload.topic;
    const dataId = payload.data?.id || payload.id;

    if (!dataId) return { handled: false };

    // Validate webhook signature if secret configured
    if (this.webhookSecret) {
      if (!signature || !requestId) return { handled: false };
      const parts = signature.split(",");
      const tsPart = parts.find((p) => p.trim().startsWith("ts="));
      const v1Part = parts.find((p) => p.trim().startsWith("v1="));
      if (tsPart && v1Part) {
        const ts = tsPart.split("=")[1];
        const v1 = v1Part.split("=")[1];
        const timestampMs = Number(ts) * 1000;
        if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return { handled: false };
        const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
        const hmac = crypto.createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");
        const actual = Buffer.from(v1, "hex");
        const expected = Buffer.from(hmac, "hex");
        if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
          console.warn("Invalid MP SaaS webhook signature, rejecting.");
          return { handled: false };
        }
      } else return { handled: false };
    }

    if (type === "subscription_preapproval" || type === "preapproval") {
      try {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) return { handled: false };

        const subData = await response.json();
        const subscription = await platformDb.subscription.findUnique({ where: { providerSubscriptionId: String(dataId) } });
        const externalRef = subscription?.tenantId;

        if (externalRef) {
          const status = subData.status; // authorized, paused, cancelled
          if (status === "authorized") {
            await setTenantStatus(externalRef, "ACTIVE");
            await platformDb.subscription.update({ where: { tenantId: externalRef }, data: { status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
          } else if (status === "paused") {
            await setTenantStatus(externalRef, "PAST_DUE");
            await platformDb.subscription.update({ where: { tenantId: externalRef }, data: { status: "PAST_DUE" } });
          } else if (status === "cancelled") {
            // Correct transition: cancelled -> CANCELED
            await setTenantStatus(externalRef, "CANCELED");
            await platformDb.subscription.update({ where: { tenantId: externalRef }, data: { status: "CANCELED" } });
          }

          await recordAuditLog({
            tenantId: externalRef,
            action: `BILLING_WEBHOOK_${status.toUpperCase()}`,
            resource: "Subscription",
            details: { dataId, status },
          });

          return { handled: true, event: `SUBSCRIPTION_${status.toUpperCase()}` };
        }
      } catch (err) {
        console.error("Error processing billing webhook:", err);
      }
    }

    return { handled: true };
  }
}

export const saasBillingProvider: BillingProvider = new MercadoPagoSaaSBillingProvider();
