/**
 * RepandaWriter - Real Redpanda integration using existing streaming infrastructure
 */

import { Err, Ok, type Result, create, flatMap, fromAsyncTryCatch } from "@qi/base";
import type { QiError } from "@qi/base";
import { type ICache, type Logger, createLogger, createMemoryCache } from "@qi/core";
import {
  type IStreamingClient,
  type IStreamingProducer,
  type StreamingMessage,
  createStreamingClient,
} from "../../base/streaming";
import type * as DSL from "../../dsl";
import type * as MD from "../../md";
import { Writer } from "../abstract/Writer";

interface RedpandaWriterConfig {
  readonly brokers: string[];
  readonly clientId: string;
  readonly topics: {
    readonly prices: string;
    readonly level1: string;
    readonly depth: string;
    readonly ohlcv: string;
  };
}

export class RepandaWriter extends Writer {
  private readonly config: RedpandaWriterConfig;
  private readonly logger: Logger;
  private readonly cache: ICache;
  private client: IStreamingClient | null = null;
  private producer: IStreamingProducer | null = null;
  private initializationError: QiError | null = null;

  constructor(context: DSL.DataContext, config?: Partial<RedpandaWriterConfig>) {
    super(context);

    const defaultConfig = {
      brokers: ["localhost:9092"],
      clientId: "qi-repanda-writer",
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
    if (initCheck.tag === "failure") return initCheck;

    if (this.client && this.producer) {
      return Ok(undefined);
    }

    return fromAsyncTryCatch(
      async () => {
        this.client = createStreamingClient();
        const producerResult = await this.client.getProducer();

        if (producerResult.tag === "failure") {
          throw new Error(`Producer creation failed: ${producerResult.error.message}`);
        }

        this.producer = producerResult.value;
        const connectResult = await this.producer.connect();

        if (connectResult.tag === "failure") {
          throw new Error(`Producer connection failed: ${connectResult.error.message}`);
        }
      },
      (error) => create("CONNECTION_FAILED", String(error), "SYSTEM")
    );
  }

  private createMessage<T extends DSL.CoreMarketData>(
    _topic: string,
    data: MD.MarketData<T>
  ): StreamingMessage {
    const key = this.buildMessageKey(data);
    const payload = {
      context: data.context,
      coreData: data.coreData,
      timestamp: new Date().toISOString(),
    };

    return {
      key,
      value: Buffer.from(JSON.stringify(payload)),
      timestamp: new Date(),
    };
  }

  private buildMessageKey<T extends DSL.CoreMarketData>(data: MD.MarketData<T>): string {
    return `${data.context.market.type}:${data.context.exchange.id}:${data.context.instrument.symbol}`;
  }

  private async publishMessage(
    topic: string,
    message: StreamingMessage
  ): Promise<Result<void, QiError>> {
    if (!this.producer) {
      return Err(create("PUBLISH_ERROR", "Producer not connected", "SYSTEM"));
    }

    const result = await this.producer.send(topic, message);
    if (result.tag === "failure") {
      return Err(create("PUBLISH_ERROR", `Send failed: ${result.error.message}`, "SYSTEM"));
    }

    this.logger.debug("Message published", {
      topic,
      key: message.key,
      partition: result.value.partition,
      offset: result.value.offset,
    });

    return Ok(undefined);
  }

  private async publishBatch(
    topic: string,
    messages: StreamingMessage[]
  ): Promise<Result<void, QiError>> {
    if (!this.producer) {
      return Err(create("BATCH_PUBLISH_ERROR", "Producer not connected", "SYSTEM"));
    }

    const batch = { topic, messages };
    const result = await this.producer.sendBatch(batch);

    if (result.tag === "failure") {
      return Err(
        create("BATCH_PUBLISH_ERROR", `Batch send failed: ${result.error.message}`, "SYSTEM")
      );
    }

    this.logger.info("Batch published", {
      topic,
      messageCount: messages.length,
      totalMessages: result.value.totalMessages,
    });

    return Ok(undefined);
  }

  // Abstract handler implementations
  protected async writePriceHandler(data: MD.MarketData<MD.Price>): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const message = this.createMessage(this.config.topics.prices, data);
    return this.publishMessage(this.config.topics.prices, message);
  }

  protected async writePricesHandler(
    data: MD.MarketData<MD.Price>[]
  ): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const messages = data.map((d) => this.createMessage(this.config.topics.prices, d));
    return this.publishBatch(this.config.topics.prices, messages);
  }

  protected async writeLevel1Handler(
    data: MD.MarketData<MD.Level1>
  ): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const message = this.createMessage(this.config.topics.level1, data);
    return this.publishMessage(this.config.topics.level1, message);
  }

  protected async writeMarketDepthHandler(
    data: MD.MarketData<MD.MarketDepth>
  ): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const message = this.createMessage(this.config.topics.depth, data);
    return this.publishMessage(this.config.topics.depth, message);
  }

  protected async writeOHLCVHandler(data: MD.MarketData<MD.OHLCV>): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const message = this.createMessage(this.config.topics.ohlcv, data);
    return this.publishMessage(this.config.topics.ohlcv, message);
  }

  protected async writeOHLCVBatchHandler(
    data: MD.MarketData<MD.OHLCV>[]
  ): Promise<Result<void, QiError>> {
    const connectResult = await this.ensureConnected();
    if (connectResult.tag === "failure") return connectResult;

    const messages = data.map((d) => this.createMessage(this.config.topics.ohlcv, d));
    return this.publishBatch(this.config.topics.ohlcv, messages);
  }

  async disconnect(): Promise<Result<void, QiError>> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.client) {
      await this.client.disconnect();
    }
    return Ok(undefined);
  }
}
