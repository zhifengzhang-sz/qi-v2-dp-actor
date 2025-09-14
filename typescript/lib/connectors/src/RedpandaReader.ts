/**
 * RedpandaReader - Abstracted market data reader for Redpanda
 *
 * Uses abstract streaming connector interface with @platformatic/kafka backend
 * for optimal performance and Result<T> composition with @qi/dp/md smart constructors.
 */

import { Err, Ok, type Result } from "@qi/base";
import type { Logger } from "@qi/core";
import { createLogger } from "@qi/core";
import { Reader } from "@qi/dp/actors";
import type * as DSL from "@qi/dp/dsl";
import * as MD from "@qi/dp/md";

import { ConnectorFactory } from "./factories/ConnectorFactory.js";
import type {
  IStreamingConnector,
  IStreamingConsumer,
  StreamingBackend,
  StreamingConsumerConfig,
} from "./interfaces/StreamingConnector.js";

export interface RedpandaReaderConfig extends StreamingConsumerConfig {
  readonly topics: string[];
  readonly backend?: StreamingBackend;
}

export class RedpandaReader extends Reader {
  private connector: IStreamingConnector | null = null;
  private consumer: IStreamingConsumer | null = null;
  private logger: Logger;
  private config: RedpandaReaderConfig;

  constructor(context: DSL.DataContext, config: RedpandaReaderConfig) {
    super(context);
    this.config = config;

    const loggerResult = createLogger({ level: "info" });
    this.logger =
      typeof loggerResult === "object" && "success" in loggerResult && loggerResult.success
        ? loggerResult.data
        : (loggerResult as Logger);
  }

  async connect(): Promise<Result<void, Error>> {
    return this.workflow(this.handleConnect(), "READER_CONNECTION_ERROR");
  }

  private async handleConnect(): Promise<Result<void, Error>> {
    // Create connector using factory
    const backend = this.config.backend || ConnectorFactory.getRecommendedBackend();
    const connectorResult = await ConnectorFactory.createConnector({
      backend,
      logger: this.logger,
    });

    if (!connectorResult.success) {
      return Err(connectorResult.error);
    }

    this.connector = connectorResult.data;

    // Create consumer
    const consumerResult = await this.connector.createConsumer(this.config);
    if (!consumerResult.success) {
      return Err(consumerResult.error);
    }

    this.consumer = consumerResult.data;

    // Connect and subscribe
    const connectResult = await this.consumer.connect();
    if (!connectResult.success) {
      return Err(connectResult.error);
    }

    const subscribeResult = await this.consumer.subscribe(this.config.topics);
    if (!subscribeResult.success) {
      return Err(subscribeResult.error);
    }

    this.logger.info("RedpandaReader connected and subscribed", {
      topics: this.config.topics,
      groupId: this.config.groupId,
      backend,
    });

    return Ok(undefined);
  }

  async readPrice(symbol: string): Promise<Result<DSL.MarketData<DSL.Price>, Error>> {
    return this.workflow(this.handleReadPrice(symbol), "PRICE_READ_ERROR", { symbol });
  }

  private async handleReadPrice(symbol: string): Promise<Result<DSL.MarketData<DSL.Price>, Error>> {
    if (!this.consumer) {
      return Err(new Error("Consumer not connected"));
    }

    try {
      // Consume messages from stream
      const messagesResult = await this.consumer.consume();
      if (!messagesResult.success) {
        return Err(messagesResult.error);
      }

      // For now, create mock data - in practice, parse from consumed messages
      const priceResult = MD.Price.create({
        timestamp: new Date().toISOString(),
        price: "100.00",
        size: "10.00",
      });

      if (!priceResult.success) {
        return Err(priceResult.error);
      }

      const marketDataResult = MD.MarketData.create(this.context, priceResult.data);
      if (!marketDataResult.success) {
        return Err(marketDataResult.error);
      }

      return Ok(marketDataResult.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to parse price data: ${errorMessage}`));
    }
  }

  async disconnect(): Promise<Result<void, Error>> {
    return this.workflow(this.handleDisconnect(), "READER_DISCONNECT_ERROR");
  }

  private async handleDisconnect(): Promise<Result<void, Error>> {
    if (this.consumer) {
      const disconnectResult = await this.consumer.disconnect();
      if (!disconnectResult.success) {
        this.logger.error("Failed to disconnect consumer", {
          error: disconnectResult.error.message,
        });
      }
      this.consumer = null;
    }

    if (this.connector) {
      const connectorDisconnectResult = await this.connector.disconnect();
      if (!connectorDisconnectResult.success) {
        this.logger.error("Failed to disconnect connector", {
          error: connectorDisconnectResult.error.message,
        });
      }
      this.connector = null;
    }

    this.logger.info("RedpandaReader disconnected");
    return Ok(undefined);
  }

  // Additional DSL interface methods would be implemented here
  async readLevel1(_symbol: string): Promise<Result<DSL.MarketData<DSL.Level1>, Error>> {
    return Err(new Error("Level1 reading not yet implemented"));
  }

  async readOHLCV(
    _symbol: string,
    _timeframe: DSL.Timeframe
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>, Error>> {
    return Err(new Error("OHLCV reading not yet implemented"));
  }

  async readMarketDepth(
    _symbol: string,
    _levels: DSL.Levels
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>, Error>> {
    return Err(new Error("Market depth reading not yet implemented"));
  }
}
