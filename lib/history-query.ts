import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { startOfBusinessDayUtc } from "./time";
export const historyQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["ALL", "NEW", "IN_PROCESS", "PENDING_DELIVERY", "OUT_FOR_DELIVERY", "FINISHED", "DELIVERED", "CANCELLED"]).default("ALL"),
  type: z.enum(["ALL", "IMMEDIATE", "SCHEDULED_TOMORROW", "CUSTOM_DATE"]).default("ALL"),
  payment: z.enum(["ALL", "CASH", "MP", "ADMIN", "TRANSFER"]).default("ALL"),
  range: z.enum(["ALL", "TODAY", "YESTERDAY", "LAST_7_DAYS", "THIS_MONTH", "CUSTOM"]).default("ALL"),
  from: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(""),
  to: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(""),
  page: z.number().int().min(1).max(1000000).default(1),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export function historyFromSearchParams(params: Record<string, string | undefined>): HistoryQuery {
  const parsed = historyQuerySchema.safeParse({ search: params.q || "", status: params.status || "ALL", type: params.type || "ALL", payment: params.payment || "ALL", range: params.range || "ALL", from: params.from || "", to: params.to || "", page: Number(params.page || 1) });
  if (parsed.success) { try { historyWhere(parsed.data); return parsed.data; } catch { /* Invalid ranges fall back to the complete history. */ } }
  return historyQuerySchema.parse({});
}
export function historyWhere(input: HistoryQuery, now = new Date()): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (input.search) {
    const needle = input.search.replace(/^#/, "");
    where.OR = ["id", "clientName", "clientPhone", "deliveryAddress"].map(key => ({ [key]: { contains: needle } }));
  }
  if (input.status !== "ALL") where.status = input.status;
  if (input.type !== "ALL") where.orderType = input.type;
  if (input.payment !== "ALL") where.paymentMethod = input.payment === "CASH" ? { in: ["CASH", "EFVO"] } : input.payment;
  const today = startOfBusinessDayUtc(now), nextDay = new Date(today.getTime() + 86400000);
  let gte: Date | undefined, lt: Date | undefined;
  if (input.range === "TODAY") { gte = today; lt = nextDay; }
  if (input.range === "YESTERDAY") { gte = new Date(today.getTime() - 86400000); lt = today; }
  if (input.range === "LAST_7_DAYS") { gte = new Date(today.getTime() - 6 * 86400000); lt = nextDay; }
  if (input.range === "THIS_MONTH") { gte = new Date(today); gte.setUTCDate(1); lt = nextDay; }
  if (input.range === "CUSTOM") {
    if (input.from) gte = new Date(`${input.from}T03:00:00Z`);
    if (input.to) lt = new Date(new Date(`${input.to}T03:00:00Z`).getTime() + 86400000);
    if ((gte && !Number.isFinite(gte.getTime())) || (lt && !Number.isFinite(lt.getTime())) || (gte && lt && gte >= lt)) throw new Error("Revisá el rango de fechas.");
  }
  if (gte || lt) where.createdAt = { ...(gte && { gte }), ...(lt && { lt }) };
  return where;
}
