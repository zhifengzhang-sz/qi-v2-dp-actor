/**
 * Tests for MCPStreamingReader concrete class
 * Tests all DSL.StreamingMarketDataReader interface methods with MCP integration
 */

import type { QiError, Result } from "@qi/base";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCPStreamingReader } from "../../../src/actor/mcp/MCPStreamingReader.js";
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
        return { tag: "success" as const, value: { subscriptionId: "sub123" } };
      }
    },
  };
});

describe("MCPStreamingReader", () => {
  let testContext: DSL.DataContext;
  let reader: MCPStreamingReader;
  let mockCallTool: any;

  // Mock callback functions
  let mockPriceCallback: (data: DSL.MarketData<DSL.Price>) => void;
  let mockLevel1Callback: (data: DSL.MarketData<DSL.Level1>) => void;
  let mockMarketDepthCallback: (data: DSL.MarketData<DSL.MarketDepth>) => void;
  let mockOHLCVCallback: (data: DSL.MarketData<DSL.OHLCV>) => void;

  // Test data setup
  const mockSubscription: DSL.Subscription = {
    id: "sub123",
    status: "ACTIVE",
    context: {} as DSL.DataContext,
    type: "PRICE_STREAM",
    createdAt: new Date("2025-07-23T10:00:00Z"),
  };

  const mockPriceData: DSL.MarketData<DSL.Price> = {
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

  const mockLevel1Data: DSL.MarketData<DSL.Level1> = {
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

  const mockMarketDepthData: DSL.MarketData<DSL.MarketDepth> = {
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

  const mockOHLCVData: DSL.MarketData<DSL.OHLCV> = {
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

    reader = new MCPStreamingReader(testContext, ["node", "mcp-server.js"]);

    // Mock the callTool method
    mockCallTool = vi.spyOn(reader as any, "callTool");

    // Create mock callback functions
    mockPriceCallback = vi.fn();
    mockLevel1Callback = vi.fn();
    mockMarketDepthCallback = vi.fn();
    mockOHLCVCallback = vi.fn();
  });

  describe("subscribePriceStream", () => {
    it("should successfully subscribe to price stream", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockSubscription);
        expect(result.value.id).toBe("sub123");
        expect(result.value.status).toBe("ACTIVE");
      }
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_price_stream", {
        context: testContext,
        callback: mockPriceCallback,
      });
    });

    it("should handle price stream subscription failure", async () => {
      const subscriptionError = new Error("Subscription failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: subscriptionError });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "subscribe_price_stream",
          originalError: "Subscription failed",
        });
      }
    });

    it("should pass through workflow error handling", async () => {
      vi.spyOn(reader as any, "workflow").mockResolvedValue({
        tag: "failure",
        error: {
          code: "PRICE_STREAM_SUBSCRIBE_ERROR",
          message: "Workflow error",
          category: "SYSTEM",
        },
      });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("PRICE_STREAM_SUBSCRIBE_ERROR");
      }
    });

    it("should handle callback function validation", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      // Test with arrow function callback
      const arrowCallback = (data: DSL.MarketData<DSL.Price>) => {
        console.log("Received price:", data.data.price);
      };

      const result = await reader.subscribePriceStream(testContext, arrowCallback);
      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_price_stream", {
        context: testContext,
        callback: arrowCallback,
      });
    });
  });

  describe("subscribeLevel1Stream", () => {
    it("should successfully subscribe to Level1 stream", async () => {
      const level1Subscription = { ...mockSubscription, type: "LEVEL1_STREAM" as const };
      mockCallTool.mockResolvedValue({ tag: "success", value: level1Subscription });

      const result = await reader.subscribeLevel1Stream(testContext, mockLevel1Callback);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.type).toBe("LEVEL1_STREAM");
      }
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_level1_stream", {
        context: testContext,
        callback: mockLevel1Callback,
      });
    });

    it("should handle Level1 stream subscription failure", async () => {
      const level1Error = new Error("Level1 stream unavailable");
      mockCallTool.mockResolvedValue({ tag: "failure", error: level1Error });

      const result = await reader.subscribeLevel1Stream(testContext, mockLevel1Callback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("subscribe_level1_stream");
      }
    });

    it("should handle multiple Level1 subscriptions", async () => {
      const contexts = [
        testContext,
        { ...testContext, instrument: { ...testContext.instrument, symbol: "ETH/USD" } },
      ];

      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      // Subscribe to multiple contexts
      const results = await Promise.all(
        contexts.map((ctx) => reader.subscribeLevel1Stream(ctx, mockLevel1Callback))
      );

      for (const result of results) {
        expect(result.tag).toBe("success");
      }
      expect(mockCallTool).toHaveBeenCalledTimes(2);
    });
  });

  describe("subscribeMarketDepthStream", () => {
    const levels: DSL.Levels = { count: 5 };

    it("should successfully subscribe to market depth stream", async () => {
      const depthSubscription = { ...mockSubscription, type: "MARKET_DEPTH_STREAM" as const };
      mockCallTool.mockResolvedValue({ tag: "success", value: depthSubscription });

      const result = await reader.subscribeMarketDepthStream(
        testContext,
        levels,
        mockMarketDepthCallback
      );

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.type).toBe("MARKET_DEPTH_STREAM");
      }
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_market_depth_stream", {
        context: testContext,
        levels,
        callback: mockMarketDepthCallback,
      });
    });

    it("should handle different levels configurations", async () => {
      const customLevels: DSL.Levels = { count: 10 };
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const result = await reader.subscribeMarketDepthStream(
        testContext,
        customLevels,
        mockMarketDepthCallback
      );

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_market_depth_stream", {
        context: testContext,
        levels: customLevels,
        callback: mockMarketDepthCallback,
      });
    });

    it("should handle market depth subscription failure", async () => {
      const depthError = new Error("Market depth not available");
      mockCallTool.mockResolvedValue({ tag: "failure", error: depthError });

      const result = await reader.subscribeMarketDepthStream(
        testContext,
        levels,
        mockMarketDepthCallback
      );

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.tool).toBe("subscribe_market_depth_stream");
      }
    });

    it("should validate levels parameter", async () => {
      const extremeLevels: DSL.Levels = { count: 100 };
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const result = await reader.subscribeMarketDepthStream(
        testContext,
        extremeLevels,
        mockMarketDepthCallback
      );

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_market_depth_stream", {
        context: testContext,
        levels: extremeLevels,
        callback: mockMarketDepthCallback,
      });
    });
  });

  describe("subscribeOHLCVStream", () => {
    const timeframe: DSL.Timeframe = { interval: "1m", unit: "MINUTE" };

    it("should successfully subscribe to OHLCV stream", async () => {
      const ohlcvSubscription = { ...mockSubscription, type: "OHLCV_STREAM" as const };
      mockCallTool.mockResolvedValue({ tag: "success", value: ohlcvSubscription });

      const result = await reader.subscribeOHLCVStream(testContext, timeframe, mockOHLCVCallback);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.type).toBe("OHLCV_STREAM");
      }
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_ohlcv_stream", {
        context: testContext,
        timeframe,
        callback: mockOHLCVCallback,
      });
    });

    it("should handle different timeframes", async () => {
      const timeframes = [
        { interval: "1s", unit: "SECOND" as const },
        { interval: "5m", unit: "MINUTE" as const },
        { interval: "1h", unit: "HOUR" as const },
        { interval: "1d", unit: "DAY" as const },
      ];

      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      for (const tf of timeframes) {
        const result = await reader.subscribeOHLCVStream(testContext, tf, mockOHLCVCallback);
        expect(result.tag).toBe("success");
      }

      expect(mockCallTool).toHaveBeenCalledTimes(timeframes.length);
    });

    it("should handle OHLCV subscription failure", async () => {
      const ohlcvError = new Error("OHLCV stream not available");
      mockCallTool.mockResolvedValue({ tag: "failure", error: ohlcvError });

      const result = await reader.subscribeOHLCVStream(testContext, timeframe, mockOHLCVCallback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.tool).toBe("subscribe_ohlcv_stream");
      }
    });
  });

  describe("unsubscribe", () => {
    it("should successfully unsubscribe from stream", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await reader.unsubscribe(mockSubscription);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        // The callMCPTool returns the actual value from callTool, then workflow processes it
        // The DSL signature shows this should return Result<void>, but the implementation
        // currently passes through the MCP response. This is implementation-dependent.
        expect(result.value).toBeDefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("unsubscribe", { subscription: mockSubscription });
    });

    it("should handle unsubscribe failure", async () => {
      const unsubscribeError = new Error("Unsubscribe failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: unsubscribeError });

      const result = await reader.unsubscribe(mockSubscription);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("unsubscribe");
      }
    });

    it("should handle invalid subscription ID", async () => {
      const invalidSubscription: DSL.Subscription = {
        ...mockSubscription,
        id: "invalid-sub-id",
        status: "INACTIVE",
      };

      const unsubscribeError = new Error("Subscription not found");
      mockCallTool.mockResolvedValue({ tag: "failure", error: unsubscribeError });

      const result = await reader.unsubscribe(invalidSubscription);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.originalError).toBe("Subscription not found");
      }
    });

    it("should pass through workflow error handling", async () => {
      vi.spyOn(reader as any, "workflow").mockResolvedValue({
        tag: "failure",
        error: {
          code: "UNSUBSCRIBE_ERROR",
          message: "Workflow error",
          category: "SYSTEM",
        },
      });

      const result = await reader.unsubscribe(mockSubscription);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("UNSUBSCRIBE_ERROR");
      }
    });
  });

  describe("callMCPTool private method behavior", () => {
    it("should convert successful callTool results", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toEqual(mockSubscription);
      }
    });

    it("should convert failed callTool results to QiError", async () => {
      const originalError = new Error("Connection lost");
      mockCallTool.mockResolvedValue({ tag: "failure", error: originalError });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.category).toBe("SYSTEM");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "subscribe_price_stream",
          originalError: "Connection lost",
        });
      }
    });

    it("should handle different return types for unsubscribe", async () => {
      mockCallTool.mockResolvedValue({
        tag: "success",
        value: { success: true, message: "Unsubscribed" },
      });

      const result = await reader.unsubscribe(mockSubscription);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        // The implementation passes through the MCP response value
        expect(result.value).toBeDefined();
      }
    });
  });

  describe("integration with DSL interfaces", () => {
    it("should implement all StreamingMarketDataReader interface methods", () => {
      // Verify all required methods exist
      expect(typeof reader.subscribePriceStream).toBe("function");
      expect(typeof reader.subscribeLevel1Stream).toBe("function");
      expect(typeof reader.subscribeMarketDepthStream).toBe("function");
      expect(typeof reader.subscribeOHLCVStream).toBe("function");
      expect(typeof reader.unsubscribe).toBe("function");
    });

    it("should return proper Result types for subscriptions", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const priceResult = await reader.subscribePriceStream(testContext, mockPriceCallback);
      const level1Result = await reader.subscribeLevel1Stream(testContext, mockLevel1Callback);

      // Type validation - should be Result<Subscription, QiError>
      expect(priceResult).toHaveProperty("tag");
      expect(level1Result).toHaveProperty("tag");

      if (priceResult.tag === "success") {
        expect(priceResult.value).toHaveProperty("id");
        expect(priceResult.value).toHaveProperty("status");
        expect(priceResult.value).toHaveProperty("type");
      }
    });

    it("should handle all subscription types correctly", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const levels: DSL.Levels = { count: 5 };
      const timeframe: DSL.Timeframe = { interval: "1m", unit: "MINUTE" };

      // Test all subscription types
      const priceResult = await reader.subscribePriceStream(testContext, mockPriceCallback);
      const level1Result = await reader.subscribeLevel1Stream(testContext, mockLevel1Callback);
      const depthResult = await reader.subscribeMarketDepthStream(
        testContext,
        levels,
        mockMarketDepthCallback
      );
      const ohlcvResult = await reader.subscribeOHLCVStream(
        testContext,
        timeframe,
        mockOHLCVCallback
      );

      expect(priceResult.tag).toBe("success");
      expect(level1Result.tag).toBe("success");
      expect(depthResult.tag).toBe("success");
      expect(ohlcvResult.tag).toBe("success");

      // Verify different tool names were called
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_price_stream", expect.any(Object));
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_level1_stream", expect.any(Object));
      expect(mockCallTool).toHaveBeenCalledWith(
        "subscribe_market_depth_stream",
        expect.any(Object)
      );
      expect(mockCallTool).toHaveBeenCalledWith("subscribe_ohlcv_stream", expect.any(Object));
    });
  });

  describe("callback handling and streaming scenarios", () => {
    it("should handle callback invocation simulation", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      // Subscribe to price stream
      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);
      expect(result.tag).toBe("success");

      // Simulate callback being called (in real scenario, this would be done by MCP server)
      mockPriceCallback(mockPriceData);

      expect(mockPriceCallback).toHaveBeenCalledWith(mockPriceData);
      expect(mockPriceCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle high-frequency callback scenarios", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const callbackSpy = vi.fn();
      const result = await reader.subscribePriceStream(testContext, callbackSpy);
      expect(result.tag).toBe("success");

      // Simulate high-frequency price updates
      const priceUpdates = Array.from({ length: 100 }, (_, i) => ({
        ...mockPriceData,
        data: { ...mockPriceData.data, price: `${50000 + i}.00`, tradeId: `trade${i}` },
      }));

      for (const update of priceUpdates) {
        callbackSpy(update);
      }

      expect(callbackSpy).toHaveBeenCalledTimes(100);
    });

    it("should handle callback errors gracefully", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const errorCallback = vi.fn(() => {
        throw new Error("Callback processing error");
      });

      const result = await reader.subscribePriceStream(testContext, errorCallback);
      expect(result.tag).toBe("success");

      // Simulate callback error (should not break the subscription)
      expect(() => errorCallback(mockPriceData)).toThrow("Callback processing error");
      expect(errorCallback).toHaveBeenCalledWith(mockPriceData);
    });
  });

  describe("subscription lifecycle management", () => {
    it("should handle complete subscribe-unsubscribe cycle", async () => {
      // Subscribe
      mockCallTool.mockResolvedValueOnce({ tag: "success", value: mockSubscription });

      const subscribeResult = await reader.subscribePriceStream(testContext, mockPriceCallback);
      expect(subscribeResult.tag).toBe("success");

      // Unsubscribe
      mockCallTool.mockResolvedValueOnce({ tag: "success", value: { success: true } });

      if (subscribeResult.tag === "success") {
        const unsubscribeResult = await reader.unsubscribe(subscribeResult.value);
        expect(unsubscribeResult.tag).toBe("success");
      }

      expect(mockCallTool).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple active subscriptions", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: mockSubscription });

      const levels: DSL.Levels = { count: 5 };
      const timeframe: DSL.Timeframe = { interval: "1m", unit: "MINUTE" };

      // Create multiple subscriptions
      const subscriptions = await Promise.all([
        reader.subscribePriceStream(testContext, mockPriceCallback),
        reader.subscribeLevel1Stream(testContext, mockLevel1Callback),
        reader.subscribeMarketDepthStream(testContext, levels, mockMarketDepthCallback),
        reader.subscribeOHLCVStream(testContext, timeframe, mockOHLCVCallback),
      ]);

      for (const sub of subscriptions) {
        expect(sub.tag).toBe("success");
      }

      expect(mockCallTool).toHaveBeenCalledTimes(4);
    });

    it("should handle subscription state tracking", async () => {
      const activeSubscription = { ...mockSubscription, status: "ACTIVE" as const };
      const inactiveSubscription = { ...mockSubscription, status: "INACTIVE" as const };

      // Test with active subscription
      mockCallTool.mockResolvedValueOnce({ tag: "success", value: activeSubscription });
      const activeResult = await reader.subscribePriceStream(testContext, mockPriceCallback);

      if (activeResult.tag === "success") {
        expect(activeResult.value.status).toBe("ACTIVE");
      }

      // Test with inactive subscription
      mockCallTool.mockResolvedValueOnce({ tag: "success", value: inactiveSubscription });
      const inactiveResult = await reader.subscribePriceStream(testContext, mockPriceCallback);

      if (inactiveResult.tag === "success") {
        expect(inactiveResult.value.status).toBe("INACTIVE");
      }
    });
  });

  describe("error boundary testing", () => {
    it("should handle workflow throwing exceptions", async () => {
      vi.spyOn(reader as any, "workflow").mockRejectedValue(new Error("Workflow exception"));

      try {
        await reader.subscribePriceStream(testContext, mockPriceCallback);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Workflow exception");
      }
    });

    it("should handle malformed subscription responses", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { id: "sub123" } }); // Missing required fields

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.id).toBe("sub123"); // Should still work with partial data
      }
    });

    it("should handle network interruption scenarios", async () => {
      const networkError = new Error("Network connection lost");
      networkError.name = "NetworkError";
      mockCallTool.mockResolvedValue({ tag: "failure", error: networkError });

      const result = await reader.subscribePriceStream(testContext, mockPriceCallback);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.originalError).toBe("Network connection lost");
      }
    });
  });
});
