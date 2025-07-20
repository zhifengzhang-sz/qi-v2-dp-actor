/**
 * Unit tests for DSL market data types and validation
 * Tests all core market data types with FIX Protocol compliance
 */

import { describe, expect, it, test } from "vitest";
// Import types from DSL
import type {
  CoreMarketData,
  DataContext,
  DepthLevel,
  Exchange,
  Instrument,
  Level1,
  Market,
  MarketData,
  MarketDepth,
  OHLCV,
  Price,
} from "../../src/dsl/index.js";

// Import validation functions from utils
import {
  isValidCoreMarketData,
  isValidLevel1,
  isValidMarketData,
  isValidMarketDepth,
  isValidMarketDepthOrdering,
  isValidOHLCV,
  isValidOHLCVIntegrity,
  isValidPrice,
  isValidTimestamp,
} from "../../src/utils/index.js";

// Import analytics types and validation from utils
import {
  type MarketAnalytics,
  isValidMarketAnalytics,
} from "../../src/utils/marketdata-analytics.js";

// Test fixtures
const createValidDataContext = (): DataContext => ({
  market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
  exchange: { id: "binance", name: "Binance", mic: null, timezone: "UTC" },
  instrument: {
    symbol: "BTC/USD",
    isin: null,
    name: "Bitcoin USD",
    assetClass: "CRYPTO",
    currency: "USD",
  },
});

const createValidDepthLevel = (price: number, size: number, level: number): DepthLevel => ({
  price,
  size,
  level,
});

describe("DSL Market Data - Price Type", () => {
  it("should validate valid price data", () => {
    const validPrices: Price[] = [
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000.99,
        size: 1.5,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000.99,
        size: 1.5,
        tradeId: "trade-123",
        aggressor: "BUY",
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 0.000001, // very small price
        size: 1000000, // large size
      },
    ];

    for (const price of validPrices) {
      expect(isValidPrice(price)).toBe(true);
    }
  });

  it("should reject invalid price data", () => {
    const invalidPrices = [
      null,
      undefined,
      {},
      // Invalid timestamp
      { timestamp: "invalid", price: 100, size: 1 },
      { timestamp: null, price: 100, size: 1 },
      // Invalid price
      { timestamp: "2024-01-15T10:30:00.000Z", price: 0, size: 1 }, // zero price
      { timestamp: "2024-01-15T10:30:00.000Z", price: -100, size: 1 }, // negative price
      { timestamp: "2024-01-15T10:30:00.000Z", price: Number.POSITIVE_INFINITY, size: 1 }, // infinite price
      { timestamp: "2024-01-15T10:30:00.000Z", price: Number.NaN, size: 1 }, // NaN price
      { timestamp: "2024-01-15T10:30:00.000Z", price: "100", size: 1 }, // string price
      // Invalid size
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: 0 }, // zero size
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: -1 }, // negative size
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: Number.POSITIVE_INFINITY }, // infinite size
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: Number.NaN }, // NaN size
      // Invalid optional fields
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: 1, tradeId: 123 }, // non-string tradeId
      { timestamp: "2024-01-15T10:30:00.000Z", price: 100, size: 1, aggressor: "INVALID" }, // invalid aggressor
    ];

    for (const price of invalidPrices) {
      expect(isValidPrice(price)).toBe(false);
    }
  });

  it("should validate FIX Protocol compliance fields", () => {
    const fixCompliantPrice: Price = {
      timestamp: "2024-01-15T10:30:00.000Z", // FIX Tag 273 (MDEntryTime)
      price: 50000.99, // FIX Tag 270 (MDEntryPrice)
      size: 1.5, // FIX Tag 271 (MDEntrySize)
      tradeId: "T123456", // FIX Tag 1003 (TradeID)
      aggressor: "BUY", // FIX Tag 54 (Side)
    };

    expect(isValidPrice(fixCompliantPrice)).toBe(true);
  });
});

describe("DSL Market Data - Level1 Type", () => {
  it("should validate valid Level1 data", () => {
    const validLevel1Data: Level1[] = [
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 49999.5,
        bidSize: 2.1,
        askPrice: 50000.5,
        askSize: 1.8,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 49999.5,
        bidSize: 2.1,
        askPrice: 49999.5, // same as bid (no spread)
        askSize: 1.8,
        quoteId: "quote-123",
        bidTime: "2024-01-15T10:29:58.000Z",
        askTime: "2024-01-15T10:29:59.000Z",
      },
    ];

    for (const level1 of validLevel1Data) {
      expect(isValidLevel1(level1)).toBe(true);
    }
  });

  it("should reject invalid Level1 data", () => {
    const invalidLevel1Data = [
      null,
      undefined,
      {},
      // Missing required fields
      { timestamp: "2024-01-15T10:30:00.000Z", bidPrice: 100, bidSize: 1 }, // missing ask fields
      { timestamp: "2024-01-15T10:30:00.000Z", askPrice: 101, askSize: 1 }, // missing bid fields
      // Invalid prices (zero, negative, infinite, NaN)
      { timestamp: "2024-01-15T10:30:00.000Z", bidPrice: 0, bidSize: 1, askPrice: 101, askSize: 1 },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: -100,
        bidSize: 1,
        askPrice: 101,
        askSize: 1,
      },
      { timestamp: "2024-01-15T10:30:00.000Z", bidPrice: 100, bidSize: 1, askPrice: 0, askSize: 1 },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: -101,
        askSize: 1,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: Number.POSITIVE_INFINITY,
        bidSize: 1,
        askPrice: 101,
        askSize: 1,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: Number.NaN,
        askSize: 1,
      },
      // Invalid sizes (zero, negative, infinite, NaN)
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 0,
        askPrice: 101,
        askSize: 1,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: -1,
        askPrice: 101,
        askSize: 1,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: 101,
        askSize: 0,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: 101,
        askSize: -1,
      },
      // Crossed market (ask < bid)
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 101,
        bidSize: 1,
        askPrice: 100,
        askSize: 1,
      },
      // Invalid optional fields
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: 101,
        askSize: 1,
        quoteId: 123,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 100,
        bidSize: 1,
        askPrice: 101,
        askSize: 1,
        bidTime: "invalid",
      },
    ];

    for (const level1 of invalidLevel1Data) {
      expect(isValidLevel1(level1)).toBe(false);
    }
  });

  it("should validate FIX Protocol compliance for Level1", () => {
    const fixCompliantLevel1: Level1 = {
      timestamp: "2024-01-15T10:30:00.000Z", // FIX Tag 273 (MDEntryTime)
      bidPrice: 49999.5, // FIX Tag 270 + MDEntryType=0
      bidSize: 2.1, // FIX Tag 271 + MDEntryType=0
      askPrice: 50000.5, // FIX Tag 270 + MDEntryType=1
      askSize: 1.8, // FIX Tag 271 + MDEntryType=1
      quoteId: "Q123456", // FIX Tag 117 (QuoteID)
      bidTime: "2024-01-15T10:29:58.000Z", // FIX Tag 273 for bid specifically
      askTime: "2024-01-15T10:29:59.000Z", // FIX Tag 273 for ask specifically
    };

    expect(isValidLevel1(fixCompliantLevel1)).toBe(true);
  });
});

describe("DSL Market Data - OHLCV Type", () => {
  it("should validate valid OHLCV data", () => {
    const validOHLCVData: OHLCV[] = [
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 49500,
        high: 50500,
        low: 49000,
        close: 50200,
        volume: 150.5,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 50000,
        high: 50000, // same as open/close (no movement)
        low: 50000,
        close: 50000,
        volume: 0, // zero volume is valid
        baseVolume: 100.5,
        quoteVolume: 5000000,
        tradeCount: 1250,
        weightedAveragePrice: 50125.75,
      },
    ];

    for (const ohlcv of validOHLCVData) {
      expect(isValidOHLCV(ohlcv)).toBe(true);
    }
  });

  it("should reject invalid OHLCV data", () => {
    const invalidOHLCVData = [
      null,
      undefined,
      {},
      // Missing required fields
      { timestamp: "2024-01-15T10:00:00.000Z", open: 100, high: 105, low: 95 }, // missing close, volume
      // Invalid prices (zero, negative, infinite, NaN)
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 0,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: -100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 0,
        low: 95,
        close: 100,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 0,
        close: 100,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 0,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: Number.POSITIVE_INFINITY,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: Number.NaN,
        low: 95,
        close: 100,
        volume: 10,
      },
      // Invalid volume (negative, infinite, NaN)
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: -10,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: Number.POSITIVE_INFINITY,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: Number.NaN,
      },
      // Invalid OHLC relationships
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 95,
        low: 90,
        close: 98,
        volume: 10,
      }, // high < open
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 102,
        close: 98,
        volume: 10,
      }, // low > open
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 98,
        low: 95,
        close: 99,
        volume: 10,
      }, // high < close
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 102,
        close: 98,
        volume: 10,
      }, // low > close
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 95,
        low: 90,
        close: 92,
        volume: 10,
      }, // high < low
      // Invalid optional fields
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
        baseVolume: -5,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
        tradeCount: -1,
      },
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
        tradeCount: 1.5,
      }, // non-integer
      {
        timestamp: "2024-01-15T10:00:00.000Z",
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10,
        weightedAveragePrice: 0,
      },
    ];

    for (const ohlcv of invalidOHLCVData) {
      expect(isValidOHLCV(ohlcv)).toBe(false);
    }
  });

  it("should validate OHLCV integrity separately", () => {
    const validOHLCV: OHLCV = {
      timestamp: "2024-01-15T10:00:00.000Z",
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
    };

    const invalidOHLCV: OHLCV = {
      timestamp: "2024-01-15T10:00:00.000Z",
      open: 100,
      high: 95, // high < open (violates integrity)
      low: 90,
      close: 98,
      volume: 1000,
    };

    expect(isValidOHLCVIntegrity(validOHLCV)).toBe(true);
    expect(isValidOHLCVIntegrity(invalidOHLCV)).toBe(false);
  });
});

describe("DSL Market Data - MarketDepth Type", () => {
  it("should validate valid market depth data", () => {
    const validMarketDepth: MarketDepth[] = [
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bids: [
          createValidDepthLevel(49999.5, 2.1, 1),
          createValidDepthLevel(49999.0, 1.5, 2),
          createValidDepthLevel(49998.5, 3.2, 3),
        ],
        asks: [
          createValidDepthLevel(50000.5, 1.8, 1),
          createValidDepthLevel(50001.0, 2.3, 2),
          createValidDepthLevel(50001.5, 1.1, 3),
        ],
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bids: [], // empty bids
        asks: [createValidDepthLevel(50000.5, 1.8, 1)],
        sequenceNumber: 12345,
        totalBidSize: 0,
        totalAskSize: 1.8,
      },
    ];

    for (const depth of validMarketDepth) {
      expect(isValidMarketDepth(depth)).toBe(true);
    }
  });

  it("should reject invalid market depth data", () => {
    const invalidMarketDepth = [
      null,
      undefined,
      {},
      // Missing required fields
      { timestamp: "2024-01-15T10:30:00.000Z", bids: [] }, // missing asks
      { timestamp: "2024-01-15T10:30:00.000Z", asks: [] }, // missing bids
      // Invalid timestamp
      { timestamp: "invalid", bids: [], asks: [] },
      // Invalid arrays
      { timestamp: "2024-01-15T10:30:00.000Z", bids: "not-array", asks: [] },
      { timestamp: "2024-01-15T10:30:00.000Z", bids: [], asks: "not-array" },
      // Invalid depth levels
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bids: [{ price: 0, size: 1, level: 1 }], // invalid depth level
        asks: [],
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        bids: [],
        asks: [{ price: 100, size: -1, level: 1 }], // invalid depth level
      },
      // Invalid optional fields
      { timestamp: "2024-01-15T10:30:00.000Z", bids: [], asks: [], sequenceNumber: 1.5 }, // non-integer
      { timestamp: "2024-01-15T10:30:00.000Z", bids: [], asks: [], totalBidSize: -10 }, // negative
      { timestamp: "2024-01-15T10:30:00.000Z", bids: [], asks: [], totalAskSize: -5 }, // negative
    ];

    for (const depth of invalidMarketDepth) {
      expect(isValidMarketDepth(depth)).toBe(false);
    }
  });

  it("should validate market depth ordering separately", () => {
    const validOrderedDepth: MarketDepth = {
      timestamp: "2024-01-15T10:30:00.000Z",
      bids: [
        createValidDepthLevel(50000, 1, 1), // highest bid first
        createValidDepthLevel(49999, 1, 2),
        createValidDepthLevel(49998, 1, 3),
      ],
      asks: [
        createValidDepthLevel(50001, 1, 1), // lowest ask first
        createValidDepthLevel(50002, 1, 2),
        createValidDepthLevel(50003, 1, 3),
      ],
    };

    const invalidOrderedDepth: MarketDepth = {
      timestamp: "2024-01-15T10:30:00.000Z",
      bids: [
        createValidDepthLevel(49998, 1, 1), // wrong order (should be descending)
        createValidDepthLevel(50000, 1, 2),
      ],
      asks: [
        createValidDepthLevel(50002, 1, 1), // wrong order (should be ascending)
        createValidDepthLevel(50001, 1, 2),
      ],
    };

    const crossedMarketDepth: MarketDepth = {
      timestamp: "2024-01-15T10:30:00.000Z",
      bids: [createValidDepthLevel(50002, 1, 1)], // bid > ask (crossed market)
      asks: [createValidDepthLevel(50001, 1, 1)],
    };

    expect(isValidMarketDepthOrdering(validOrderedDepth)).toBe(true);
    expect(isValidMarketDepthOrdering(invalidOrderedDepth)).toBe(false);
    expect(isValidMarketDepthOrdering(crossedMarketDepth)).toBe(false);
  });
});

describe("DSL Market Data - MarketAnalytics Type", () => {
  it("should validate valid market analytics data", () => {
    const validAnalytics: MarketAnalytics = {
      timestamp: "2024-01-15T10:30:00.000Z",
      market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
      calculationPeriod: {
        startDate: "2024-01-15T09:30:00.000Z",
        endDate: "2024-01-15T10:30:00.000Z",
      },
      totalMarketCap: 2500000000000, // $2.5T
      totalVolume: 150000000000, // $150B
      instrumentCount: 25000,
      activeExchangeCount: 50,
      dominanceMetrics: {
        topInstrumentShare: 45.5,
        top5InstrumentShare: 78.2,
        top10InstrumentShare: 89.9,
        exchangeConcentration: 0.15,
      },
      changeMetrics: {
        change1h: 2.5,
        change24h: -5.1,
        change7d: 15.8,
        change30d: -12.3,
      },
      volatilityMetrics: {
        volatility24h: 15.5,
        volatility7d: 22.1,
        volatility30d: 18.7,
      },
      liquidityMetrics: {
        averageSpread: 0.05,
        medianSpread: 0.03,
        averageDepth: 1000000,
        turnoverRatio: 2.5,
      },
    };

    expect(isValidMarketAnalytics(validAnalytics)).toBe(true);
  });

  it("should reject invalid market analytics data", () => {
    const baseValidMetrics = {
      market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
      calculationPeriod: {
        startDate: "2024-01-15T09:30:00.000Z",
        endDate: "2024-01-15T10:30:00.000Z",
      },
      activeExchangeCount: 50,
      dominanceMetrics: {
        topInstrumentShare: 45,
        top5InstrumentShare: 70,
        top10InstrumentShare: 85,
        exchangeConcentration: 0.15,
      },
      changeMetrics: { change1h: 2, change24h: -5, change7d: 15, change30d: -12 },
      volatilityMetrics: { volatility24h: 15, volatility7d: 22, volatility30d: 18 },
      liquidityMetrics: {
        averageSpread: 0.05,
        medianSpread: 0.03,
        averageDepth: 1000000,
        turnoverRatio: 2.5,
      },
    };

    const invalidAnalytics = [
      null,
      undefined,
      {},
      // Missing required fields
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: 100,
        market: baseValidMetrics.market,
        calculationPeriod: baseValidMetrics.calculationPeriod,
        // Missing activeExchangeCount field
        dominanceMetrics: baseValidMetrics.dominanceMetrics,
        changeMetrics: baseValidMetrics.changeMetrics,
        volatilityMetrics: baseValidMetrics.volatilityMetrics,
        liquidityMetrics: baseValidMetrics.liquidityMetrics,
      },
      // Invalid numeric fields
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: -1000,
        totalVolume: 100,
        instrumentCount: 100,
        ...baseValidMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: -100,
        instrumentCount: 100,
        ...baseValidMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: -1,
        ...baseValidMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: 1.5,
        ...baseValidMetrics,
      }, // non-integer
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: Number.POSITIVE_INFINITY,
        totalVolume: 100,
        instrumentCount: 100,
        ...baseValidMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: Number.NaN,
        instrumentCount: 100,
        ...baseValidMetrics,
      },
      // Invalid nested metrics
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: 100,
        market: baseValidMetrics.market,
        calculationPeriod: baseValidMetrics.calculationPeriod,
        activeExchangeCount: baseValidMetrics.activeExchangeCount,
        dominanceMetrics: {
          topInstrumentShare: -5,
          top5InstrumentShare: 70,
          top10InstrumentShare: 85,
          exchangeConcentration: 0.15,
        }, // invalid dominance
        changeMetrics: baseValidMetrics.changeMetrics,
        volatilityMetrics: baseValidMetrics.volatilityMetrics,
        liquidityMetrics: baseValidMetrics.liquidityMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: 100,
        market: baseValidMetrics.market,
        calculationPeriod: baseValidMetrics.calculationPeriod,
        activeExchangeCount: baseValidMetrics.activeExchangeCount,
        dominanceMetrics: baseValidMetrics.dominanceMetrics,
        changeMetrics: {
          change1h: Number.POSITIVE_INFINITY,
          change24h: -5,
          change7d: 15,
          change30d: -12,
        }, // invalid change
        volatilityMetrics: baseValidMetrics.volatilityMetrics,
        liquidityMetrics: baseValidMetrics.liquidityMetrics,
      },
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        totalMarketCap: 1000,
        totalVolume: 100,
        instrumentCount: 100,
        market: baseValidMetrics.market,
        calculationPeriod: baseValidMetrics.calculationPeriod,
        activeExchangeCount: baseValidMetrics.activeExchangeCount,
        dominanceMetrics: baseValidMetrics.dominanceMetrics,
        changeMetrics: baseValidMetrics.changeMetrics,
        volatilityMetrics: { volatility24h: -5, volatility7d: 22, volatility30d: 18 }, // invalid volatility
        liquidityMetrics: baseValidMetrics.liquidityMetrics,
      },
    ];

    for (const analytics of invalidAnalytics) {
      expect(isValidMarketAnalytics(analytics)).toBe(false);
    }
  });
});

describe("DSL Market Data - Generic Types", () => {
  describe("CoreMarketData union type", () => {
    it("should validate any core market data type", () => {
      const validPrice: Price = {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000,
        size: 1.5,
      };

      const validLevel1: Level1 = {
        timestamp: "2024-01-15T10:30:00.000Z",
        bidPrice: 49999,
        bidSize: 1,
        askPrice: 50001,
        askSize: 1,
      };

      expect(isValidCoreMarketData(validPrice)).toBe(true);
      expect(isValidCoreMarketData(validLevel1)).toBe(true);
    });

    it("should reject non-market data types", () => {
      const invalidData = [null, undefined, {}, "string", 123, [], { notMarketData: true }];

      for (const data of invalidData) {
        expect(isValidCoreMarketData(data)).toBe(false);
      }
    });
  });

  describe("MarketData<T> wrapper type", () => {
    const validContext = createValidDataContext();

    it("should validate market data with valid context and core data", () => {
      const validPrice: Price = {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000,
        size: 1.5,
      };

      const marketDataPrice: MarketData<Price> = {
        context: validContext,
        coreData: validPrice,
      };

      expect(isValidMarketData(marketDataPrice, isValidPrice)).toBe(true);
    });

    it("should accept market data with extra fields", () => {
      const validPrice: Price = {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000,
        size: 1.5,
      };

      const marketDataWithExtra = {
        context: validContext,
        coreData: validPrice,
        extra: "field", // extra fields should be accepted
      };

      expect(isValidMarketData(marketDataWithExtra, isValidPrice)).toBe(true);
    });

    it("should reject market data with invalid context or core data", () => {
      const validPrice: Price = {
        timestamp: "2024-01-15T10:30:00.000Z",
        price: 50000,
        size: 1.5,
      };

      const invalidMarketData = [
        null,
        undefined,
        {},
        { context: validContext }, // missing coreData
        { coreData: validPrice }, // missing context
        { context: {}, coreData: validPrice }, // invalid context
        { context: validContext, coreData: {} }, // invalid coreData
      ];

      for (const data of invalidMarketData) {
        if (data && typeof data === "object" && "context" in data && "coreData" in data) {
          // Only test with type guard if it has the basic structure
          expect(isValidMarketData(data, isValidPrice)).toBe(false);
        } else {
          expect(isValidMarketData(data, isValidPrice)).toBe(false);
        }
      }
    });
  });

  describe("Timestamp validation utility", () => {
    it("should validate reasonable timestamps", () => {
      const now = "2024-01-15T10:30:00.000Z";
      const recentPast = "2024-01-15T09:30:00.000Z"; // 1 hour ago
      const nearFuture = "2024-01-15T11:00:00.000Z"; // 30 minutes from now

      expect(isValidTimestamp(now)).toBe(true);
      expect(isValidTimestamp(recentPast)).toBe(true);
      expect(isValidTimestamp(nearFuture)).toBe(true);
    });

    it("should reject unreasonable timestamps", () => {
      const invalidFormat = "2020-01-01"; // Not ISO 8601
      const invalidString = "not-a-date";

      expect(isValidTimestamp(invalidFormat)).toBe(false);
      expect(isValidTimestamp(invalidString)).toBe(false);
    });
  });
});

describe("DSL Market Data - FIX Protocol Compliance", () => {
  test("Price type should map to FIX MDEntryType=2 (Trade)", () => {
    const tradePrice: Price = {
      timestamp: "2024-01-15T10:30:00.000Z", // FIX Tag 273
      price: 50000.99, // FIX Tag 270
      size: 1.5, // FIX Tag 271
      tradeId: "T123456", // FIX Tag 1003
      aggressor: "BUY", // FIX Tag 54
    };

    expect(isValidPrice(tradePrice)).toBe(true);

    // Verify all FIX-required fields are present
    expect(typeof tradePrice.timestamp).toBe("string");
    expect(typeof tradePrice.price).toBe("number");
    expect(typeof tradePrice.size).toBe("number");
  });

  test("Level1 type should map to FIX MDEntryType=0/1 (Bid/Offer)", () => {
    const topOfBook: Level1 = {
      timestamp: "2024-01-15T10:30:00.000Z", // FIX Tag 273
      bidPrice: 49999.5, // FIX Tag 270 + MDEntryType=0
      bidSize: 2.1, // FIX Tag 271 + MDEntryType=0
      askPrice: 50000.5, // FIX Tag 270 + MDEntryType=1
      askSize: 1.8, // FIX Tag 271 + MDEntryType=1
      quoteId: "Q123456", // FIX Tag 117
    };

    expect(isValidLevel1(topOfBook)).toBe(true);

    // Verify bid/ask structure matches FIX MDEntryType expectations
    expect(topOfBook.bidPrice).toBeLessThanOrEqual(topOfBook.askPrice); // No crossed market
  });

  test("MarketDepth should represent multi-level FIX order book", () => {
    const orderBook: MarketDepth = {
      timestamp: "2024-01-15T10:30:00.000Z", // FIX Tag 273
      bids: [
        // MDEntryType=0 levels
        { price: 50000, size: 1.0, level: 1 },
        { price: 49999, size: 1.5, level: 2 },
        { price: 49998, size: 2.0, level: 3 },
      ],
      asks: [
        // MDEntryType=1 levels
        { price: 50001, size: 0.8, level: 1 },
        { price: 50002, size: 1.2, level: 2 },
        { price: 50003, size: 1.8, level: 3 },
      ],
      sequenceNumber: 12345, // Order book sequence
    };

    expect(isValidMarketDepth(orderBook)).toBe(true);
    expect(isValidMarketDepthOrdering(orderBook)).toBe(true);

    // Verify proper price ladder structure
    expect(orderBook.bids[0].price).toBeGreaterThan(orderBook.bids[1].price); // Descending bids
    expect(orderBook.asks[0].price).toBeLessThan(orderBook.asks[1].price); // Ascending asks
  });
});
