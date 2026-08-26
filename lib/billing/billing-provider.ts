import "server-only";

import { platformDb } from "@/lib/platform-db";
import { setTenantStatus, setTenantPlan } from "@/lib/superadmin";
import type { PlanCode } from "@/lib/features";

export interface SubscriptionResult {
  providerSubscriptionId: string;
  initPoint?: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
}

export interface BillingProvider {
  createSubscription(tenantId: string, planCode: PlanCode, email: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  handleWebhook(payload: any, signature?: string): Promise<{ handled: boolean; event?: string }>;
}

export class MercadoPagoSaaSBillingProvider implements BillingProvider {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.PLATFORM_MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
  }

  async createSubscription(tenantId: string, planCode: PlanCode, email: string): Promise<SubscriptionResult> {
    const plan = await platformDb.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new Error("PLAN_NOT_FOUND");

    if (!this.accessToken) {
      // Offline / manual fallback mode if platform MP credentials are not set
      const sub = await platformDb.subscription.upsert({
        where: { tenantId },
        update: { planId: plan.id, status: "ACTIVE" },
        create: {
          tenantId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        providerSubscriptionId: `manual_${sub.id}`,
        status: "ACTIVE",
      };
    }

    try {
      const baseUrl = process.env.BASE_URL || "https://nanolabs.app";
      const response = await fetch("https://api.mercadopago.com/preapproval_plan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: `NanoLabs OnlyFood SaaS - Plan ${plan.name}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: plan.priceMonthly,
            currency_id: "ARS",
          },
          back_url: `${baseUrl}/admin`,
          collector_id: undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("MP SaaS Preapproval Error:", data);
        throw new Error(data.message || "Error al crear suscripción en Mercado Pago");
      }

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

  async handleWebhook(payload: any): Promise<{ handled: boolean; event?: string }> {
    const type = payload.type || payload.action || payload.topic;
    const dataId = payload.data?.id || payload.id;

    if (!dataId) return { handled: false };

    if (type === "subscription_preapproval" || type === "preapproval") {
      try {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) return { handled: false };

        const subData = await response.json();
        const externalRef = subData.external_reference; // tenantId

        if (externalRef) {
          const status = subData.status; // authorized, paused, cancelled
          if (status === "authorized") {
            await setTenantStatus(externalRef, "ACTIVE");
          } else if (status === "paused") {
            await setTenantStatus(externalRef, "PAST_DUE");
          } else if (status === "cancelled") {
            await setTenantStatus(externalRef, "SUSPENDED");
          }
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
