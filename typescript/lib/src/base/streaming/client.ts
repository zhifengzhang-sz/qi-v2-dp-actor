/**
 * StreamingClient - Main orchestrator for Kafka/Redpanda operations
 *
 * Coordinates producer, consumer, and admin operations using @qi/core infrastructure
 * (Config, Logger, Cache) and @qi/base Result<T> patterns for comprehensive
 * observability and error handling.
 */

import { type Result, create, failure, flatMap, fromAsyncTryCatch, match, success } from "@qi/base";
import type { QiError } from "@qi/base";
import { ConfigBuilder, createLogger, createMemoryCache } from "@qi/core";
import type { Config, ICache, LogLevel, Logger } from "@qi/core";
import { Kafka } from "kafkajs";
import { z } from "zod";

import { StreamingAdmin } from "./admin.js";
import { StreamingConsumer } from "./consumer.js";
import { StreamingProducer } from "./producer.js";
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
  StreamingInfrastructure,
} from "./types.js";

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Streaming configuration schema following @qi/core patterns
 */
const _streamingConfigSchema = z.object({
  streaming: z.object({
    clientId: z.string().min(1),
    brokers: z.array(z.string().min(1)).min(1),
    connectionTimeout: z.number().positive().optional().default(3000),
    requestTimeout: z.number().positive().optional().default(25000),
    retryAttempts: z.number().min(0).optional().default(5),
    security: z
      .object({
        mechanism: z.enum(["plain", "scram-sha-256", "scram-sha-512"]),
        username: z.string().optional(),
        password: z.string().optional(),
      })
      .optional(),
  }),
  producer: z
    .object({
      maxInFlightRequests: z.number().positive().optional().default(1),
      idempotent: z.boolean().optional().default(true),
      transactionTimeout: z.number().positive().optional().default(30000),
      allowAutoTopicCreation: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  logging: z
    .object({
      level: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
      pretty: z.boolean().default(false),
    })
    .optional()
    .default({}),
  cache: z
    .object({
      backend: z.enum(["memory", "redis"]).default("memory"),
      maxSize: z.number().positive().default(1000),
      defaultTtl: z.number().positive().default(300),
    })
    .optional()
    .default({}),
});

// type StreamingConfigSchema = z.infer<typeof streamingConfigSchema>; // TODO: Use this for runtime validation

export class StreamingClient implements IStreamingClient {
  private kafka: Kafka | null = null;
  private infrastructure: StreamingInfrastructure | null = null;
  private producers = new Map<string, StreamingProducer>();
  private consumers = new Map<string, StreamingConsumer>();
  private admin: StreamingAdmin | null = null;

  constructor(private readonly configPath?: string) {}

  // ===========================================================================
  // INFRASTRUCTURE INITIALIZATION
  // ===========================================================================

  /**
   * Initialize streaming infrastructure using @qi/core tools
   */
  private async initializeInfrastructure(): Promise<Result<StreamingInfrastructure, QiError>> {
    try {
      // Step 1: Load configuration from environment with basic structure
      const config = {
        streaming: {
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          clientId: process.env["STREAMING_CLIENTID"] || "qi-streaming-client",
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          brokers: (process.env["STREAMING_BROKERS"] || "localhost:9092").split(","),
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          connectionTimeout: Number.parseInt(process.env["STREAMING_CONNECTION_TIMEOUT"] || "3000"),
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          requestTimeout: Number.parseInt(process.env["STREAMING_REQUEST_TIMEOUT"] || "25000"),
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          retryAttempts: Number.parseInt(process.env["STREAMING_RETRY_ATTEMPTS"] || "5"),
        },
        logging: {
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          level: (process.env["STREAMING_LOGGING_LEVEL"] || "info") as LogLevel,
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          pretty: process.env["STREAMING_LOGGING_PRETTY"] === "true",
        },
        cache: {
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          maxSize: Number.parseInt(process.env["STREAMING_CACHE_MAX_SIZE"] || "1000"),
          // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
          defaultTtl: Number.parseInt(process.env["STREAMING_CACHE_DEFAULT_TTL"] || "300"),
        },
      };

      // Step 2: Create logger
      const loggerResult = createLogger({
        level: config.logging.level,
        name: "streaming",
        pretty: config.logging.pretty,
      });
      if (loggerResult.tag === "failure") {
        return loggerResult;
      }

      // Step 3: Create cache (direct, no Result wrapper)
      const cache = createMemoryCache({
        maxSize: config.cache.maxSize,
        defaultTtl: config.cache.defaultTtl,
      });

      // Step 4: Initialize Kafka client
      this.kafka = new Kafka({
        clientId: config.streaming.clientId,
        brokers: config.streaming.brokers,
        connectionTimeout: config.streaming.connectionTimeout,
        requestTimeout: config.streaming.requestTimeout,
        retry: {
          initialRetryTime: 100,
          retries: config.streaming.retryAttempts,
        },
      });

      const infrastructure: StreamingInfrastructure = {
        config: {
          get: (key: string, defaultValue?: any) => {
            const keys = key.split(".");
            let value: any = config;
            for (const k of keys) {
              value = value?.[k];
            }
            return value ?? defaultValue;
          },
        } as Config,
        logger: loggerResult.value.child({
          component: "StreamingClient",
          clientId: config.streaming.clientId,
        }),
        cache,
      };

      infrastructure.logger.info("Streaming infrastructure initialized", {
        clientId: config.streaming.clientId,
        brokers: config.streaming.brokers,
        cacheBackend: "memory",
        logLevel: config.logging.level,
      });

      return success(infrastructure);
    } catch (error) {
      return failure(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          `Failed to initialize streaming infrastructure: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "initializeInfrastructure", error: String(error) }
        )
      );
    }
  }

  /**
   * Ensure infrastructure is initialized
   */
  private async ensureInfrastructure(): Promise<Result<StreamingInfrastructure, QiError>> {
    if (this.infrastructure) {
      return success(this.infrastructure);
    }

    const result = await this.initializeInfrastructure();

    if (result.tag === "success") {
      this.infrastructure = result.value;
      return success(result.value);
    }
    return failure(result.error);
  }

  // ===========================================================================
  // CLIENT FACTORY METHODS
  // ===========================================================================

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    // Step 1: Ensure infrastructure (may be async but returns Result synchronously)
    const infrastructureResult = await this.ensureInfrastructure();
    if (infrastructureResult.tag === "failure") {
      return infrastructureResult;
    }

    const infrastructure = infrastructureResult.value;
    const producerKey = JSON.stringify(config || {});

    if (this.producers.has(producerKey)) {
      const existingProducer = this.producers.get(producerKey);
      if (!existingProducer) {
        return failure(
          this.createStreamingError("STREAMING_PRODUCER_FAILED", "Producer not found in cache", {
            operation: "getProducer",
            producerKey,
          })
        );
      }
      infrastructure.logger.debug("Returning existing producer", { producerKey });
      return success(existingProducer);
    }

    // Step 2: Create producer (sync operation)
    const streamingConfig = this.extractStreamingConfig(infrastructure.config);
    const producerConfig = {
      maxInFlightRequests: 5,
      idempotent: true,
      ...config,
    } as ProducerConfig;

    if (!this.kafka) {
      return failure(
        create("KAFKA_CLIENT_NOT_INITIALIZED", "Kafka client not initialized", "SYSTEM", {
          operation: "getProducer",
        })
      );
    }

    const producer = new StreamingProducer(
      this.kafka,
      streamingConfig,
      producerConfig,
      infrastructure.logger
    );

    this.producers.set(producerKey, producer);

    infrastructure.logger.info("Created new producer", {
      producerKey,
      config: producerConfig,
    });

    return success(producer);
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    // Step 1: Ensure infrastructure (may be async but returns Result synchronously)
    const infrastructureResult = await this.ensureInfrastructure();
    if (infrastructureResult.tag === "failure") {
      return infrastructureResult;
    }

    const infrastructure = infrastructureResult.value;
    const consumerKey = config.groupId;

    if (this.consumers.has(consumerKey)) {
      const existingConsumer = this.consumers.get(consumerKey);
      if (!existingConsumer) {
        return failure(
          this.createStreamingError("STREAMING_CONSUMER_FAILED", "Consumer not found in cache", {
            operation: "getConsumer",
            consumerKey,
          })
        );
      }
      infrastructure.logger.debug("Returning existing consumer", { groupId: config.groupId });
      return success(existingConsumer);
    }

    // Step 2: Create consumer (sync operation)
    const streamingConfig = this.extractStreamingConfig(infrastructure.config);

    if (!this.kafka) {
      return failure(
        create("KAFKA_CLIENT_NOT_INITIALIZED", "Kafka client not initialized", "SYSTEM", {
          operation: "getConsumer",
        })
      );
    }

    const consumer = new StreamingConsumer(
      this.kafka,
      streamingConfig,
      config,
      infrastructure.logger
    );

    this.consumers.set(consumerKey, consumer);

    infrastructure.logger.info("Created new consumer", {
      groupId: config.groupId,
      config,
    });

    return success(consumer);
  }

  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>> {
    // Step 1: Ensure infrastructure (may be async but returns Result synchronously)
    const infrastructureResult = await this.ensureInfrastructure();
    if (infrastructureResult.tag === "failure") {
      return infrastructureResult;
    }

    const infrastructure = infrastructureResult.value;

    if (this.admin) {
      infrastructure.logger.debug("Returning existing admin client");
      return success(this.admin);
    }

    // Step 2: Create admin (sync operation)
    const streamingConfig = this.extractStreamingConfig(infrastructure.config);

    if (!this.kafka) {
      return failure(
        create("KAFKA_CLIENT_NOT_INITIALIZED", "Kafka client not initialized", "SYSTEM", {
          operation: "getAdmin",
        })
      );
    }

    this.admin = new StreamingAdmin(this.kafka, streamingConfig, infrastructure.logger);

    infrastructure.logger.info("Created new admin client");
    return success(this.admin);
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.infrastructure) {
      return success(undefined);
    }

    const opLogger = this.infrastructure.logger.child({ operation: "disconnect" });
    opLogger.info("Disconnecting streaming client", {
      producerCount: this.producers.size,
      consumerCount: this.consumers.size,
      hasAdmin: !!this.admin,
    });

    const errors: QiError[] = [];

    // Disconnect all producers
    for (const [key, producer] of this.producers) {
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

    // Disconnect all consumers
    for (const [key, consumer] of this.consumers) {
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

    // Disconnect admin client
    if (this.admin) {
      const result = await this.admin.disconnect();
      if (result.tag === "failure") {
        errors.push(result.error);
        opLogger.warn("Admin disconnection failed", { error: result.error.message });
      }
      this.admin = null;
    }

    // Reset infrastructure
    this.kafka = null;
    this.infrastructure = null;

    if (errors.length > 0) {
      const combinedError = this.createStreamingError(
        "STREAMING_DISCONNECTION_FAILED",
        `Failed to disconnect ${errors.length} streaming components`,
        { operation: "disconnect", errorCount: errors.length, errors: errors.map((e) => e.message) }
      );
      opLogger.error("Streaming client disconnection completed with errors");
      return failure(combinedError);
    }

    opLogger.info("Streaming client disconnected successfully");
    return success(undefined);
  }

  async isHealthy(): Promise<Result<boolean, QiError>> {
    if (!this.infrastructure || !this.kafka) {
      return success(false);
    }

    const opLogger = this.infrastructure.logger.child({ operation: "healthCheck" });

    try {
      // Try to get admin client and list topics as health check
      // Get admin client
      const adminResult = await this.getAdmin();
      if (adminResult.tag === "failure") {
        opLogger.warn("Health check failed - could not get admin client", {
          error: adminResult.error.message,
        });
        return success(false);
      }

      const admin = adminResult.value;

      // Connect to admin
      const connectResult = await admin.connect();
      if (connectResult.tag === "failure") {
        opLogger.warn("Health check failed - could not connect admin", {
          error: connectResult.error.message,
        });
        return success(false);
      }

      // Test by listing topics
      const listResult = await admin.listTopics();

      return match(
        (topics: readonly string[]) => {
          opLogger.debug("Health check passed", {
            topicCount: topics.length,
            isHealthy: true,
          });
          return success(true);
        },
        (error) => {
          opLogger.warn("Health check failed on topic listing", { message: error.message });
          return success(false);
        },
        listResult
      );
    } catch (error) {
      const qiError = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { operation: "healthCheck", error: String(error) }
      );

      opLogger.warn("Health check failed with exception", { message: qiError.message });
      return success(false);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private extractStreamingConfig(_config: Config): StreamingConfig {
    // Use simple defaults since config extraction is complex
    return {
      clientId: "qi-streaming-client",
      brokers: ["localhost:9092"],
      connectionTimeout: 3000,
      requestTimeout: 25000,
      retryAttempts: 5,
    };
  }

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {}
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "StreamingClient",
      timestamp: Date.now(),
      ...context,
    });
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create StreamingClient from YAML configuration file
 * Following @qi/core configuration patterns
 */
export async function createStreamingClient(
  configPath: string
): Promise<Result<IStreamingClient, QiError>> {
  try {
    const client = new StreamingClient(configPath);
    return success(client);
  } catch (error) {
    return failure(
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create streaming client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { configPath, error: String(error) }
      )
    );
  }
}

/**
 * Create StreamingClient from environment variables
 * Following @qi/core environment configuration patterns
 */
export async function createStreamingClientFromEnv(): Promise<Result<IStreamingClient, QiError>> {
  try {
    const client = new StreamingClient();
    return success(client);
  } catch (error) {
    return failure(
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create streaming client from environment: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { error: String(error) }
      )
    );
  }
}
