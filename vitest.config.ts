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
      : ["tests/security-unit.test.ts", "tests/tenant-branding.test.ts", "tests/quantity-discounts.test.ts", "tests/whatsapp-notifications.test.ts", "tests/patty-count.test.ts", "tests/order-review-policy.test.ts", "tests/bun-count.test.ts", "tests/cashier-vip-store.test.ts", "tests/rewards-multi-unit-flow.test.ts", "tests/advance-order-scheduling.test.ts", "tests/sushi-theme.test.ts", "tests/order-history-circuit.test.ts", "tests/checkout-auth-policy.test.ts", "tests/email-configuration.test.ts", "tests/tenant-email-isolation.test.ts", "tests/client-account-policy.test.ts", "tests/client-login-identifier.test.ts", "tests/client-recovery-policy.test.ts", "tests/temporary-password-policy.test.ts", "tests/tier-payment-policy.test.ts", "tests/checkout-presentation.test.ts", "tests/client-address-policy.test.ts", "tests/pwa-order-helpers.test.ts", "tests/order-status-guidance.test.ts", "tests/pwa-order-history.test.ts", "tests/pwa-mobile-navigation.test.ts", "tests/transfer-payment.test.ts", "tests/audit-order-integrity.test.ts"],
    alias: {
      'server-only': path.resolve(import.meta.dirname, './tests/mocks/server-only.ts'),
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
