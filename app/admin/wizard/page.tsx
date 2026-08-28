import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import WizardClient from "./WizardClient";

export const dynamic = "force-dynamic";

export default async function AdminWizardPage() {
  await requireAdmin();
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  const [config, productsCount, categoriesCount, activeSlots, domainsCount, ordersCount, mercadoPagoConfigured] = await Promise.all([
    db.systemConfig.findFirst(),
    db.product.count({ where: { isActive: true } }),
    db.category.count({ where: { isActive: true } }),
    db.deliveryTimeSlot.count({ where: { isActive: true } }),
    db.tenantDomain.count({ where: { verifiedAt: { not: null } } }),
    db.order.count(),
    db.tenantIntegration.count({ where: { type: "MERCADO_PAGO", isActive: true } }),
  ]);

  const hasOrderingMode = Boolean(config?.allowImmediateOrders || config?.allowScheduledTomorrow || config?.allowAdvanceOrders);
  const schedulingNeedsSlots = Boolean(config?.allowScheduledTomorrow || config?.allowAdvanceOrders);
  const steps = [
    { id: "identity", title: "Identidad del comercio", description: "Definí un nombre real y revisá logo, colores y tema visual.", completed: Boolean(config?.appName?.trim() && !["nfood", "beatsburgers", "onlyfood"].includes(config.appName.trim().toLowerCase())), href: "/admin/settings", action: "Configurar identidad" },
    { id: "catalog", title: "Catálogo vendible", description: `Necesitás al menos una categoría y un producto activos. Hoy: ${categoriesCount} categorías y ${productsCount} productos.`, completed: categoriesCount > 0 && productsCount > 0, href: "/admin/catalog", action: "Revisar catálogo" },
    { id: "orders", title: "Modalidades y horarios", description: schedulingNeedsSlots ? `Hay ${activeSlots} franjas activas para pedidos programados.` : "Los pedidos inmediatos no requieren franjas programadas.", completed: hasOrderingMode && (!schedulingNeedsSlots || activeSlots > 0) && (!config?.autoScheduleEnabled || Boolean(config.businessHours)), href: "/admin/settings", action: "Configurar operación" },
    { id: "payments", title: "Cobros listos", description: config?.paymentMp ? "Mercado Pago debe estar vinculado y activo." : "El comercio cobrará con los medios habilitados.", completed: Boolean(config && (config.paymentCash || (config.paymentMp && mercadoPagoConfigured > 0))), href: "/admin/settings", action: "Revisar pagos" },
    { id: "domain", title: "Dirección pública verificada", description: `Dominios verificados: ${domainsCount}. El cliente debe poder abrir la tienda desde su URL definitiva.`, completed: domainsCount > 0, href: "/admin/settings", action: "Revisar dominio" },
    { id: "test", title: "Pedido de prueba completo", description: `Pedidos registrados: ${ordersCount}. Hacé un pedido real de punta a punta antes de publicar.`, completed: ordersCount > 0, href: "/", action: "Abrir tienda y probar", external: true },
  ];
  return <WizardClient tenantName={tenant.name} steps={steps} isStoreOpen={Boolean(config?.isStoreOpen)} ordersEnabled={tenant.features.has("orders")} />;
}
