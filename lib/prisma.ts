import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Falta definir DATABASE_URL en el archivo .env");
  }

  // Desarmamos la URL de tu .env de forma segura
  const dbUrl = new URL(connectionString);

  // FIX PARA XAMPP: Forzamos IPv4. Evita que se quede 10 segundos esperando (Timeout)
  const dbHost = dbUrl.hostname === "localhost" ? "127.0.0.1" : dbUrl.hostname;

  // ERROR CORREGIDO: En Prisma 7, las credenciales van DIRECTAMENTE al adaptador.
  // Ya NO se usa mariadb.createPool() como envoltorio, porque ocultaba las credenciales.
  const adapter = new PrismaMariaDb({
    host: dbHost,
    port: Number(dbUrl.port) || 3306,
    user: dbUrl.username || "root",
    password: dbUrl.password || "",
    database: dbUrl.pathname.replace("/", ""),
    connectionLimit: 15,
    connectTimeout: 10000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;