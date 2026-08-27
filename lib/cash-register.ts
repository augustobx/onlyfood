import "server-only";

import { getTenantDb } from "@/lib/tenant-db";

const CASH_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || "America/Argentina/Buenos_Aires";

export function currentBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CASH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

export async function getCashDashboard(from: Date, to: Date) {
  const db = await getTenantDb();
  const [locations, sessions] = await Promise.all([
    db.location.findMany({ where: { isActive: true }, orderBy: [{ isMain: "desc" }, { name: "asc" }], select: { id: true, name: true, code: true } }),
    db.cashSession.findMany({
      where: { businessDate: { gte: from, lte: to } },
      include: { location: { select: { id: true, name: true } }, movements: { orderBy: { occurredAt: "desc" } } },
      orderBy: [{ businessDate: "desc" }, { openedAt: "desc" }],
    }),
  ]);

  const snapshots = await Promise.all(sessions.map(async (session) => {
    const end = session.closedAt || new Date();
    const cashOrders = await db.order.findMany({
      where: {
        locationId: session.locationId,
        paymentMethod: "CASH",
        status: "DELIVERED",
        history: { some: { status: "DELIVERED", createdAt: { gte: session.openedAt, lte: end } } },
      },
      select: { id: true, total: true },
    });
    const cashSales = Math.round(cashOrders.reduce((sum, order) => sum + order.total, 0) * 100) / 100;
    const manualIncome = Math.round(session.movements.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const expenses = Math.round(session.movements.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const liveExpectedBalance = Math.round((session.openingBalance + cashSales + manualIncome - expenses) * 100) / 100;
    return {
      ...session,
      cashSales,
      cashOrders: cashOrders.length,
      manualIncome,
      expenses,
      calculatedExpectedBalance: session.status === "CLOSED" && session.expectedBalance !== null
        ? session.expectedBalance
        : liveExpectedBalance,
    };
  }));

  const totals = snapshots.reduce((result, session) => ({
    opening: result.opening + session.openingBalance,
    sales: result.sales + session.cashSales,
    income: result.income + session.manualIncome,
    expenses: result.expenses + session.expenses,
    expected: result.expected + session.calculatedExpectedBalance,
    difference: result.difference + (session.difference ?? 0),
  }), { opening: 0, sales: 0, income: 0, expenses: 0, expected: 0, difference: 0 });

  return { locations, sessions: snapshots, totals };
}
