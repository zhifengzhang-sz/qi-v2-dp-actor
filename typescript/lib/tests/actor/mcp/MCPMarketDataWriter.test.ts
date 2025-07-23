/**
 * Tests for MCPMarketDataWriter concrete class
 * Tests all DSL.MarketDataWriter interface methods with MCP integration
 */

import type { QiError, Result } from "@qi/base";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCPMarketDataWriter } from "../../../src/actor/mcp/MCPMarketDataWriter.js";
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
        return { tag: "success" as const, value: { success: true } };
      }
    },
  };
});

describe("MCPMarketDataWriter", () => {
  let testContext: DSL.DataContext;
  let writer: MCPMarketDataWriter;
  let mockCallTool: any;

  // Test data setup
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

    writer = new MCPMarketDataWriter(testContext, ["node", "mcp-server.js"]);

    // Mock the callTool method
    mockCallTool = vi.spyOn(writer as any, "callTool");
  });

  describe("writePrice", () => {
    it("should successfully write single price data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined(); // void return type
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_price", { data: mockPriceData });
    });

    it("should handle price write failure", async () => {
      const writeError = new Error("Write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: writeError });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "write_price",
          args: { data: mockPriceData },
          originalError: "Write failed",
        });
      }
    });

    it("should pass through workflow error handling", async () => {
      vi.spyOn(writer as any, "workflow").mockResolvedValue({
        tag: "failure",
        error: {
          code: "PRICE_WRITE_ERROR",
          message: "Workflow error",
          category: "SYSTEM",
        },
      });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("PRICE_WRITE_ERROR");
      }
    });
  });

  describe("writePrices", () => {
    it("should successfully write multiple price data", async () => {
      const pricesArray = [
        mockPriceData,
        {
          ...mockPriceData,
          data: { ...mockPriceData.data, price: "49500.00", tradeId: "trade124" },
        },
        {
          ...mockPriceData,
          data: { ...mockPriceData.data, price: "50500.00", tradeId: "trade125" },
        },
      ];

      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, written: 3 } });

      const result = await writer.writePrices(pricesArray);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_prices", { data: pricesArray });
    });

    it("should handle empty prices array", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, written: 0 } });

      const result = await writer.writePrices([]);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("write_prices", { data: [] });
    });

    it("should handle batch write failure", async () => {
      const batchError = new Error("Batch write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: batchError });

      const result = await writer.writePrices([mockPriceData]);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("write_prices");
      }
    });
  });

  describe("writeLevel1", () => {
    it("should successfully write Level1 data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writeLevel1(mockLevel1Data);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_level1", { data: mockLevel1Data });
    });

    it("should handle Level1 write failure", async () => {
      const level1Error = new Error("Level1 write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: level1Error });

      const result = await writer.writeLevel1(mockLevel1Data);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("write_level1");
      }
    });

    it("should validate Level1 data structure", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      // Test with complete Level1 data
      expect(mockLevel1Data.data).toHaveProperty("bid");
      expect(mockLevel1Data.data).toHaveProperty("ask");
      expect(mockLevel1Data.data).toHaveProperty("bidSize");
      expect(mockLevel1Data.data).toHaveProperty("askSize");
      expect(mockLevel1Data.data).toHaveProperty("lastPrice");
      expect(mockLevel1Data.data).toHaveProperty("lastSize");

      const result = await writer.writeLevel1(mockLevel1Data);
      expect(result.tag).toBe("success");
    });
  });

  describe("writeMarketDepth", () => {
    it("should successfully write market depth data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writeMarketDepth(mockMarketDepthData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_market_depth", {
        data: mockMarketDepthData,
      });
    });

    it("should handle market depth with different bid/ask counts", async () => {
      const asymmetricDepth: DSL.MarketData<DSL.MarketDepth> = {
        ...mockMarketDepthData,
        data: {
          timestamp: new Date("2025-07-23T10:00:00Z"),
          bids: [
            { price: "49950.00", size: "2.0", orderCount: 5 },
            { price: "49940.00", size: "3.0", orderCount: 8 },
            { price: "49930.00", size: "1.5", orderCount: 3 },
          ],
          asks: [{ price: "50050.00", size: "1.8", orderCount: 3 }],
        },
      };

      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writeMarketDepth(asymmetricDepth);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("write_market_depth", { data: asymmetricDepth });
    });

    it("should handle market depth write failure", async () => {
      const depthError = new Error("Market depth write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: depthError });

      const result = await writer.writeMarketDepth(mockMarketDepthData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("write_market_depth");
      }
    });
  });

  describe("writeOHLCV", () => {
    it("should successfully write OHLCV data", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writeOHLCV(mockOHLCVData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_ohlcv", { data: mockOHLCVData });
    });

    it("should validate OHLCV data completeness", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      // Verify all required OHLCV fields
      expect(mockOHLCVData.data).toHaveProperty("open");
      expect(mockOHLCVData.data).toHaveProperty("high");
      expect(mockOHLCVData.data).toHaveProperty("low");
      expect(mockOHLCVData.data).toHaveProperty("close");
      expect(mockOHLCVData.data).toHaveProperty("volume");
      expect(mockOHLCVData.data).toHaveProperty("timestamp");

      const result = await writer.writeOHLCV(mockOHLCVData);
      expect(result.tag).toBe("success");
    });

    it("should handle OHLCV write failure", async () => {
      const ohlcvError = new Error("OHLCV write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: ohlcvError });

      const result = await writer.writeOHLCV(mockOHLCVData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("write_ohlcv");
      }
    });
  });

  describe("writeOHLCVBatch", () => {
    it("should successfully write OHLCV batch data", async () => {
      const ohlcvBatch = [
        mockOHLCVData,
        {
          ...mockOHLCVData,
          data: {
            ...mockOHLCVData.data,
            timestamp: new Date("2025-07-23T10:01:00Z"),
            close: "50100.00",
          },
        },
        {
          ...mockOHLCVData,
          data: {
            ...mockOHLCVData.data,
            timestamp: new Date("2025-07-23T10:02:00Z"),
            close: "50200.00",
          },
        },
      ];

      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, written: 3 } });

      const result = await writer.writeOHLCVBatch(ohlcvBatch);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
      expect(mockCallTool).toHaveBeenCalledWith("write_ohlcv_batch", { data: ohlcvBatch });
    });

    it("should handle large OHLCV batch", async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        ...mockOHLCVData,
        data: {
          ...mockOHLCVData.data,
          timestamp: new Date(
            `2025-07-23T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`
          ),
          close: `${50000 + i}.00`,
        },
      }));

      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, written: 1000 } });

      const result = await writer.writeOHLCVBatch(largeBatch);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("write_ohlcv_batch", { data: largeBatch });
    });

    it("should handle empty OHLCV batch", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, written: 0 } });

      const result = await writer.writeOHLCVBatch([]);

      expect(result.tag).toBe("success");
      expect(mockCallTool).toHaveBeenCalledWith("write_ohlcv_batch", { data: [] });
    });

    it("should handle OHLCV batch write failure", async () => {
      const batchError = new Error("OHLCV batch write failed");
      mockCallTool.mockResolvedValue({ tag: "failure", error: batchError });

      const result = await writer.writeOHLCVBatch([mockOHLCVData]);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.context?.tool).toBe("write_ohlcv_batch");
      }
    });
  });

  describe("callMCPTool private method behavior", () => {
    it("should convert successful callTool results to void", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true, id: "write123" } });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined(); // Always returns void for write operations
      }
    });

    it("should convert failed callTool results to QiError", async () => {
      const originalError = new Error("Database connection lost");
      mockCallTool.mockResolvedValue({ tag: "failure", error: originalError });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("MCP_TOOL_ERROR");
        expect(result.error.category).toBe("SYSTEM");
        expect(result.error.message).toContain("MCP tool call failed");
        expect(result.error.context).toMatchObject({
          tool: "write_price",
          originalError: "Database connection lost",
        });
      }
    });

    it("should handle different MCP response formats", async () => {
      // Test with minimal response
      mockCallTool.mockResolvedValue({ tag: "success", value: null });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined();
      }
    });
  });

  describe("integration with DSL interfaces", () => {
    it("should implement all MarketDataWriter interface methods", () => {
      // Verify all required methods exist
      expect(typeof writer.writePrice).toBe("function");
      expect(typeof writer.writePrices).toBe("function");
      expect(typeof writer.writeLevel1).toBe("function");
      expect(typeof writer.writeMarketDepth).toBe("function");
      expect(typeof writer.writeOHLCV).toBe("function");
      expect(typeof writer.writeOHLCVBatch).toBe("function");
    });

    it("should return proper Result<void, QiError> types", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      const result = await writer.writePrice(mockPriceData);

      // Type validation - should be Result<void, QiError>
      expect(result).toHaveProperty("tag");
      expect(["success", "failure"]).toContain(result.tag);

      if (result.tag === "success") {
        expect(result.value).toBeUndefined(); // void return type
      }
    });

    it("should handle all market data types correctly", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      // Test all data types
      const priceResult = await writer.writePrice(mockPriceData);
      const level1Result = await writer.writeLevel1(mockLevel1Data);
      const depthResult = await writer.writeMarketDepth(mockMarketDepthData);
      const ohlcvResult = await writer.writeOHLCV(mockOHLCVData);

      expect(priceResult.tag).toBe("success");
      expect(level1Result.tag).toBe("success");
      expect(depthResult.tag).toBe("success");
      expect(ohlcvResult.tag).toBe("success");

      // Verify different tool names were called
      expect(mockCallTool).toHaveBeenCalledWith("write_price", expect.any(Object));
      expect(mockCallTool).toHaveBeenCalledWith("write_level1", expect.any(Object));
      expect(mockCallTool).toHaveBeenCalledWith("write_market_depth", expect.any(Object));
      expect(mockCallTool).toHaveBeenCalledWith("write_ohlcv", expect.any(Object));
    });
  });

  describe("error boundary testing", () => {
    it("should handle workflow throwing exceptions", async () => {
      vi.spyOn(writer as any, "workflow").mockRejectedValue(new Error("Workflow exception"));

      try {
        await writer.writePrice(mockPriceData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Workflow exception");
      }
    });

    it("should handle malformed write responses", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { malformed: "response" } });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toBeUndefined(); // Should still return void
      }
    });

    it("should handle network timeout scenarios", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";
      mockCallTool.mockResolvedValue({ tag: "failure", error: timeoutError });

      const result = await writer.writePrice(mockPriceData);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.context?.originalError).toBe("Request timeout");
      }
    });
  });

  describe("performance and scalability", () => {
    it("should handle concurrent write operations", async () => {
      mockCallTool.mockResolvedValue({ tag: "success", value: { success: true } });

      // Simulate concurrent writes
      const writePromises = [
        writer.writePrice(mockPriceData),
        writer.writeLevel1(mockLevel1Data),
        writer.writeMarketDepth(mockMarketDepthData),
        writer.writeOHLCV(mockOHLCVData),
      ];

      const results = await Promise.all(writePromises);

      for (const result of results) {
        expect(result.tag).toBe("success");
      }

      expect(mockCallTool).toHaveBeenCalledTimes(4);
    });

    it("should handle partial failure in concurrent operations", async () => {
      mockCallTool
        .mockResolvedValueOnce({ tag: "success", value: { success: true } })
        .mockResolvedValueOnce({ tag: "failure", error: new Error("Write failed") })
        .mockResolvedValueOnce({ tag: "success", value: { success: true } });

      const results = await Promise.allSettled([
        writer.writePrice(mockPriceData),
        writer.writeLevel1(mockLevel1Data),
        writer.writeMarketDepth(mockMarketDepthData),
      ]);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("fulfilled");
      expect(results[2].status).toBe("fulfilled");

      if (results[1].status === "fulfilled") {
        expect(results[1].value.tag).toBe("failure");
      }
    });
  });
});
