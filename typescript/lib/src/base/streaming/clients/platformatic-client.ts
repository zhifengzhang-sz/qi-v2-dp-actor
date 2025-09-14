/**
 * Platformatic Kafka Client Implementation
 *
 * Uses @platformatic/kafka - a modern, high-performance, pure TypeScript Kafka client
 * designed for modern Node.js development with excellent TypeScript support.
 *
 * Features:
 * - High performance, optimized for speed
 * - Pure modern JavaScript/TypeScript, no native addons
 * - Full type safety with strong typing
 * - Excellent serialization/deserialization support
 * - Event-based consumption, async iterator consumption, concurrent processing
 * - Modern Node.js ECMAScript features
 *
 * Installation: bun add @platformatic/kafka
 */

import { Err, Ok, type Result, create, match } from "@qi/base";
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
let PlatformaticKafka: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PlatformaticKafka = require("@platformatic/kafka");
} catch {
  // Package not installed - will be handled gracefully
}

export class PlatformaticStreamingClient implements IStreamingClient {
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
      // Check if Platformatic package is available
      if (!PlatformaticKafka) {
        return Err(
          create(
            "STREAMING_INVALID_CONFIG",
            "Platformatic client requires @platformatic/kafka package. Install with: bun add @platformatic/kafka",
            "CONFIGURATION",
            {
              operation: "initialize",
              implementation: "platformatic",
              requiresPackage: "@platformatic/kafka"
            }
          )
        );
      }

      // Configuration with defaults
      this.config = {
        clientId: "qi-platformatic-client",
        brokers: ["localhost:9092"],
        connectionTimeout: 3000,
        requestTimeout: 25000,
        retryAttempts: 5,
        ...this.clientConfig,
      };

      // Create logger
      const loggerResult = createLogger({
        level: "info",
        name: "platformatic-streaming",
        pretty: process.env["NODE_ENV"] === "development",
      });

      if (loggerResult.tag === "failure") {
        return loggerResult;
      }

      this.logger = loggerResult.value.child({
        component: "PlatformaticStreamingClient",
        clientId: this.config.clientId,
      });

      // Create cache
      this.cache = createMemoryCache({
        maxSize: 1000,
        defaultTtl: 300,
      });

      // Create Platformatic Kafka client
      this.kafka = new PlatformaticKafka.Kafka({
        clientId: this.config.clientId,
        brokers: [...this.config.brokers],
        connectionTimeout: this.config.connectionTimeout,
        requestTimeout: this.config.requestTimeout,
        retry: {
          initialRetryTime: 100,
          retries: this.config.retryAttempts || 5,
        },
      });

      this.logger.info("Platformatic streaming client initialized", {
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        implementation: "platformatic",
        features: ["pure-js", "type-safe", "high-performance"],
      });

      return Ok(undefined);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          `Failed to initialize Platformatic client: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "initialize", implementation: "platformatic", error: String(error) }
        )
      );
    }
  }

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const producerKey = `platformatic-${JSON.stringify(config || {})}`;

    if (this.producers.has(producerKey)) {
      const existingProducer = this.producers.get(producerKey);
      if (!existingProducer) {
        return Err(
          this.createStreamingError("STREAMING_PRODUCER_FAILED", "Producer not found in cache", {
            operation: "getProducer",
            producerKey,
            implementation: "platformatic",
          })
        );
      }
      this.logger!.debug("Returning existing Platformatic producer", { producerKey });
      return Ok(existingProducer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Platformatic client not initialized", "SYSTEM", {
          operation: "getProducer",
          implementation: "platformatic",
        })
      );
    }

    try {
      // Create Platformatic producer with modern API
      const producer = this.kafka.producer({
        maxInFlightRequests: config?.maxInFlightRequests || 5,
        idempotent: config?.idempotent ?? true,
        allowAutoTopicCreation: config?.allowAutoTopicCreation ?? false,
        transactionTimeout: config?.transactionTimeout || 30000,
      });

      // Wrap producer to match our interface with proper serialization support
      const wrappedProducer = {
        connect: async () => {
          try {
            await producer.connect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_CONNECTION_FAILED",
              `Producer connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        disconnect: async () => {
          try {
            await producer.disconnect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_DISCONNECTION_FAILED",
              `Producer disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        send: async (topic: string, message: any) => {
          try {
            const result = await producer.send({
              topic,
              messages: [message]
            });
            return Ok(result[0]); // Return first result for single message
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_PUBLISH_FAILED",
              `Message send failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { topic, implementation: "platformatic" }
            ));
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendBatch: async (batch: any) => {
          try {
            const result = await producer.send(batch);
            return Ok({
              results: result,
              totalMessages: batch.messages.length,
              totalTopics: 1,
            });
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_BATCH_PUBLISH_FAILED",
              `Batch send failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        isConnected: () => producer.connected || false,
      };

      this.producers.set(producerKey, wrappedProducer);

      this.logger.info("Created new Platformatic producer", {
        producerKey,
        config,
        implementation: "platformatic",
        serialization: "json-string-support",
      });

      return Ok(wrappedProducer);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_PRODUCER_FAILED",
          `Failed to create Platformatic producer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getProducer", implementation: "platformatic", error: String(error) }
        )
      );
    }
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") {
      return initResult;
    }

    const consumerKey = `platformatic-${config.groupId}`;

    if (this.consumers.has(consumerKey)) {
      const existingConsumer = this.consumers.get(consumerKey);
      if (!existingConsumer) {
        return Err(
          this.createStreamingError("STREAMING_CONSUMER_FAILED", "Consumer not found in cache", {
            operation: "getConsumer",
            consumerKey,
            implementation: "platformatic",
          })
        );
      }
      this.logger!.debug("Returning existing Platformatic consumer", { groupId: config.groupId });
      return Ok(existingConsumer);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Platformatic client not initialized", "SYSTEM", {
          operation: "getConsumer",
          implementation: "platformatic",
        })
      );
    }

    try {
      // Create Platformatic consumer with modern API and multiple consumption patterns
      const consumer = this.kafka.consumer({
        groupId: config.groupId,
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
        maxBytesPerPartition: config.maxBytesPerPartition || 1048576,
        minBytes: config.minBytes || 1,
        maxWaitTimeInMs: config.maxWaitTimeInMs || 5000,
      });

      // Wrap consumer to match our interface with enhanced consumption patterns
      const wrappedConsumer = {
        connect: async () => {
          try {
            await consumer.connect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_CONNECTION_FAILED",
              `Consumer connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        disconnect: async () => {
          try {
            await consumer.disconnect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_DISCONNECTION_FAILED",
              `Consumer disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: async (subscriptionConfig: any) => {
          try {
            await consumer.subscribe(subscriptionConfig);
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_SUBSCRIPTION_FAILED",
              `Subscription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run: async (runConfig: any) => {
          try {
            await consumer.run(runConfig);
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_CONSUME_FAILED",
              `Consumer run failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        commitOffsets: async () => {
          try {
            await consumer.commitOffsets();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_COMMIT_FAILED",
              `Offset commit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        seek: async (topic: string, partition: number, offset: string) => {
          try {
            await consumer.seek({ topic, partition, offset });
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_SEEK_FAILED",
              `Seek failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { topic, partition, offset, implementation: "platformatic" }
            ));
          }
        },
        isConnected: () => consumer.connected || false,
      };

      this.consumers.set(consumerKey, wrappedConsumer);

      this.logger.info("Created new Platformatic consumer", {
        groupId: config.groupId,
        config,
        implementation: "platformatic",
        patterns: ["event-based", "async-iterator", "concurrent-processing"],
      });

      return Ok(wrappedConsumer);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_CONSUMER_FAILED",
          `Failed to create Platformatic consumer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getConsumer", implementation: "platformatic", error: String(error) }
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
      this.logger!.debug("Returning existing Platformatic admin client");
      return Ok(this.admin);
    }

    if (!this.kafka || !this.config || !this.logger) {
      return Err(
        create("STREAMING_CONNECTION_FAILED", "Platformatic client not initialized", "SYSTEM", {
          operation: "getAdmin",
          implementation: "platformatic",
        })
      );
    }

    try {
      // Create Platformatic admin client
      const admin = this.kafka.admin();

      // Wrap admin to match our interface
      const wrappedAdmin = {
        connect: async () => {
          try {
            await admin.connect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_CONNECTION_FAILED",
              `Admin connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        disconnect: async () => {
          try {
            await admin.disconnect();
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_DISCONNECTION_FAILED",
              `Admin disconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createTopics: async (topics: any) => {
          try {
            await admin.createTopics({ topics });
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_TOPIC_CREATE_FAILED",
              `Topic creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        deleteTopics: async (topicNames: string[]) => {
          try {
            await admin.deleteTopics({ topics: topicNames });
            return Ok(undefined);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_TOPIC_DELETE_FAILED",
              `Topic deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { topicNames, implementation: "platformatic" }
            ));
          }
        },
        listTopics: async () => {
          try {
            const topics = await admin.listTopics();
            return Ok(topics);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_METADATA_FAILED",
              `Topic listing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { implementation: "platformatic" }
            ));
          }
        },
        getTopicMetadata: async (topics: string[]) => {
          try {
            const metadata = await admin.fetchTopicMetadata({ topics });
            return Ok(metadata.topics || []);
          } catch (error) {
            return Err(this.createStreamingError(
              "STREAMING_METADATA_FAILED",
              `Topic metadata fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              { topics, implementation: "platformatic" }
            ));
          }
        },
        isConnected: () => admin.connected || false,
      };

      this.admin = wrappedAdmin;

      this.logger.info("Created new Platformatic admin client", {
        implementation: "platformatic",
        features: ["type-safe-operations", "modern-api"],
      });
      return Ok(wrappedAdmin);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_ADMIN_FAILED",
          `Failed to create Platformatic admin: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getAdmin", implementation: "platformatic", error: String(error) }
        )
      );
    }
  }

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.logger) {
      return Ok(undefined);
    }

    const opLogger = this.logger.child({ operation: "disconnect" });
    opLogger.info("Disconnecting Platformatic streaming client", {
      producerCount: this.producers.size,
      consumerCount: this.consumers.size,
      hasAdmin: !!this.admin,
      implementation: "platformatic",
    });

    const errors: QiError[] = [];

    // Disconnect all components using Result<T> patterns
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
        `Failed to disconnect ${errors.length} Platformatic streaming components`,
        {
          operation: "disconnect",
          errorCount: errors.length,
          errors: errors.map((e) => e.message),
          implementation: "platformatic"
        }
      );
      opLogger.error("Platformatic streaming client disconnection completed with errors");
      return Err(combinedError);
    }

    opLogger.info("Platformatic streaming client disconnected successfully");
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
          implementation: "platformatic",
        });
        return Ok(false);
      }

      const admin = adminResult.value;
      const connectResult = await admin.connect();
      if (connectResult.tag === "failure") {
        opLogger.warn("Health check failed - could not connect admin", {
          error: connectResult.error.message,
          implementation: "platformatic",
        });
        return Ok(false);
      }

      const listResult = await admin.listTopics();

      return match(
        (topics: readonly string[]) => {
          opLogger.debug("Platformatic health check passed", {
            topicCount: topics.length,
            isHealthy: true,
            implementation: "platformatic",
          });
          return Ok(true);
        },
        (error) => {
          opLogger.warn("Platformatic health check failed on topic listing", {
            message: error.message,
            implementation: "platformatic"
          });
          return Ok(false);
        },
        listResult
      );
    } catch (error) {
      const qiError = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        `Platformatic health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { operation: "healthCheck", error: String(error), implementation: "platformatic" }
      );

      opLogger.warn("Platformatic health check failed with exception", {
        message: qiError.message,
        implementation: "platformatic"
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
      component: "PlatformaticStreamingClient",
      implementation: "platformatic",
      timestamp: Date.now(),
      ...context,
    });
  }
}

// Factory function
export function createPlatformaticStreamingClient(config?: Partial<StreamingConfig>): Result<IStreamingClient, QiError> {
  try {
    const client = new PlatformaticStreamingClient(config);
    return Ok(client);
  } catch (error) {
    return Err(
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create Platformatic streaming client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { error: String(error), implementation: "platformatic" }
      )
    );
  }
}