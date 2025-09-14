/**
 * Confluent Kafka Client Implementation
 *
 * Uses @confluentinc/kafka-javascript - Confluent's official JavaScript client
 * with KafkaJS-compatible API for high-performance streaming operations.
 *
 * Features:
 * - Built on librdkafka for high performance
 * - KafkaJS-compatible API (promisified)
 * - Full TypeScript support
 * - Production-ready with full Confluent support
 *
 * Installation: bun add @confluentinc/kafka-javascript
 */

import { Err, Ok, type Result, create } from "@qi/base";
import type { QiError } from "@qi/base";
import { createLogger, createMemoryCache } from "@qi/core";
import type { ICache, Logger } from "@qi/core";

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

// Conditional import - will work when package is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ConfluentKafka: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ConfluentKafka = require("@confluentinc/kafka-javascript").KafkaJS.Kafka;
} catch {
  // Package not installed - will be handled gracefully
}

export class ConfluentStreamingClient implements IStreamingClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kafka: any = null;
  private logger: Logger | null = null;
  private cache: ICache | null = null;
  private config: StreamingConfig | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private producers = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private consumers = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private admin: any = null;

  constructor(private readonly clientConfig?: Partial<StreamingConfig>) {}

  private async initialize(): Promise<Result<void, QiError>> {
    if (this.kafka && this.logger && this.cache && this.config) {
      return Ok(undefined);
    }

    try {
      // Check if Confluent package is available
      if (!ConfluentKafka) {
        return Err(
          create(
            "STREAMING_INVALID_CONFIG",
            "Confluent client requires @confluentinc/kafka-javascript package. Install with: bun add @confluentinc/kafka-javascript",
            "CONFIGURATION",
            {
              operation: "initialize",
              implementation: "confluent",
              requiresPackage: "@confluentinc/kafka-javascript"
            }
          )
        );
      }

      // Configuration with defaults
      this.config = {
        clientId: "qi-confluent-client",
        brokers: ["localhost:9092"],
        connectionTimeout: 3000,
        requestTimeout: 25000,
        retryAttempts: 5,
        ...this.clientConfig,
      };

      // Create logger
      const loggerResult = createLogger({
        level: "info",
        name: "confluent-streaming",
        pretty: process.env["NODE_ENV"] === "development",
      });

      if (loggerResult.tag === "failure") {
        return loggerResult;
      }

      this.logger = loggerResult.value.child({
        component: "ConfluentStreamingClient",
        clientId: this.config.clientId,
      });

      // Create cache
      this.cache = createMemoryCache({
        maxSize: 1000,
        defaultTtl: 300,
      });

      // Create Confluent Kafka client using KafkaJS-compatible API
      this.kafka = new ConfluentKafka({
        kafkaJS: {
          brokers: [...this.config.brokers],
          clientId: this.config.clientId,
          connectionTimeout: this.config.connectionTimeout,
          requestTimeout: this.config.requestTimeout,
          retry: {
            initialRetryTime: 100,
            retries: this.config.retryAttempts || 5,
          },
        }
      });

      this.logger.info("Confluent streaming client initialized", {
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        implementation: "confluent",
        api: "kafkajs-compatible",
      });

      return Ok(undefined);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          `Failed to initialize Confluent client: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "initialize", implementation: "confluent", error: String(error) }
        )
      );
    }
  }

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const producerKey = `confluent-${JSON.stringify(config || {})}`;

    if (this.producers.has(producerKey)) {
      const existingProducer = this.producers.get(producerKey);
      if (!existingProducer) {
        return Err(
          this.createStreamingError("STREAMING_PRODUCER_FAILED", "Producer not found in cache", {
            operation: "getProducer",
            producerKey,
            implementation: "confluent",
          })
        );
      }
      this.logger!.debug("Returning existing Confluent producer", { producerKey });
      return Ok(existingProducer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Confluent client not initialized", "SYSTEM", {
          operation: "getProducer",
          implementation: "confluent",
        })
      );
    }

    try {
      // Create Confluent producer using KafkaJS-compatible API
      const producer = this.kafka.producer({
        maxInFlightRequests: config?.maxInFlightRequests || 5,
        idempotent: config?.idempotent ?? true,
        allowAutoTopicCreation: config?.allowAutoTopicCreation ?? false,
        transactionTimeout: config?.transactionTimeout || 30000,
      });

      // Wrap producer to match our interface
      const wrappedProducer = {
        connect: () => producer.connect(),
        disconnect: () => producer.disconnect(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        send: async (topic: string, message: any) => {
          const result = await producer.send({
            topic,
            messages: [message]
          });
          return result[0]; // Return first result for single message
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendBatch: (batch: any) => producer.send(batch),
        isConnected: () => true, // Confluent client handles connection state internally
      };

      this.producers.set(producerKey, wrappedProducer);

      this.logger.info("Created new Confluent producer", {
        producerKey,
        config,
        implementation: "confluent",
      });

      return Ok(wrappedProducer);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_PRODUCER_FAILED",
          `Failed to create Confluent producer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getProducer", implementation: "confluent", error: String(error) }
        )
      );
    }
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const consumerKey = `confluent-${config.groupId}`;

    if (this.consumers.has(consumerKey)) {
      const existingConsumer = this.consumers.get(consumerKey);
      if (!existingConsumer) {
        return Err(
          this.createStreamingError("STREAMING_CONSUMER_FAILED", "Consumer not found in cache", {
            operation: "getConsumer",
            consumerKey,
            implementation: "confluent",
          })
        );
      }
      this.logger!.debug("Returning existing Confluent consumer", { groupId: config.groupId });
      return Ok(existingConsumer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Confluent client not initialized", "SYSTEM", {
          operation: "getConsumer",
          implementation: "confluent",
        })
      );
    }

    try {
      // Create Confluent consumer using KafkaJS-compatible API
      const consumer = this.kafka.consumer({
        groupId: config.groupId,
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
        maxBytesPerPartition: config.maxBytesPerPartition || 1048576,
        minBytes: config.minBytes || 1,
        maxWaitTimeInMs: config.maxWaitTimeInMs || 5000,
      });

      // Wrap consumer to match our interface
      const wrappedConsumer = {
        connect: () => consumer.connect(),
        disconnect: () => consumer.disconnect(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (subscriptionConfig: any) => consumer.subscribe(subscriptionConfig),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run: (runConfig: any) => consumer.run(runConfig),
        commitOffsets: () => consumer.commitOffsets(),
        seek: (topic: string, partition: number, offset: string) =>
          consumer.seek({ topic, partition, offset }),
        isConnected: () => true, // Confluent client handles connection state internally
      };

      this.consumers.set(consumerKey, wrappedConsumer);

      this.logger.info("Created new Confluent consumer", {
        groupId: config.groupId,
        config,
        implementation: "confluent",
      });

      return Ok(wrappedConsumer);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_CONSUMER_FAILED",
          `Failed to create Confluent consumer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getConsumer", implementation: "confluent", error: String(error) }
        )
      );
    }
  }

  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    if (this.admin) {
      this.logger!.debug("Returning existing Confluent admin client");
      return Ok(this.admin);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Confluent client not initialized", "SYSTEM", {
          operation: "getAdmin",
          implementation: "confluent",
        })
      );
    }

    try {
      // Create Confluent admin client using KafkaJS-compatible API
      const admin = this.kafka.admin();

      // Wrap admin to match our interface
      const wrappedAdmin = {
        connect: () => admin.connect(),
        disconnect: () => admin.disconnect(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createTopics: (topics: any) => admin.createTopics({ topics }),
        deleteTopics: (topicNames: string[]) => admin.deleteTopics({ topics: topicNames }),
        listTopics: () => admin.listTopics(),
        getTopicMetadata: (topics: string[]) => admin.fetchTopicMetadata({ topics }),
        isConnected: () => true, // Confluent client handles connection state internally
      };

      this.admin = wrappedAdmin;

      this.logger.info("Created new Confluent admin client", { implementation: "confluent" });
      return Ok(wrappedAdmin);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_ADMIN_FAILED",
          `Failed to create Confluent admin: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getAdmin", implementation: "confluent", error: String(error) }
        )
      );
    }
  }

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.logger) {
      return Ok(undefined);
    }

    const opLogger = this.logger.child({ operation: "disconnect" });
    opLogger.info("Disconnecting Confluent streaming client", {
      producerCount: this.producers.size,
      consumerCount: this.consumers.size,
      hasAdmin: !!this.admin,
      implementation: "confluent",
    });

    const errors: QiError[] = [];

    // Disconnect all components
    for (const [key, producer] of Array.from(this.producers)) {
      try {
        await producer.disconnect();
      } catch (error) {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Producer disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { producerKey: key, implementation: "confluent" }
        );
        errors.push(qiError);
        opLogger.warn("Producer disconnection failed", {
          producerKey: key,
          error: qiError.message,
        });
      }
    }
    this.producers.clear();

    for (const [key, consumer] of Array.from(this.consumers)) {
      try {
        await consumer.disconnect();
      } catch (error) {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Consumer disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { groupId: key, implementation: "confluent" }
        );
        errors.push(qiError);
        opLogger.warn("Consumer disconnection failed", {
          groupId: key,
          error: qiError.message,
        });
      }
    }
    this.consumers.clear();

    if (this.admin) {
      try {
        await this.admin.disconnect();
      } catch (error) {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Admin disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { implementation: "confluent" }
        );
        errors.push(qiError);
        opLogger.warn("Admin disconnection failed", { error: qiError.message });
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
        `Failed to disconnect ${errors.length} Confluent streaming components`,
        {
          operation: "disconnect",
          errorCount: errors.length,
          errors: errors.map((e) => e.message),
          implementation: "confluent"
        }
      );
      opLogger.error("Confluent streaming client disconnection completed with errors");
      return Err(combinedError);
    }

    opLogger.info("Confluent streaming client disconnected successfully");
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
          implementation: "confluent",
        });
        return Ok(false);
      }

      const admin = adminResult.value;
      await admin.connect();

      const listResult = await admin.listTopics();

      if (Array.isArray(listResult)) {
        opLogger.debug("Confluent health check passed", {
          topicCount: listResult.length,
          isHealthy: true,
          implementation: "confluent",
        });
        return Ok(true);
      } else {
        opLogger.warn("Confluent health check failed on topic listing", {
          implementation: "confluent"
        });
        return Ok(false);
      }
    } catch (error) {
      const qiError = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        `Confluent health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { operation: "healthCheck", error: String(error), implementation: "confluent" }
      );

      opLogger.warn("Confluent health check failed with exception", {
        message: qiError.message,
        implementation: "confluent"
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
      component: "ConfluentStreamingClient",
      implementation: "confluent",
      timestamp: Date.now(),
      ...context,
    });
  }
}

// Factory function
export function createConfluentStreamingClient(config?: Partial<StreamingConfig>): Result<IStreamingClient, QiError> {
  try {
    const client = new ConfluentStreamingClient(config);
    return Ok(client);
  } catch (error) {
    return Err(
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create Confluent streaming client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { error: String(error), implementation: "confluent" }
      )
    );
  }
}