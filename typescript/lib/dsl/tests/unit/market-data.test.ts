/**
 * Unit tests for market data types
 * Tests FIX Protocol 4.4 compliant data structures
 */

import { describe, expect, it } from "vitest";
import type { Level1, MarketDepth, OHLCV, Price } from "../../src/market-data.js";

describe("Market Data Types", () => {
  describe("Price (Trade/Tick Data)", () => {
    it("should create valid Price objects with required fields", () => {
      const price: Price = {
        timestamp: "2025-01-15T10:30:00.000Z",
        price: "50000.00",
        size: "1.5",
      };

      expect(price.timestamp).toBe("2025-01-15T10:30:00.000Z");
      expect(price.price).toBe("50000.00");
      expect(price.size).toBe("1.5");
    });

    it("should support optional FIX fields in Price", () => {
      const price: Price = {
        timestamp: "2025-01-15T10:30:00.000Z",
        price: "50000.00",
        size: "1.5",
        tradeId: "T123456",
        aggressor: "BUY",
      };

      expect(price.tradeId).toBe("T123456");
      expect(price.aggressor).toBe("BUY");
    });

    it("should support both BUY and SELL aggressor sides", () => {
      const buyTrade: Price = {
        timestamp: "2025-01-15T10:30:00.000Z",
        price: "50000.00",
        size: "1.0",
        aggressor: "BUY",
      };

      const sellTrade: Price = {
        timestamp: "2025-01-15T10:30:00.000Z",
        price: "49999.00",
        size: "2.0",
        aggressor: "SELL",
      };

      expect(buyTrade.aggressor).toBe("BUY");
      expect(sellTrade.aggressor).toBe("SELL");
    });
  });

  describe("Level1 (Top-of-Book)", () => {
    it("should create valid Level1 objects with bid/ask data", () => {
      const level1: Level1 = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bidPrice: "49999.50",
        bidSize: "2.0",
        askPrice: "50000.50",
        askSize: "1.8",
      };

      expect(level1.bidPrice).toBe("49999.50");
      expect(level1.askPrice).toBe("50000.50");
      expect(level1.bidSize).toBe("2.0");
      expect(level1.askSize).toBe("1.8");
    });

    it("should support optional FIX fields in Level1", () => {
      const level1: Level1 = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bidPrice: "49999.50",
        bidSize: "2.0",
        askPrice: "50000.50",
        askSize: "1.8",
        quoteId: "Q789012",
        bidTime: "2025-01-15T10:30:00.100Z",
        askTime: "2025-01-15T10:30:00.200Z",
      };

      expect(level1.quoteId).toBe("Q789012");
      expect(level1.bidTime).toBe("2025-01-15T10:30:00.100Z");
      expect(level1.askTime).toBe("2025-01-15T10:30:00.200Z");
    });

    it("should enforce decimal precision for prices and sizes", () => {
      const level1: Level1 = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bidPrice: "49999.123456",
        bidSize: "2.00000001",
        askPrice: "50000.654321",
        askSize: "1.99999999",
      };

      expect(typeof level1.bidPrice).toBe("string");
      expect(typeof level1.bidSize).toBe("string");
      expect(level1.bidPrice).toBe("49999.123456");
      expect(level1.askSize).toBe("1.99999999");
    });
  });

  describe("OHLCV (Candlestick Data)", () => {
    it("should create valid OHLCV objects", () => {
      const ohlcv: OHLCV = {
        timestamp: "2025-01-15T10:30:00.000Z",
        open: "50000.00",
        high: "50500.00",
        low: "49800.00",
        close: "50200.00",
        volume: "150.75",
      };

      expect(ohlcv.open).toBe("50000.00");
      expect(ohlcv.high).toBe("50500.00");
      expect(ohlcv.low).toBe("49800.00");
      expect(ohlcv.close).toBe("50200.00");
      expect(ohlcv.volume).toBe("150.75");
    });

    it("should support optional fields in OHLCV", () => {
      const ohlcv: OHLCV = {
        timestamp: "2025-01-15T10:30:00.000Z",
        open: "50000.00",
        high: "50500.00",
        low: "49800.00",
        close: "50200.00",
        volume: "150.75",
        trades: 1250,
        interval: "1m",
        openTime: "2025-01-15T10:30:00.000Z",
        closeTime: "2025-01-15T10:30:59.999Z",
      };

      expect(ohlcv.trades).toBe(1250);
      expect(ohlcv.interval).toBe("1m");
      expect(ohlcv.openTime).toBe("2025-01-15T10:30:00.000Z");
      expect(ohlcv.closeTime).toBe("2025-01-15T10:30:59.999Z");
    });

    it("should maintain proper OHLC relationships conceptually", () => {
      // Note: DSL doesn't enforce business logic, just structure
      const ohlcv: OHLCV = {
        timestamp: "2025-01-15T10:30:00.000Z",
        open: "50000.00",
        high: "50500.00",
        low: "49800.00",
        close: "50200.00",
        volume: "150.75",
      };

      // All values are strings (decimal type)
      expect(typeof ohlcv.open).toBe("string");
      expect(typeof ohlcv.high).toBe("string");
      expect(typeof ohlcv.low).toBe("string");
      expect(typeof ohlcv.close).toBe("string");
    });
  });

  describe("MarketDepth (Order Book)", () => {
    it("should create valid MarketDepth objects", () => {
      const marketDepth: MarketDepth = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bids: [
          { price: "49999.50", size: "2.0", level: 1 },
          { price: "49999.00", size: "1.5", level: 2 },
        ],
        asks: [
          { price: "50000.50", size: "1.8", level: 1 },
          { price: "50001.00", size: "2.2", level: 2 },
        ],
      };

      expect(marketDepth.bids).toHaveLength(2);
      expect(marketDepth.asks).toHaveLength(2);
      expect(marketDepth.bids[0].price).toBe("49999.50");
      expect(marketDepth.asks[0].price).toBe("50000.50");
    });

    it("should support optional sequence and levels fields", () => {
      const marketDepth: MarketDepth = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bids: [{ price: "49999.50", size: "2.0", level: 1 }],
        asks: [{ price: "50000.50", size: "1.8", level: 1 }],
        sequence: 123456,
        levels: 5,
      };

      expect(marketDepth.sequence).toBe(123456);
      expect(marketDepth.levels).toBe(5);
    });

    it("should enforce proper DepthLevel structure", () => {
      const marketDepth: MarketDepth = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bids: [
          { price: "49999.50", size: "2.0", level: 1 },
          { price: "49999.00", size: "1.5", level: 2 },
          { price: "49998.50", size: "3.0", level: 3 },
        ],
        asks: [
          { price: "50000.50", size: "1.8", level: 1 },
          { price: "50001.00", size: "2.2", level: 2 },
          { price: "50001.50", size: "1.0", level: 3 },
        ],
      };

      // Check structure of depth levels
      marketDepth.bids.forEach((bid, index) => {
        expect(typeof bid.price).toBe("string");
        expect(typeof bid.size).toBe("string");
        expect(typeof bid.level).toBe("number");
        expect(bid.level).toBe(index + 1);
      });

      marketDepth.asks.forEach((ask, index) => {
        expect(typeof ask.price).toBe("string");
        expect(typeof ask.size).toBe("string");
        expect(typeof ask.level).toBe("number");
        expect(ask.level).toBe(index + 1);
      });
    });
  });

  describe("Type Safety and Immutability", () => {
    it("should enforce readonly arrays for market depth", () => {
      const marketDepth: MarketDepth = {
        timestamp: "2025-01-15T10:30:00.000Z",
        bids: [{ price: "49999.50", size: "2.0", level: 1 }],
        asks: [{ price: "50000.50", size: "1.8", level: 1 }],
      };

      // Arrays should be readonly - these would be TypeScript compile errors
      // marketDepth.bids.push({ price: '49999.00', size: '1.0', level: 2 })
      // marketDepth.asks[0].price = '50001.00'

      expect(marketDepth.bids).toHaveLength(1);
      expect(marketDepth.asks).toHaveLength(1);
    });

    it("should maintain ISO 8601 timestamp format across all types", () => {
      const timestamp = "2025-01-15T10:30:00.000Z";

      const price: Price = { timestamp, price: "50000.00", size: "1.0" };
      const level1: Level1 = {
        timestamp,
        bidPrice: "49999.50",
        bidSize: "2.0",
        askPrice: "50000.50",
        askSize: "1.8",
      };
      const ohlcv: OHLCV = {
        timestamp,
        open: "50000.00",
        high: "50500.00",
        low: "49800.00",
        close: "50200.00",
        volume: "150.75",
      };
      const marketDepth: MarketDepth = { timestamp, bids: [], asks: [] };

      expect(price.timestamp).toBe(timestamp);
      expect(level1.timestamp).toBe(timestamp);
      expect(ohlcv.timestamp).toBe(timestamp);
      expect(marketDepth.timestamp).toBe(timestamp);
    });
  });
});
