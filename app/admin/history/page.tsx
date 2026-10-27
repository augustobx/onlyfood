import { getTenantDb } from "@/lib/tenant-db";
import { HistoryClient } from "./HistoryClient";
import { getHistoryPage } from "@/app/actions/admin-history";
import { historyFromSearchParams } from "@/lib/history-query";
export const dynamic = "force-dynamic";
export default async function AdminHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams;
 const query = historyFromSearchParams(Object.fromEntries(Object.entries(params).map(([key,value]) => [key,Array.isArray(value) ? value[0] : value])));
 const result = await getHistoryPage(query); const db = await getTenantDb();
 const messengers = await db.messenger.findMany({orderBy:{name:"asc"}});
 return <HistoryClient initialOrders={result.orders} initialResult={result} initialMessengers={messengers}/>;
}
