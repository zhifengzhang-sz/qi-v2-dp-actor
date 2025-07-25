/**
 * Tests for RepandaReader concrete class
 * Tests all DSL.Reader interface methods with Redpanda streaming integration
 */

import { Err, Ok, create } from "@qi/base";
import type { QiError, Result } from "@qi/base";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepandaReader } from "../../../src/actor/redpanda/RepandaReader.js";
import type * as DSL from "../../../src/dsl/index.js";
import type * as MD from "../../../src/md/index.js";

// Mock the streaming infrastructure
vi.mock("../../../src/base/streaming/index.js", () => {
  const mockConsumer = {
    connect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
    disconnect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
    subscribe: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
    run: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
  };

  const mockClient = {
    getConsumer: vi.fn().mockResolvedValue({ tag: "success", value: mockConsumer }),
    disconnect: vi.fn().mockResolvedValue({ tag: "success", value: undefined }),
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
class TestRepandaReader extends RepandaReader {
  // Expose protected methods for testing
  public async testEnsureConnected(): Promise<Result<void, QiError>> {
    console.log("About to call ensureConnected()");
    try {
      const result = await this.ensureConnected();
      console.log("ensureConnected() returned:", result);
      return result;
    } catch (error) {
      console.log("ensureConnected() threw error:", error);
      throw error;
    }
  }

  public async testConsumeLatest(topic: string): Promise<Result<any, QiError>> {
    return this.consumeLatest(topic);
  }

  public testParsePrice(message: any): Result<MD.MarketData<MD.Price>, QiError> {
    return this.parsePrice(message);
  }

  public testParseLevel1(message: any): Result<MD.MarketData<MD.Level1>, QiError> {
    return this.parseLevel1(message);
  }

  public testParseMarketDepth(message: any): Result<MD.MarketData<MD.MarketDepth>, QiError> {
    return this.parseMarketDepth(message);
  }

  public testParseOHLCV(message: any): Result<MD.MarketData<MD.OHLCV>, QiError> {
    return this.parseOHLCV(message);
  }

  public testCreateDataContext(contextData: any): Result<MD.DataContext, QiError> {
    return this.createDataContext(contextData);
  }

  // Expose private members for testing
  public getConfig() {
    return this.config;
  }

  public getClient() {
    return this.client;
  }

  public getConsumer() {
    return this.consumer;
  }
}

describe("RepandaReader", () => {
  let testContext: DSL.DataContext;
  let reader: TestRepandaReader;
  let mockStreamingClient: any;
  let mockConsumer: any;

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

  const mockPriceMessage = {
    topic: "market-data-prices",
    partition: 0,
    offset: "123",
    key: "binance:BTC/USD",
    value: Buffer.from(
      JSON.stringify({
        context: mockDataContext,
        coreData: {
          timestamp: "2025-07-23T10:00:00Z",
          price: "50000.00",
          size: "1.5",
          tradeId: "trade123",
          aggressor: "BUY",
        },
      })
    ),
    timestamp: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    testContext = mockDataContext;
    reader = new TestRepandaReader(testContext);

    // Get the mock from the mocked module
    const { createStreamingClient } = await import("../../../src/base/streaming/index.js");
    mockStreamingClient = createStreamingClient();
    mockConsumer = (await mockStreamingClient.getConsumer({ groupId: "test" })).value;
  });

  describe("Constructor", () => {
    it("should initialize with default config", () => {
      const config = reader.getConfig();
      expect(config.brokers).toEqual(["localhost:9092"]);
      expect(config.clientId).toBe("qi-repanda-reader");
      expect(config.groupId).toBe("qi-market-data-readers");
      expect(config.topics.prices).toBe("market-data-prices");
      expect(config.topics.level1).toBe("market-data-level1");
      expect(config.topics.depth).toBe("market-data-depth");
      expect(config.topics.ohlcv).toBe("market-data-ohlcv");
    });

    it("should merge provided config with defaults", () => {
      const customConfig = {
        brokers: ["custom:9092"],
        clientId: "custom-client",
        topics: { prices: "custom-prices" },
      };

      const customReader = new TestRepandaReader(testContext, customConfig);
      const config = customReader.getConfig();

      expect(config.brokers).toEqual(["custom:9092"]);
      expect(config.clientId).toBe("custom-client");
      expect(config.topics.prices).toBe("custom-prices");
      // Should keep defaults for non-overridden values
      expect(config.groupId).toBe("qi-market-data-readers");
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
      const result = await reader.testEnsureConnected();

      expect(result.tag).toBe("success");
      expect(mockStreamingClient.getConsumer).toHaveBeenCalledWith({
        groupId: "qi-market-data-readers",
      });
    });

    it("should return existing connection if already connected", async () => {
      // First connection
      await reader.testEnsureConnected();
      vi.clearAllMocks();

      // Second connection should reuse existing
      const result = await reader.testEnsureConnected();

      expect(result.tag).toBe("success");
      expect(mockStreamingClient.getConsumer).not.toHaveBeenCalled();
    });

    it("should handle consumer creation failure", async () => {
      mockStreamingClient.getConsumer.mockResolvedValueOnce({
        tag: "failure",
        error: create("CONSUMER_FAILED", "Consumer creation failed", "SYSTEM"),
      });

      const result = await reader.testEnsureConnected();

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("CONNECTION_FAILED");
      expect(result.error?.message).toContain("Consumer creation failed");
    });

    it("should disconnect properly", async () => {
      await reader.testEnsureConnected();

      const result = await reader.disconnect();

      expect(result.tag).toBe("success");
    });
  });

  describe("Message Parsing", () => {
    describe("parsePrice", () => {
      it("should parse valid price message", () => {
        const result = reader.testParsePrice(mockPriceMessage);

        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.context.instrument.symbol).toBe("BTC/USD");
          expect(result.value.coreData.price).toBe("50000.00");
          expect(result.value.coreData.size).toBe("1.5");
          expect(result.value.coreData.tradeId).toBe("trade123");
          expect(result.value.coreData.aggressor).toBe("BUY");
        }
      });

      it("should handle invalid JSON in message", () => {
        const invalidMessage = {
          ...mockPriceMessage,
          value: Buffer.from("invalid json"),
        };

        const result = reader.testParsePrice(invalidMessage);

        expect(result.tag).toBe("failure");
        expect(result.error?.code).toBe("PARSE_ERROR");
      });

      it("should handle missing coreData", () => {
        const invalidMessage = {
          ...mockPriceMessage,
          value: Buffer.from(
            JSON.stringify({
              context: mockDataContext,
              // Missing coreData
            })
          ),
        };

        const result = reader.testParsePrice(invalidMessage);

        expect(result.tag).toBe("failure");
      });
    });

    describe("parseLevel1", () => {
      const mockLevel1Message = {
        ...mockPriceMessage,
        value: Buffer.from(
          JSON.stringify({
            context: mockDataContext,
            coreData: {
              timestamp: "2025-07-23T10:00:00Z",
              bidPrice: "49900.00",
              bidSize: "2.0",
              askPrice: "50100.00",
              askSize: "1.8",
            },
          })
        ),
      };

      it("should parse valid level1 message", () => {
        const result = reader.testParseLevel1(mockLevel1Message);

        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.coreData.bidPrice).toBe("49900.00");
          expect(result.value.coreData.bidSize).toBe("2.0");
          expect(result.value.coreData.askPrice).toBe("50100.00");
          expect(result.value.coreData.askSize).toBe("1.8");
        }
      });

      it("should handle invalid level1 data", () => {
        const invalidMessage = {
          ...mockLevel1Message,
          value: Buffer.from("invalid"),
        };

        const result = reader.testParseLevel1(invalidMessage);
        expect(result.tag).toBe("failure");
        expect(result.error?.code).toBe("PARSE_ERROR");
      });
    });

    describe("parseMarketDepth", () => {
      const mockDepthMessage = {
        ...mockPriceMessage,
        value: Buffer.from(
          JSON.stringify({
            context: mockDataContext,
            coreData: {
              timestamp: "2025-07-23T10:00:00Z",
              bids: [
                { price: "49900.00", size: "1.0", level: 1 },
                { price: "49800.00", size: "2.0", level: 2 },
              ],
              asks: [
                { price: "50100.00", size: "1.5", level: 1 },
                { price: "50200.00", size: "1.2", level: 2 },
              ],
            },
          })
        ),
      };

      it("should parse valid market depth message", () => {
        const result = reader.testParseMarketDepth(mockDepthMessage);

        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.coreData.bids).toHaveLength(2);
          expect(result.value.coreData.asks).toHaveLength(2);
          expect(result.value.coreData.bids[0].price).toBe("49900.00");
          expect(result.value.coreData.asks[0].price).toBe("50100.00");
        }
      });
    });

    describe("parseOHLCV", () => {
      const mockOHLCVMessage = {
        ...mockPriceMessage,
        value: Buffer.from(
          JSON.stringify({
            context: mockDataContext,
            coreData: {
              timestamp: "2025-07-23T10:00:00Z",
              open: "49500.00",
              high: "50500.00",
              low: "49000.00",
              close: "50000.00",
              volume: "125.5",
            },
          })
        ),
      };

      it("should parse valid OHLCV message", () => {
        const result = reader.testParseOHLCV(mockOHLCVMessage);

        expect(result.tag).toBe("success");
        if (result.tag === "success") {
          expect(result.value.coreData.open).toBe("49500.00");
          expect(result.value.coreData.high).toBe("50500.00");
          expect(result.value.coreData.low).toBe("49000.00");
          expect(result.value.coreData.close).toBe("50000.00");
          expect(result.value.coreData.volume).toBe("125.5");
        }
      });
    });
  });

  describe("Data Context Creation", () => {
    it("should create valid DataContext from contextData", () => {
      const contextData = {
        market: mockMarket,
        exchange: mockExchange,
        instrument: mockInstrument,
      };

      const result = reader.testCreateDataContext(contextData);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.type).toBe("CRYPTO");
        expect(result.value.exchange.id).toBe("binance");
        expect(result.value.instrument.symbol).toBe("BTC/USD");
      }
    });

    it("should handle invalid context data", () => {
      const invalidContextData = {
        market: { ...mockMarket, type: "INVALID" as any },
        exchange: mockExchange,
        instrument: mockInstrument,
      };

      const result = reader.testCreateDataContext(invalidContextData);

      expect(result.tag).toBe("failure");
    });
  });

  describe("Handler Methods", () => {
    beforeEach(async () => {
      // Mock successful connection and message consumption by mocking the consumer.run method
      mockConsumer.run = vi.fn().mockImplementation(async ({ eachMessage }) => {
        // Get the topic from the subscription call (we'll need to track this)
        const lastSubscribedTopic =
          mockConsumer.subscribe.mock.lastCall?.[0]?.topics?.[0] || "market-data-prices";

        let messageData: any;
        switch (lastSubscribedTopic) {
          case "market-data-level1":
            messageData = {
              context: mockDataContext,
              coreData: {
                timestamp: "2025-07-23T10:00:00Z",
                bidPrice: "49900.00",
                bidSize: "2.0",
                askPrice: "50100.00",
                askSize: "1.8",
              },
            };
            break;
          case "market-data-depth":
            messageData = {
              context: mockDataContext,
              coreData: {
                timestamp: "2025-07-23T10:00:00Z",
                bids: [
                  { price: "49900.00", size: "1.0", level: 1 },
                  { price: "49800.00", size: "2.0", level: 2 },
                ],
                asks: [
                  { price: "50100.00", size: "1.5", level: 1 },
                  { price: "50200.00", size: "1.2", level: 2 },
                ],
              },
            };
            break;
          case "market-data-ohlcv":
            messageData = {
              context: mockDataContext,
              coreData: {
                timestamp: "2025-07-23T10:00:00Z",
                open: "49500.00",
                high: "50500.00",
                low: "49000.00",
                close: "50000.00",
                volume: "125.5",
              },
            };
            break;
          default: // market-data-prices
            messageData = {
              context: mockDataContext,
              coreData: {
                timestamp: "2025-07-23T10:00:00Z",
                price: "50000.00",
                size: "1.5",
                tradeId: "trade123",
                aggressor: "BUY",
              },
            };
        }

        // Simulate receiving a message
        await eachMessage({
          topic: lastSubscribedTopic,
          partition: 0,
          message: {
            offset: "123",
            key: Buffer.from("binance:BTC/USD"),
            value: Buffer.from(JSON.stringify(messageData)),
            timestamp: Date.now().toString(),
            attributes: 0,
            headers: {},
          },
        });
        return { tag: "success", value: undefined };
      });
    });

    it("should handle getCurrentPrice", async () => {
      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.coreData.price).toBe("50000.00");
      }
    });

    it("should handle getCurrentPrices for multiple contexts", async () => {
      const contexts = [testContext, testContext];

      const result = await reader.getCurrentPrices(contexts);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value).toHaveLength(2);
      }
    });

    it("should handle getLevel1", async () => {
      const result = await reader.getLevel1(testContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.coreData.bidPrice).toBe("49900.00");
      }
    });

    it("should handle getMarketDepth", async () => {
      const levels: DSL.Levels = 5;

      const result = await reader.getMarketDepth(testContext, levels);

      expect(result.tag).toBe("success");
    });

    it("should handle getOHLCV", async () => {
      const timeframe: DSL.Timeframe = "1m";

      const result = await reader.getOHLCV(testContext, timeframe);

      expect(result.tag).toBe("success");
    });

    it("should return empty array for historical methods", async () => {
      const dateRange: DSL.DateRange = {
        start: new Date("2025-07-22T00:00:00Z"),
        end: new Date("2025-07-23T00:00:00Z"),
      };

      const priceHistoryResult = await reader.getPriceHistory(testContext, dateRange);
      expect(priceHistoryResult.tag).toBe("success");
      expect(priceHistoryResult.value).toEqual([]);

      const level1HistoryResult = await reader.getLevel1History(testContext, dateRange);
      expect(level1HistoryResult.tag).toBe("success");
      expect(level1HistoryResult.value).toEqual([]);

      const ohlcvHistoryResult = await reader.getOHLCVHistory(testContext, "1m", dateRange);
      expect(ohlcvHistoryResult.tag).toBe("success");
      expect(ohlcvHistoryResult.value).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should handle connection failures gracefully", async () => {
      mockStreamingClient.getConsumer.mockResolvedValueOnce({
        tag: "failure",
        error: create("CONNECTION_FAILED", "Connection failed", "NETWORK"),
      });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("PRICE_FETCH_ERROR");
      expect(result.error?.message).toContain("Connection failed");
    });

    it("should handle message consumption failures", async () => {
      // Mock consumer.run to simulate no messages available
      mockConsumer.run = vi.fn().mockImplementation(async () => {
        throw new Error("No messages available");
      });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("PRICE_FETCH_ERROR");
      expect(result.error?.message).toContain("No messages available");
    });

    it("should handle parsing failures", async () => {
      // Mock consumer.run to provide invalid JSON
      mockConsumer.run = vi.fn().mockImplementation(async ({ eachMessage }) => {
        await eachMessage({
          topic: "market-data-prices",
          partition: 0,
          message: {
            offset: "123",
            key: Buffer.from("binance:BTC/USD"),
            value: Buffer.from("invalid json"),
            timestamp: Date.now().toString(),
            attributes: 0,
            headers: {},
          },
        });
        return { tag: "success", value: undefined };
      });

      const result = await reader.getCurrentPrice(testContext);

      expect(result.tag).toBe("failure");
      expect(result.error?.code).toBe("PRICE_FETCH_ERROR");
      expect(result.error?.message).toContain("Parsing failed");
    });
  });
});
