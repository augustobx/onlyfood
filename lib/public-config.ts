import "server-only";

import { prisma } from "@/lib/prisma";

export const publicConfigSelect = {
  id: true,
  tenantId: true,
  appName: true,
  logoUrl: true,
  splashUrl: true,
  splashType: true,
  splashVideoUrl: true,
  backgroundUrl: true,
  backgroundBlur: true,
  isStoreOpen: true,
  closedMessage: true,
  primaryColor: true,
  secondaryColor: true,
  storeTheme: true,
  splashEnabled: true,
  splashDuration: true,
  welcomeBalloonEnabled: true,
  welcomeBalloonText: true,
  welcomeBalloonDuration: true,
  deliveryCost: true,
  globalDiscount: true,
  paymentCash: true,
  paymentMp: true,
  autoPrintTickets: true,
  printingMode: true,
  isRouletteActive: true,
  rouletteCost: true,
  isPointsCatalogActive: true,
  vapidPublicKey: true,
  allowImmediateOrders: true,
  allowScheduledTomorrow: true,
  allowAdvanceOrders: true,
  advanceOrderMinDays: true,
  advanceOrderMaxDays: true,
  asapEstimatedMinutes: true,
  businessHours: true,
  autoScheduleEnabled: true,
} as const;

export async function getPublicConfig(tenantId?: string) {
  if (tenantId) {
    const config = await prisma.systemConfig.findFirst({
      where: { tenantId },
      select: publicConfigSelect,
    });
    if (config) return config;
  }
  return prisma.systemConfig.findFirst({ select: publicConfigSelect });
}
