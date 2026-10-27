import { getTenantDb } from "@/lib/tenant-db";
import { SettingsForm } from "./SettingsForm";
import { MessengerForm } from "./MessengerForm";
import { DeliverySlotForm } from "./DeliverySlotForm";



import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantEmailPublicSettings } from "@/lib/tenant-email";
import { getTenantIntegration, type WhatsAppCredentials, type MercadoPagoCredentials } from "@/lib/tenant-integrations";

export default async function SettingsPage() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const db = await getTenantDb();
  const emailSettings = await getTenantEmailPublicSettings(tenant.id);
  const [config, mpCredentials, whatsappCredentials, whatsappNotifications] = await Promise.all([
    db.systemConfig.findFirst(),
    getTenantIntegration<MercadoPagoCredentials>(tenant.id, "MERCADO_PAGO"),
    getTenantIntegration<WhatsAppCredentials>(tenant.id, "WHATSAPP"),
    db.whatsAppNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        event: true,
        status: true,
        recipient: true,
        templateName: true,
        attempts: true,
        error: true,
        createdAt: true,
        sentAt: true,
        order: { select: { id: true, clientName: true } },
      },
    }),
  ]);
  const domains = await db.tenantDomain.findMany({ where: { verifiedAt: { not: null } }, select: { hostname: true } });
  const messengers = await db.messenger.findMany({
    orderBy: { name: 'asc' }
  });
  
  const slots = await db.deliveryTimeSlot.findMany({
    orderBy: { time: 'asc' }
  });

  // Ensure default config exists
  const safeConfig = config || await db.systemConfig.create({
    data: { appName: "nfood", isStoreOpen: true }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">Elegí qué necesitás ajustar. Cada sección indica cómo se guardan sus cambios.</p>
      </div>

          <SettingsForm
            slotsPanel={<DeliverySlotForm initialSlots={slots} />}
            messengersPanel={<MessengerForm initialMessengers={messengers} />}
            domains={domains.map(item => item.hostname)}
            initialConfig={{
              ...safeConfig,
              mpAccessToken: null,
              mpPublicKey: mpCredentials?.publicKey || safeConfig.mpPublicKey || null,
              metaApiToken: null,
              metaVerifyToken: null,
              metaPhoneNumberId: whatsappCredentials?.phoneNumberId || null,
              metaApiVersion: whatsappCredentials?.apiVersion || process.env.META_GRAPH_API_VERSION || "v23.0",
              vapidPrivateKey: null,
            }}
            mpIntegrationConfigured={Boolean(mpCredentials?.accessToken)}
            emailServiceConfigured={emailSettings.configured}
            emailSettings={emailSettings}
            printNodeApiKeyConfigured={Boolean(process.env.PRINTNODE_API_KEY?.trim())}
            whatsappIntegrationConfigured={Boolean(whatsappCredentials?.apiToken && whatsappCredentials.phoneNumberId && whatsappCredentials.verifyToken)}
            metaAppSecretConfigured={Boolean(process.env.META_APP_SECRET?.trim())}
            whatsappWebhookUrl={process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, "")}/api/webhooks/whatsapp` : ""}
            whatsappNotifications={whatsappNotifications}
            whatsappEnabled={tenant.features.has("whatsapp")}
            printNodeEnabled={tenant.features.has("printNode")}
          />
    </div>
  );
}
