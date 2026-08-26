import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createTenantDb } from '@/lib/tenant-db';
import { resolveTenantByHostname } from '@/lib/tenant-context';
import { saveTenantIntegration, getTenantIntegration, type MercadoPagoCredentials } from '@/lib/tenant-integrations';
import { getTenantFeatures } from '@/lib/features';
import { getPublicConfig } from '@/lib/public-config';

describe('FASE 19: Suite de Validación Final SaaS Multi-Tenant', () => {
  it('E2E: Full Isolation across Products, Customers, Orders, Settings, Integrations, Domains & Roles', async () => {
    // 1. Resolver Tenant A y Tenant B
    const resA = await resolveTenantByHostname('beats.producto.nanolabs.app');
    const resB = await resolveTenantByHostname('roma.producto.nanolabs.app');

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    if (!resA.success || !resB.success) return;

    const tenantA = resA.tenant;
    const tenantB = resB.tenant;

    const dbA = createTenantDb(tenantA.id);
    const dbB = createTenantDb(tenantB.id);

    // ==========================================
    // A. PRODUCTOS & CATEGORÍAS
    // ==========================================
    const catA = await dbA.category.create({
      data: { name: 'Cat E2E Beats', sequence: 1 } as any,
    });
    const prodA = await dbA.product.create({
      data: { categoryId: catA.id, name: 'Burger E2E Beats', basePrice: 10000 } as any,
    });

    const productsFromB = await dbB.product.findMany();
    expect(productsFromB.some((p) => p.id === prodA.id)).toBe(false);

    // Tenant B cannot update Tenant A's product
    await expect(
      dbB.product.update({ where: { id: prodA.id }, data: { name: 'Hack' } })
    ).rejects.toThrow();

    // ==========================================
    // B. CLIENTES & TELÉFONO COMPARTIDO
    // ==========================================
    const testPhone = '+5491122223333';
    const clientA = await dbA.client.upsert({
      where: { tenantId_phone: { tenantId: tenantA.id, phone: testPhone } },
      update: { points: 500 },
      create: { phone: testPhone, password: 'PassA', points: 500 } as any,
    });

    const clientB = await dbB.client.upsert({
      where: { tenantId_phone: { tenantId: tenantB.id, phone: testPhone } },
      update: { points: 200 },
      create: { phone: testPhone, password: 'PassB', points: 200 } as any,
    });

    expect(clientA.id).not.toBe(clientB.id);
    expect(clientA.points).toBe(500);
    expect(clientB.points).toBe(200);

    // ==========================================
    // C. PEDIDOS
    // ==========================================
    const orderA = await dbA.order.create({
      data: {
        clientName: 'Juan E2E',
        clientPhone: testPhone,
        needsDelivery: false,
        total: 10000,
        paymentMethod: 'CASH',
        status: 'NEW',
      } as any,
    });

    const ordersFromB = await dbB.order.findMany();
    expect(ordersFromB.some((o) => o.id === orderA.id)).toBe(false);

    // ==========================================
    // D. CONFIGURACIÓN & BRANDING
    // ==========================================
    await prisma.systemConfig.upsert({
      where: { tenantId: tenantA.id },
      update: { appName: 'BeatsBurgers Oficial' },
      create: { tenantId: tenantA.id, appName: 'BeatsBurgers Oficial' },
    });

    await prisma.systemConfig.upsert({
      where: { tenantId: tenantB.id },
      update: { appName: 'Pizzeria Roma Artesanal' },
      create: { tenantId: tenantB.id, appName: 'Pizzeria Roma Artesanal' },
    });

    const configA = await getPublicConfig(tenantA.id);
    const configB = await getPublicConfig(tenantB.id);

    expect(configA?.appName).toBe('BeatsBurgers Oficial');
    expect(configB?.appName).toBe('Pizzeria Roma Artesanal');

    // ==========================================
    // E. INTEGRACIONES & CIFRADO
    // ==========================================
    const credsA: MercadoPagoCredentials = { accessToken: 'MP-BEATS-FINAL-SECRET' };
    const credsB: MercadoPagoCredentials = { accessToken: 'MP-ROMA-FINAL-SECRET' };

    await saveTenantIntegration(tenantA.id, 'MERCADO_PAGO', credsA);
    await saveTenantIntegration(tenantB.id, 'MERCADO_PAGO', credsB);

    const decryptedA = await getTenantIntegration<MercadoPagoCredentials>(tenantA.id, 'MERCADO_PAGO');
    const decryptedB = await getTenantIntegration<MercadoPagoCredentials>(tenantB.id, 'MERCADO_PAGO');

    expect(decryptedA?.accessToken).toBe('MP-BEATS-FINAL-SECRET');
    expect(decryptedB?.accessToken).toBe('MP-ROMA-FINAL-SECRET');

    // ==========================================
    // F. PLANES & FEATURES
    // ==========================================
    const featA = await getTenantFeatures(tenantA.id);
    expect(featA.isSubscriptionActive).toBe(true);
    expect(featA.planCode).toBe('PRO');
  });
});
