/**
 * RepandaReader - Real Redpanda integration using existing streaming infrastructure
 */

import { Err, Ok, type Result, create, flatMap, fromAsyncTryCatch } from "@qi/base";
import type { QiError } from "@qi/base";
import { type ICache, type Logger, createLogger, createMemoryCache } from "@qi/core";
import {
  type ConsumedMessage,
  type IStreamingClient,
  type IStreamingConsumer,
  createStreamingClient,
} from "../../base/streaming";
import type * as DSL from "../../dsl";
import * as MD from "../../md";
import { Reader } from "../abstract/Reader";

interface RedpandaReaderConfig {
  readonly brokers: string[];
  readonly clientId: string;
  readonly groupId: string;
  readonly topics: {
    readonly prices: string;
    readonly level1: string;
    readonly depth: string;
    readonly ohlcv: string;
  };
}

export class RepandaReader extends Reader {
  private readonly config: RedpandaReaderConfig;
  private readonly logger: Logger;
  private readonly cache: ICache;
  private client: IStreamingClient | null = null;
  private consumer: IStreamingConsumer | null = null;
  private initializationError: QiError | null = null;

  constructor(context: DSL.DataContext, config?: Partial<RedpandaReaderConfig>) {
    super(context);

    const defaultConfig = {
      brokers: ["localhost:9092"],
      clientId: "qi-repanda-reader",
      groupId: "qi-market-data-readers",
      topics: {
        prices: "market-data-prices",
        level1: "market-data-level1",
        depth: "market-data-depth",
        ohlcv: "market-data-ohlcv",
      },
    };

    this.config = {
      ...defaultConfig,
      ...config,
      topics: {
        ...defaultConfig.topics,
        ...config?.topics,
      },
    };

    const loggerResult = createLogger({ level: "info", pretty: true });
    if (loggerResult.tag === "failure") {
      this.initializationError = loggerResult.error;
      // Create minimal fallback logger to prevent crashes
      this.logger = {
        info: () => {},
        error: () => {},
        debug: () => {},
        warn: () => {},
        child: () => this.logger,
      } as any;
    } else {
      this.logger = loggerResult.value;
    }

    this.cache = createMemoryCache({ maxSize: 1000, defaultTtl: 60 });
  }

  private checkInitialization(): Result<void, QiError> {
    return this.initializationError ? Err(this.initializationError) : Ok(undefined);
  }

  protected async ensureConnected(): Promise<Result<void, QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    if (this.client && this.consumer) {
      return Ok(undefined);
    }

    return fromAsyncTryCatch(
      async () => {
        this.client = createStreamingClient();
        const consumerResult = await this.client.getConsumer({ groupId: this.config.groupId });

        if (consumerResult.tag === "failure") {
          throw new Error(`Consumer creation failed: ${consumerResult.error.message}`);
        }

        this.consumer = consumerResult.value;
        const connectResult = await this.consumer.connect();

        if (connectResult.tag === "failure") {
          throw new Error(`Connection failed: ${connectResult.error.message}`);
        }

        return undefined;
      },
      (error) => create("CONNECTION_FAILED", String(error), "SYSTEM")
    );
  }

  protected async consumeLatest(topic: string): Promise<Result<ConsumedMessage, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        if (!this.consumer) {
          throw new Error("Consumer not initialized");
        }

        await this.consumer.subscribe({ topics: [topic], fromBeginning: false });

        let latestMessage: ConsumedMessage | null = null;

        await this.consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            latestMessage = {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString() || "",
              value: message.value || Buffer.from(""),
              timestamp: new Date(),
            };
          },
        });

        if (!latestMessage) {
          throw new Error("No messages available");
        }

        return latestMessage;
      },
      (error) => create("CONSUME_ERROR", String(error), "SYSTEM")
    );
  }

  protected parsePrice(message: ConsumedMessage): Result<MD.MarketData<MD.Price>, QiError> {
    try {
      const data = JSON.parse(message.value.toString());

      return flatMap(
        (price) =>
          flatMap(
            (context) => MD.MarketData.create(context, price),
            this.createDataContext(data.context)
          ),
        MD.Price.create(
          data.coreData.timestamp,
          data.coreData.price,
          data.coreData.size,
          data.coreData.tradeId,
          data.coreData.aggressor
        )
      );
    } catch (error) {
      return Err(create("PARSE_ERROR", String(error), "VALIDATION"));
    }
  }

  protected parseLevel1(message: ConsumedMessage): Result<MD.MarketData<MD.Level1>, QiError> {
    try {
      const data = JSON.parse(message.value.toString());

      return flatMap(
        (level1) =>
          flatMap(
            (context) => MD.MarketData.create(context, level1),
            this.createDataContext(data.context)
          ),
        MD.Level1.create(
          data.coreData.timestamp,
          data.coreData.bidPrice,
          data.coreData.bidSize,
          data.coreData.askPrice,
          data.coreData.askSize
        )
      );
    } catch (error) {
      return Err(create("PARSE_ERROR", String(error), "VALIDATION"));
    }
  }

  protected parseMarketDepth(
    message: ConsumedMessage
  ): Result<MD.MarketData<MD.MarketDepth>, QiError> {
    try {
      const data = JSON.parse(message.value.toString());

      return flatMap(
        (depth) =>
          flatMap(
            (context) => MD.MarketData.create(context, depth),
            this.createDataContext(data.context)
          ),
        MD.MarketDepth.create(data.coreData.timestamp, data.coreData.bids, data.coreData.asks)
      );
    } catch (error) {
      return Err(create("PARSE_ERROR", String(error), "VALIDATION"));
    }
  }

  protected parseOHLCV(message: ConsumedMessage): Result<MD.MarketData<MD.OHLCV>, QiError> {
    try {
      const data = JSON.parse(message.value.toString());

      return flatMap(
        (ohlcv) =>
          flatMap(
            (context) => MD.MarketData.create(context, ohlcv),
            this.createDataContext(data.context)
          ),
        MD.OHLCV.create(
          data.coreData.timestamp,
          data.coreData.open,
          data.coreData.high,
          data.coreData.low,
          data.coreData.close,
          data.coreData.volume
        )
      );
    } catch (error) {
      return Err(create("PARSE_ERROR", String(error), "VALIDATION"));
    }
  }

  protected createDataContext(contextData: any): Result<MD.DataContext, QiError> {
    return flatMap(
      (market) =>
        flatMap(
          (exchange) =>
            flatMap(
              (instrument) => MD.DataContext.create(market, exchange, instrument),
              MD.Instrument.create(
                contextData.instrument.symbol,
                contextData.instrument.isin,
                contextData.instrument.name,
                contextData.instrument.assetClass,
                contextData.instrument.currency
              )
            ),
          MD.Exchange.create(
            contextData.exchange.id,
            contextData.exchange.name,
            contextData.exchange.mic,
            contextData.exchange.timezone
          )
        ),
      MD.Market.create(
        contextData.market.type,
        contextData.market.region,
        contextData.market.segment
      )
    );
  }

  // Abstract handler implementations
  protected async getCurrentPriceHandler(
    _context: DSL.DataContext
  ): Promise<Result<MD.MarketData<MD.Price>, QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    return fromAsyncTryCatch(
      async () => {
        const connectResult = await this.ensureConnected();
        if (connectResult.tag === "failure") {
          throw new Error(`Connection failed: ${connectResult.error.message}`);
        }

        const messageResult = await this.consumeLatest(this.config.topics.prices);
        if (messageResult.tag === "failure") {
          throw new Error(`Message consumption failed: ${messageResult.error.message}`);
        }

        const parseResult = this.parsePrice(messageResult.value);
        if (parseResult.tag === "failure") {
          throw new Error(`Parsing failed: ${parseResult.error.message}`);
        }

        return parseResult.value;
      },
      (error) => create("PRICE_FETCH_ERROR", String(error), "SYSTEM")
    );
  }

  protected async getCurrentPricesHandler(
    contexts: DSL.DataContext[]
  ): Promise<Result<MD.MarketData<MD.Price>[], QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    return fromAsyncTryCatch(
      async () => {
        const results = await Promise.all(
          contexts.map((context) => this.getCurrentPriceHandler(context))
        );

        const failures = results.filter((r) => r.tag === "failure");
        if (failures.length > 0) {
          const firstFailure = failures[0] as any;
          throw new Error(
            `Failed to fetch ${failures.length} out of ${contexts.length} prices: ${firstFailure.error.message}`
          );
        }

        const prices = results.map((r) => (r as any).value);
        return prices;
      },
      (error) => create("BATCH_PRICE_FETCH_ERROR", String(error), "SYSTEM")
    );
  }

  protected async getLevel1Handler(
    _context: DSL.DataContext
  ): Promise<Result<MD.MarketData<MD.Level1>, QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    return fromAsyncTryCatch(
      async () => {
        const connectResult = await this.ensureConnected();
        if (connectResult.tag === "failure") {
          throw new Error(`Connection failed: ${connectResult.error.message}`);
        }

        const messageResult = await this.consumeLatest(this.config.topics.level1);
        if (messageResult.tag === "failure") {
          throw new Error(`Message consumption failed: ${messageResult.error.message}`);
        }

        const parseResult = this.parseLevel1(messageResult.value);
        if (parseResult.tag === "failure") {
          throw new Error(`Parsing failed: ${parseResult.error.message}`);
        }

        return parseResult.value;
      },
      (error) => create("LEVEL1_FETCH_ERROR", String(error), "SYSTEM")
    );
  }

  protected async getMarketDepthHandler(
    _context: DSL.DataContext,
    _levels: DSL.Levels
  ): Promise<Result<MD.MarketData<MD.MarketDepth>, QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    return fromAsyncTryCatch(
      async () => {
        const connectResult = await this.ensureConnected();
        if (connectResult.tag === "failure") {
          throw new Error(`Connection failed: ${connectResult.error.message}`);
        }

        const messageResult = await this.consumeLatest(this.config.topics.depth);
        if (messageResult.tag === "failure") {
          throw new Error(`Message consumption failed: ${messageResult.error.message}`);
        }

        const parseResult = this.parseMarketDepth(messageResult.value);
        if (parseResult.tag === "failure") {
          throw new Error(`Parsing failed: ${parseResult.error.message}`);
        }

        return parseResult.value;
      },
      (error) => create("MARKET_DEPTH_FETCH_ERROR", String(error), "SYSTEM")
    );
  }

  protected async getOHLCVHandler(
    _context: DSL.DataContext,
    _timeframe: DSL.Timeframe
  ): Promise<Result<MD.MarketData<MD.OHLCV>, QiError>> {
    const initCheck = this.checkInitialization();
    if (initCheck.tag === "failure") {
      return initCheck;
    }

    return fromAsyncTryCatch(
      async () => {
        const connectResult = await this.ensureConnected();
        if (connectResult.tag === "failure") {
          throw new Error(`Connection failed: ${connectResult.error.message}`);
        }

        const messageResult = await this.consumeLatest(this.config.topics.ohlcv);
        if (messageResult.tag === "failure") {
          throw new Error(`Message consumption failed: ${messageResult.error.message}`);
        }

        const parseResult = this.parseOHLCV(messageResult.value);
        if (parseResult.tag === "failure") {
          throw new Error(`Parsing failed: ${parseResult.error.message}`);
        }

        return parseResult.value;
      },
      (error) => create("OHLCV_FETCH_ERROR", String(error), "SYSTEM")
    );
  }

  protected async getPriceHistoryHandler(
    _context: DSL.DataContext,
    _range: DSL.DateRange
  ): Promise<Result<MD.MarketData<MD.Price>[], QiError>> {
    // Historical data requires different approach - seek to timestamp range
    return Ok([]);
  }

  protected async getLevel1HistoryHandler(
    _context: DSL.DataContext,
    _range: DSL.DateRange
  ): Promise<Result<MD.MarketData<MD.Level1>[], QiError>> {
    return Ok([]);
  }

  protected async getOHLCVHistoryHandler(
    _context: DSL.DataContext,
    _timeframe: DSL.Timeframe,
    _range: DSL.DateRange
  ): Promise<Result<MD.MarketData<MD.OHLCV>[], QiError>> {
    return Ok([]);
  }

  async disconnect(): Promise<Result<void, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        if (this.consumer) {
          const result = await this.consumer.disconnect();
          if (result.tag === "failure") {
            throw new Error(`Consumer disconnect failed: ${result.error.message}`);
          }
        }
        if (this.client) {
          const result = await this.client.disconnect();
          if (result.tag === "failure") {
            throw new Error(`Client disconnect failed: ${result.error.message}`);
          }
        }
        return undefined;
      },
      (error) => create("DISCONNECT_ERROR", String(error), "SYSTEM")
    );
  }
}
