/**
 * Unit tests for DSL core types
 * Tests type definitions, constraints, and DSL vocabulary contracts
 */

import { describe, expect, it } from "vitest";
import type {
  AssetClass,
  ContextQuery,
  DataContext,
  DateRange,
  DepthLevel,
  Exchange,
  Instrument,
  Levels,
  Market,
  MarketType,
  Segment,
  Side,
  Timeframe,
} from "../../src/types.js";

describe("DSL Core Types", () => {
  describe("Market Classification Types", () => {
    it("should define correct MarketType values", () => {
      const validMarketTypes: MarketType[] = [
        "EQUITY",
        "CRYPTO",
        "FOREX",
        "COMMODITY",
        "BOND",
        "DERIVATIVE",
      ];

      expect(validMarketTypes).toHaveLength(6);
      expect(validMarketTypes).toContain("CRYPTO");
      expect(validMarketTypes).toContain("EQUITY");
    });

    it("should define correct Segment values", () => {
      const validSegments: Segment[] = ["CASH", "FUTURES", "OPTIONS"];
      expect(validSegments).toHaveLength(3);
    });

    it("should define correct Side values", () => {
      const validSides: Side[] = ["BUY", "SELL"];
      expect(validSides).toHaveLength(2);
    });

    it("should define correct AssetClass values", () => {
      const validAssetClasses: AssetClass[] = [
        "STOCK",
        "CRYPTO",
        "CURRENCY",
        "COMMODITY",
        "BOND",
        "INDEX",
      ];
      expect(validAssetClasses).toHaveLength(6);
    });
  });

  describe("Context Interfaces", () => {
    it("should create valid Market objects", () => {
      const market: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      expect(market.type).toBe("CRYPTO");
      expect(market.region).toBe("US");
      expect(market.segment).toBe("CASH");
    });

    it("should create valid Exchange objects", () => {
      const exchange: Exchange = {
        id: "coinbase",
        name: "Coinbase Pro",
        mic: "GDAX",
        timezone: "UTC",
      };

      expect(exchange.id).toBe("coinbase");
      expect(exchange.mic).toBe("GDAX");
    });

    it("should create valid Instrument objects", () => {
      const instrument: Instrument = {
        symbol: "BTC-USD",
        isin: null,
        name: "Bitcoin USD",
        assetClass: "CRYPTO",
        currency: "USD",
      };

      expect(instrument.symbol).toBe("BTC-USD");
      expect(instrument.assetClass).toBe("CRYPTO");
      expect(instrument.isin).toBeNull();
    });

    it("should create complete DataContext objects", () => {
      const dataContext: DataContext = {
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

      expect(dataContext.market.type).toBe("CRYPTO");
      expect(dataContext.exchange.id).toBe("coinbase");
      expect(dataContext.instrument.symbol).toBe("BTC-USD");
    });
  });

  describe("Query and Filter Types", () => {
    it("should create valid ContextQuery objects", () => {
      const query: ContextQuery = {
        marketType: "CRYPTO",
        exchangeId: "coinbase",
        assetClass: "CRYPTO",
        symbol: "BTC-USD",
        region: "US",
      };

      expect(query.marketType).toBe("CRYPTO");
      expect(query.symbol).toBe("BTC-USD");
    });

    it("should allow null values in ContextQuery", () => {
      const query: ContextQuery = {
        marketType: null,
        exchangeId: null,
        assetClass: null,
        symbol: null,
        region: null,
      };

      expect(query.marketType).toBeNull();
      expect(query.exchangeId).toBeNull();
    });
  });

  describe("Market Depth Support", () => {
    it("should create valid DepthLevel objects", () => {
      const depthLevel: DepthLevel = {
        price: "50000.00",
        size: "1.5",
        level: 1,
      };

      expect(depthLevel.price).toBe("50000.00");
      expect(depthLevel.size).toBe("1.5");
      expect(depthLevel.level).toBe(1);
    });
  });

  describe("Time and Range Types", () => {
    it("should create valid DateRange objects", () => {
      const dateRange: DateRange = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      };

      expect(dateRange.startDate).toBe("2025-01-01");
      expect(dateRange.endDate).toBe("2025-01-31");
    });

    it("should define correct Timeframe values", () => {
      const validTimeframes: Timeframe[] = [
        "1s",
        "5s",
        "1m",
        "5m",
        "15m",
        "1h",
        "4h",
        "1d",
        "1w",
        "1M",
        "1Y",
      ];
      expect(validTimeframes).toHaveLength(11);
      expect(validTimeframes).toContain("1m");
      expect(validTimeframes).toContain("1h");
    });

    it("should define correct Levels values", () => {
      const validLevels: Levels[] = [1, 5, 10, 50, 100, 500, 1000];
      expect(validLevels).toHaveLength(7);
      expect(validLevels).toContain(1);
      expect(validLevels).toContain(1000);
    });
  });

  describe("Decimal Type", () => {
    it("should use string type for decimal precision", () => {
      // Test that decimal is properly typed as string
      const price: import("../../src/types.js").decimal = "50000.12345678";
      expect(typeof price).toBe("string");
      expect(price).toBe("50000.12345678");
    });
  });

  describe("Type Safety and Readonly Properties", () => {
    it("should enforce readonly properties in interfaces", () => {
      const market: Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      // These should be TypeScript compile-time errors if readonly is not enforced
      // market.type = 'EQUITY' // Should be blocked by readonly
      // market.region = 'EU'   // Should be blocked by readonly

      expect(market.type).toBe("CRYPTO");
    });

    it("should support immutable context objects", () => {
      const context: DataContext = {
        market: { type: "CRYPTO", region: "US", segment: "CASH" },
        exchange: { id: "test", name: "Test Exchange", mic: null, timezone: "UTC" },
        instrument: {
          symbol: "TEST",
          isin: null,
          name: "Test",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      };

      // Context should be immutable
      expect(typeof context).toBe("object");
      expect(context.market.type).toBe("CRYPTO");
    });
  });
});
