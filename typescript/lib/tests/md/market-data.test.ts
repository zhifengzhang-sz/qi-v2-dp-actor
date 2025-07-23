/**
 * Tests for MarketData<T> generic wrapper smart constructor
 * Uses real market data examples - no mocks or stubs
 */

import { describe, expect, it } from "vitest";
import type * as DSL from "../../src/dsl/index.js";
import { MarketData } from "../../src/md/market-data.js";

describe("MarketData Smart Constructor", () => {
  // Helper data contexts for testing
  const equityContext: DSL.DataContext = {
    market: { type: "EQUITY", region: "US", segment: "CASH" },
    exchange: { id: "nasdaq", name: "NASDAQ", mic: "XNAS", timezone: "America/New_York" },
    instrument: {
      symbol: "AAPL",
      isin: "US0378331005",
      name: "Apple Inc",
      assetClass: "STOCK",
      currency: "USD",
    },
  };

  const cryptoContext: DSL.DataContext = {
    market: { type: "CRYPTO", region: "US", segment: "CASH" },
    exchange: { id: "coinbase", name: "Coinbase Pro", mic: null, timezone: "UTC" },
    instrument: {
      symbol: "BTC/USD",
      isin: null,
      name: "Bitcoin/US Dollar",
      assetClass: "CRYPTO",
      currency: "USD",
    },
  };

  const forexContext: DSL.DataContext = {
    market: { type: "FOREX", region: "US", segment: "CASH" },
    exchange: { id: "fx", name: "FX Markets", mic: null, timezone: "UTC" },
    instrument: {
      symbol: "EUR/USD",
      isin: null,
      name: "Euro/US Dollar",
      assetClass: "CURRENCY",
      currency: "USD",
    },
  };

  // Helper core data for testing
  const priceData: DSL.Price = {
    timestamp: "2024-03-15T14:30:00.000Z",
    price: "150.25",
    size: "100",
  };

  const level1Data: DSL.Level1 = {
    timestamp: "2024-03-15T14:30:00.000Z",
    bidPrice: "150.20",
    bidSize: "500",
    askPrice: "150.30",
    askSize: "300",
  };

  const ohlcvData: DSL.OHLCV = {
    timestamp: "2024-03-15T14:30:00.000Z",
    open: "149.50",
    high: "150.75",
    low: "149.20",
    close: "150.25",
    volume: "1500000",
  };

  const marketDepthData: DSL.MarketDepth = {
    timestamp: "2024-03-15T14:30:00.000Z",
    bids: [
      { price: "150.20", size: "500" },
      { price: "150.15", size: "250" },
      { price: "150.10", size: "750" },
    ],
    asks: [
      { price: "150.30", size: "300" },
      { price: "150.35", size: "400" },
      { price: "150.40", size: "200" },
    ],
  };

  describe("create() method", () => {
    it("should create valid MarketData with Price data", () => {
      const result = MarketData.create(equityContext, priceData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(equityContext);
        expect(result.value.coreData).toEqual(priceData);
        expect(result.value.isPrice()).toBe(true);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should create valid MarketData with Level1 data", () => {
      const result = MarketData.create(cryptoContext, level1Data);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(cryptoContext);
        expect(result.value.coreData).toEqual(level1Data);
        expect(result.value.isLevel1()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should create valid MarketData with OHLCV data", () => {
      const result = MarketData.create(forexContext, ohlcvData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(forexContext);
        expect(result.value.coreData).toEqual(ohlcvData);
        expect(result.value.isOHLCV()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should create valid MarketData with MarketDepth data", () => {
      const result = MarketData.create(equityContext, marketDepthData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(equityContext);
        expect(result.value.coreData).toEqual(marketDepthData);
        expect(result.value.isMarketDepth()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
      }
    });

    it("should create MarketData with different asset classes", () => {
      const testCases = [
        { context: equityContext, coreData: priceData, expectedAssetClass: "STOCK" },
        { context: cryptoContext, coreData: level1Data, expectedAssetClass: "CRYPTO" },
        { context: forexContext, coreData: ohlcvData, expectedAssetClass: "CURRENCY" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, testCase.coreData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getAssetClass()).toBe(testCase.expectedAssetClass);
        }
      }
    });

    it("should create MarketData with different market types", () => {
      const testCases = [
        { context: equityContext, expectedMarketType: "EQUITY" },
        { context: cryptoContext, expectedMarketType: "CRYPTO" },
        { context: forexContext, expectedMarketType: "FOREX" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, priceData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getMarketType()).toBe(testCase.expectedMarketType);
        }
      }
    });

    describe("context validation", () => {
      it("should reject null context", () => {
        const result = MarketData.create(null as any, priceData);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CONTEXT");
          expect(result.error.message).toContain("Context must be a valid DataContext object");
          expect(result.error.context?.type).toBe("object");
        }
      });

      it("should reject undefined context", () => {
        const result = MarketData.create(undefined as any, priceData);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CONTEXT");
          expect(result.error.context?.type).toBe("undefined");
        }
      });

      it("should reject non-object context", () => {
        const result = MarketData.create("invalid" as any, priceData);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CONTEXT");
          expect(result.error.context?.type).toBe("string");
        }
      });

      it("should reject number context", () => {
        const result = MarketData.create(123 as any, priceData);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CONTEXT");
          expect(result.error.context?.type).toBe("number");
        }
      });
    });

    describe("core data validation", () => {
      it("should reject null core data", () => {
        const result = MarketData.create(equityContext, null as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CORE_DATA");
          expect(result.error.message).toContain("Core data must be a valid market data object");
          expect(result.error.context?.type).toBe("object");
        }
      });

      it("should reject undefined core data", () => {
        const result = MarketData.create(equityContext, undefined as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CORE_DATA");
          expect(result.error.context?.type).toBe("undefined");
        }
      });

      it("should reject non-object core data", () => {
        const result = MarketData.create(equityContext, "invalid" as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CORE_DATA");
          expect(result.error.context?.type).toBe("string");
        }
      });

      it("should reject number core data", () => {
        const result = MarketData.create(equityContext, 123 as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_CORE_DATA");
          expect(result.error.context?.type).toBe("number");
        }
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create MarketData from valid DSL Price object", () => {
      const dslMarketData: DSL.MarketData<DSL.Price> = {
        context: equityContext,
        coreData: priceData,
      };

      const result = MarketData.fromDSL(dslMarketData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(equityContext);
        expect(result.value.coreData).toEqual(priceData);
        expect(result.value.isPrice()).toBe(true);
      }
    });

    it("should create MarketData from valid DSL Level1 object", () => {
      const dslMarketData: DSL.MarketData<DSL.Level1> = {
        context: cryptoContext,
        coreData: level1Data,
      };

      const result = MarketData.fromDSL(dslMarketData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(cryptoContext);
        expect(result.value.coreData).toEqual(level1Data);
        expect(result.value.isLevel1()).toBe(true);
      }
    });

    it("should create MarketData from valid DSL OHLCV object", () => {
      const dslMarketData: DSL.MarketData<DSL.OHLCV> = {
        context: forexContext,
        coreData: ohlcvData,
      };

      const result = MarketData.fromDSL(dslMarketData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(forexContext);
        expect(result.value.coreData).toEqual(ohlcvData);
        expect(result.value.isOHLCV()).toBe(true);
      }
    });

    it("should create MarketData from valid DSL MarketDepth object", () => {
      const dslMarketData: DSL.MarketData<DSL.MarketDepth> = {
        context: equityContext,
        coreData: marketDepthData,
      };

      const result = MarketData.fromDSL(dslMarketData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.context).toEqual(equityContext);
        expect(result.value.coreData).toEqual(marketDepthData);
        expect(result.value.isMarketDepth()).toBe(true);
      }
    });

    it("should fail validation for invalid DSL object", () => {
      const invalidDslMarketData = {
        context: null,
        coreData: priceData,
      } as any;

      const result = MarketData.fromDSL(invalidDslMarketData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("INVALID_CONTEXT");
      }
    });
  });

  describe("type guard methods", () => {
    it("should correctly identify Price data", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.isPrice()).toBe(true);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should correctly identify Level1 data", () => {
      const result = MarketData.create(cryptoContext, level1Data);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.isLevel1()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should correctly identify OHLCV data", () => {
      const result = MarketData.create(forexContext, ohlcvData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.isOHLCV()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isMarketDepth()).toBe(false);
      }
    });

    it("should correctly identify MarketDepth data", () => {
      const result = MarketData.create(equityContext, marketDepthData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.isMarketDepth()).toBe(true);
        expect(result.value.isPrice()).toBe(false);
        expect(result.value.isLevel1()).toBe(false);
        expect(result.value.isOHLCV()).toBe(false);
      }
    });
  });

  describe("accessor methods", () => {
    it("should return correct timestamp", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getTimestamp()).toBe("2024-03-15T14:30:00.000Z");
      }
    });

    it("should return correct symbol", () => {
      const testCases = [
        { context: equityContext, expectedSymbol: "AAPL" },
        { context: cryptoContext, expectedSymbol: "BTC/USD" },
        { context: forexContext, expectedSymbol: "EUR/USD" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, priceData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getSymbol()).toBe(testCase.expectedSymbol);
        }
      }
    });

    it("should return correct exchange ID", () => {
      const testCases = [
        { context: equityContext, expectedExchangeId: "nasdaq" },
        { context: cryptoContext, expectedExchangeId: "coinbase" },
        { context: forexContext, expectedExchangeId: "fx" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, priceData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getExchangeId()).toBe(testCase.expectedExchangeId);
        }
      }
    });

    it("should return correct market type", () => {
      const testCases = [
        { context: equityContext, expectedMarketType: "EQUITY" },
        { context: cryptoContext, expectedMarketType: "CRYPTO" },
        { context: forexContext, expectedMarketType: "FOREX" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, priceData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getMarketType()).toBe(testCase.expectedMarketType);
        }
      }
    });

    it("should return correct asset class", () => {
      const testCases = [
        { context: equityContext, expectedAssetClass: "STOCK" },
        { context: cryptoContext, expectedAssetClass: "CRYPTO" },
        { context: forexContext, expectedAssetClass: "CURRENCY" },
      ];

      for (const testCase of testCases) {
        const result = MarketData.create(testCase.context, priceData);
        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.getAssetClass()).toBe(testCase.expectedAssetClass);
        }
      }
    });

    it("should return correct currency", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getCurrency()).toBe("USD");
      }
    });

    it("should generate unique ID", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const uniqueId = result.value.getUniqueId();
        expect(uniqueId).toContain("EQUITY");
        expect(uniqueId).toContain("nasdaq");
        expect(uniqueId).toContain("AAPL");
        expect(uniqueId).toContain("2024-03-15T14:30:00.000Z");
        expect(uniqueId.split(":")).toHaveLength(6); // timestamp has colons too
      }
    });

    it("should generate different unique IDs for different contexts", () => {
      const result1 = MarketData.create(equityContext, priceData);
      const result2 = MarketData.create(cryptoContext, priceData);

      expect(result1.tag).toBe("success");
      expect(result2.tag).toBe("success");

      if (result1.tag === "success" && result2.tag === "success") {
        const id1 = result1.value.getUniqueId();
        const id2 = result2.value.getUniqueId();
        expect(id1).not.toBe(id2);
      }
    });

    it("should generate different unique IDs for different timestamps", () => {
      const priceData2 = { ...priceData, timestamp: "2024-03-15T14:31:00.000Z" };
      const result1 = MarketData.create(equityContext, priceData);
      const result2 = MarketData.create(equityContext, priceData2);

      expect(result1.tag).toBe("success");
      expect(result2.tag).toBe("success");

      if (result1.tag === "success" && result2.tag === "success") {
        const id1 = result1.value.getUniqueId();
        const id2 = result2.value.getUniqueId();
        expect(id1).not.toBe(id2);
      }
    });
  });

  describe("toString() method", () => {
    it("should return formatted string for Price data", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const str = result.value.toString();
        expect(str).toContain("MarketData<Price>");
        expect(str).toContain("AAPL");
        expect(str).toContain("nasdaq");
        expect(str).toContain("2024-03-15T14:30:00.000Z");
      }
    });

    it("should return formatted string for Level1 data", () => {
      const result = MarketData.create(cryptoContext, level1Data);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const str = result.value.toString();
        expect(str).toContain("MarketData<Level1>");
        expect(str).toContain("BTC/USD");
        expect(str).toContain("coinbase");
      }
    });

    it("should return formatted string for OHLCV data", () => {
      const result = MarketData.create(forexContext, ohlcvData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const str = result.value.toString();
        expect(str).toContain("MarketData<OHLCV>");
        expect(str).toContain("EUR/USD");
        expect(str).toContain("fx");
      }
    });

    it("should return formatted string for MarketDepth data", () => {
      const result = MarketData.create(equityContext, marketDepthData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const str = result.value.toString();
        expect(str).toContain("MarketData<MarketDepth>");
        expect(str).toContain("AAPL");
        expect(str).toContain("nasdaq");
      }
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = MarketData.create(equityContext, priceData);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const obj = result.value.toObject();
        expect(obj.context).toEqual(equityContext);
        expect(obj.coreData).toEqual(priceData);
      }
    });

    it("should return object that can be used with fromDSL", () => {
      const result1 = MarketData.create(cryptoContext, level1Data);
      expect(result1.tag).toBe("success");

      if (result1.tag === "success") {
        const obj = result1.value.toObject();
        const result2 = MarketData.fromDSL(obj);

        expect(result2.tag).toBe("success");
        if (result2.tag === "success") {
          expect(result2.value.context).toEqual(cryptoContext);
          expect(result2.value.coreData).toEqual(level1Data);
          expect(result2.value.isLevel1()).toBe(true);
        }
      }
    });

    it("should maintain type safety in round-trip conversion", () => {
      const testCases = [
        { context: equityContext, coreData: priceData, typeGuard: "isPrice" as const },
        { context: cryptoContext, coreData: level1Data, typeGuard: "isLevel1" as const },
        { context: forexContext, coreData: ohlcvData, typeGuard: "isOHLCV" as const },
        { context: equityContext, coreData: marketDepthData, typeGuard: "isMarketDepth" as const },
      ];

      for (const testCase of testCases) {
        const result1 = MarketData.create(testCase.context, testCase.coreData);
        expect(result1.tag).toBe("success");

        if (result1.tag === "success") {
          const obj = result1.value.toObject();
          const result2 = MarketData.fromDSL(obj);

          expect(result2.tag).toBe("success");
          if (result2.tag === "success") {
            expect(result2.value[testCase.typeGuard]()).toBe(true);
          }
        }
      }
    });
  });

  describe("real world market data", () => {
    it("should handle US equity price data", () => {
      const applePrice: DSL.Price = {
        timestamp: "2024-03-15T14:30:15.123Z",
        price: "175.50",
        size: "100",
      };

      const result = MarketData.create(equityContext, applePrice);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getSymbol()).toBe("AAPL");
        expect(result.value.getMarketType()).toBe("EQUITY");
        expect(result.value.getAssetClass()).toBe("STOCK");
        expect(result.value.isPrice()).toBe(true);
      }
    });

    it("should handle crypto level1 data", () => {
      const btcLevel1: DSL.Level1 = {
        timestamp: "2024-03-15T14:30:30.456Z",
        bidPrice: "67800.50",
        bidSize: "0.5",
        askPrice: "67801.25",
        askSize: "0.3",
      };

      const result = MarketData.create(cryptoContext, btcLevel1);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getSymbol()).toBe("BTC/USD");
        expect(result.value.getMarketType()).toBe("CRYPTO");
        expect(result.value.getAssetClass()).toBe("CRYPTO");
        expect(result.value.isLevel1()).toBe(true);
      }
    });

    it("should handle forex OHLCV data", () => {
      const eurUsdOhlcv: DSL.OHLCV = {
        timestamp: "2024-03-15T14:30:00.000Z",
        open: "1.08950",
        high: "1.09125",
        low: "1.08875",
        close: "1.09050",
        volume: "15000000",
      };

      const result = MarketData.create(forexContext, eurUsdOhlcv);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getSymbol()).toBe("EUR/USD");
        expect(result.value.getMarketType()).toBe("FOREX");
        expect(result.value.getAssetClass()).toBe("CURRENCY");
        expect(result.value.isOHLCV()).toBe(true);
      }
    });

    it("should handle equity market depth data", () => {
      const appleDepth: DSL.MarketDepth = {
        timestamp: "2024-03-15T14:30:45.789Z",
        bids: [
          { price: "175.48", size: "300" },
          { price: "175.47", size: "500" },
          { price: "175.46", size: "200" },
        ],
        asks: [
          { price: "175.52", size: "250" },
          { price: "175.53", size: "400" },
          { price: "175.54", size: "150" },
        ],
      };

      const result = MarketData.create(equityContext, appleDepth);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        expect(result.value.getSymbol()).toBe("AAPL");
        expect(result.value.getExchangeId()).toBe("nasdaq");
        expect(result.value.isMarketDepth()).toBe(true);
        expect(result.value.getTimestamp()).toBe("2024-03-15T14:30:45.789Z");
      }
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context for validation failures", () => {
      const result = MarketData.create(null as any, undefined as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.category).toBe("VALIDATION");
        expect(result.error.context).toBeDefined();
      }
    });

    it("should maintain error categories consistently", () => {
      const testCases = [
        [null, priceData],
        [equityContext, null],
        [undefined, priceData],
        [equityContext, undefined],
        ["invalid", priceData],
        [equityContext, "invalid"],
      ];

      for (const [context, coreData] of testCases) {
        const result = MarketData.create(context as any, coreData as any);
        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.category).toBe("VALIDATION");
        }
      }
    });

    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        { context: {}, coreData: priceData },
        { context: equityContext, coreData: {} },
        { context: [], coreData: priceData },
        { context: equityContext, coreData: [] },
      ];

      for (const edgeCase of edgeCases) {
        const result = MarketData.create(edgeCase.context as any, edgeCase.coreData as any);
        expect(result.tag).toBe("success"); // Basic objects should pass the type validation
      }
    });
  });
});
