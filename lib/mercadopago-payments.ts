import "server-only";

import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";
import { getTenantIntegration, type MercadoPagoCredentials } from "@/lib/tenant-integrations";

function localPaymentStatus(status?: string) {
  if (status === "approved") return "PAID";
  if (status === "refunded" || status === "charged_back") return "REFUNDED";
  if (status === "rejected" || status === "cancelled") return "FAILED";
  return "PENDING";
}

export async function reconcileMercadoPagoPayment(paymentId: string, expectedOrderId?: string, tenantIdHint?: string) {
  if (!/^\d{1,32}$/.test(paymentId)) throw new Error("INVALID_PAYMENT_ID");

  // 1. Resolve order to know which tenant this belongs to
  let order = expectedOrderId ? await prisma.order.findUnique({ where: { id: expectedOrderId } }) : null;
  if (order?.tenantId && tenantIdHint && order.tenantId !== tenantIdHint) throw new Error("PAYMENT_TENANT_MISMATCH");
  const tenantId = order?.tenantId || tenantIdHint;
  if (!tenantId) throw new Error("PAYMENT_TENANT_REQUIRED");

  // 2. Fetch tenant credentials
  let accessToken: string | undefined;
  if (tenantId) {
    const creds = await getTenantIntegration<MercadoPagoCredentials>(tenantId, "MERCADO_PAGO");
    accessToken = creds?.accessToken;
  }

  if (!accessToken) throw new Error("MP_NOT_CONFIGURED");

  const paymentInfo = await new Payment(new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })).get({ id: paymentId });
  const orderId = paymentInfo.external_reference;
  if (!orderId || (expectedOrderId && orderId !== expectedOrderId)) throw new Error("PAYMENT_ORDER_MISMATCH");
  if (paymentInfo.transaction_amount === undefined || !paymentInfo.currency_id) throw new Error("PAYMENT_INCOMPLETE");

  if (!order || order.id !== orderId) {
    order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  }

  if (!order || order.tenantId !== tenantId || order.paymentMethod !== "MP") throw new Error("ORDER_NOT_FOUND");
  const finalTenantId = tenantId;
  const amount = Number(paymentInfo.transaction_amount);
  const relatedOrders = order.mpPreferenceId
    ? await prisma.order.findMany({ where: { tenantId, mpPreferenceId: order.mpPreferenceId }, select: { total: true } })
    : [{ total: order.total }];
  const expectedAmount = relatedOrders.reduce((sum, item) => sum + item.total, 0);
  if (Math.abs(amount - expectedAmount) > 0.01 || paymentInfo.currency_id !== "ARS") throw new Error("PAYMENT_AMOUNT_MISMATCH");

  const paymentStatus = localPaymentStatus(paymentInfo.status);
  const db = createTenantDb(finalTenantId);

  const transitionedToPaid = await (db as any).$transaction(async (tx: any) => {
    await tx.paymentRecord.upsert({
      where: { providerPaymentId: paymentId },
      create: { providerPaymentId: paymentId, orderId, status: paymentStatus, amount, currency: paymentInfo.currency_id!, tenantId: finalTenantId },
      update: { status: paymentStatus, amount, currency: paymentInfo.currency_id! },
    });

    if (paymentStatus === "REFUNDED" && order.clientId && order.earnedPoints) {
      const reversed = await tx.order.updateMany({ where: { id: orderId, earnedPoints: { gt: 0 } }, data: { earnedPoints: 0 } });
      if (reversed.count === 1) {
        await tx.$executeRaw`UPDATE \`Client\` SET points = GREATEST(0, points - ${order.earnedPoints}) WHERE id = ${order.clientId}`;
      }
    }

    if (paymentStatus === "PAID") {
      const transition = await tx.order.updateMany({ where: { id: orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID" } });
      if (order.mpPreferenceId) {
        await tx.order.updateMany({
          where: { mpPreferenceId: order.mpPreferenceId, paymentStatus: { not: "PAID" } },
          data: { paymentStatus: "PAID" }
        });
      }
      return transition.count === 1;
    }
    if (paymentStatus === "REFUNDED") {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    } else {
      await tx.order.updateMany({ where: { id: orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus } });
    }
    return false;
  });

  return { orderId, paymentStatus, transitionedToPaid };
}

export async function findAndReconcileMercadoPagoOrder(orderId: string, tenantId?: string) {
  if (!tenantId) throw new Error("PAYMENT_TENANT_REQUIRED");
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  const resolvedTenantId = order?.tenantId || tenantId;

  let accessToken: string | undefined;
  if (resolvedTenantId) {
    const creds = await getTenantIntegration<MercadoPagoCredentials>(resolvedTenantId, "MERCADO_PAGO");
    accessToken = creds?.accessToken;
  }

  if (!accessToken) throw new Error("MP_NOT_CONFIGURED");

  const payments = await new Payment(new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })).search({
    options: { external_reference: orderId, sort: "date_last_updated", criteria: "desc", limit: 10 },
  });
  const candidate = payments.results?.find((payment) => payment.status === "approved") || payments.results?.[0];
  if (!candidate?.id) return { orderId, paymentStatus: "PENDING", transitionedToPaid: false };
  return reconcileMercadoPagoPayment(String(candidate.id), orderId, resolvedTenantId);
}
