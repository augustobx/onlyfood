import { getTenantDb } from "@/lib/tenant-db";
import { SettingsForm } from "./SettingsForm";
import { MessengerForm } from "./MessengerForm";
import { DeliverySlotForm } from "./DeliverySlotForm";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Clock, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantIntegration, type WhatsAppCredentials } from "@/lib/tenant-integrations";

export default async function SettingsPage() {
  await requireAdmin(["OWNER", "MANAGER"]);
  const tenant = await getTenantContext();
  const db = await getTenantDb();
  const [config, whatsappCredentials, whatsappNotifications] = await Promise.all([
    db.systemConfig.findFirst(),
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
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Administrar preferencias de la PWA, Horarios de Entrega y Mensajeros.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 border p-1 rounded-lg">
          <TabsTrigger value="general" className="rounded-md">
            <Settings className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="slots" className="rounded-md">
            <Clock className="w-4 h-4 mr-2" /> Horarios (Cupos)
          </TabsTrigger>
          <TabsTrigger value="messengers" className="rounded-md">
            <Users className="w-4 h-4 mr-2" /> Mensajeros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <SettingsForm
            initialConfig={{
              ...safeConfig,
              mpAccessToken: null,
              metaApiToken: null,
              metaVerifyToken: null,
              metaPhoneNumberId: whatsappCredentials?.phoneNumberId || null,
              metaApiVersion: whatsappCredentials?.apiVersion || process.env.META_GRAPH_API_VERSION || "v23.0",
              vapidPrivateKey: null,
            }}
            printNodeApiKeyConfigured={Boolean(process.env.PRINTNODE_API_KEY?.trim())}
            whatsappIntegrationConfigured={Boolean(whatsappCredentials?.apiToken && whatsappCredentials.phoneNumberId && whatsappCredentials.verifyToken)}
            metaAppSecretConfigured={Boolean(process.env.META_APP_SECRET?.trim())}
            whatsappWebhookUrl={process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, "")}/api/webhooks/whatsapp` : ""}
            whatsappNotifications={whatsappNotifications}
          />
        </TabsContent>

        <TabsContent value="slots" className="space-y-6">
          <DeliverySlotForm initialSlots={slots} />
        </TabsContent>

        <TabsContent value="messengers" className="space-y-6">
          <MessengerForm initialMessengers={messengers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
