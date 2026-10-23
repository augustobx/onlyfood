import { timingSafeEqual } from "node:crypto";
import { platformDb } from "@/lib/platform-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  const token = process.env.HUB_INTEGRATION_TOKEN || "", supplied = req.headers.get("authorization") || "";
  if (Buffer.byteLength(token) < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength("Bearer " + token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from("Bearer " + token))) return Response.json({ success: false, error: "No autorizado" }, { status: 401, headers });
  const offset = Number(new URL(req.url).searchParams.get("offset") || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) return Response.json({ success: false, error: "Paginación inválida" }, { status: 400, headers });
  try {
    const rows = await platformDb.tenant.findMany({ orderBy: { id: "asc" }, skip: offset, take: 101, include: { subscription: { include: { plan: true } }, features: true, _count: { select: { orders: true } } } });
    const tenants = rows.slice(0, 100).map(t => {
      const s = t.subscription, now = new Date();
      const allowed = !!s && ((s.status === "ACTIVE" && s.currentPeriodEnd > now) || (s.status === "TRIAL" && !!s.trialEndsAt && s.trialEndsAt > now));
      const status = t.status === "CANCELED" ? "CANCELED" : !allowed || !["ACTIVE", "TRIAL"].includes(t.status) ? "SUSPENDED" : t.status;
      const inherited = Array.isArray(s?.plan.features) ? s.plan.features.filter((v): v is string => typeof v === "string") : [];
      const modules = Object.fromEntries(inherited.map(k => [k, true]));
      for (const f of t.features) modules[f.featureKey] = f.isEnabled;
      return { id: t.id, slug: t.slug, name: t.name, status, rawStatus: t.status, createdAt: t.createdAt.toISOString(), plan: s?.plan.name || null, planExpiresAt: (s?.status === "TRIAL" ? s.trialEndsAt : s?.currentPeriodEnd)?.toISOString() || null, modules, metrics: { totalRecords: t._count.orders, recordLabel: "Pedidos", available: true } };
    });
    return Response.json({ success: true, contract: "nanolabs.saas.tenants.v1", product: "onlyfood", capturedAt: new Date().toISOString(), tenants, nextOffset: rows.length > 100 ? offset + 100 : null, capabilities: { tenantsRead: true, tenantWrite: false, moduleWrite: false } }, { headers });
  } catch { return Response.json({ success: false, error: "La fuente no está disponible" }, { status: 503, headers }); }
}
