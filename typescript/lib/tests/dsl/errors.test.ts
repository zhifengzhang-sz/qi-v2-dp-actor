/**
 * Unit tests for DSL error handling
 * Tests DSL-specific error types and creation functions
 */

import type { QiError } from "@qi/base";
import type {
  DSLError,
  DataSourceError,
  HistoricalDataError,
  MarketDataError,
  MarketDepthError,
  StreamingError,
} from "@qi/dp/dsl";
import {
  API_KEY_INVALID,
  DATA_GAPS_DETECTED,
  DATE_RANGE_INVALID,
  DATE_RANGE_TOO_LARGE,
  INSUFFICIENT_DEPTH,
  INVALID_DEPTH_LEVELS,
  INVALID_PRICE,
  INVALID_SIZE,
  INVALID_TIMESTAMP,
  MARKET_CLOSED,
  MAX_RECONNECTS_EXCEEDED,
  RATE_LIMIT_EXCEEDED,
  SPREAD_TOO_WIDE,
  STREAM_BUFFER_OVERFLOW,
  STREAM_DISCONNECTED,
  SYMBOL_NOT_FOUND,
  createDataSourceError,
  createHistoricalDataError,
  createMarketDataError,
  createMarketDepthError,
  createStreamingError,
} from "@qi/dp/utils";
import { describe, expect, it } from "vitest";

describe("DSL Error Types", () => {
  describe("MarketDataError", () => {
    it("should create market data validation errors", () => {
      const error = createMarketDataError("INVALID_PRICE", "Price must be positive", "VALIDATION", {
        symbol: "BTC/USD",
        price: -100,
        field: "price",
      });

      expect(error.code).toBe("INVALID_PRICE");
      expect(error.message).toBe("Price must be positive");
      expect(error.category).toBe("VALIDATION");
      expect(error.context.symbol).toBe("BTC/USD");
      expect(error.context.price).toBe(-100);
      expect(error.context.field).toBe("price");
    });

    it("should create market data business errors", () => {
      const error = createMarketDataError("SPREAD_TOO_WIDE", "Spread exceeds maximum", "BUSINESS", {
        symbol: "ETH/USD",
        spread: 0.05,
        maxSpread: 0.02,
      });

      expect(error.category).toBe("BUSINESS");
      expect(error.context.spread).toBe(0.05);
      expect(error.context.maxSpread).toBe(0.02);
    });
  });

  describe("DataSourceError", () => {
    it("should create network errors for data sources", () => {
      const error = createDataSourceError(
        "RATE_LIMIT_EXCEEDED",
        "API rate limit exceeded",
        "NETWORK",
        {
          provider: "CoinGecko",
          endpoint: "/simple/price",
          retryAfter: 60,
        }
      );

      expect(error.category).toBe("NETWORK");
      expect(error.context.provider).toBe("CoinGecko");
      expect(error.context.retryAfter).toBe(60);
    });

    it("should create business errors for data sources", () => {
      const error = createDataSourceError("SYMBOL_NOT_FOUND", "Symbol not available", "BUSINESS", {
        provider: "Binance",
        symbol: "UNKNOWN/USD",
        exchange: "binance",
      });

      expect(error.category).toBe("BUSINESS");
      expect(error.context.symbol).toBe("UNKNOWN/USD");
    });
  });

  describe("MarketDepthError", () => {
    it("should create market depth validation errors", () => {
      const error = createMarketDepthError(
        "INVALID_DEPTH_LEVELS",
        "Invalid levels requested",
        "VALIDATION",
        {
          levels: 1000,
          maxLevels: 100,
          symbol: "BTC/USD",
        }
      );

      expect(error.category).toBe("VALIDATION");
      expect(error.context.levels).toBe(1000);
      expect(error.context.maxLevels).toBe(100);
    });
  });

  describe("StreamingError", () => {
    it("should create streaming network errors", () => {
      const error = createStreamingError(
        "STREAM_DISCONNECTED",
        "WebSocket disconnected",
        "NETWORK",
        {
          streamId: "ws-123",
          symbol: "BTC/USD",
          reconnectCount: 3,
        }
      );

      expect(error.category).toBe("NETWORK");
      expect(error.context.streamId).toBe("ws-123");
      expect(error.context.reconnectCount).toBe(3);
    });
  });

  describe("HistoricalDataError", () => {
    it("should create historical data validation errors", () => {
      const error = createHistoricalDataError(
        "DATE_RANGE_INVALID",
        "Invalid date range",
        "VALIDATION",
        {
          startDate: "2024-01-01",
          endDate: "2023-12-31",
          symbol: "ETH/USD",
        }
      );

      expect(error.category).toBe("VALIDATION");
      expect(error.context.startDate).toBe("2024-01-01");
      expect(error.context.endDate).toBe("2023-12-31");
    });
  });
});

describe("DSL Error Factory Functions", () => {
  describe("Market Data Error Factories", () => {
    it("should create INVALID_PRICE errors", () => {
      const error = INVALID_PRICE(-100, "BTC/USD");

      expect(error.code).toBe("INVALID_PRICE");
      expect(error.category).toBe("VALIDATION");
      expect(error.message).toBe("Price must be positive and finite");
      expect(error.context.price).toBe(-100);
      expect(error.context.symbol).toBe("BTC/USD");
    });

    it("should create INVALID_SIZE errors", () => {
      const error = INVALID_SIZE(0, "ETH/USD");

      expect(error.code).toBe("INVALID_SIZE");
      expect(error.category).toBe("VALIDATION");
      expect(error.context.size).toBe(0);
    });

    it("should create INVALID_TIMESTAMP errors", () => {
      const error = INVALID_TIMESTAMP("invalid-date", "BTC/USD");

      expect(error.code).toBe("INVALID_TIMESTAMP");
      expect(error.category).toBe("VALIDATION");
      expect(error.context.timestamp).toBe("invalid-date");
    });

    it("should create SPREAD_TOO_WIDE errors", () => {
      const error = SPREAD_TOO_WIDE(0.05, 0.02, "BTC/USD");

      expect(error.code).toBe("SPREAD_TOO_WIDE");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.spread).toBe(0.05);
      expect(error.context.maxSpread).toBe(0.02);
    });
  });

  describe("Data Source Error Factories", () => {
    it("should create RATE_LIMIT_EXCEEDED errors", () => {
      const error = RATE_LIMIT_EXCEEDED("CoinGecko", 60);

      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.category).toBe("NETWORK");
      expect(error.context.provider).toBe("CoinGecko");
      expect(error.context.retryAfter).toBe(60);
    });

    it("should create SYMBOL_NOT_FOUND errors", () => {
      const error = SYMBOL_NOT_FOUND("UNKNOWN", "binance", "Binance");

      expect(error.code).toBe("SYMBOL_NOT_FOUND");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.symbol).toBe("UNKNOWN");
      expect(error.context.exchange).toBe("binance");
      expect(error.context.provider).toBe("Binance");
    });

    it("should create API_KEY_INVALID errors", () => {
      const error = API_KEY_INVALID("TwelveData");

      expect(error.code).toBe("API_KEY_INVALID");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.provider).toBe("TwelveData");
    });

    it("should create MARKET_CLOSED errors", () => {
      const error = MARKET_CLOSED("AAPL", "NASDAQ");

      expect(error.code).toBe("MARKET_CLOSED");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.symbol).toBe("AAPL");
      expect(error.context.exchange).toBe("NASDAQ");
    });
  });

  describe("Market Depth Error Factories", () => {
    it("should create INSUFFICIENT_DEPTH errors", () => {
      const error = INSUFFICIENT_DEPTH(20, 5, "BTC/USD");

      expect(error.code).toBe("INSUFFICIENT_DEPTH");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.levels).toBe(20);
      expect(error.context.bidCount).toBe(5);
    });

    it("should create INVALID_DEPTH_LEVELS errors", () => {
      const error = INVALID_DEPTH_LEVELS(1000, 100);

      expect(error.code).toBe("INVALID_DEPTH_LEVELS");
      expect(error.category).toBe("VALIDATION");
      expect(error.context.levels).toBe(1000);
      expect(error.context.maxLevels).toBe(100);
    });
  });

  describe("Streaming Error Factories", () => {
    it("should create STREAM_DISCONNECTED errors", () => {
      const error = STREAM_DISCONNECTED("ws-123", "BTC/USD");

      expect(error.code).toBe("STREAM_DISCONNECTED");
      expect(error.category).toBe("NETWORK");
      expect(error.context.streamId).toBe("ws-123");
      expect(error.context.symbol).toBe("BTC/USD");
    });

    it("should create STREAM_BUFFER_OVERFLOW errors", () => {
      const error = STREAM_BUFFER_OVERFLOW("ws-456", 10000, 8192);

      expect(error.code).toBe("STREAM_BUFFER_OVERFLOW");
      expect(error.category).toBe("SYSTEM");
      expect(error.context.streamId).toBe("ws-456");
      expect(error.context.bufferSize).toBe(10000);
      expect(error.context.maxBufferSize).toBe(8192);
    });

    it("should create MAX_RECONNECTS_EXCEEDED errors", () => {
      const error = MAX_RECONNECTS_EXCEEDED("ws-789", 5);

      expect(error.code).toBe("MAX_RECONNECTS_EXCEEDED");
      expect(error.category).toBe("NETWORK");
      expect(error.context.streamId).toBe("ws-789");
      expect(error.context.maxReconnects).toBe(5);
    });
  });

  describe("Historical Data Error Factories", () => {
    it("should create DATE_RANGE_INVALID errors", () => {
      const error = DATE_RANGE_INVALID("2024-01-01", "2023-12-31");

      expect(error.code).toBe("DATE_RANGE_INVALID");
      expect(error.category).toBe("VALIDATION");
      expect(error.context.startDate).toBe("2024-01-01");
      expect(error.context.endDate).toBe("2023-12-31");
    });

    it("should create DATE_RANGE_TOO_LARGE errors", () => {
      const error = DATE_RANGE_TOO_LARGE("2020-01-01", "2024-01-01", 1000);

      expect(error.code).toBe("DATE_RANGE_TOO_LARGE");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.startDate).toBe("2020-01-01");
      expect(error.context.endDate).toBe("2024-01-01");
      expect(error.context.maxRecords).toBe(1000);
    });

    it("should create DATA_GAPS_DETECTED errors", () => {
      const error = DATA_GAPS_DETECTED("BTC/USD", ["2024-01-01", "2024-01-03"]);

      expect(error.code).toBe("DATA_GAPS_DETECTED");
      expect(error.category).toBe("BUSINESS");
      expect(error.context.symbol).toBe("BTC/USD");
      expect(error.context.missingDates).toEqual(["2024-01-01", "2024-01-03"]);
    });
  });
});

describe("DSL Error Type Guards", () => {
  it("should properly type DSLError union", () => {
    const marketDataError: DSLError = createMarketDataError("TEST", "Test", "VALIDATION");
    const dataSourceError: DSLError = createDataSourceError("TEST", "Test", "NETWORK");
    const streamingError: DSLError = createStreamingError("TEST", "Test", "SYSTEM");

    // All should be valid QiError instances
    expect(marketDataError.code).toBeDefined();
    expect(dataSourceError.category).toBeDefined();
    expect(streamingError.message).toBeDefined();

    // Each should have proper context types
    expect(typeof marketDataError.context).toBe("object");
    expect(typeof dataSourceError.context).toBe("object");
    expect(typeof streamingError.context).toBe("object");
  });

  it("should properly extend QiError interface", () => {
    const error: MarketDataError = createMarketDataError("TEST", "Test", "VALIDATION", {
      symbol: "BTC/USD",
      price: 50000,
    });

    // Should have all QiError properties
    const qiError: QiError = error;
    expect(qiError.code).toBe("TEST");
    expect(qiError.message).toBe("Test");
    expect(qiError.category).toBe("VALIDATION");
    expect(qiError.context).toBeDefined();

    // Should have MarketDataError-specific context
    expect(error.context.symbol).toBe("BTC/USD");
    expect(error.context.price).toBe(50000);
  });
});
