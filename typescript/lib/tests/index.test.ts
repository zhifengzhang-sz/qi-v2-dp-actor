/**
 * Unit tests for main module entry point
 * Tests that the main index.ts exports all expected modules and types
 */

import { describe, expect, it } from "vitest";
import * as QiCore from "../src/index.js";

describe("Main Entry Point", () => {
  describe("DSL exports", () => {
    it("should export core market data types", () => {
      // Check that core DSL types are available
      expect(typeof QiCore.decimal).toBe("undefined"); // decimal is a type, not a value

      // These should be available as types (can't test types directly in runtime)
      // But we can check that the module structure exists
      expect(QiCore).toBeDefined();
    });

    it("should export market data interfaces", () => {
      // The module should be defined and accessible
      expect(QiCore).toBeDefined();
      expect(typeof QiCore).toBe("object");
    });

    it("should export constants", () => {
      // Check that exports are defined
      expect(QiCore).toHaveProperty("MARKET_TYPES");
      expect(QiCore).toHaveProperty("ASSET_CLASSES");
      expect(QiCore).toHaveProperty("TIMEFRAMES");
      expect(QiCore).toHaveProperty("DEPTH_LEVELS");
    });

    it("should export MARKET_TYPES array", () => {
      expect(QiCore.MARKET_TYPES).toBeDefined();
      expect(Array.isArray(QiCore.MARKET_TYPES)).toBe(true);
      expect(QiCore.MARKET_TYPES).toContain("EQUITY");
      expect(QiCore.MARKET_TYPES).toContain("CRYPTO");
      expect(QiCore.MARKET_TYPES).toContain("FOREX");
      expect(QiCore.MARKET_TYPES).toContain("COMMODITY");
      expect(QiCore.MARKET_TYPES).toContain("BOND");
      expect(QiCore.MARKET_TYPES).toContain("DERIVATIVE");
    });

    it("should export ASSET_CLASSES array", () => {
      expect(QiCore.ASSET_CLASSES).toBeDefined();
      expect(Array.isArray(QiCore.ASSET_CLASSES)).toBe(true);
      expect(QiCore.ASSET_CLASSES).toContain("STOCK");
      expect(QiCore.ASSET_CLASSES).toContain("CRYPTO");
      expect(QiCore.ASSET_CLASSES).toContain("CURRENCY");
      expect(QiCore.ASSET_CLASSES).toContain("COMMODITY");
      expect(QiCore.ASSET_CLASSES).toContain("BOND");
      expect(QiCore.ASSET_CLASSES).toContain("INDEX");
    });

    it("should export TIMEFRAMES array", () => {
      expect(QiCore.TIMEFRAMES).toBeDefined();
      expect(Array.isArray(QiCore.TIMEFRAMES)).toBe(true);
      expect(QiCore.TIMEFRAMES).toContain("1s");
      expect(QiCore.TIMEFRAMES).toContain("5s");
      expect(QiCore.TIMEFRAMES).toContain("1m");
      expect(QiCore.TIMEFRAMES).toContain("5m");
      expect(QiCore.TIMEFRAMES).toContain("15m");
      expect(QiCore.TIMEFRAMES).toContain("1h");
      expect(QiCore.TIMEFRAMES).toContain("4h");
      expect(QiCore.TIMEFRAMES).toContain("1d");
      expect(QiCore.TIMEFRAMES).toContain("1w");
      expect(QiCore.TIMEFRAMES).toContain("1M");
      expect(QiCore.TIMEFRAMES).toContain("1Y");
    });

    it("should export DEPTH_LEVELS array", () => {
      expect(QiCore.DEPTH_LEVELS).toBeDefined();
      expect(Array.isArray(QiCore.DEPTH_LEVELS)).toBe(true);
      expect(QiCore.DEPTH_LEVELS).toContain(1);
      expect(QiCore.DEPTH_LEVELS).toContain(5);
      expect(QiCore.DEPTH_LEVELS).toContain(10);
      expect(QiCore.DEPTH_LEVELS).toContain(50);
      expect(QiCore.DEPTH_LEVELS).toContain(100);
      expect(QiCore.DEPTH_LEVELS).toContain(500);
      expect(QiCore.DEPTH_LEVELS).toContain(1000);
    });

    it("should export INTERVALS_MS mapping", () => {
      expect(QiCore.INTERVALS_MS).toBeDefined();
      expect(typeof QiCore.INTERVALS_MS).toBe("object");
      expect(QiCore.INTERVALS_MS["1s"]).toBe(1000);
      expect(QiCore.INTERVALS_MS["5s"]).toBe(5000);
      expect(QiCore.INTERVALS_MS["1m"]).toBe(60000);
      expect(QiCore.INTERVALS_MS["5m"]).toBe(300000);
      expect(QiCore.INTERVALS_MS["15m"]).toBe(900000);
      expect(QiCore.INTERVALS_MS["1h"]).toBe(3600000);
      expect(QiCore.INTERVALS_MS["4h"]).toBe(14400000);
      expect(QiCore.INTERVALS_MS["1d"]).toBe(86400000);
      expect(QiCore.INTERVALS_MS["1w"]).toBe(604800000);
      expect(QiCore.INTERVALS_MS["1M"]).toBe(2629746000);
      expect(QiCore.INTERVALS_MS["1Y"]).toBe(31556952000);
    });

    it("should export error handling functions", () => {
      expect(QiCore.Utils.createMarketDataError).toBeDefined();
      expect(typeof QiCore.Utils.createMarketDataError).toBe("function");
      expect(QiCore.Utils.createDataSourceError).toBeDefined();
      expect(typeof QiCore.Utils.createDataSourceError).toBe("function");
    });
  });

  describe("Utils namespace export", () => {
    it("should export Utils namespace", () => {
      expect(QiCore.Utils).toBeDefined();
      expect(typeof QiCore.Utils).toBe("object");
    });

    it("should provide analytics validation functions", () => {
      expect(QiCore.Utils.isValidDominanceMetrics).toBeDefined();
      expect(typeof QiCore.Utils.isValidDominanceMetrics).toBe("function");
    });

    it("should provide precision utilities", () => {
      expect(QiCore.Utils.FinancialDecimal).toBeDefined();
      expect(typeof QiCore.Utils.FinancialDecimal).toBe("function");
      expect(QiCore.Utils.parsePrice).toBeDefined();
      expect(typeof QiCore.Utils.parsePrice).toBe("function");
    });

    it("should provide factory functions", () => {
      expect(QiCore.Utils.createPrice).toBeDefined();
      expect(typeof QiCore.Utils.createPrice).toBe("function");

      expect(QiCore.Utils.createLevel1).toBeDefined();
      expect(typeof QiCore.Utils.createLevel1).toBe("function");

      expect(QiCore.Utils.createOHLCV).toBeDefined();
      expect(typeof QiCore.Utils.createOHLCV).toBe("function");

      expect(QiCore.Utils.createMarketDepth).toBeDefined();
      expect(typeof QiCore.Utils.createMarketDepth).toBe("function");

      expect(QiCore.Utils.createMarketData).toBeDefined();
      expect(typeof QiCore.Utils.createMarketData).toBe("function");
    });

    // Validation functions removed - not the responsibility of utils layer
    // DSL types have explicit typing, MD layer has smart constructors with typed parameters

    // Note: More comprehensive precision tests are in dedicated precision test files

    // Note: More comprehensive error utility tests are in dedicated error test files
  });

  describe("Module structure", () => {
    it("should have correct module structure", () => {
      // Check that the main module exports the expected structure
      const exportKeys = Object.keys(QiCore);

      // Should include various DSL exports and Utils
      expect(exportKeys).toContain("Utils");
      expect(exportKeys).toContain("MARKET_TYPES");
      expect(exportKeys).toContain("ASSET_CLASSES");
      expect(exportKeys).toContain("TIMEFRAMES");
      expect(exportKeys).toContain("DEPTH_LEVELS");
      expect(exportKeys).toContain("INTERVALS_MS");
    });

    it("should provide access to all major components", () => {
      // DSL layer constants
      expect(QiCore.MARKET_TYPES).toBeDefined();

      // Utils layer
      expect(QiCore.Utils).toBeDefined();
      expect(QiCore.Utils.isValidDominanceMetrics).toBeDefined();
      expect(QiCore.Utils.FinancialDecimal).toBeDefined();

      // Error handling
      expect(QiCore.Utils.createMarketDataError).toBeDefined();
    });

    it("should export constant arrays with expected values", () => {
      // Check MARKET_TYPES array structure
      expect(Array.isArray(QiCore.MARKET_TYPES)).toBe(true);
      expect(QiCore.MARKET_TYPES).toContain("EQUITY");

      // Check ASSET_CLASSES array structure
      expect(Array.isArray(QiCore.ASSET_CLASSES)).toBe(true);
      expect(QiCore.ASSET_CLASSES).toContain("STOCK");

      // Check TIMEFRAMES array structure
      expect(Array.isArray(QiCore.TIMEFRAMES)).toBe(true);
      expect(QiCore.TIMEFRAMES).toContain("1m");

      // Check DEPTH_LEVELS array structure
      expect(Array.isArray(QiCore.DEPTH_LEVELS)).toBe(true);
      expect(QiCore.DEPTH_LEVELS).toContain(10);
    });
  });

  describe("Usage patterns", () => {
    it("should support typical DSL usage patterns", () => {
      // Check that constants can be used for object creation
      const market = {
        type: "CRYPTO" as const,
        region: "GLOBAL",
        segment: "CASH" as const,
      };

      expect(market.type).toBe("CRYPTO");
      expect(market.segment).toBe("CASH");
      expect(QiCore.MARKET_TYPES).toContain(market.type);
    });

    it("should support analytics validation patterns", () => {
      const dominanceMetrics = {
        topInstrumentShare: 45.2,
        top5InstrumentShare: 78.6,
        top10InstrumentShare: 89.3,
        exchangeConcentration: 0.67,
      };

      expect(QiCore.Utils.isValidDominanceMetrics(dominanceMetrics)).toBe(true);
    });

    it("should support precision calculation patterns", () => {
      const priceResult = QiCore.Utils.parsePrice("123.45");
      expect(priceResult.tag).toBe("success");

      const zeroResult = QiCore.Utils.zero();
      expect(zeroResult.tag).toBe("success");

      const oneResult = QiCore.Utils.one();
      expect(oneResult.tag).toBe("success");
    });

    it("should support error creation patterns", () => {
      const error = QiCore.Utils.createMarketDataError(
        "TEST_ERROR",
        "Test error message",
        "VALIDATION",
        { test: true }
      );

      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test error message");
      expect(error.category).toBe("VALIDATION");
    });
  });

  describe("TypeScript compatibility", () => {
    it("should export types that work with TypeScript", () => {
      // This test verifies that the module structure supports TypeScript usage
      // The types themselves can't be tested at runtime, but we can verify
      // that the exported values have the expected structure

      expect(QiCore.MARKET_TYPES).toBeDefined();
      expect(QiCore.ASSET_CLASSES).toBeDefined();
      expect(QiCore.TIMEFRAMES).toBeDefined();
      expect(QiCore.DEPTH_LEVELS).toBeDefined();
      expect(QiCore.INTERVALS_MS).toBeDefined();
      expect(QiCore.Utils).toBeDefined();
    });

    it("should provide proper namespace structure for imports", () => {
      // Verify that the Utils namespace has the expected structure
      expect(QiCore.Utils).toHaveProperty("isValidDominanceMetrics");
      expect(QiCore.Utils).toHaveProperty("FinancialDecimal");
      expect(QiCore.Utils).toHaveProperty("createMarketDataError");

      // Verify that flattened analytics functions are available
      expect(QiCore.Utils).toHaveProperty("isValidDominanceMetrics");
      expect(QiCore.Utils).toHaveProperty("createAnalyticsMarketData");

      // Verify that flattened precision functions and classes are available
      expect(QiCore.Utils).toHaveProperty("FinancialDecimal");
      expect(QiCore.Utils).toHaveProperty("parsePrice");
    });
  });

  describe("Version and metadata", () => {
    it("should provide access to core functionality", () => {
      // Verify that the main exports are functional
      expect(typeof QiCore.Utils.createMarketDataError).toBe("function");
      expect(typeof QiCore.Utils.isValidDominanceMetrics).toBe("function");
      expect(typeof QiCore.Utils.parsePrice).toBe("function");
    });

    it("should maintain consistent API surface", () => {
      // Check that the main exports don't change unexpectedly
      const mainExports = Object.keys(QiCore).sort();

      // Should include these key exports
      expect(mainExports).toContain("MARKET_TYPES");
      expect(mainExports).toContain("ASSET_CLASSES");
      expect(mainExports).toContain("TIMEFRAMES");
      expect(mainExports).toContain("DEPTH_LEVELS");
      expect(mainExports).toContain("INTERVALS_MS");
      expect(mainExports).toContain("Utils");

      // Should be a reasonable number of exports (not too many, not too few)
      expect(mainExports.length).toBeGreaterThan(5);
      expect(mainExports.length).toBeLessThan(50);
    });
  });
});
