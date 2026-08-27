import { requireAdmin } from "@/lib/admin-session";
import { getCalendarOrders } from "@/app/actions/admin-calendar";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  await requireAdmin(["OWNER", "MANAGER", "KITCHEN", "CASHIER", "DELIVERY", "STAFF"]);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const data = await getCalendarOrders(start.toISOString(), end.toISOString());

  return (
    <CalendarClient
      initialOrders={data.orders || []}
      initialMessengers={data.messengers || []}
    />
  );
}
