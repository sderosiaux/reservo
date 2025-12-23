import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],

    // Longer timeouts for integration tests
    // (database operations, concurrent tests)
    testTimeout: 30000,
    hookTimeout: 30000,

    // Run tests sequentially to avoid conflicts
    // (each test modifies shared database)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Disable file parallelism for database tests
    fileParallelism: false,

    // Better error output for integration tests
    reporters: ['verbose'],

    // Setup/teardown hooks
    setupFiles: [],
    globalSetup: [],
  },
});
