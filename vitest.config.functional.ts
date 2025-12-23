import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/functional/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially to avoid DB conflicts
      },
    },
  },
});
