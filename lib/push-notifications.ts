import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function configure(publicKey: string, privateKey: string) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:soporte@nanolabs.online",
    publicKey,
    privateKey,
  );
}

export async function sendOrderPush(orderId: string, title: string, body: string, url = `/track/${orderId}`) {
  const config = await prisma.systemConfig.findFirst({ select: { vapidPublicKey: true, vapidPrivateKey: true } });
  if (!config?.vapidPublicKey || !config.vapidPrivateKey) return;
  configure(config.vapidPublicKey, config.vapidPrivateKey);
  const subscriptions = await prisma.pushSubscription.findMany({ where: { orderId } });
  const payload = JSON.stringify({ title, body, url });
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

