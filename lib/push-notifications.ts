import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function configure(publicKey: string, privateKey: string) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:soporte@nanoapps.ar",
    publicKey,
    privateKey,
  );
}

export async function sendOrderPush(orderId: string, title: string, body: string, url = `/track/${orderId}`) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      tenantId: true,
      clientId: true,
      tenant: { select: { settings: { select: { logoUrl: true } } } },
    },
  });
  if (!order?.tenantId) return;
  configure(publicKey, privateKey);
  const subscriptions = await prisma.pushSubscription.findMany({ where: { tenantId: order.tenantId, orderId } });
  // Anonymous tracking URLs require the one-time token, which is intentionally
  // never persisted in plaintext. Do not send a broken or unprotected deep link.
  const payload = JSON.stringify({
    title,
    body,
    url: order.clientId ? url : "/",
    icon: order.tenant?.settings?.logoUrl || undefined,
  });
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { auth: subscription.auth, p256dh: subscription.p256dh },
      }, payload);
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      }
    }
  }));
}
