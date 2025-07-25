/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["lib/tests/**/*.{test,spec}.ts"],
    exclude: [
      "lib/tests/integration/**/*.integration.test.ts",
      "tests/**/*.bench.ts",
      "node_modules/**",
      "dist/**",
    ],
    // Fix CommonJS/ESM module resolution issues
    deps: {
      optimizer: {
        ssr: {
          include: ["@qi/base", "@qi/core", "@qi"],
        },
      },
    },
    coverage: {
      provider: "v8", // Note: Istanbul provider has compatibility issues with current Vitest version
      reporter: ["text", "json", "html"],
      include: ["lib/src/**/*.ts"],
      exclude: ["lib/src/**/*.test.ts", "lib/src/**/*.spec.ts"],
      all: true, // Include all files, even those with no executable code
      skipFull: false, // Show files with 100% coverage
      reportOnFailure: true, // Generate report even on test failures
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
    preserveSymlinks: true,
    alias: {
      // Workspace dependency aliases
      "@qi/base": new URL("../../qi-v2-qicore/typescript/dist/base.js", import.meta.url).pathname,
      "@qi/core": new URL("../../qi-v2-qicore/typescript/dist/core.js", import.meta.url).pathname,
      // Local project aliases
      "@qi/dp": new URL("./lib/src", import.meta.url).pathname,
      "@qi/dp/dsl": new URL("./lib/src/dsl", import.meta.url).pathname,
      "@qi/dp/md": new URL("./lib/src/md", import.meta.url).pathname,
      "@qi/dp/utils": new URL("./lib/src/utils", import.meta.url).pathname,
      "@": new URL("./lib/src", import.meta.url).pathname,
      "@/dsl": new URL("./lib/src/dsl", import.meta.url).pathname,
      "@/market": new URL("./lib/src/market", import.meta.url).pathname,
      "@/mcp": new URL("./lib/src/mcp", import.meta.url).pathname,
      "@/analytics": new URL("./lib/src/analytics", import.meta.url).pathname,
      "@/functional": new URL("./lib/src/functional", import.meta.url).pathname,
      "@/performance": new URL("./lib/src/performance", import.meta.url).pathname,
      "@/testing": new URL("./lib/src/testing", import.meta.url).pathname,
      "@/tests": new URL("./lib/tests", import.meta.url).pathname,
    },
  },
});
