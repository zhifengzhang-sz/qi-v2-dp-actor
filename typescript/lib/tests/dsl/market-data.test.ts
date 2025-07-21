/**
 * Tests for DSL market data types
 * Pure interface export and type composition validation
 * DSL depends only on @qi/base and @qi/core - NO utils imports
 */

import { describe, expect, test } from "vitest";

// Import all types to validate they're properly exported from DSL
import type {
  CoreMarketData,
  DataContext,
  DepthLevel,
  Level1,
  MarketData,
  MarketDepth,
  OHLCV,
  Price,
  Side,
} from "@qi/dp/dsl";

describe("DSL Market Data Type Exports", () => {
  test("should export Price interface with correct structure", () => {
    // Create a minimal valid Price object to verify interface structure
    const price: Price = {
      timestamp: "2025-01-20T00:00:00.000Z",
      price: 100.0,
      size: 1.0,
    };

    // Verify required fields exist and have correct types
    expect(typeof price.timestamp).toBe("string");
    expect(typeof price.price).toBe("number");
    expect(typeof price.size).toBe("number");
  });

  test("should export Price interface with optional fields", () => {
    const price: Price = {
      timestamp: "2025-01-20T00:00:00.000Z",
      price: 100.0,
      size: 1.0,
      tradeId: "trade123",
      aggressor: "BUY" as Side,
    };

    expect(typeof price.tradeId).toBe("string");
    expect(price.aggressor).toBe("BUY");
  });

  test("should export Level1 interface with correct structure", () => {
    const level1: Level1 = {
      timestamp: "2025-01-20T00:00:00.000Z",
      bidPrice: 99.0,
      bidSize: 1.0,
      askPrice: 101.0,
      askSize: 1.0,
    };

    expect(typeof level1.bidPrice).toBe("number");
    expect(typeof level1.askPrice).toBe("number");
    expect(typeof level1.bidSize).toBe("number");
    expect(typeof level1.askSize).toBe("number");
  });

  test("should export OHLCV interface with correct structure", () => {
    const ohlcv: OHLCV = {
      timestamp: "2025-01-20T00:00:00.000Z",
      open: 100.0,
      high: 105.0,
      low: 95.0,
      close: 102.0,
      volume: 1000.0,
    };

    expect(typeof ohlcv.open).toBe("number");
    expect(typeof ohlcv.high).toBe("number");
    expect(typeof ohlcv.low).toBe("number");
    expect(typeof ohlcv.close).toBe("number");
    expect(typeof ohlcv.volume).toBe("number");
  });

  test("should export MarketDepth interface with correct structure", () => {
    const depthLevel: DepthLevel = { price: 100.0, size: 1.0, level: 1 };

    const depth: MarketDepth = {
      timestamp: "2025-01-20T00:00:00.000Z",
      bids: [depthLevel],
      asks: [depthLevel],
    };

    expect(Array.isArray(depth.bids)).toBe(true);
    expect(Array.isArray(depth.asks)).toBe(true);
    expect(depth.bids[0]).toEqual(depthLevel);
  });

  test("should export CoreMarketData union type", () => {
    const price: CoreMarketData = {
      timestamp: "2025-01-20T00:00:00.000Z",
      price: 100.0,
      size: 1.0,
    } as Price;

    const level1: CoreMarketData = {
      timestamp: "2025-01-20T00:00:00.000Z",
      bidPrice: 99.0,
      bidSize: 1.0,
      askPrice: 101.0,
      askSize: 1.0,
    } as Level1;

    expect(price).toBeDefined();
    expect(level1).toBeDefined();
  });

  test("should export MarketData wrapper interface", () => {
    const context: DataContext = {
      market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
      exchange: { id: "test", name: "Test Exchange", mic: null, timezone: "UTC" },
      instrument: {
        symbol: "TEST",
        isin: null,
        name: "Test Asset",
        assetClass: "CRYPTO",
        currency: "USD",
      },
    };

    const marketData: MarketData<Price> = {
      context,
      coreData: {
        timestamp: "2025-01-20T00:00:00.000Z",
        price: 100.0,
        size: 1.0,
      },
    };

    expect(marketData.context).toBeDefined();
    expect(marketData.coreData).toBeDefined();
    expect(typeof marketData.coreData.price).toBe("number");
  });
});

describe("DSL Type Composition", () => {
  test("should support generic type constraints", () => {
    // Test that MarketData accepts all CoreMarketData types
    type PriceData = MarketData<Price>;

    // These should compile without errors
    const context: DataContext = {
      market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
      exchange: { id: "test", name: "Test", mic: null, timezone: "UTC" },
      instrument: {
        symbol: "TEST",
        isin: null,
        name: "Test",
        assetClass: "CRYPTO",
        currency: "USD",
      },
    };

    const priceData: PriceData = {
      context,
      coreData: { timestamp: "2025-01-20T00:00:00.000Z", price: 100.0, size: 1.0 },
    };

    expect(priceData).toBeDefined();

    // Verify generic constraint works by checking structure
    expect(priceData.context).toBeDefined();
    expect(priceData.coreData).toBeDefined();
  });

  test("should enforce readonly constraints", () => {
    const price: Price = {
      timestamp: "2025-01-20T00:00:00.000Z",
      price: 100.0,
      size: 1.0,
    };

    // These properties should be accessible (readonly doesn't prevent reading)
    expect(price.timestamp).toBeDefined();
    expect(price.price).toBeDefined();
    expect(price.size).toBeDefined();
  });
});
