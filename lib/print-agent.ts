import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashPrintAgentSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generatePrintAgentPairingCode() {
  const bytes = crypto.randomBytes(8);
  const raw = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export async function pairPrintAgent(input: { code: string; name: string; platform: string; version: string }) {
  const normalizedCode = input.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const now = new Date();
  const pairing = await prisma.printAgentPairingCode.findUnique({
    where: { codeHash: hashPrintAgentSecret(normalizedCode) },
    include: { tenant: { select: { id: true, name: true } } },
  });
  if (!pairing || pairing.usedAt || pairing.expiresAt <= now) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const device = await prisma.$transaction(async (tx) => {
    const claimed = await tx.printAgentPairingCode.updateMany({
      where: { id: pairing.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;
    return tx.printAgentDevice.create({
      data: {
        tenantId: pairing.tenantId,
        name: input.name,
        platform: input.platform,
        version: input.version,
        tokenHash: hashPrintAgentSecret(token),
        lastSeenAt: now,
      },
      select: { id: true, name: true },
    });
  });
  return device ? { device, tenant: pairing.tenant, token } : null;
}

export async function authenticatePrintAgent(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (token.length < 32 || token.length > 200) return null;
  return prisma.printAgentDevice.findFirst({
    where: { tokenHash: hashPrintAgentSecret(token), revokedAt: null },
    select: { id: true, tenantId: true, name: true },
  });
}

export async function leaseNextPrintAgentJob(device: { id: string; tenantId: string }, destinations: string[]) {
  const allowed = destinations.filter((value) => ["KITCHEN", "COUNTER", "LABEL", "DEFAULT"].includes(value));
  if (!allowed.length) return null;
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 60_000);

  return prisma.$transaction(async (tx) => {
    const exhausted = await tx.printAgentJob.findMany({
      where: { tenantId: device.tenantId, status: "LEASED", leaseUntil: { lte: now }, attempts: { gte: 3 } },
      select: { id: true, orderId: true, destination: true },
    });
    if (exhausted.length) {
      await tx.printAgentJob.updateMany({
        where: { id: { in: exhausted.map((job) => job.id) } },
        data: { status: "FAILED", leasedById: null, leaseUntil: null, error: "El agente perdió la conexión durante tres intentos." },
      });
      for (const job of exhausted) {
        if (job.orderId && ["KITCHEN", "COUNTER"].includes(job.destination)) {
          await tx.printDispatch.updateMany({
            where: { tenantId: device.tenantId, orderId: job.orderId, kind: job.destination },
            data: { status: "FAILED", error: "El agente perdió la conexión durante tres intentos." },
          });
        }
      }
    }
    await tx.printAgentJob.updateMany({
      where: { tenantId: device.tenantId, status: "LEASED", leaseUntil: { lte: now }, attempts: { lt: 3 } },
      data: { status: "PENDING", leasedById: null, leaseUntil: null },
    });
    const candidate = await tx.printAgentJob.findFirst({
      where: { tenantId: device.tenantId, status: "PENDING", destination: { in: allowed } },
      orderBy: { createdAt: "asc" },
    });
    if (!candidate) return null;
    const leased = await tx.printAgentJob.updateMany({
      where: { id: candidate.id, status: "PENDING" },
      data: { status: "LEASED", leasedById: device.id, leaseUntil, attempts: { increment: 1 }, error: null },
    });
    if (leased.count !== 1) return null;
    return { id: candidate.id, destination: candidate.destination, title: candidate.title, contentType: candidate.contentType, payload: candidate.payload, copies: candidate.copies, widthMm: candidate.widthMm };
  });
}

export async function acknowledgePrintAgentJob(device: { id: string; tenantId: string }, jobId: string, success: boolean, error?: string) {
  const job = await prisma.printAgentJob.findFirst({ where: { id: jobId, tenantId: device.tenantId, leasedById: device.id, status: "LEASED" } });
  if (!job) return null;
  const retry = !success && job.attempts < 3;
  const status = success ? "PRINTED" : retry ? "PENDING" : "FAILED";
  await prisma.$transaction(async (tx) => {
    await tx.printAgentJob.update({
      where: { id: job.id },
      data: { status, printedAt: success ? new Date() : null, leasedById: null, leaseUntil: null, error: success ? null : (error || "La impresora rechazó el trabajo.").slice(0, 2000) },
    });
    if (job.orderId && ["KITCHEN", "COUNTER"].includes(job.destination)) {
      await tx.printDispatch.updateMany({
        where: { tenantId: device.tenantId, orderId: job.orderId, kind: job.destination },
        data: { status: success ? "SENT" : retry ? "PENDING" : "FAILED", error: success ? null : (error || "Error del agente.").slice(0, 2000) },
      });
    }
  });
  return { status, retry };
}

export async function enqueuePrintAgentJob(input: { tenantId: string; orderId?: string; destination: string; title: string; payload: Buffer; widthMm: number; idempotencyKey: string }) {
  return prisma.printAgentJob.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      destination: input.destination,
      title: input.title,
      contentType: "RAW_BASE64",
      payload: input.payload.toString("base64"),
      widthMm: input.widthMm,
      idempotencyKey: input.idempotencyKey,
    },
    update: {},
    select: { id: true, status: true },
  });
}
