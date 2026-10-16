"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { getLoggedClient } from "@/lib/auth";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";
import {
  MAX_SAVED_ADDRESSES, isSavedAddressValid, normalizedAddress,
} from "@/lib/client-address-policy";

const idSchema = z.string().uuid();
const addressSchema = z.object({
  id: idSchema.optional(),
  label: z.string().trim().min(1).max(40),
  street: z.string().trim().min(5).max(180),
  unit: z.string().trim().max(60).default(""),
  reference: z.string().trim().max(80).default(""),
  makeDefault: z.boolean().default(false),
});

async function clientScope() {
  const tenant = await getTenantContext();
  const client = await getLoggedClient(tenant.id);
  if (!client) return null;
  return { tenantId: tenant.id, clientId: client.id };
}

/** Nunca acepta tenantId/clientId del navegador. */
export async function getClientSavedAddresses() {
  const scope = await clientScope();
  if (!scope) return [];
  return prisma.clientSavedAddress.findMany({
    where: scope,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true, label: true, street: true, unit: true, reference: true, isDefault: true,
    },
    take: MAX_SAVED_ADDRESSES,
  });
}

export async function upsertClientSavedAddress(input: unknown) {
  const scope = await clientScope();
  if (!scope) return { success: false as const, error: "Iniciá sesión para guardar direcciones." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success || !isSavedAddressValid(parsed.data)) {
    return { success: false as const, error: "Completá la dirección y verificá que no supere 250 caracteres en total." };
  }
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-address-save", `${scope.tenantId}:${scope.clientId}:${ip}`, 30, 60 * 60_000)) {
    return { success: false as const, error: "Demasiadas modificaciones. Probá más tarde." };
  }
  const value = normalizedAddress(parsed.data);
  try {
    const addressId = await prisma.$transaction(async tx => {
      // Serializa cambios simultáneos sobre la misma lista; 5 como máximo.
      const current = await tx.clientSavedAddress.findMany({
        where: scope, select: { id: true, isDefault: true },
        orderBy: { createdAt: "asc" },
      });
      const prior = parsed.data.id ? current.find(a => a.id === parsed.data.id) : null;
      if (parsed.data.id && !prior) throw new Error("ADDRESS_NOT_FOUND");
      if (!prior && current.length >= MAX_SAVED_ADDRESSES) throw new Error("ADDRESS_LIMIT");
      const makeDefault = parsed.data.makeDefault || (!prior && current.length === 0) || Boolean(prior?.isDefault);
      if (makeDefault) {
        await tx.clientSavedAddress.updateMany({
          where: scope, data: { isDefault: false },
        });
      }
      const data = {
        ...scope, ...value, isDefault: makeDefault,
      };
      if (prior) {
        const updated = await tx.clientSavedAddress.updateMany({
          where: { ...scope, id: prior.id }, data: value,
        });
        if (updated.count !== 1) throw new Error("ADDRESS_NOT_FOUND");
        if (makeDefault) {
          await tx.clientSavedAddress.updateMany({
            where: { ...scope, id: prior.id }, data: { isDefault: true },
          });
        }
        return prior.id;
      }
      const result = await tx.clientSavedAddress.create({ data, select: { id: true } });
      return result.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/profile");
    return { success: true as const, id: addressId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "ADDRESS_LIMIT") return { success: false as const, error: "Podés guardar hasta 5 direcciones. Eliminá una para agregar otra." };
    if (reason === "ADDRESS_NOT_FOUND") return { success: false as const, error: "No encontramos esa dirección. Actualizá la pantalla." };
    return { success: false as const, error: "No se pudo guardar la dirección. Intentá nuevamente." };
  }
}

export async function setDefaultClientSavedAddress(addressId: string) {
  const scope = await clientScope();
  if (!scope) return { success: false as const, error: "Iniciá sesión." };
  const id = idSchema.safeParse(addressId);
  if (!id.success) return { success: false as const, error: "Dirección inválida." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-address-default", `${scope.tenantId}:${scope.clientId}:${ip}`, 30, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados cambios. Probá más tarde." };
  }
  try {
    await prisma.$transaction(async tx => {
      const selected = await tx.clientSavedAddress.findFirst({
        where: { ...scope, id: id.data }, select: { id: true },
      });
      if (!selected) throw new Error("ADDRESS_NOT_FOUND");
      await tx.clientSavedAddress.updateMany({ where: scope, data: { isDefault: false } });
      await tx.clientSavedAddress.updateMany({
        where: { ...scope, id: selected.id }, data: { isDefault: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/profile");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo cambiar la dirección principal." };
  }
}

export async function deleteClientSavedAddress(addressId: string) {
  const scope = await clientScope();
  if (!scope) return { success: false as const, error: "Iniciá sesión." };
  const id = idSchema.safeParse(addressId);
  if (!id.success) return { success: false as const, error: "Dirección inválida." };
  const ip = await getRequestIp();
  if (!await consumeRateLimit("client-address-delete", `${scope.tenantId}:${scope.clientId}:${ip}`, 30, 60 * 60_000)) {
    return { success: false as const, error: "Demasiados cambios. Probá más tarde." };
  }
  try {
    const removed = await prisma.$transaction(async tx => {
      const old = await tx.clientSavedAddress.findFirst({ where: { ...scope, id: id.data } });
      if (!old) return false;
      await tx.clientSavedAddress.deleteMany({ where: { ...scope, id: old.id } });
      if (old.isDefault) {
        const next = await tx.clientSavedAddress.findFirst({
          where: scope, orderBy: { updatedAt: "desc" }, select: { id: true },
        });
        if (next) await tx.clientSavedAddress.updateMany({
          where: { ...scope, id: next.id }, data: { isDefault: true },
        });
      }
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!removed) return { success: false as const, error: "La dirección ya no existe." };
    revalidatePath("/profile");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "No se pudo eliminar la dirección." };
  }
}
