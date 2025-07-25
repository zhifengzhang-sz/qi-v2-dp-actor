/**
 * Tests for RepandaWriter concrete class
 * Tests all DSL.Writer interface methods with Redpanda streaming integration
 */

import { Err, Ok, create } from "@qi/base";
import type { QiError, Result } from "@qi/base";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepandaWriter } from "../../../src/actor/redpanda/RepandaWriter.js";
import type * as DSL from "../../../src/dsl/index.js";
import type * as MD from "../../../src/md/index.js";

// Mock the streaming infrastructure
vi.mock("../../../src/base/streaming/index.js", () => {
  const mockProducer = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    sendBatch: vi.fn(),
  };

  const mockClient = {
    getProducer: vi.fn().mockResolvedValue({ tag: "success", value: mockProducer }),
    disconnect: vi.fn(),
  };

  return {
    createStreamingClient: vi.fn(() => mockClient),
  };
});

// Mock @qi/core
vi.mock("@qi/core", () => ({
  createLogger: vi.fn(() => ({
    tag: "success" as const,
    value: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  })),
  createMemoryCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Create a concrete test implementation
class TestRepandaWriter extends RepandaWriter {
  // Expose protected/private methods for testing
  public async testEnsureConnected(): Promise<Result<void, QiError>> {
    return this.ensureConnected();
  }

  public testCreateMessage<T extends DSL.CoreMarketData>(
    topic: string,
    data: MD.MarketData<T>
  ): any {
    return this.createMessage(topic, data);
  }

  public testBuildMessageKey<T extends DSL.CoreMarketData>(data: MD.MarketData<T>): string {
    return this.buildMessageKey(data);
  }

  public async testPublishMessage(topic: string, message: any): Promise<Result<void, QiError>> {
    return this.publishMessage(topic, message);
  }

  public async testPublishBatch(topic: string, messages: any[]): Promise<Result<void, QiError>> {
    return this.publishBatch(topic, messages);
  }

  // Expose private members for testing
  public getConfig() {
    return this.config;
  }

  public getClient() {
    return this.client;
  }

  public getProducer() {
    return this.producer;
  }
}

describe("RepandaWriter", () => {
  let testContext: DSL.DataContext;
  let writer: TestRepandaWriter;
  let mockStreamingClient: any;
  let mockProducer: any;

  // Test data setup
  const mockMarket: DSL.Market = {
    type: "CRYPTO",
    region: "US",
    segment: "CASH",
  };

  const mockExchange: DSL.Exchange = {
    id: "binance",
    name: "Binance",
    mic: null,
    timezone: "UTC",
  };

  const mockInstrument: DSL.Instrument = {
    symbol: "BTC/USD",
    isin: null,
    name: "Bitcoin",
    assetClass: "CRYPTO",
    currency: "USD",
  };

  const mockDataContext: DSL.DataContext = {
    market: mockMarket,
    exchange: mockExchange,
    instrument: mockInstrument,
  };

  // Create test market data instances
  const mockPrice: MD.Price = {
    timestamp: "2025-07-23T10:00:00.000Z",
    price: "50000.00",
    size: "1.5",
    tradeId: "trade123",
    aggressor: "BUY",
  } as MD.Price;

  const mockMarketDataPrice: MD.MarketData<MD.Price> = {
    context: mockDataContext,
    coreData: mockPrice,
  };

  const mockLevel1: MD.Level1 = {
    timestamp: "2025-07-23T10:00:00.000Z",
    bidPrice: "49900.00",
    bidSize: "2.0",
    askPrice: "50100.00",
    askSize: "1.8",
  } as MD.Level1;

  const mockMarketDataLevel1: MD.MarketData<MD.Level1> = {
    context: mockDataContext,
    coreData: mockLevel1,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    testContext = mockDataContext;
    writer = new TestRepandaWriter(testContext);

    // Mock instances are available through the mocked module
    mockProducer = {
      connect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
      disconnect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
      send: vi.fn().mockResolvedValue({
        tag: "success",
        value: { partition: 0, offset: "123" },
      }),
      sendBatch: vi.fn().mockResolvedValue({
        tag: "success",
        value: { totalMessages: 2 },
      }),
    };

    mockStreamingClient = {
      getProducer: vi.fn().mockResolvedValue({ tag: "success", value: mockProducer }),
      disconnect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
    };

    // Get the mock from the mocked module and configure it
    const { createStreamingClient } = await import("../../../src/base/streaming/index.js");
    vi.mocked(createStreamingClient).mockReturnValue(mockStreamingClient);
  });

  describe("Constructor", () => {
    it("should initialize with default config", () => {
      const config = writer.getConfig();
      expect(config.brokers).toEqual(["localhost:9092"]);
      expect(config.clientId).toBe("qi-repanda-writer");
      expect(config.topics.prices).toBe("market-data-prices");
      expect(config.topics.level1).toBe("market-data-level1");
      expect(config.topics.depth).toBe("market-data-depth");
      expect(config.topics.ohlcv).toBe("market-data-ohlcv");
    });

    it("should merge provided config with defaults", () => {
      const customConfig = {
        brokers: ["custom:9092"],
        clientId: "custom-writer",
        topics: { prices: "custom-prices" },
      };

      const customWriter = new TestRepandaWriter(testContext, customConfig);
      const config = customWriter.getConfig();

      expect(config.brokers).toEqual(["custom:9092"]);
      expect(config.clientId).toBe("custom-writer");
      expect(config.topics.prices).toBe("custom-prices");
      // Should keep defaults for non-overridden values
      expect(config.topics.level1).toBe("market-data-level1");
    });

    it("should initialize logger and cache", async () => {
      const { createLogger, createMemoryCache } = await import("@qi/core");
      expect(createLogger).toHaveBeenCalledWith({ level: "info", pretty: true });
      expect(createMemoryCache).toHaveBeenCalledWith({ maxSize: 1000, defaultTtl: 60 });
    });
  });

  describe("Connection Management", () => {
    it("should establish connection successfully", async () => {
      const result = await writer.testEnsureConnected();

      expect(result.tag).toBe("success");
      expect(mockStreamingClient.getProducer).toHaveBeenCalled();
    });

    it("should return existing connection if already connected", async () => {
      // First connection
      await writer.testEnsureConnected();
      vi.clearAllMocks();

      // Second connection should reuse existing
      const result = await writer.testEnsureConnected();

      expect(result.tag).toBe("success");
      expect(mockStreamingClient.getProducer).not.toHaveBeenCalled();
    });

    it("should handle producer creation failure", async () => {
      mockStreamingClient.getProducer.mockResolvedValueOnce({
        tag: "failure",
        error: create("PRODUCER_FAILED", "Producer creation failed", "SYSTEM"),
      });

      const result = await writer.testEnsureConnected();

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("CONNECTION_FAILED");
      expect(result.error?.message).toContain("Producer creation failed");
    });

    it("should disconnect properly", async () => {
      await writer.testEnsureConnected();

      const result = await writer.disconnect();

      expect(result.tag).toBe("success");
    });
  });

  describe("Message Creation", () => {
    it("should create message with proper structure", () => {
      const topic = "test-topic";
      const message = writer.testCreateMessage(topic, mockMarketDataPrice);

      expect(message.key).toBe("CRYPTO:binance:BTC/USD");
      expect(message.value).toBeInstanceOf(Buffer);
      expect(message.timestamp).toBeInstanceOf(Date);

      // Parse the message value to verify structure
      const payload = JSON.parse(message.value.toString());
      expect(payload.context).toEqual(mockDataContext);
      expect(payload.coreData).toEqual(mockPrice);
      expect(payload.timestamp).toBeDefined();
    });

    it("should build message key correctly", () => {
      const key = writer.testBuildMessageKey(mockMarketDataPrice);
      expect(key).toBe("CRYPTO:binance:BTC/USD");
    });

    it("should create different keys for different contexts", () => {
      const differentContext = {
        ...mockDataContext,
        market: { ...mockMarket, type: "STOCK" as const },
        exchange: { ...mockExchange, id: "nyse" },
        instrument: { ...mockInstrument, symbol: "AAPL" },
      };

      const differentMarketData = {
        ...mockMarketDataPrice,
        context: differentContext,
      };

      const key = writer.testBuildMessageKey(differentMarketData);
      expect(key).toBe("STOCK:nyse:AAPL");
    });
  });

  describe("Message Publishing", () => {
    it("should publish single message successfully", async () => {
      // Ensure connection is established first
      await writer.testEnsureConnected();

      const topic = "test-topic";
      const message = writer.testCreateMessage(topic, mockMarketDataPrice);

      const result = await writer.testPublishMessage(topic, message);

      expect(result.tag).toBe("success");
      expect(mockProducer.send).toHaveBeenCalledWith(topic, message);
    });

    it("should publish batch messages successfully", async () => {
      // Ensure connection is established first
      await writer.testEnsureConnected();

      const topic = "test-topic";
      const messages = [
        writer.testCreateMessage(topic, mockMarketDataPrice),
        writer.testCreateMessage(topic, mockMarketDataPrice),
      ];

      const result = await writer.testPublishBatch(topic, messages);

      expect(result.tag).toBe("success");
      expect(mockProducer.sendBatch).toHaveBeenCalledWith({ topic, messages });
    });

    it("should handle send failure", async () => {
      mockProducer.send.mockResolvedValueOnce({
        tag: "failure",
        error: create("SEND_FAILED", "Message send failed", "NETWORK"),
      });

      const topic = "test-topic";
      const message = writer.testCreateMessage(topic, mockMarketDataPrice);

      const result = await writer.testPublishMessage(topic, message);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("PUBLISH_ERROR");
    });

    it("should handle batch send failure", async () => {
      mockProducer.sendBatch.mockResolvedValueOnce({
        tag: "failure",
        error: create("BATCH_SEND_FAILED", "Batch send failed", "NETWORK"),
      });

      const topic = "test-topic";
      const messages = [writer.testCreateMessage(topic, mockMarketDataPrice)];

      const result = await writer.testPublishBatch(topic, messages);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("BATCH_PUBLISH_ERROR");
    });
  });

  describe("Handler Methods", () => {
    beforeEach(async () => {
      // Ensure connection is established for handler tests
      await writer.testEnsureConnected();
    });

    it("should handle writePrice", async () => {
      const result = await writer.writePrice(mockMarketDataPrice);

      expect(result.tag).toBe("success");
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it("should handle writePrices with batch", async () => {
      const priceData = [mockMarketDataPrice, mockMarketDataPrice];

      const result = await writer.writePrices(priceData);

      expect(result.tag).toBe("success");
      expect(mockProducer.sendBatch).toHaveBeenCalled();
    });

    it("should handle writeLevel1", async () => {
      const result = await writer.writeLevel1(mockMarketDataLevel1);

      expect(result.tag).toBe("success");
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it("should handle writeMarketDepth", async () => {
      const mockDepth: MD.MarketDepth = {
        timestamp: "2025-07-23T10:00:00.000Z",
        bids: [{ price: "49900.00", size: "1.0", level: 1 }],
        asks: [{ price: "50100.00", size: "1.5", level: 1 }],
      } as MD.MarketDepth;

      const mockMarketDataDepth: MD.MarketData<MD.MarketDepth> = {
        context: mockDataContext,
        coreData: mockDepth,
      };

      const result = await writer.writeMarketDepth(mockMarketDataDepth);

      expect(result.tag).toBe("success");
    });

    it("should handle writeOHLCV", async () => {
      const mockOHLCV: MD.OHLCV = {
        timestamp: "2025-07-23T10:00:00.000Z",
        open: "49500.00",
        high: "50500.00",
        low: "49000.00",
        close: "50000.00",
        volume: "125.5",
      } as MD.OHLCV;

      const mockMarketDataOHLCV: MD.MarketData<MD.OHLCV> = {
        context: mockDataContext,
        coreData: mockOHLCV,
      };

      const result = await writer.writeOHLCV(mockMarketDataOHLCV);

      expect(result.tag).toBe("success");
    });

    it("should handle writeOHLCVBatch", async () => {
      const mockOHLCV: MD.OHLCV = {
        timestamp: "2025-07-23T10:00:00.000Z",
        open: "49500.00",
        high: "50500.00",
        low: "49000.00",
        close: "50000.00",
        volume: "125.5",
      } as MD.OHLCV;

      const mockMarketDataOHLCV: MD.MarketData<MD.OHLCV> = {
        context: mockDataContext,
        coreData: mockOHLCV,
      };

      const ohlcvData = [mockMarketDataOHLCV, mockMarketDataOHLCV];

      const result = await writer.writeOHLCVBatch(ohlcvData);

      expect(result.tag).toBe("success");
      expect(mockProducer.sendBatch).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle connection failures in write operations", async () => {
      mockStreamingClient.getProducer.mockResolvedValueOnce({
        tag: "failure",
        error: create("CONNECTION_FAILED", "Connection failed", "NETWORK"),
      });

      const result = await writer.writePrice(mockMarketDataPrice);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("CONNECTION_FAILED");
    });

    it("should handle producer not initialized error", async () => {
      // Create a new writer that won't have connection established
      const freshWriter = new TestRepandaWriter(testContext);

      // Mock the ensureConnected to fail
      vi.spyOn(freshWriter as any, "ensureConnected").mockResolvedValueOnce({
        tag: "failure",
        error: create("CONNECTION_FAILED", "Producer not connected", "SYSTEM"),
      });

      const result = await freshWriter.writePrice(mockMarketDataPrice);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("CONNECTION_FAILED");
    });

    it("should handle send errors gracefully", async () => {
      await writer.testEnsureConnected();

      mockProducer.send.mockResolvedValueOnce({
        tag: "failure",
        error: create("SEND_ERROR", "Network error", "NETWORK"),
      });

      const result = await writer.writePrice(mockMarketDataPrice);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("PUBLISH_ERROR");
    });

    it("should handle batch send errors gracefully", async () => {
      await writer.testEnsureConnected();

      mockProducer.sendBatch.mockResolvedValueOnce({
        tag: "failure",
        error: create("BATCH_ERROR", "Batch processing failed", "NETWORK"),
      });

      const result = await writer.writePrices([mockMarketDataPrice]);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("BATCH_PUBLISH_ERROR");
    });

    it("should handle multiple failure scenarios in batch operations", async () => {
      await writer.testEnsureConnected();

      // Test with empty array
      const emptyResult = await writer.writePrices([]);
      expect(emptyResult.tag).toBe("success"); // Should handle empty arrays gracefully

      // Test with single item (should still use batch logic)
      const singleResult = await writer.writePrices([mockMarketDataPrice]);
      expect(singleResult.tag).toBe("success");
    });
  });

  describe("Topic Routing", () => {
    beforeEach(async () => {
      await writer.testEnsureConnected();
    });

    it("should route price data to correct topic", async () => {
      await writer.writePrice(mockMarketDataPrice);

      expect(mockProducer.send).toHaveBeenCalledWith("market-data-prices", expect.any(Object));
    });

    it("should route level1 data to correct topic", async () => {
      await writer.writeLevel1(mockMarketDataLevel1);

      expect(mockProducer.send).toHaveBeenCalledWith("market-data-level1", expect.any(Object));
    });

    it("should route market depth data to correct topic", async () => {
      const mockDepth: MD.MarketDepth = {
        timestamp: "2025-07-23T10:00:00.000Z",
        bids: [],
        asks: [],
      } as MD.MarketDepth;

      const mockMarketDataDepth: MD.MarketData<MD.MarketDepth> = {
        context: mockDataContext,
        coreData: mockDepth,
      };

      await writer.writeMarketDepth(mockMarketDataDepth);

      expect(mockProducer.send).toHaveBeenCalledWith("market-data-depth", expect.any(Object));
    });

    it("should route OHLCV data to correct topic", async () => {
      const mockOHLCV: MD.OHLCV = {
        timestamp: "2025-07-23T10:00:00.000Z",
        open: "100.00",
        high: "105.00",
        low: "95.00",
        close: "102.00",
        volume: "1000.0",
      } as MD.OHLCV;

      const mockMarketDataOHLCV: MD.MarketData<MD.OHLCV> = {
        context: mockDataContext,
        coreData: mockOHLCV,
      };

      await writer.writeOHLCV(mockMarketDataOHLCV);

      expect(mockProducer.send).toHaveBeenCalledWith("market-data-ohlcv", expect.any(Object));
    });
  });

  describe("Message Serialization", () => {
    it("should serialize message payload correctly", () => {
      const topic = "test-topic";
      const message = writer.testCreateMessage(topic, mockMarketDataPrice);

      const payload = JSON.parse(message.value.toString());

      expect(payload).toHaveProperty("context");
      expect(payload).toHaveProperty("coreData");
      expect(payload).toHaveProperty("timestamp");

      expect(payload.context).toEqual(mockDataContext);
      expect(payload.coreData).toEqual(mockPrice);
      expect(typeof payload.timestamp).toBe("string");
    });

    it("should create unique timestamps for different messages", async () => {
      const message1 = writer.testCreateMessage("test", mockMarketDataPrice);

      // Longer delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const message2 = writer.testCreateMessage("test", mockMarketDataPrice);

      const payload1 = JSON.parse(message1.value.toString());
      const payload2 = JSON.parse(message2.value.toString());

      expect(payload1.timestamp).not.toBe(payload2.timestamp);
    });
  });
});
