"use server";

import { provisionNewTenant } from "@/lib/superadmin";
import { createTenantDb } from "@/lib/tenant-db";
import type { PlanCode } from "@/lib/features";

export interface OnboardingInput {
  businessName: string;
  slug: string;
  categoryType: "BURGER" | "PIZZA" | "SUSHI" | "CAFE" | "VIANDAS" | "GENERAL";
  planCode: PlanCode;
  email: string;
  password: string;
  phone?: string;
  locationAddress?: string;
}

const TEMPLATE_CATALOGS: Record<string, { category: string; products: Array<{ name: string; price: number; desc: string }> }> = {
  BURGER: {
    category: "Hamburguesas Clásicas",
    products: [
      { name: "Burger Doble Bacon Cheddar", price: 9500, desc: "Doble medallón smash, panceta crocante y doble cheddar fundido en pan brioche." },
      { name: "Burger Crispy Chicken", price: 8900, desc: "Pechuga rebozada extra crujiente con lechuga fresca, tomate y mayonesa de la casa." },
    ],
  },
  PIZZA: {
    category: "Pizzas Especiales",
    products: [
      { name: "Pizza Napolitana con Ajo", price: 12000, desc: "Salsa de tomate casera, muzzarella premium, rodajas de tomate y toque de ajo al óleo." },
      { name: "Fugazzeta Rellena", price: 13500, desc: "Masa al molde rellena con 500g de muzzarella, cubierta con cebollas caramelizadas y orégano." },
    ],
  },
  SUSHI: {
    category: "Rolls & Combinados",
    products: [
      { name: "Combo Salmón Roll (15 piezas)", price: 18500, desc: "Variedad de New York Roll, Philadelphia y Geishas con sésamo tostado." },
      { name: "Hot Roll Langostinos", price: 16000, desc: "Rolls crocantes fritos al panko rellenos de langostinos, palta y queso philadelphia con salsa teriyaki." },
    ],
  },
  CAFE: {
    category: "Cafetería & Delicatessen",
    products: [
      { name: "Flat White & Medialuna con Jamón y Queso", price: 5400, desc: "Doble shot de espresso con leche vaporizada sedosa y medialuna hojaldrada rellena." },
      { name: "Tostón de Palta & Huevo Poché", price: 6200, desc: "Pan de masa madre tostado, palta fresca pisada, semillas y huevo de campo poché." },
    ],
  },
  VIANDAS: {
    category: "Platos del Día & Viandas",
    products: [
      { name: "Pechuga Grillé con Vegetales Asados", price: 7800, desc: "Pechuga marinada a las finas hierbas con mix de calabaza, batatas y zuchinis al horno." },
      { name: "Bowl de Quinoa, Salmón & Palta", price: 9200, desc: "Bowl nutritivo con base de quinoa real, dados de salmón, tomates cherry y aderezo cítrico." },
    ],
  },
  GENERAL: {
    category: "Menú Principal",
    products: [
      { name: "Plato Especial de la Casa", price: 8500, desc: "Preparado diariamente con ingredientes frescos y seleccionados por nuestro chef." },
      { name: "Bebida Refrescante 500ml", price: 2500, desc: "Línea de bebidas frías listas para consumir." },
    ],
  },
};

export async function registerMerchantOnboarding(input: OnboardingInput) {
  try {
    const cleanSlug = input.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    if (!cleanSlug || cleanSlug.length < 2) {
      return { success: false, error: "El nombre de enlace / slug es inválido." };
    }

    // 1. Provision Tenant Transactionally
    const tenant = await provisionNewTenant({
      name: input.businessName,
      slug: cleanSlug,
      planCode: input.planCode,
      ownerEmail: input.email,
      ownerName: input.businessName,
      ownerPassword: input.password,
      locationName: "Local Principal",
      locationAddress: input.locationAddress,
      locationPhone: input.phone,
    });

    // 2. Seed Initial Tailored Catalog
    const db = createTenantDb(tenant.id);
    const template = TEMPLATE_CATALOGS[input.categoryType] || TEMPLATE_CATALOGS.GENERAL;

    const cat = await db.category.create({
      data: {
        name: template.category,
        isActive: true,
        sequence: 1,
        tenantId: tenant.id,
      },
    });

    for (let i = 0; i < template.products.length; i++) {
      const p = template.products[i];
      await db.product.create({
        data: {
          name: p.name,
          basePrice: p.price,
          description: p.desc,
          categoryId: cat.id,
          isActive: true,
          tenantId: tenant.id,
        },
      });
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    };
  } catch (error: any) {
    console.error("Onboarding error:", error);
    const errorMsg =
      error.message === "SLUG_ALREADY_EXISTS"
        ? "Ese nombre de enlace ya está en uso por otro comercio. Elegí uno diferente."
        : "Ocurrió un error al registrar tu tienda. Por favor intentá nuevamente.";
    return { success: false, error: errorMsg };
  }
}
