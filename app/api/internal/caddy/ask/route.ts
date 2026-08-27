import { NextRequest, NextResponse } from "next/server";
import { resolveTenantByHostname } from "@/lib/tenant-context";

const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || !HOSTNAME_RE.test(domain)) return new NextResponse(null, { status: 400 });

  const baseDomain = (process.env.BASE_DOMAIN || "").trim().toLowerCase().replace(/\.$/, "");
  if (baseDomain && domain === baseDomain) return new NextResponse(null, { status: 204 });

  const result = await resolveTenantByHostname(domain);
  return new NextResponse(null, { status: result.success ? 204 : 404 });
}
