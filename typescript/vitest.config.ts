/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["tests/**/*.bench.ts", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
    },
    benchmark: {
      include: ["tests/**/*.bench.ts"],
    },
    // Test environment for integration tests
    testTimeout: 30000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@/dsl": new URL("./src/dsl", import.meta.url).pathname,
      "@/market": new URL("./src/market", import.meta.url).pathname,
      "@/mcp": new URL("./src/mcp", import.meta.url).pathname,
      "@/analytics": new URL("./src/analytics", import.meta.url).pathname,
      "@/functional": new URL("./src/functional", import.meta.url).pathname,
      "@/performance": new URL("./src/performance", import.meta.url).pathname,
      "@/testing": new URL("./src/testing", import.meta.url).pathname,
      "@/tests": new URL("./tests", import.meta.url).pathname,
    },
  },
});