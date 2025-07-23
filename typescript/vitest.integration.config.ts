import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@qi/base": new URL("../../qi-v2-qicore/typescript/dist/base.js", import.meta.url).pathname,
      "@qi/core": new URL("../../qi-v2-qicore/typescript/dist/core.js", import.meta.url).pathname,
      "@qi/dp": new URL("./lib/src", import.meta.url).pathname,
      "@qi/dp/dsl": new URL("./lib/src/dsl", import.meta.url).pathname,
      "@qi/dp/md": new URL("./lib/src/md", import.meta.url).pathname,
      "@qi/dp/utils": new URL("./lib/src/utils", import.meta.url).pathname,
      "@": new URL("./lib/src", import.meta.url).pathname,
    },
  },
  test: {
    // Integration tests need longer timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Run integration tests sequentially to avoid resource conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Include only integration test files
    include: ["lib/tests/integration/**/*.integration.test.ts"],

    // Exclude unit tests
    exclude: [
      "node_modules/**/*",
      "lib/tests/md/**/*.test.ts",
      "lib/tests/base/**/*.test.ts",
      "lib/tests/actor/**/*.test.ts",
    ],

    // Environment setup for integration tests
    env: {
      REDPANDA_BROKERS: process.env.REDPANDA_BROKERS || "localhost:19092",
      INTEGRATION_TEST_TIMEOUT: process.env.INTEGRATION_TEST_TIMEOUT || "30000",
      NODE_ENV: "test",
    },

    // Enable verbose logging for debugging
    reporter: "verbose",

    // Setup files for integration tests
    setupFiles: [],

    // Global setup/teardown if needed
    globalSetup: undefined,
    globalTeardown: undefined,
  },

  // TypeScript configuration
  esbuild: {
    target: "node18",
  },
});
