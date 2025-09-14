/**
 * KafkaJS Client Implementation
 *
 * Standard KafkaJS implementation for Kafka/Redpanda streaming operations.
 * This is the current default implementation.
 */

import { Err, Ok, type Result, create, match } from "@qi/base";
import type { QiError } from "@qi/base";
import { createLogger, createMemoryCache } from "@qi/core";
import type { ICache, Logger } from "@qi/core";
import { Kafka } from "kafkajs";

import { StreamingAdmin } from "../admin.js";
import { StreamingConsumer } from "../consumer.js";
import { StreamingProducer } from "../producer.js";
import type {
  ConsumerConfig,
  IStreamingAdmin,
  IStreamingClient,
  IStreamingConsumer,
  IStreamingProducer,
  ProducerConfig,
  StreamingConfig,
  StreamingErrorCode,
  StreamingErrorContext,
} from "../types.js";

export class KafkaJSStreamingClient implements IStreamingClient {
  private kafka: Kafka | null = null;
  private logger: Logger | null = null;
  private cache: ICache | null = null;
  private config: StreamingConfig | null = null;
  private producers = new Map<string, StreamingProducer>();
  private consumers = new Map<string, StreamingConsumer>();
  private admin: StreamingAdmin | null = null;

  constructor(private readonly clientConfig?: Partial<StreamingConfig>) {}

  private async initialize(): Promise<Result<void, QiError>> {
    if (this.kafka && this.logger && this.cache && this.config) {
      return Ok(undefined);
    }

    try {
      // Configuration with defaults
      this.config = {
        clientId: "qi-kafkajs-client",
        brokers: ["localhost:9092"],
        connectionTimeout: 3000,
        requestTimeout: 25000,
        retryAttempts: 5,
        ...this.clientConfig,
      };

      // Create logger
      const loggerResult = createLogger({
        level: "info",
        name: "kafkajs-streaming",
        pretty: process.env["NODE_ENV"] === "development",
      });

      if (loggerResult.tag === "failure") {
        return loggerResult;
      }

      this.logger = loggerResult.value.child({
        component: "KafkaJSStreamingClient",
        clientId: this.config.clientId,
      });

      // Create cache
      this.cache = createMemoryCache({
        maxSize: 1000,
        defaultTtl: 300,
      });

      // Create Kafka client
      this.kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: [...this.config.brokers], // Convert readonly array to mutable
        connectionTimeout: this.config.connectionTimeout,
        requestTimeout: this.config.requestTimeout,
        retry: {
          initialRetryTime: 100,
          retries: this.config.retryAttempts || 5, // Ensure number, not undefined
        },
      });

      this.logger.info("KafkaJS streaming client initialized", {
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        implementation: "kafkajs",
      });

      return Ok(undefined);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          `Failed to initialize KafkaJS client: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "initialize", implementation: "kafkajs", error: String(error) }
        )
      );
    }
  }

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const producerKey = `kafkajs-${JSON.stringify(config || {})}`;

    if (this.producers.has(producerKey)) {
      const existingProducer = this.producers.get(producerKey);
      if (!existingProducer) {
        return Err(
          this.createStreamingError("STREAMING_PRODUCER_FAILED", "Producer not found in cache", {
            operation: "getProducer",
            producerKey,
            implementation: "kafkajs",
          })
        );
      }
      this.logger!.debug("Returning existing KafkaJS producer", { producerKey });
      return Ok(existingProducer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "KafkaJS client not initialized", "SYSTEM", {
          operation: "getProducer",
          implementation: "kafkajs",
        })
      );
    }

    const producerConfig: ProducerConfig = {
      maxInFlightRequests: 5,
      idempotent: true,
      allowAutoTopicCreation: false,
      ...config,
    };

    const producer = new StreamingProducer(this.kafka, this.config, producerConfig, this.logger);

    this.producers.set(producerKey, producer);

    this.logger.info("Created new KafkaJS producer", {
      producerKey,
      config: producerConfig,
      implementation: "kafkajs",
    });

    return Ok(producer);
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const consumerKey = `kafkajs-${config.groupId}`;

    if (this.consumers.has(consumerKey)) {
      const existingConsumer = this.consumers.get(consumerKey);
      if (!existingConsumer) {
        return Err(
          this.createStreamingError("STREAMING_CONSUMER_FAILED", "Consumer not found in cache", {
            operation: "getConsumer",
            consumerKey,
            implementation: "kafkajs",
          })
        );
      }
      this.logger!.debug("Returning existing KafkaJS consumer", { groupId: config.groupId });
      return Ok(existingConsumer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "KafkaJS client not initialized", "SYSTEM", {
          operation: "getConsumer",
          implementation: "kafkajs",
        })
      );
    }

    const consumer = new StreamingConsumer(this.kafka, this.config, config, this.logger);

    this.consumers.set(consumerKey, consumer);

    this.logger.info("Created new KafkaJS consumer", {
      groupId: config.groupId,
      config,
      implementation: "kafkajs",
    });

    return Ok(consumer);
  }

  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    if (this.admin) {
      this.logger!.debug("Returning existing KafkaJS admin client");
      return Ok(this.admin);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "KafkaJS client not initialized", "SYSTEM", {
          operation: "getAdmin",
          implementation: "kafkajs",
        })
      );
    }

    this.admin = new StreamingAdmin(this.kafka, this.config, this.logger);

    this.logger.info("Created new KafkaJS admin client", { implementation: "kafkajs" });
    return Ok(this.admin);
  }

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.logger) {
      return Ok(undefined);
    }

    const opLogger = this.logger.child({ operation: "disconnect" });
    opLogger.info("Disconnecting KafkaJS streaming client", {
      producerCount: this.producers.size,
      consumerCount: this.consumers.size,
      hasAdmin: !!this.admin,
      implementation: "kafkajs",
    });

    const errors: QiError[] = [];

    // Disconnect all components
    for (const [key, producer] of Array.from(this.producers)) {
      const result = await producer.disconnect();
      if (result.tag === "failure") {
        errors.push(result.error);
        opLogger.warn("Producer disconnection failed", {
          producerKey: key,
          error: result.error.message,
        });
      }
    }
    this.producers.clear();

    for (const [key, consumer] of Array.from(this.consumers)) {
      const result = await consumer.disconnect();
      if (result.tag === "failure") {
        errors.push(result.error);
        opLogger.warn("Consumer disconnection failed", {
          groupId: key,
          error: result.error.message,
        });
      }
    }
    this.consumers.clear();

    if (this.admin) {
      const result = await this.admin.disconnect();
      if (result.tag === "failure") {
        errors.push(result.error);
        opLogger.warn("Admin disconnection failed", { error: result.error.message });
      }
      this.admin = null;
    }

    // Reset state
    this.kafka = null;
    this.config = null;
    this.logger = null;
    this.cache = null;

    if (errors.length > 0) {
      const combinedError = this.createStreamingError(
        "STREAMING_DISCONNECTION_FAILED",
        `Failed to disconnect ${errors.length} KafkaJS streaming components`,
        {
          operation: "disconnect",
          errorCount: errors.length,
          errors: errors.map((e) => e.message),
          implementation: "kafkajs"
        }
      );
      opLogger.error("KafkaJS streaming client disconnection completed with errors");
      return Err(combinedError);
    }

    opLogger.info("KafkaJS streaming client disconnected successfully");
    return Ok(undefined);
  }

  async isHealthy(): Promise<Result<boolean, QiError>> {
    if (!this.kafka || !this.logger) {
      return Ok(false);
    }

    const opLogger = this.logger.child({ operation: "healthCheck" });

    try {
      const adminResult = await this.getAdmin();
      if (adminResult.tag === "failure") {
        opLogger.warn("Health check failed - could not get admin client", {
          error: adminResult.error.message,
          implementation: "kafkajs",
        });
        return Ok(false);
      }

      const admin = adminResult.value;
      const connectResult = await admin.connect();
      if (connectResult.tag === "failure") {
        opLogger.warn("Health check failed - could not connect admin", {
          error: connectResult.error.message,
          implementation: "kafkajs",
        });
        return Ok(false);
      }

      const listResult = await admin.listTopics();

      return match(
        (topics: readonly string[]) => {
          opLogger.debug("KafkaJS health check passed", {
            topicCount: topics.length,
            isHealthy: true,
            implementation: "kafkajs",
          });
          return Ok(true);
        },
        (error) => {
          opLogger.warn("KafkaJS health check failed on topic listing", {
            message: error.message,
            implementation: "kafkajs"
          });
          return Ok(false);
        },
        listResult
      );
    } catch (error) {
      const qiError = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        `KafkaJS health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { operation: "healthCheck", error: String(error), implementation: "kafkajs" }
      );

      opLogger.warn("KafkaJS health check failed with exception", {
        message: qiError.message,
        implementation: "kafkajs"
      });
      return Ok(false);
    }
  }

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {}
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "KafkaJSStreamingClient",
      implementation: "kafkajs",
      timestamp: Date.now(),
      ...context,
    });
  }
}

// Factory function
export function createKafkaJSStreamingClient(config?: Partial<StreamingConfig>): Result<IStreamingClient, QiError> {
  try {
    const client = new KafkaJSStreamingClient(config);
    return Ok(client);
  } catch (error) {
    return Err(
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create KafkaJS streaming client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { error: String(error), implementation: "kafkajs" }
      )
    );
  }
}