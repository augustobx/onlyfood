import { requireAdmin } from "@/lib/admin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { createTenantDb } from "@/lib/tenant-db";
import { launchReadiness } from "@/lib/launch-readiness";
import { getTenantIntegration, type MercadoPagoCredentials } from "@/lib/tenant-integrations";
import WizardClient from "./WizardClient";

export const dynamic = "force-dynamic";

export default async function AdminWizardPage() {
  await requireAdmin();
  const tenant = await getTenantContext();
  const db = createTenantDb(tenant.id);

  const [config, productsCount, categoriesCount, activeSlots, domainsCount, completedOrders, mercadoPagoCredentials] = await Promise.all([
    db.systemConfig.findFirst(),
    db.product.count({ where: { isActive: true } }),
    db.category.count({ where: { isActive: true } }),
    db.deliveryTimeSlot.count({ where: { isActive: true } }),
    db.tenantDomain.count({ where: { verifiedAt: { not: null } } }),
    db.order.count({ where: { status: "DELIVERED", paymentStatus: "PAID" } }),
    getTenantIntegration<MercadoPagoCredentials>(tenant.id, "MERCADO_PAGO"),
  ]);

  const readiness = launchReadiness(config, activeSlots, Boolean(mercadoPagoCredentials?.accessToken));
  const steps = [
    { id: "identity", title: "Identidad del comercio", description: "Definí un nombre real y revisá logo, colores y tema visual.", completed: Boolean(config?.appName?.trim() && !["nfood", "beatsburgers", "onlyfood"].includes(config.appName.trim().toLowerCase())), href: "/admin/settings?section=general", action: "Configurar identidad" },
    { id: "catalog", title: "Catálogo vendible", description: `Necesitás al menos una categoría y un producto activos. Hoy: ${categoriesCount} categorías y ${productsCount} productos.`, completed: categoriesCount > 0 && productsCount > 0, href: "/admin/catalog", action: "Revisar catálogo" },
    { id: "orders", title: "Horarios y cupos", description: `Franjas activas: ${activeSlots}. Los pedidos de hoy necesitan una franja disponible. Revisá también días y turnos de atención.`, completed: readiness.scheduling, href: "/admin/settings?section=schedule", action: "Configurar horarios y cupos" },
    { id: "payments", title: "Medios de cobro preparados", description: "Cada medio habilitado debe tener su configuración completa: efectivo, Mercado Pago o transferencia.", completed: readiness.payments, href: "/admin/settings?section=finance", action: "Revisar cobros" },
    { id: "domain", title: "Dirección pública", description: `Dominios verificados: ${domainsCount}. Abrí el enlace público y consultá al administrador si necesitás modificarlo.`, completed: domainsCount > 0, href: "/admin/settings?section=domain", action: "Ver dirección pública" },
    { id: "test", title: "Pedido cobrado y entregado", description: `Pedidos entregados y pagados: ${completedOrders}. Comprobá que podés comprar, cobrar, preparar y entregar. Las integraciones requieren sus propias pruebas.`, completed: completedOrders > 0, href: "/", action: "Abrir tienda y probar", external: true },
  ];
  return <WizardClient tenantName={tenant.name} steps={steps} isStoreOpen={Boolean(config?.isStoreOpen)} ordersEnabled={tenant.features.has("orders")} />;
}
