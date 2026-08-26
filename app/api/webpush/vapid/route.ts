import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/tenant-db";
import webpush from "web-push";

export async function GET() {
  try {
    const db = await getTenantDb();
    let config = await db.systemConfig.findFirst();
    if (!config) {
      config = await db.systemConfig.create({
        data: {}
      });
    }

    if (!config.vapidPublicKey || !config.vapidPrivateKey) {
      const vapidKeys = webpush.generateVAPIDKeys();
      config = await db.systemConfig.update({
        where: { id: config.id },
        data: {
          vapidPublicKey: vapidKeys.publicKey,
          vapidPrivateKey: vapidKeys.privateKey,
        }
      });
    }

    return NextResponse.json({ publicKey: config.vapidPublicKey });
  } catch (error) {
    console.error("VAPID config error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
