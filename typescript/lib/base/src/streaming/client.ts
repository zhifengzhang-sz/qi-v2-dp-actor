/**
 * StreamingClient - Main orchestrator for streaming operations
 *
 * Coordinates producer, consumer, and admin operations through connector abstractions
 * using @qi/base Result<T> patterns for comprehensive error handling.
 */

import {
  Err,
  Ok,
  type Result,
  create,
  fromAsyncTryCatch,
  fromTryCatch,
  isFailure,
  match,
} from "@qi/base";
import type { QiError } from "@qi/base";

import { ConnectorFactory } from "./factories/factory.js";
import type { IStreamingConnector } from "./interfaces/connector.js";
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
} from "./types.js";

export class StreamingClient implements IStreamingClient {
  private connector: IStreamingConnector | null = null;
  private producers = new Map<string, IStreamingProducer>();
  private consumers = new Map<string, IStreamingConsumer>();
  private admin: IStreamingAdmin | null = null;

  constructor(
    private readonly implementation: "confluent" | "platformatic",
    private readonly streamingConfig: StreamingConfig,
    private readonly logger?: {
      debug: (msg: string, ctx?: Record<string, unknown>) => void;
      info: (msg: string, ctx?: Record<string, unknown>) => void;
      warn: (msg: string, ctx?: Record<string, unknown>) => void;
      error: (msg: string, ctx?: Record<string, unknown>) => void;
    },
  ) {}

  // ===========================================================================
  // CONNECTOR INITIALIZATION
  // ===========================================================================

  /**
   * Initialize streaming connector
   */
  private initializeConnector(): Result<IStreamingConnector, QiError> {
    if (this.connector) {
      return Ok(this.connector);
    }

    const connectorResult = ConnectorFactory.createConnector(
      this.implementation,
      this.streamingConfig,
      this.logger,
    );

    if (isFailure(connectorResult)) {
      return connectorResult;
    }

    this.connector = connectorResult.value;
    this.logger?.info("Streaming connector initialized", { implementation: this.implementation });
    return Ok(this.connector);
  }

  // ===========================================================================
  // CLIENT FACTORY METHODS
  // ===========================================================================

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    // Step 1: Ensure connector is initialized
    const connectorResult = this.initializeConnector();
    if (isFailure(connectorResult)) {
      return connectorResult;
    }

    const connector = match(
      (conn) => conn,
      (error) => {
        throw error;
      },
      connectorResult
    );
    const producerKey = JSON.stringify(config || {});

    if (this.producers.has(producerKey)) {
      const existingProducer = this.producers.get(producerKey);
      if (!existingProducer) {
        return Promise.resolve(
          Err(
            this.createStreamingError("STREAMING_PRODUCER_FAILED", "Producer not found in cache", {
              operation: "getProducer",
              producerKey,
            }),
          ),
        );
      }
      this.logger?.debug("Returning existing producer", { producerKey });
      return Promise.resolve(Ok(existingProducer));
    }

    // Step 2: Create producer through connector
    const producerConfig = {
      maxInFlightRequests: 5,
      idempotent: true,
      ...config,
    } as ProducerConfig;

    return fromAsyncTryCatch(
      async () => {
        const producerResult = await connector.getProducer(producerConfig);
        return match(
          (producer) => {
            this.producers.set(producerKey, producer);
            this.logger?.info("Created new producer", { producerKey, config: producerConfig });
            return producer;
          },
          (error) => {
            throw error;
          },
          producerResult,
        );
      },
      (error) =>
        error instanceof Error
          ? this.createStreamingError("STREAMING_PRODUCER_FAILED", error.message, {
              operation: "getProducer",
            })
          : this.createStreamingError("STREAMING_PRODUCER_FAILED", "Unknown error", {
              operation: "getProducer",
            }),
    );
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    // Step 1: Ensure connector is initialized
    const connectorResult = this.initializeConnector();
    if (isFailure(connectorResult)) {
      return connectorResult;
    }

    const connector = match(
      (conn) => conn,
      (error) => {
        throw error;
      },
      connectorResult
    );
    const consumerKey = config.groupId;

    if (this.consumers.has(consumerKey)) {
      const existingConsumer = this.consumers.get(consumerKey);
      if (!existingConsumer) {
        return Promise.resolve(
          Err(
            this.createStreamingError("STREAMING_CONSUMER_FAILED", "Consumer not found in cache", {
              operation: "getConsumer",
              consumerKey,
            }),
          ),
        );
      }
      this.logger?.debug("Returning existing consumer", { groupId: config.groupId });
      return Promise.resolve(Ok(existingConsumer));
    }

    // Step 2: Create consumer through connector
    return fromAsyncTryCatch(
      async () => {
        const consumerResult = await connector.getConsumer(config);
        return match(
          (consumer) => {
            this.consumers.set(consumerKey, consumer);
            this.logger?.info("Created new consumer", { groupId: config.groupId, config });
            return consumer;
          },
          (error) => {
            throw error;
          },
          consumerResult,
        );
      },
      (error) =>
        error instanceof Error
          ? this.createStreamingError("STREAMING_CONSUMER_FAILED", error.message, {
              operation: "getConsumer",
            })
          : this.createStreamingError("STREAMING_CONSUMER_FAILED", "Unknown error", {
              operation: "getConsumer",
            }),
    );
  }

  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>> {
    // Step 1: Ensure connector is initialized
    const connectorResult = this.initializeConnector();
    if (isFailure(connectorResult)) {
      return connectorResult;
    }

    const connector = match(
      (conn) => conn,
      (error) => {
        throw error;
      },
      connectorResult
    );

    if (this.admin) {
      this.logger?.debug("Returning existing admin client");
      return Promise.resolve(Ok(this.admin));
    }

    // Step 2: Create admin through connector
    return fromAsyncTryCatch(
      async () => {
        const adminResult = await connector.getAdmin();
        return match(
          (admin) => {
            this.admin = admin;
            this.logger?.info("Created new admin client");
            return admin;
          },
          (error) => {
            throw error;
          },
          adminResult,
        );
      },
      (error) =>
        error instanceof Error
          ? this.createStreamingError("STREAMING_ADMIN_FAILED", error.message, {
              operation: "getAdmin",
            })
          : this.createStreamingError("STREAMING_ADMIN_FAILED", "Unknown error", {
              operation: "getAdmin",
            }),
    );
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.connector) {
      return Ok(undefined);
    }

    this.logger?.info("Disconnecting streaming client", {
      producerCount: this.producers.size,
      consumerCount: this.consumers.size,
      hasAdmin: !!this.admin,
    });

    const errors: QiError[] = [];

    // Disconnect all producers
    for (const [key, producer] of this.producers) {
      const result = await producer.disconnect();
      match(
        () => {}, // Success - no action needed
        (error) => {
          errors.push(error);
          this.logger?.warn("Producer disconnection failed", {
            producerKey: key,
            error: error.message,
          });
        },
        result,
      );
    }
    this.producers.clear();

    // Disconnect all consumers
    for (const [key, consumer] of this.consumers) {
      const result = await consumer.disconnect();
      match(
        () => {}, // Success - no action needed
        (error) => {
          errors.push(error);
          this.logger?.warn("Consumer disconnection failed", {
            groupId: key,
            error: error.message,
          });
        },
        result,
      );
    }
    this.consumers.clear();

    // Disconnect admin client
    if (this.admin) {
      const result = await this.admin.disconnect();
      match(
        () => {}, // Success - no action needed
        (error) => {
          errors.push(error);
          this.logger?.warn("Admin disconnection failed", { error: error.message });
        },
        result,
      );
      this.admin = null;
    }

    // Disconnect connector
    if (this.connector) {
      const result = await this.connector.disconnect();
      match(
        () => {}, // Success - no action needed
        (error) => {
          errors.push(error);
          this.logger?.warn("Connector disconnection failed", { error: error.message });
        },
        result,
      );
      this.connector = null;
    }

    if (errors.length > 0) {
      const combinedError = this.createStreamingError(
        "STREAMING_DISCONNECTION_FAILED",
        `Failed to disconnect ${errors.length} streaming components`,
        {
          operation: "disconnect",
          errorCount: errors.length,
          errors: errors.map((e) => e.message),
        },
      );
      this.logger?.error("Streaming client disconnection completed with errors");
      return Err(combinedError);
    }

    this.logger?.info("Streaming client disconnected successfully");
    return Ok(undefined);
  }

  async isHealthy(): Promise<Result<boolean, QiError>> {
    if (!this.connector) {
      return Ok(false);
    }

    // Try to get admin client and list topics as health check
    const adminResult = await this.getAdmin();

    if (isFailure(adminResult)) {
      match(
        () => {},
        (error) => {
          this.logger?.warn("Health check failed - could not get admin client", {
            error: error.message,
          });
        },
        adminResult
      );
      return Ok(false);
    }

    const admin = match(
      (adm) => adm,
      (error) => {
        throw error;
      },
      adminResult
    );

    // Connect to admin
    const connectResult = await admin.connect();
    if (isFailure(connectResult)) {
      match(
        () => {},
        (error) => {
          this.logger?.warn("Health check failed - could not connect admin", {
            error: error.message,
          });
        },
        connectResult
      );
      return Ok(false);
    }

    // Test by listing topics
    const listResult = await admin.listTopics();

    return match(
      (topics: readonly string[]) => {
        this.logger?.debug("Health check passed", {
          topicCount: topics.length,
          isHealthy: true,
        });
        return Ok(true);
      },
      (error) => {
        this.logger?.warn("Health check failed on topic listing", { message: error.message });
        return Ok(false);
      },
      listResult,
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {},
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "StreamingClient",
      implementation: this.implementation,
      timestamp: Date.now(),
      ...context,
    });
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create StreamingClient with specific implementation and configuration
 */
export function createStreamingClient(
  implementation: "confluent" | "platformatic",
  config: StreamingConfig,
  logger?: {
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  },
): Result<IStreamingClient, QiError> {
  return fromTryCatch(
    () => new StreamingClient(implementation, config, logger),
    (error) =>
      create(
        "STREAMING_INVALID_CONFIG",
        `Failed to create streaming client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CONFIGURATION",
        { implementation, error: String(error) },
      ),
  );
}

/**
 * @deprecated Use createStreamingClient instead
 */
export function createStreamingClientFromEnv(): Result<IStreamingClient, QiError> {
  return Err(
    create(
      "STREAMING_INVALID_CONFIG",
      "createStreamingClientFromEnv is deprecated. Use createStreamingClient with explicit config instead.",
      "CONFIGURATION",
    ),
  );
}
