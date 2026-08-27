import { requireAdmin } from "@/lib/admin-session";
import { currentBusinessDate, getCashDashboard } from "@/lib/cash-register";
import { CashDashboardClient } from "./CashDashboardClient";
import { requireTenantFeature } from "@/lib/features";

function parseDate(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export default async function CashPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { tenant } = await requireAdmin(["OWNER", "MANAGER", "CASHIER"]);
  await requireTenantFeature(tenant.id, "cashRegister");
  const today = currentBusinessDate();
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const params = await searchParams;
  const from = parseDate(params.from, firstDay);
  const to = parseDate(params.to, today);
  const dashboard = await getCashDashboard(from, to);
  return <CashDashboardClient dashboard={dashboard} from={from.toISOString().slice(0, 10)} to={to.toISOString().slice(0, 10)} />;
}
