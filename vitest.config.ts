import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.RUN_DB_TESTS === "true") {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for integration tests");
  const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error("Refusing integration tests: TEST_DATABASE_URL must target a database whose name contains 'test'");
  }
  process.env.DATABASE_URL = testDatabaseUrl;
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    include: process.env.RUN_DB_TESTS === "true"
      ? ["tests/**/*.test.ts"]
      : ["tests/security-unit.test.ts", "tests/tenant-branding.test.ts", "tests/quantity-discounts.test.ts"],
    alias: {
      'server-only': path.resolve(import.meta.dirname, './tests/mocks/server-only.ts'),
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
