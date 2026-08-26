import "server-only";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getRequestIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
}

export async function consumeRateLimit(
  namespace: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const key = crypto
    .createHash("sha256")
    .update(`${namespace}:${identifier}`)
    .digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  return prisma.$transaction(async (tx) => {
    const current = await tx.rateLimitBucket.findUnique({ where: { key } });

    if (!current || current.resetAt <= now) {
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return true;
    }

    if (current.count >= limit) return false;

    await tx.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return true;
  });
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

