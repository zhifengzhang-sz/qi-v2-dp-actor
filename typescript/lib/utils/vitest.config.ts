import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test files patterns
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".git"],

    // Environment
    environment: "node",

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // TypeScript support
    typecheck: {
      enabled: true,
      checker: "tsc",
    },

    // Reporter configuration
    reporter: ["verbose"],

    // Concurrent testing (Vitest 2025 default)
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // Watch mode configuration
    watch: {
      clearScreen: false,
    },

    // Global setup for DSL testing
    globals: false, // Use explicit imports for better tree-shaking

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  // Resolve configuration for TypeScript paths
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
      "@tests": new URL("./tests", import.meta.url).pathname,
    },
  },
});
