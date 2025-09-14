/**
 * RedpandaWriter - Abstracted market data writer for Redpanda
 *
 * Uses abstract streaming connector interface with @platformatic/kafka backend
 * for optimal performance and Result<T> composition.
 */

import { Err, Ok, type Result } from "@qi/base";
import type { Logger } from "@qi/core";
import { createLogger } from "@qi/core";
import { Writer } from "@qi/dp/actors";
import type * as DSL from "@qi/dp/dsl";

import { ConnectorFactory } from "./factories/ConnectorFactory.js";
import type {
  IStreamingConnector,
  IStreamingProducer,
  StreamingBackend,
  StreamingProducerConfig,
} from "./interfaces/StreamingConnector.js";

export interface RedpandaWriterConfig extends StreamingProducerConfig {
  readonly defaultTopic: string;
  readonly backend?: StreamingBackend;
}

export class RedpandaWriter extends Writer {
  private connector: IStreamingConnector | null = null;
  private producer: IStreamingProducer | null = null;
  private logger: Logger;
  private config: RedpandaWriterConfig;

  constructor(context: DSL.DataContext, config: RedpandaWriterConfig) {
    super(context);
    this.config = config;

    const loggerResult = createLogger({ level: "info" });
    this.logger =
      typeof loggerResult === "object" && "success" in loggerResult && loggerResult.success
        ? loggerResult.data
        : (loggerResult as Logger);
  }

  async connect(): Promise<Result<void, Error>> {
    return this.workflow(this.handleConnect(), "WRITER_CONNECTION_ERROR");
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

    // Create producer
    const producerResult = await this.connector.createProducer(this.config);
    if (!producerResult.success) {
      return Err(producerResult.error);
    }

    this.producer = producerResult.data;

    // Connect producer
    const connectResult = await this.producer.connect();
    if (!connectResult.success) {
      return Err(connectResult.error);
    }

    this.logger.info("RedpandaWriter connected", {
      defaultTopic: this.config.defaultTopic,
      backend,
    });

    return Ok(undefined);
  }

  async writePrice(data: DSL.MarketData<DSL.Price>): Promise<Result<void, Error>> {
    return this.workflow(this.handleWritePrice(data), "PRICE_WRITE_ERROR", {
      symbol: data.context.instrument.symbol,
    });
  }

  private async handleWritePrice(data: DSL.MarketData<DSL.Price>): Promise<Result<void, Error>> {
    if (!this.producer) {
      return Err(new Error("Producer not connected"));
    }

    try {
      const message = {
        key: data.context.instrument.symbol,
        value: JSON.stringify({
          context: data.context,
          price: data.coreData,
        }),
        timestamp: new Date(data.coreData.timestamp).getTime(),
      };

      const produceResult = await this.producer.produce(this.config.defaultTopic, message);
      if (!produceResult.success) {
        return Err(produceResult.error);
      }

      this.logger.info("Price data written successfully", {
        symbol: data.context.instrument.symbol,
        price: data.coreData.price,
      });

      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to write price data: ${errorMessage}`));
    }
  }

  async disconnect(): Promise<Result<void, Error>> {
    return this.workflow(this.handleDisconnect(), "WRITER_DISCONNECT_ERROR");
  }

  private async handleDisconnect(): Promise<Result<void, Error>> {
    if (this.producer) {
      const disconnectResult = await this.producer.disconnect();
      if (!disconnectResult.success) {
        this.logger.error("Failed to disconnect producer", {
          error: disconnectResult.error.message,
        });
      }
      this.producer = null;
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

    this.logger.info("RedpandaWriter disconnected");
    return Ok(undefined);
  }

  // Additional DSL interface methods would be implemented here
  async writeLevel1(_data: DSL.MarketData<DSL.Level1>): Promise<Result<void, Error>> {
    return Err(new Error("Level1 writing not yet implemented"));
  }

  async writeOHLCV(_data: DSL.MarketData<DSL.OHLCV>): Promise<Result<void, Error>> {
    return Err(new Error("OHLCV writing not yet implemented"));
  }

  async writeMarketDepth(_data: DSL.MarketData<DSL.MarketDepth>): Promise<Result<void, Error>> {
    return Err(new Error("Market depth writing not yet implemented"));
  }
}
