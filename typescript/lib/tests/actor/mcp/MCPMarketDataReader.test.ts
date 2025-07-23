/**
 * Tests for MCPMarketDataReader concrete class
 * Tests all DSL.MarketDataReader interface methods with MCP integration
 */

import type { QiError, Result } from "@qi/base";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCPMarketDataReader } from "../../../src/actor/mcp/MCPMarketDataReader.js";
import type * as DSL from "../../../src/dsl/index.js";

// Mock the MCPBaseActor class
vi.mock("../../../src/actor/mcp/MCPBaseActor.js", () => {
  return {
    MCPBaseActor: class {
      constructor(context: DSL.DataContext, serverCommand: string[]) {
        this.context = context;
        this.serverCommand = serverCommand;
      }

      async workflow<T>(
        handlerPromise: Promise<Result<T, QiError>>,
        errorType: string
      ): Promise<Result<T, QiError>> {
        // Mock workflow implementation - just return the handler promise
        return handlerPromise;
      }

      async callTool(name: string, args: any): Promise<Result<any, Error>> {
        // This will be mocked in individual tests
        return { tag: "success" as const, value: { mockResult: true } };
      }
    },
  };
});

describe("MCPMarketDataReader", () => {
  let testContext: DSL.DataContext;
  let contexts: DSL.DataContext[];
  let reader: MCPMarketDataReader;
  let mockCallTool: any;

  // Test data setup
  const mockPrice: DSL.MarketData<DSL.Price> = {
    context: {} as DSL.DataContext,
    data: {
      timestamp: new Date("2025-07-23T10:00:00Z"),
      price: "50000.00",
      size: "1.5",
      tradeId: "trade123",
      aggressor: "BUY",
    },
    metadata: {
      sourceType: "EXCHANGE",
      quality: "REAL_TIME",
      latencyMs: 10,
    },
  };

  const mockLevel1: DSL.MarketData<DSL.Level1> = {
    context: {} as DSL.DataContext,
    data: {
      timestamp: new Date("2025-07-23T10:00:00Z"),
      bid: "49950.00",
      ask: "50050.00",
      bidSize: "2.0",
      askSize: "1.8",
      lastPrice: "50000.00",
      lastSize: "0.5",
    },
    metadata: {
      sourceType: "EXCHANGE",
      quality: "REAL_TIME",
      latencyMs: 5,
    },
  };

  const mockMarketDepth: DSL.MarketData<DSL.MarketDepth> = {
    context: {} as DSL.DataContext,
    data: {
      timestamp: new Date("2025-07-23T10:00:00Z"),
      bids: [
        { price: "49950.00", size: "2.0", orderCount: 5 },
        { price: "49940.00", size: "3.0", orderCount: 8 },
      ],
      asks: [
        { price: "50050.00", size: "1.8", orderCount: 3 },
        { price: "50060.00", size: "2.5", orderCount: 6 },
      ],
    },
    metadata: {
      sourceType: "EXCHANGE",
      quality: "REAL_TIME",
      latencyMs: 15,
    },
  };

  const mockOHLCV: DSL.MarketData<DSL.OHLCV> = {
    context: {} as DSL.DataContext,
    data: {
      timestamp: new Date("2025-07-23T10:00:00Z"),
      open: "49800.00",
      high: "50200.00",
      low: "49700.00",
      close: "50000.00",
      volume: "150.75",
    },
    metadata: {
      sourceType: "EXCHANGE",
      quality: "REAL_TIME",
      latencyMs: 20,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    testContext = {
      market: { type: "CRYPTO", region: "US", segment: "CASH" },
      exchange: { id: "binance", name: "Binance", mic: null, timezone: "UTC" },
      instrument: {
        symbol: "BTC/USD",
        isin: null,
        name: "Bitcoin/US Dollar",
        assetClass: "CRYPTO",
        currency: "USD",
      },
    };

    contexts = [
      testContext,
      {
        market: { type: "CRYPTO", region: "US", segment: "CASH" },
        exchange: { id: "coinbase", name: "Coinbase", mic: null, timezone: "UTC" },
        instrument: {
          symbol: "ETH/USD",
          isin: null,
          name: "Ethereum/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      },
    ];

    reader = new MCPMarketDataReader(testContext, ["node", "mcp-server.js"]);

    // Mock the callTool method
    mockCallTool = vi.spyOn(reader as any, "callTool");
  });

  describe("getCurrentPrice", () => {
    it("should successfully get current price", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockPrice });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockPrice);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_current_price", { context: testContext });
    });

    it("should handle MCP tool call failure for getCurrentPrice", async () => {
      const toolError = new Error("Price fetch failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: toolError });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "get_current_price",
          args: { context: testContext },
        });
      }
    });

    it("should pass through workflow error handling", async () => {
      // Mock workflow to simulate error handling
      vi.spyOn(reader as any, "workflow").mockResolvedValue({
        tag: "failure",
        error: {
          code: "PRICE_FETCH_ERROR",
          message: "Workflow error",
          category: "SYSTEM",
        },
      });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("PRICE_FETCH_ERROR");
      }
    });
  });

  describe("getCurrentPrices", () => {
    it("should successfully get current prices for multiple contexts", async () => {
      const mockPrices = [
        mockPrice,
        { ...mockPrice, data: { ...mockPrice.data, price: "3000.00" } },
      ];
      mockCallTool.mockResolvedValue({ tag: "success", value: mockPrices });

      const result = await reader.getCurrentPrices(contexts);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockPrices);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_current_prices", { contexts });
    });

    it("should handle empty contexts array", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: [] });

      const result = await reader.getCurrentPrices([]);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual([]);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_current_prices", { contexts: [] });
    });
  });

  describe("getLevel1", () => {
    it("should successfully get Level1 data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockLevel1 });

      const result = await reader.getLevel1(testContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockLevel1);
        expect(result.value.data.bid).toBe("49950.00");
        expect(result.value.data.ask).toBe("50050.00");
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_level1", { context: testContext });
    });

    it("should handle Level1 fetch failure", async () => {
      const toolError = new Error("Level1 unavailable");
      mockCallTool.mockResolvedValue({ tag: "failure", error: toolError });

      const result = await reader.getLevel1(testContext);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("get_level1");
      }
    });
  });

  describe("getMarketDepth", () => {
    const levels: DSL.Levels = { count: 5 };

    it("should successfully get market depth data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockMarketDepth });

      const result = await reader.getMarketDepth(testContext, levels);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockMarketDepth);
        expect(result.value.data.bids).toHaveLength(2);
        expect(result.value.data.asks).toHaveLength(2);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_market_depth", {
        context: testContext,
        levels,
      });
    });

    it("should handle different levels configurations", async () => {
      const customLevels: DSL.Levels = { count: 10 };
      mockCallTool.mockResolvedValue({ tag: "success", value: mockMarketDepth });

      const result = await reader.getMarketDepth(testContext, customLevels);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("get_market_depth", {
        context: testContext,
        levels: customLevels,
      });
    });
  });

  describe("getOHLCV", () => {
    const timeframe: DSL.Timeframe = { interval: "1m", unit: "MINUTE" };

    it("should successfully get OHLCV data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockOHLCV });

      const result = await reader.getOHLCV(testContext, timeframe);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockOHLCV);
        expect(result.value.data.open).toBe("49800.00");
        expect(result.value.data.close).toBe("50000.00");
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_ohlcv", { context: testContext, timeframe });
    });

    it("should handle different timeframes", async () => {
      const hourlyTimeframe: DSL.Timeframe = { interval: "1h", unit: "HOUR" };
      mockCallTool.mockResolvedValue({ tag: "success", value: mockOHLCV });

      const result = await reader.getOHLCV(testContext, hourlyTimeframe);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("get_ohlcv", {
        context: testContext,
        timeframe: hourlyTimeframe,
      });
    });
  });

  describe("getPriceHistory", () => {
    const dateRange: DSL.DateRange = {
      start: new Date("2025-07-22T00:00:00Z"),
      end: new Date("2025-07-23T00:00:00Z"),
    };

    it("should successfully get price history", async () => {
      const mockPriceHistory = [
        mockPrice,
        { ...mockPrice, data: { ...mockPrice.data, price: "49500.00" } },
      ];
      mockCallTool.mockResolvedValue({ tag: "success", value: mockPriceHistory });

      const result = await reader.getPriceHistory(testContext, dateRange);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockPriceHistory);
        expect(result.value).toHaveLength(2);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_price_history", {
        context: testContext,
        range: dateRange,
      });
    });

    it("should handle empty price history", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: [] });

      const result = await reader.getPriceHistory(testContext, dateRange);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("getLevel1History", () => {
    const dateRange: DSL.DateRange = {
      start: new Date("2025-07-22T00:00:00Z"),
      end: new Date("2025-07-23T00:00:00Z"),
    };

    it("should successfully get Level1 history", async () => {
      const mockLevel1History = [
        mockLevel1,
        { ...mockLevel1, data: { ...mockLevel1.data, bid: "49900.00" } },
      ];
      mockCallTool.mockResolvedValue({ tag: "success", value: mockLevel1History });

      const result = await reader.getLevel1History(testContext, dateRange);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockLevel1History);
        expect(result.value).toHaveLength(2);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_level1_history", {
        context: testContext,
        range: dateRange,
      });
    });

    it("should handle Level1 history fetch failure", async () => {
      const historyError = new Error("Historical data unavailable");
      mockCallTool.mockResolvedValue({ tag: "failure", error: historyError });

      const result = await reader.getLevel1History(testContext, dateRange);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.tool).toBe("get_level1_history");
      }
    });
  });

  describe("getOHLCVHistory", () => {
    const timeframe: DSL.Timeframe = { interval: "5m", unit: "MINUTE" };
    const dateRange: DSL.DateRange = {
      start: new Date("2025-07-22T00:00:00Z"),
      end: new Date("2025-07-23T00:00:00Z"),
    };

    it("should successfully get OHLCV history", async () => {
      const mockOHLCVHistory = [
        mockOHLCV,
        { ...mockOHLCV, data: { ...mockOHLCV.data, close: "50100.00" } },
      ];
      mockCallTool.mockResolvedValue({ tag: "success", value: mockOHLCVHistory });

      const result = await reader.getOHLCVHistory(testContext, timeframe, dateRange);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockOHLCVHistory);
        expect(result.value).toHaveLength(2);
      }
      expect(mockCallTool).toHaveBeenCalledWith("get_ohlcv_history", {
        context: testContext,
        timeframe,
        range: dateRange,
      });
    });

    it("should handle complex date ranges", async () => {
      const longRange: DSL.DateRange = {
        start: new Date("2025-07-01T00:00:00Z"),
        end: new Date("2025-07-23T00:00:00Z"),
      };
      mockCallTool.mockResolvedValue({ tag: "success", value: [] });

      const result = await reader.getOHLCVHistory(testContext, timeframe, longRange);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("get_ohlcv_history", {
        context: testContext,
        timeframe,
        range: longRange,
      });
    });
  });

  describe("callMCPTool private method behavior", () => {
    it("should convert successful callTool results", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { data: "test" } });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("success");
    });

    it("should convert failed callTool results to QiError", async () => {
      const originalError = new Error("Network timeout");
      mockCallTool.mockResolvedValue({ tag: "failure", error: originalError });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.category).toBe("SYSTEM");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "get_current_price",
          originalError: "Network timeout",
        });
      }
    });
  });

  describe("integration with DSL interfaces", () => {
    it("should implement all MarketDataReader interface methods", () => {
      // Verify all required methods exist
      expect(typeof reader.getCurrentPrice).toBe("function");
      expect(typeof reader.getCurrentPrices).toBe("function");
      expect(typeof reader.getLevel1).toBe("function");
      expect(typeof reader.getMarketDepth).toBe("function");
      expect(typeof reader.getOHLCV).toBe("function");
      expect(typeof reader.getPriceHistory).toBe("function");
      expect(typeof reader.getLevel1History).toBe("function");
      expect(typeof reader.getOHLCVHistory).toBe("function");
    });

    it("should return proper Result<T, QiError> types", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockPrice });

      const result = await reader.getCurrentPrice(testContext);

      // Type validation - should be Result<MarketData<Price>, QiError>
      expect(result).toHaveProperty("tag");
      expect(["success", "failure"]).toContain(result.tag);

      if (result.tag === "success") {
        expect(result.value).toHaveProperty("context");
        expect(result.value).toHaveProperty("data");
        expect(result.value).toHaveProperty("metadata");
      }
    });
  });

  describe("error boundary testing", () => {
    it("should handle workflow throwing exceptions", async () => {
      // Mock workflow to throw an exception
      vi.spyOn(reader as any, "workflow").mockRejectedValue(new Error("Workflow exception"));

      try {
        await reader.getCurrentPrice(testContext);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Workflow exception");
      }
    });

    it("should handle malformed MCP responses", async () => {
      // Mock callTool to return malformed data
      mockCallTool.mockResolvedValue({ tag: "success", value: null });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeNull();
      }
    });
  });
});
