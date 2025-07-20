/**
 * Unit tests for DSL types and type guards
 * Tests all core types, interfaces, and type validation functions
 */

import { describe, expect, it, test } from "vitest";
// Import types from DSL
import type {
  AssetClass,
  ContextQuery,
  DataContext,
  DateRange,
  DepthLevel,
  Exchange,
  Instrument,
  Market,
  MarketType,
  Side,
} from "../../src/dsl/index.js";

// Import validation functions from utils
import {
  isValidAssetClass,
  isValidContextQuery,
  isValidDataContext,
  isValidDateRange,
  isValidDepthLevel,
  isValidExchange,
  isValidInstrument,
  isValidLevels,
  isValidMarket,
  isValidMarketType,
  isValidSide,
  isValidTimeframe,
} from "../../src/utils/index.js";

// Import analytics types and validation from utils
import {
  type ChangeMetrics,
  type DominanceMetrics,
  type VolatilityMetrics,
  isValidChangeMetrics,
  isValidDominanceMetrics,
  isValidVolatilityMetrics,
} from "../../src/utils/marketdata-analytics.js";

describe("DSL Types - Enum Type Guards", () => {
  describe("AssetClass", () => {
    it("should validate valid asset classes", () => {
      const validAssetClasses: AssetClass[] = [
        "STOCK",
        "CRYPTO",
        "CURRENCY",
        "COMMODITY",
        "BOND",
        "INDEX",
      ];

      for (const assetClass of validAssetClasses) {
        expect(isValidAssetClass(assetClass)).toBe(true);
      }
    });

    it("should reject invalid asset classes", () => {
      const invalidValues = ["INVALID", "", null, undefined, 123, {}, [], "stock", "Crypto"];

      for (const value of invalidValues) {
        expect(isValidAssetClass(value)).toBe(false);
      }
    });
  });

  describe("MarketType", () => {
    it("should validate valid market types", () => {
      const validMarketTypes: MarketType[] = [
        "EQUITY",
        "CRYPTO",
        "FOREX",
        "COMMODITY",
        "BOND",
        "DERIVATIVE",
      ];

      for (const marketType of validMarketTypes) {
        expect(isValidMarketType(marketType)).toBe(true);
      }
    });

    it("should reject invalid market types", () => {
      const invalidValues = ["INVALID", "", null, undefined, 123, {}, [], "equity", "Crypto"];

      for (const value of invalidValues) {
        expect(isValidMarketType(value)).toBe(false);
      }
    });
  });

  describe("Side", () => {
    it("should validate valid sides", () => {
      const validSides: Side[] = ["BUY", "SELL"];

      for (const side of validSides) {
        expect(isValidSide(side)).toBe(true);
      }
    });

    it("should reject invalid sides", () => {
      const invalidValues = [
        "INVALID",
        "",
        null,
        undefined,
        123,
        {},
        [],
        "buy",
        "Sell",
        "BID",
        "ASK",
      ];

      for (const value of invalidValues) {
        expect(isValidSide(value)).toBe(false);
      }
    });
  });

  describe("Timeframe", () => {
    it("should validate valid timeframes", () => {
      const validTimeframes = ["1s", "5s", "1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M", "1Y"];

      for (const timeframe of validTimeframes) {
        expect(isValidTimeframe(timeframe)).toBe(true);
      }
    });

    it("should reject invalid timeframes", () => {
      const invalidValues = ["", "1", "s", "m1", "1x", "1 m", null, undefined, 123, {}];

      for (const value of invalidValues) {
        expect(isValidTimeframe(value)).toBe(false);
      }
    });
  });

  describe("Levels", () => {
    it("should validate valid levels", () => {
      const validLevels = [1, 5, 10, 50, 100, 500, 1000];

      for (const level of validLevels) {
        expect(isValidLevels(level)).toBe(true);
      }
    });

    it("should reject invalid levels", () => {
      const invalidValues = [
        0,
        -1,
        1001,
        1.5,
        "10",
        null,
        undefined,
        {},
        Number.POSITIVE_INFINITY,
        Number.NaN,
      ];

      for (const value of invalidValues) {
        expect(isValidLevels(value)).toBe(false);
      }
    });
  });
});

describe("DSL Types - Complex Object Type Guards", () => {
  describe("DateRange", () => {
    it("should validate valid date ranges", () => {
      const startDate = "2024-01-01T00:00:00.000Z";
      const endDate = "2024-12-31T23:59:59.999Z";
      const validDateRange: DateRange = { startDate, endDate };

      expect(isValidDateRange(validDateRange)).toBe(true);
    });

    it("should validate same start and end dates", () => {
      const date = "2024-06-15T12:00:00.000Z";
      const sameDateRange: DateRange = { startDate: date, endDate: date };

      expect(isValidDateRange(sameDateRange)).toBe(true);
    });

    it("should reject invalid date ranges", () => {
      const startDate = "2024-12-31T23:59:59.999Z";
      const endDate = "2024-01-01T00:00:00.000Z";
      const invalidDateRange = { startDate, endDate }; // end before start

      expect(isValidDateRange(invalidDateRange)).toBe(false);
    });

    it("should reject malformed date range objects", () => {
      const invalidValues = [
        null,
        undefined,
        {},
        { startDate: "2024-01-01" }, // string instead of Date
        { endDate: new Date() },
        { startDate: new Date(), endDate: "invalid" },
        { startDate: null, endDate: new Date() },
      ];

      for (const value of invalidValues) {
        expect(isValidDateRange(value)).toBe(false);
      }
    });
  });

  describe("Market", () => {
    it("should validate valid markets", () => {
      const validMarkets: Market[] = [
        { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
        { type: "EQUITY", region: "US", segment: "FUTURES" },
        { type: "FOREX", region: "EU", segment: "OPTIONS" },
      ];

      for (const market of validMarkets) {
        expect(isValidMarket(market)).toBe(true);
      }
    });

    it("should reject invalid markets", () => {
      const invalidMarkets = [
        null,
        undefined,
        {},
        { type: "INVALID", region: "US", segment: "CASH" },
        { type: "CRYPTO", region: "USA", segment: "CASH" }, // 3-letter region
        { type: "CRYPTO", region: "US", segment: "INVALID" },
        { type: "CRYPTO", region: "us", segment: "CASH" }, // lowercase
        { type: "CRYPTO", region: "", segment: "CASH" },
      ];

      for (const market of invalidMarkets) {
        expect(isValidMarket(market)).toBe(false);
      }
    });
  });

  describe("Exchange", () => {
    it("should validate valid exchanges", () => {
      const validExchanges: Exchange[] = [
        { id: "binance", name: "Binance", mic: "BINA", timezone: "UTC" },
        { id: "coinbase", name: "Coinbase", mic: null, timezone: "America/New_York" },
        { id: "nasdaq", name: "NASDAQ", mic: "XNAS", timezone: "America/New_York" },
      ];

      for (const exchange of validExchanges) {
        expect(isValidExchange(exchange)).toBe(true);
      }
    });

    it("should reject invalid exchanges", () => {
      const invalidExchanges = [
        null,
        undefined,
        {},
        { id: "", name: "Valid", mic: null, timezone: "UTC" }, // empty id
        { id: "valid", name: "", mic: null, timezone: "UTC" }, // empty name
        { id: "valid", name: "Valid", mic: "TOO_LONG", timezone: "UTC" }, // invalid MIC
        { id: "valid", name: "Valid", mic: "abc", timezone: "UTC" }, // lowercase MIC
        { id: "valid", name: "Valid", mic: null, timezone: "InvalidTimezone" }, // invalid timezone
        { id: "valid", name: "Valid", mic: null, timezone: "" }, // empty timezone
      ];

      for (const exchange of invalidExchanges) {
        expect(isValidExchange(exchange)).toBe(false);
      }
    });
  });

  describe("Instrument", () => {
    it("should validate valid instruments", () => {
      const validInstruments: Instrument[] = [
        {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin USD",
          assetClass: "CRYPTO",
          currency: "USD",
        },
        {
          symbol: "AAPL",
          isin: "US0378331005",
          name: "Apple Inc.",
          assetClass: "STOCK",
          currency: "USD",
        },
        {
          symbol: "EUR/USD",
          isin: null,
          name: "Euro US Dollar",
          assetClass: "CURRENCY",
          currency: "USD",
        },
      ];

      for (const instrument of validInstruments) {
        expect(isValidInstrument(instrument)).toBe(true);
      }
    });

    it("should reject invalid instruments", () => {
      const invalidInstruments = [
        null,
        undefined,
        {},
        { symbol: "", isin: null, name: "Valid", assetClass: "CRYPTO", currency: "USD" }, // empty symbol
        { symbol: "BTC", isin: null, name: "", assetClass: "CRYPTO", currency: "USD" }, // empty name
        { symbol: "BTC", isin: null, name: "Bitcoin", assetClass: "INVALID", currency: "USD" }, // invalid asset class
        { symbol: "BTC", isin: null, name: "Bitcoin", assetClass: "CRYPTO", currency: "INVALID" }, // invalid currency
        {
          symbol: "BTC",
          isin: "INVALID_ISIN",
          name: "Bitcoin",
          assetClass: "CRYPTO",
          currency: "USD",
        }, // invalid ISIN
        { symbol: "BTC", isin: null, name: "Bitcoin", assetClass: "CRYPTO", currency: "usd" }, // lowercase currency
      ];

      for (const instrument of invalidInstruments) {
        expect(isValidInstrument(instrument)).toBe(false);
      }
    });
  });

  describe("DataContext", () => {
    const validMarket: Market = { type: "CRYPTO", region: "GLOBAL", segment: "CASH" };
    const validExchange: Exchange = { id: "binance", name: "Binance", mic: null, timezone: "UTC" };
    const validInstrument: Instrument = {
      symbol: "BTC/USD",
      isin: null,
      name: "Bitcoin USD",
      assetClass: "CRYPTO",
      currency: "USD",
    };

    it("should validate valid data contexts", () => {
      const validContext: DataContext = {
        market: validMarket,
        exchange: validExchange,
        instrument: validInstrument,
      };

      expect(isValidDataContext(validContext)).toBe(true);
    });

    it("should reject invalid data contexts", () => {
      const invalidContexts = [
        null,
        undefined,
        {},
        { market: validMarket, exchange: validExchange }, // missing instrument
        { market: validMarket, instrument: validInstrument }, // missing exchange
        { exchange: validExchange, instrument: validInstrument }, // missing market
        { market: {}, exchange: validExchange, instrument: validInstrument }, // invalid market
        { market: validMarket, exchange: {}, instrument: validInstrument }, // invalid exchange
        { market: validMarket, exchange: validExchange, instrument: {} }, // invalid instrument
      ];

      for (const context of invalidContexts) {
        expect(isValidDataContext(context)).toBe(false);
      }
    });
  });

  describe("ContextQuery", () => {
    it("should validate valid context queries", () => {
      const validQueries: ContextQuery[] = [
        {
          marketType: "CRYPTO",
          exchangeId: "binance",
          assetClass: "CRYPTO",
          symbol: "BTC/USD",
          region: "GLOBAL",
        },
        { marketType: null, exchangeId: null, assetClass: null, symbol: null, region: null }, // all null query
        { marketType: "EQUITY", exchangeId: null, assetClass: "STOCK", symbol: null, region: "US" }, // partial query
      ];

      for (const query of validQueries) {
        expect(isValidContextQuery(query)).toBe(true);
      }
    });

    it("should reject invalid context queries", () => {
      const invalidQueries = [
        null,
        undefined,
        {},
        { marketType: "INVALID", exchangeId: null, assetClass: null, symbol: null, region: null },
        { marketType: null, exchangeId: null, assetClass: "INVALID", symbol: null, region: null },
        { marketType: null, exchangeId: 123, assetClass: null, symbol: null, region: null }, // number instead of string
      ];

      for (const query of invalidQueries) {
        expect(isValidContextQuery(query)).toBe(false);
      }
    });
  });
});

describe("DSL Types - Analytics Support Types", () => {
  describe("DepthLevel", () => {
    it("should validate valid depth levels", () => {
      const validDepthLevels: DepthLevel[] = [
        { price: 50000, size: 1.5, level: 1 },
        { price: 49999, size: 0, level: 2 }, // zero size is valid
        { price: 0.000001, size: 1000000, level: 10 }, // very small price, large size
      ];

      for (const depthLevel of validDepthLevels) {
        expect(isValidDepthLevel(depthLevel)).toBe(true);
      }
    });

    it("should reject invalid depth levels", () => {
      const invalidDepthLevels = [
        null,
        undefined,
        {},
        { price: 0, size: 1, level: 1 }, // zero price
        { price: -100, size: 1, level: 1 }, // negative price
        { price: 100, size: -1, level: 1 }, // negative size
        { price: 100, size: 1, level: 0 }, // zero level
        { price: 100, size: 1, level: -1 }, // negative level
        { price: 100, size: 1, level: 1.5 }, // non-integer level
        { price: Number.POSITIVE_INFINITY, size: 1, level: 1 }, // infinite price
        { price: Number.NaN, size: 1, level: 1 }, // NaN price
      ];

      for (const depthLevel of invalidDepthLevels) {
        expect(isValidDepthLevel(depthLevel)).toBe(false);
      }
    });
  });

  describe("DominanceMetrics", () => {
    it("should validate valid dominance metrics", () => {
      const validMetrics: DominanceMetrics[] = [
        {
          topInstrumentShare: 45.5,
          top5InstrumentShare: 78.2,
          top10InstrumentShare: 89.9,
          exchangeConcentration: 0.15,
        },
        {
          topInstrumentShare: 0,
          top5InstrumentShare: 0,
          top10InstrumentShare: 0,
          exchangeConcentration: 0,
        }, // zero values
        {
          topInstrumentShare: 100,
          top5InstrumentShare: 100,
          top10InstrumentShare: 100,
          exchangeConcentration: 1.0,
        }, // max values
      ];

      for (const metrics of validMetrics) {
        expect(isValidDominanceMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid dominance metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        {
          topInstrumentShare: -1,
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: 0.5,
        }, // negative value
        {
          topInstrumentShare: 101,
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: 0.5,
        }, // over 100%
        {
          topInstrumentShare: 50,
          top5InstrumentShare: 101,
          top10InstrumentShare: 75,
          exchangeConcentration: 0.5,
        },
        {
          topInstrumentShare: 50,
          top5InstrumentShare: 75,
          top10InstrumentShare: 101,
          exchangeConcentration: 0.5,
        },
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidDominanceMetrics(metrics)).toBe(false);
      }
    });
  });

  describe("ChangeMetrics", () => {
    it("should validate valid change metrics", () => {
      const validMetrics: ChangeMetrics[] = [
        { change1h: 2.5, change24h: -5.1, change7d: 15.8, change30d: -12.3 },
        { change1h: 0, change24h: 0, change7d: 0, change30d: 0 }, // zero changes
        { change1h: -100, change24h: 500, change7d: -50, change30d: 1000 }, // extreme values
      ];

      for (const metrics of validMetrics) {
        expect(isValidChangeMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid change metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        { change1h: Number.POSITIVE_INFINITY, change24h: 0, change7d: 0, change30d: 0 }, // infinite value
        { change1h: Number.NaN, change24h: 0, change7d: 0, change30d: 0 }, // NaN value
        { change1h: "5.5", change24h: 0, change7d: 0, change30d: 0 }, // string instead of number
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidChangeMetrics(metrics)).toBe(false);
      }
    });
  });

  describe("VolatilityMetrics", () => {
    it("should validate valid volatility metrics", () => {
      const validMetrics: VolatilityMetrics[] = [
        { volatility24h: 15.5, volatility7d: 22.1, volatility30d: 18.7 },
        { volatility24h: 0, volatility7d: 0, volatility30d: 0 }, // zero volatility
        { volatility24h: 100, volatility7d: 150, volatility30d: 200 }, // high volatility
      ];

      for (const metrics of validMetrics) {
        expect(isValidVolatilityMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid volatility metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        { volatility24h: -5, volatility7d: 10, volatility30d: 15 }, // negative volatility
        { volatility24h: Number.POSITIVE_INFINITY, volatility7d: 10, volatility30d: 15 }, // infinite value
        { volatility24h: Number.NaN, volatility7d: 10, volatility30d: 15 }, // NaN value
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidVolatilityMetrics(metrics)).toBe(false);
      }
    });
  });
});

describe("DSL Types - Type System Integration", () => {
  test("type guards should work with TypeScript type narrowing", () => {
    const unknownValue: unknown = "CRYPTO";

    if (isValidAssetClass(unknownValue)) {
      // TypeScript should know this is AssetClass now
      const assetClass: AssetClass = unknownValue;
      expect(assetClass).toBe("CRYPTO");
    } else {
      throw new Error("Should have validated as AssetClass");
    }
  });

  test("should handle edge cases with type coercion", () => {
    // Test that type guards don't fall for type coercion tricks
    expect(isValidLevels("10" as any)).toBe(false); // string '10' should not validate as number
    expect(isValidSide(0 as any)).toBe(false); // falsy number should not validate as string
    expect(isValidMarketType(true as any)).toBe(false); // boolean should not validate as string
  });
});
