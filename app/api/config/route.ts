import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/public-config";
import { getTenantContext } from "@/lib/tenant-context";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    const config = await getPublicConfig(tenant.id);
    return NextResponse.json(config
      ? {
          ...config,
          whatsappOptInEnabled: tenant.features.has("whatsapp") && config.whatsappNotificationsEnabled,
        }
      : { appName: "nfood", isStoreOpen: false, whatsappOptInEnabled: false });
  } catch {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}
