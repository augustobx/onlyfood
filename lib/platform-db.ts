import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Cliente Prisma exclusivo para el módulo de Plataforma y Super Admin de NanoLabs.
 * Está estrictamente prohibido usar `platformDb` dentro de módulos del storefront o lógica del comercio.
 */
export const platformDb = prisma;
