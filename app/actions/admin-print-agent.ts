"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { generatePrintAgentPairingCode, hashPrintAgentSecret } from "@/lib/print-agent";
import { getRequestOrigin } from "@/lib/request-security";

export async function createPrintAgentPairingCode() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const code = generatePrintAgentPairingCode();
  const normalized = code.replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.$transaction([
    prisma.printAgentPairingCode.deleteMany({ where: { tenantId: tenant.id, usedAt: null } }),
    prisma.printAgentPairingCode.create({ data: { tenantId: tenant.id, codeHash: hashPrintAgentSecret(normalized), expiresAt } }),
  ]);
  return { success: true, code, expiresAt: expiresAt.toISOString(), serverUrl: await getRequestOrigin() };
}

export async function listPrintAgentDevices() {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "STAFF"]);
  const tenant = await getTenantContext();
  const devices = await prisma.printAgentDevice.findMany({
    where: { tenantId: tenant.id, revokedAt: null },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, platform: true, version: true, printers: true, lastSeenAt: true, createdAt: true },
  });
  const pendingJobs = await prisma.printAgentJob.count({ where: { tenantId: tenant.id, status: { in: ["PENDING", "LEASED"] } } });
  return { success: true, devices: devices.map((device) => ({ ...device, lastSeenAt: device.lastSeenAt?.toISOString() || null, createdAt: device.createdAt.toISOString() })), pendingJobs };
}

export async function revokePrintAgentDevice(deviceId: string) {
  await requireAdmin(["OWNER", "MANAGER"]);
  const parsed = z.string().uuid().safeParse(deviceId);
  if (!parsed.success) return { success: false, error: "Dispositivo inválido." };
  const tenant = await getTenantContext();
  const result = await prisma.printAgentDevice.updateMany({ where: { id: parsed.data, tenantId: tenant.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count === 1 ? { success: true } : { success: false, error: "El dispositivo ya no está disponible." };
}
