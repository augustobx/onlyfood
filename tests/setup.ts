import dotenv from 'dotenv';
import { beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';

dotenv.config();

beforeAll(async () => {
  try {
    // 1. Seed SaaS Plans: STARTER, PRO, BUSINESS
    const starterPlan = await prisma.plan.upsert({
      where: { code: 'STARTER' },
      update: {
        name: 'Plan Starter',
        priceMonthly: 8000,
        maxLocations: 1,
        maxProducts: 50,
        features: ['customDomain'],
        isActive: true,
      },
      create: {
        code: 'STARTER',
        name: 'Plan Starter',
        priceMonthly: 8000,
        maxLocations: 1,
        maxProducts: 50,
        features: ['customDomain'],
        isActive: true,
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { code: 'PRO' },
      update: {
        name: 'Plan Profesional',
        priceMonthly: 15000,
        maxLocations: 3,
        maxProducts: 500,
        features: ['loyalty', 'roulette', 'whatsapp', 'customDomain', 'printNode'],
        isActive: true,
      },
      create: {
        code: 'PRO',
        name: 'Plan Profesional',
        priceMonthly: 15000,
        maxLocations: 3,
        maxProducts: 500,
        features: ['loyalty', 'roulette', 'whatsapp', 'customDomain', 'printNode'],
        isActive: true,
      },
    });

    const businessPlan = await prisma.plan.upsert({
      where: { code: 'BUSINESS' },
      update: {
        name: 'Plan Business',
        priceMonthly: 25000,
        maxLocations: 10,
        maxProducts: 2000,
        features: ['loyalty', 'roulette', 'whatsapp', 'customDomain', 'printNode', 'multiLocation', 'analytics'],
        isActive: true,
      },
      create: {
        code: 'BUSINESS',
        name: 'Plan Business',
        priceMonthly: 25000,
        maxLocations: 10,
        maxProducts: 2000,
        features: ['loyalty', 'roulette', 'whatsapp', 'customDomain', 'printNode', 'multiLocation', 'analytics'],
        isActive: true,
      },
    });

    // 2. Ensure Tenant A (beats)
    const tenantBeats = await prisma.tenant.upsert({
      where: { slug: 'beats' },
      update: {},
      create: {
        slug: 'beats',
        name: 'BeatsBurgers',
        status: 'ACTIVE',
        locations: {
          create: {
            name: 'Principal',
            code: 'main',
            isMain: true,
            isActive: true,
          },
        },
        domains: {
          createMany: {
            data: [
              { hostname: 'beats.producto.nanolabs.app', isPrimary: true, isCustom: false },
              { hostname: 'localhost', isPrimary: false, isCustom: false },
            ],
          },
        },
        subscription: {
          create: {
            planId: proPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        settings: {
          create: {
            appName: 'BeatsBurgers',
            primaryColor: '#f97316',
            secondaryColor: '#9333ea',
            storeTheme: 'ORIGINAL',
          },
        },
      },
    });

    // 3. Ensure Tenant B (roma)
    const tenantRoma = await prisma.tenant.upsert({
      where: { slug: 'roma' },
      update: {},
      create: {
        slug: 'roma',
        name: 'Pizzeria Roma',
        status: 'ACTIVE',
        locations: {
          create: {
            name: 'Central',
            code: 'main',
            isMain: true,
            isActive: true,
          },
        },
        domains: {
          create: {
            hostname: 'roma.producto.nanolabs.app',
            isPrimary: true,
            isCustom: false,
          },
        },
        subscription: {
          create: {
            planId: proPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        settings: {
          create: {
            appName: 'Pizzeria Roma',
            primaryColor: '#e11d48',
            secondaryColor: '#16a34a',
            storeTheme: 'NEXO',
          },
        },
      },
    });

    // Ensure initial categories for tenants if not exist
    await prisma.category.upsert({
      where: { id: 'cat-beats-burgers' },
      update: { tenantId: tenantBeats.id },
      create: {
        id: 'cat-beats-burgers',
        name: 'Hamburguesas',
        tenantId: tenantBeats.id,
        sequence: 1,
      },
    }).catch(() => {});

    await prisma.category.upsert({
      where: { id: 'cat-roma-pizzas' },
      update: { tenantId: tenantRoma.id },
      create: {
        id: 'cat-roma-pizzas',
        name: 'Pizzas',
        tenantId: tenantRoma.id,
        sequence: 1,
      },
    }).catch(() => {});
  } catch (err) {
    // ignore if DB is offline during unit mock tests
  }
});
