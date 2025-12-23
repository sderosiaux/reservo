import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/load/**/*.test.ts'],
    testTimeout: 120000, // 2 minutes per test for load testing
    hookTimeout: 60000,
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially to avoid DB conflicts
      },
    },
  },
});
