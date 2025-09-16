/**
 * RedpandaReader - Abstracted market data reader for Redpanda
 *
 * Uses abstract streaming connector interface with @platformatic/kafka backend
 * for optimal performance and Result<T> composition with @qi/dp/md smart constructors.
 */

import { Err, Ok, type Result, create, match, isFailure, fromAsyncTryCatch } from "@qi/base";
import type { QiError } from "@qi/base";
import { createLogger } from "@qi/core";
import type { Logger } from "@qi/core";
import { Reader } from "@qi/dp/actor";
import type * as DSL from "@qi/dp/dsl";
import * as MD from "@qi/dp/md";

import { ConnectorFactory } from "@qi/dp/base";
import type {
  IStreamingConnector,
  IConnectorConsumer as IStreamingConsumer,
  StreamingBackend,
  StreamingConsumerConfig,
  ConnectorMessage as StreamingMessage,
} from "@qi/dp/base";

export interface RedpandaReaderConfig extends StreamingConsumerConfig {
  readonly topics: string[];
  readonly backend?: StreamingBackend;
}

export class RedpandaReader extends Reader {
  private connector: IStreamingConnector | null = null;
  private consumer: IStreamingConsumer | null = null;
  private logger: Logger | null = null;
  private config: RedpandaReaderConfig;

  constructor(context: DSL.DataContext, config: RedpandaReaderConfig) {
    super(context);
    this.config = config;
  }

  private async initializeLogger(): Promise<Result<void, QiError>> {
    const loggerResult = createLogger({ level: "info", name: "redpanda-reader" });
    return match(
      (logger: Logger) => {
        this.logger = logger;
        return Ok(undefined);
      },
      (error) => Err(error),
      loggerResult
    );
  }

  async connect(): Promise<Result<void, QiError>> {
    const loggerInit = await this.initializeLogger();
    if (isFailure(loggerInit)) {
      return loggerInit;
    }

    // Create connector using factory
    const connectorResult = await ConnectorFactory.createConnector({
      backend: this.config.backend || "platformatic-kafka",
      logger: this.logger!,
    });

    return match(
      (connector) => {
        this.connector = connector;
        return this.createConsumer();
      },
      (error) => {
        this.logger!.error("Failed to create streaming connector", {
          message: error.message,
        });
        return Err(
          create(
            "READER_CONNECTION_ERROR",
            `Failed to create connector: ${error.message}`,
            "SYSTEM"
          )
        );
      },
      connectorResult
    );
  }

  private async createConsumer(): Promise<Result<void, QiError>> {

    // Create consumer
    const consumerResult = await this.connector!.createConsumer(this.config);
    return match(
      (consumer) => {
        this.consumer = consumer;
        return this.connectConsumer();
      },
      (error) => {
        this.logger!.error("Failed to create consumer", {
          message: error.message,
        });
        return Err(
          create(
            "READER_CONNECTION_ERROR",
            `Failed to create consumer: ${error.message}`,
            "SYSTEM"
          )
        );
      },
      consumerResult
    );
  }

  private async connectConsumer(): Promise<Result<void, QiError>> {

    // Connect consumer
    const connectResult = await this.consumer.connect();
    if (connectResult.tag === "failure") {
      this.logger!.error("Failed to connect consumer", {
        message: connectResult.error.message,
      });
      return Err(
        create(
          "READER_CONNECTION_ERROR",
          `Failed to connect consumer: ${connectResult.error.message}`,
          "SYSTEM"
        )
      );
    }

    // Subscribe to topics
    const subscribeResult = await this.consumer.subscribe(this.config.topics);
    if (subscribeResult.tag === "failure") {
      this.logger!.error("Failed to subscribe to topics", {
        topics: this.config.topics,
        message: subscribeResult.error.message,
      });
      return Err(
        create(
          "READER_CONNECTION_ERROR",
          `Failed to subscribe to topics: ${subscribeResult.error.message}`,
          "SYSTEM"
        )
      );
    }

    this.logger!.info("RedpandaReader connected successfully", {
      topics: this.config.topics,
      backend: this.config.backend || "platformatic-kafka",
    });

    return Ok(undefined);
  }

  async readMessages(): Promise<Result<DSL.MarketData<any>[], QiError>> {
    if (!this.consumer || !this.logger) {
      return Err(
        create("READER_NOT_CONNECTED", "Reader not connected", "SYSTEM")
      );
    }

    const consumeResult = await this.consumer.consume();
    if (consumeResult.tag === "failure") {
      this.logger.error("Failed to consume messages", {
        message: consumeResult.error.message,
      });
      return Err(
        create(
          "READER_CONSUME_ERROR",
          `Failed to consume messages: ${consumeResult.error.message}`,
          "SYSTEM"
        )
      );
    }

    const messages = consumeResult.value;
    const marketDataResults: DSL.MarketData<any>[] = [];

    for (const message of messages) {
      const marketDataResult = await this.parseMessageToMarketData(message);
      if (marketDataResult.tag === "success") {
        marketDataResults.push(marketDataResult.value);
      } else {
        this.logger.warn("Failed to parse message", {
          error: marketDataResult.error.message,
          messageKey: message.key,
        });
      }
    }

    return Ok(marketDataResults);
  }

  private async parseMessageToMarketData(
    message: StreamingMessage
  ): Promise<Result<DSL.MarketData<any>, QiError>> {
    try {
      // Parse the message value (assuming JSON)
      const data = JSON.parse(message.value);

      // Create Price from the parsed data (example)
      const priceResult = MD.Price.create(
        data.price || 0,
        data.symbol || "UNKNOWN",
        data.timestamp || Date.now()
      );

      if (priceResult.tag === "failure") {
        return priceResult;
      }

      const price = priceResult.value;

      // Create MarketData with context and core data
      const marketDataResult = MD.MarketData.create(super.context, price);

      return marketDataResult;
    } catch (error) {
      return Err(
        create(
          "READER_PARSE_ERROR",
          `Failed to parse message: ${error instanceof Error ? error.message : "Unknown error"}`,
          "SYSTEM"
        )
      );
    }
  }

  async disconnect(): Promise<Result<void, QiError>> {
    const errors: QiError[] = [];

    if (this.consumer) {
      const disconnectResult = await this.consumer.disconnect();
      if (disconnectResult.tag === "failure") {
        const qiError = create(
          "READER_DISCONNECT_ERROR",
          `Consumer disconnect failed: ${disconnectResult.error.message}`,
          "SYSTEM"
        );
        errors.push(qiError);
      }
      this.consumer = null;
    }

    if (this.connector) {
      const disconnectResult = await this.connector.disconnect();
      if (disconnectResult.tag === "failure") {
        const qiError = create(
          "READER_DISCONNECT_ERROR",
          `Connector disconnect failed: ${disconnectResult.error.message}`,
          "SYSTEM"
        );
        errors.push(qiError);
      }
      this.connector = null;
    }

    if (errors.length > 0) {
      const combinedError = create(
        "READER_DISCONNECT_ERROR",
        `Failed to disconnect ${errors.length} components`,
        "SYSTEM",
        { errors: errors.map(e => e.message) }
      );

      if (this.logger) {
        this.logger.error("RedpandaReader disconnect completed with errors", {
          count: errors.length,
        });
      }

      return Err(combinedError);
    }

    if (this.logger) {
      this.logger.info("RedpandaReader disconnected successfully");
    }

    return Ok(undefined);
  }

  // Abstract method implementations for Reader base class
  async getCurrentPriceHandler(): Promise<Result<DSL.MarketData<DSL.Price>, QiError>> {
    const messagesResult = await this.readMessages();
    if (messagesResult.tag === "failure") {
      return messagesResult;
    }

    const priceData = messagesResult.value.find((md) => md.coreData.type === "Price");
    if (!priceData) {
      return Err(
        create("NO_PRICE_DATA", "No price data available", "SYSTEM")
      );
    }

    return Ok(priceData);
  }

  async getCurrentPricesHandler(): Promise<Result<DSL.MarketData<DSL.Price>[], QiError>> {
    const messagesResult = await this.readMessages();
    if (messagesResult.tag === "failure") {
      return messagesResult;
    }

    const priceDataList = messagesResult.value.filter((md) => md.coreData.type === "Price");
    return Ok(priceDataList);
  }

  async getLevel1Handler(): Promise<Result<DSL.MarketData<DSL.Level1>, QiError>> {
    return Err(create("NOT_IMPLEMENTED", "Level1 handler not implemented", "SYSTEM"));
  }

  async getMarketDepthHandler(): Promise<Result<DSL.MarketData<DSL.MarketDepth>, QiError>> {
    return Err(create("NOT_IMPLEMENTED", "MarketDepth handler not implemented", "SYSTEM"));
  }

  async getOHLCVHandler(): Promise<Result<DSL.MarketData<DSL.OHLCV>, QiError>> {
    return Err(create("NOT_IMPLEMENTED", "OHLCV handler not implemented", "SYSTEM"));
  }
}