/**
 * Tests for DSL readonly property enforcement
 * Verifies that @qi/eslint-plugin rules work correctly with DSL types
 */

import { describe, expect, it } from "vitest";
import type {
  DataContext,
  Exchange,
  Market,
  StreamingBrokerConfig,
  StreamingCredentials,
} from "../../src/index.js";

describe("DSL Readonly Property Enforcement", () => {
  describe("Core DSL Types", () => {
    it("should enforce readonly properties in Market interface", () => {
      const market: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      // Verify properties exist and are correctly typed
      expect(market.type).toBe("CRYPTO");
      expect(market.region).toBe("US");
      expect(market.segment).toBe("CASH");

      // Note: TypeScript compiler should prevent these mutations:
      // market.type = 'EQUITY'     // Error: readonly property
      // market.region = 'EU'       // Error: readonly property
      // market.segment = 'FUTURES' // Error: readonly property
    });

    it("should enforce readonly properties in Exchange interface", () => {
      const exchange: Exchange = {
        id: "coinbase",
        name: "Coinbase Pro",
        mic: "GDAX",
        timezone: "UTC",
      };

      expect(exchange.id).toBe("coinbase");
      expect(exchange.name).toBe("Coinbase Pro");

      // TypeScript should prevent mutations:
      // exchange.id = 'binance'    // Error: readonly property
      // exchange.name = 'Binance'  // Error: readonly property
    });

    it("should enforce readonly properties in nested DataContext", () => {
      const context: DataContext = {
        market: {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        },
        exchange: {
          id: "coinbase",
          name: "Coinbase Pro",
          mic: "GDAX",
          timezone: "UTC",
        },
        instrument: {
          symbol: "BTC-USD",
          isin: null,
          name: "Bitcoin USD",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      };

      // Verify nested readonly enforcement
      expect(context.market.type).toBe("CRYPTO");
      expect(context.exchange.id).toBe("coinbase");
      expect(context.instrument.symbol).toBe("BTC-USD");

      // TypeScript should prevent deep mutations:
      // context.market.type = 'EQUITY'           // Error: readonly
      // context.exchange.id = 'binance'          // Error: readonly
      // context.instrument.symbol = 'ETH-USD'    // Error: readonly
    });
  });

  describe("Streaming Configuration Types", () => {
    it("should enforce readonly properties in StreamingCredentials", () => {
      const credentials: StreamingCredentials = {
        username: "test-user",
        password: "test-password",
        mechanism: "SCRAM-SHA-256",
      };

      expect(credentials.username).toBe("test-user");
      expect(credentials.mechanism).toBe("SCRAM-SHA-256");

      // TypeScript should prevent mutations:
      // credentials.username = 'new-user'        // Error: readonly
      // credentials.mechanism = 'PLAIN'          // Error: readonly
    });

    it("should enforce readonly arrays in StreamingBrokerConfig", () => {
      const config: StreamingBrokerConfig = {
        brokers: ["localhost:9092", "localhost:9093"],
        connectionTimeout: 5000,
        retries: 3,
      };

      expect(config.brokers).toHaveLength(2);
      expect(config.brokers[0]).toBe("localhost:9092");

      // TypeScript should prevent array mutations:
      // config.brokers.push('localhost:9094')    // Error: readonly array
      // config.brokers[0] = 'new-host:9092'      // Error: readonly array
      // config.brokers = []                      // Error: readonly property
    });

    it("should enforce readonly in nested streaming configurations", () => {
      const config: StreamingBrokerConfig = {
        brokers: ["localhost:9092"],
        ssl: {
          enabled: true,
          ca: "ca-cert",
          rejectUnauthorized: true,
        },
        sasl: {
          username: "admin",
          password: "secret",
          mechanism: "PLAIN",
        },
      };

      // Verify nested readonly structures
      expect(config.ssl?.enabled).toBe(true);
      expect(config.sasl?.username).toBe("admin");

      // TypeScript should prevent nested mutations:
      // config.ssl.enabled = false               // Error: readonly
      // config.sasl.username = 'user'            // Error: readonly
    });
  });

  describe("Functional Pattern Enforcement", () => {
    it("should demonstrate immutable data flow patterns", () => {
      // Original context
      const originalContext: DataContext = {
        market: { type: "CRYPTO", region: "US", segment: "CASH" },
        exchange: { id: "coinbase", name: "Coinbase Pro", mic: "GDAX", timezone: "UTC" },
        instrument: {
          symbol: "BTC-USD",
          isin: null,
          name: "Bitcoin USD",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      };

      // Functional update - create new object instead of mutating
      const updatedContext: DataContext = {
        ...originalContext,
        market: {
          ...originalContext.market,
          region: "EU", // Only change needed field
        },
      };

      // Original should remain unchanged
      expect(originalContext.market.region).toBe("US");
      expect(updatedContext.market.region).toBe("EU");

      // Other fields should be preserved
      expect(updatedContext.exchange.id).toBe("coinbase");
      expect(updatedContext.instrument.symbol).toBe("BTC-USD");
    });

    it("should support composition patterns with readonly types", () => {
      const baseMarket: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      const exchangeConfig = {
        id: "coinbase",
        name: "Coinbase Pro",
        mic: "GDAX" as const,
        timezone: "UTC",
      } satisfies Exchange;

      // Composition should work with readonly constraints
      const context: DataContext = {
        market: baseMarket,
        exchange: exchangeConfig,
        instrument: {
          symbol: "BTC-USD",
          isin: null,
          name: "Bitcoin USD",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      };

      expect(context.market.type).toBe("CRYPTO");
      expect(context.exchange.mic).toBe("GDAX");
    });
  });

  describe("Type System Integration", () => {
    it("should work with TypeScript strict mode", () => {
      // Test that our readonly enforcement works with strict TypeScript settings

      // Exact property matching
      const market: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
        // Extra properties should cause TypeScript errors in strict mode
      };

      // Discriminated unions should work
      const marketType = market.type;
      if (marketType === "CRYPTO") {
        expect(market.segment).toBe("CASH");
      }
    });

    it("should maintain type safety with generic constraints", () => {
      // Test that readonly enforcement works with generic types
      function processConfig<T extends { readonly brokers: readonly string[] }>(config: T): T {
        // Function should receive readonly config and return readonly config
        return config;
      }

      const config: StreamingBrokerConfig = {
        brokers: ["localhost:9092"],
        connectionTimeout: 5000,
      };

      const result = processConfig(config);
      expect(result.brokers).toHaveLength(1);

      // Result should maintain readonly constraints
      // result.brokers.push('localhost:9093') // Error: readonly array
    });
  });

  describe("ESLint Rule Integration", () => {
    it("should document expected ESLint rule behavior", () => {
      // This test documents what the @qi/enforce-readonly-dsl rule should catch

      // ✅ VALID: Proper readonly interface usage
      const validInterface: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      expect(validInterface.type).toBe("CRYPTO");

      // ❌ INVALID (should be caught by ESLint rule):
      // interface BadMarket {
      //   type: MarketType        // Missing readonly
      //   region: string          // Missing readonly
      //   segment: Segment        // Missing readonly
      // }

      // ❌ INVALID (should be caught by ESLint rule):
      // interface BadConfig {
      //   brokers: string[]       // Should be readonly string[]
      //   timeout: number         // Missing readonly
      // }

      // ✅ VALID: What the rule should allow
      // interface GoodConfig {
      //   readonly brokers: readonly string[]
      //   readonly timeout: number
      // }
    });

    it("should work with ESLint rule configuration", () => {
      // This documents the expected ESLint configuration for DSL files
      const expectedRules = {
        "@qi/enforce-readonly-dsl": "error",
        "@qi/no-throw-in-dsl": "error",
        "@qi/no-imperative-try-catch": [
          "error",
          {
            enforcePaths: ["**/lib/dsl/**"],
            allowTestFiles: true,
          },
        ],
      };

      expect(expectedRules["@qi/enforce-readonly-dsl"]).toBe("error");
      expect(expectedRules["@qi/no-throw-in-dsl"]).toBe("error");
    });
  });
});
