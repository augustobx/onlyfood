import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    alias: {
      'server-only': path.resolve(__dirname, './tests/mocks/server-only.ts'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
