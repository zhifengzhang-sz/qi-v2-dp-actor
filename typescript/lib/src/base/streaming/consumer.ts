/**
 * StreamingConsumer - Kafka/Redpanda consumer implementation
 *
 * Implements message consumption with @qi/base Result<T> patterns and @qi/core
 * infrastructure integration for proper observability and error handling.
 */

import { Err, Ok, type Result, create, flatMap, fromAsyncTryCatch, match } from "@qi/base";
import type { QiError } from "@qi/base";
import type { Logger } from "@qi/core";
import type { Consumer, ConsumerRunConfig, EachMessagePayload, Kafka } from "kafkajs";
import type {
  ConsumedMessage,
  ConsumerConfig,
  IStreamingConsumer,
  StreamingConfig,
  StreamingErrorCode,
  StreamingErrorContext,
  SubscriptionConfig,
} from "./types.js";

export class StreamingConsumer implements IStreamingConsumer {
  private consumer: Consumer | null = null;
  private connected = false;
  private subscribed = false;
  private running = false;
  private readonly operationLogger: Logger;

  constructor(
    private readonly kafka: Kafka,
    private readonly streamingConfig: StreamingConfig,
    private readonly consumerConfig: ConsumerConfig,
    private readonly logger: Logger
  ) {
    this.operationLogger = this.logger.child({
      component: "StreamingConsumer",
      clientId: this.streamingConfig.clientId,
      groupId: this.consumerConfig.groupId,
    });
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  async connect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "connect" });

    if (this.connected) {
      opLogger.debug("Consumer already connected");
      return Ok(undefined);
    }

    opLogger.info("Connecting consumer", {
      brokers: this.streamingConfig.brokers,
      groupId: this.consumerConfig.groupId,
      config: this.consumerConfig,
    });

    // Step 1: Create consumer instance (sync operation)
    const instanceResult = this.createConsumerInstance();
    if (instanceResult.tag === "failure") {
      return instanceResult;
    }

    // Step 2: Connect using fromAsyncTryCatch for the async operation
    return fromAsyncTryCatch(
      async () => {
        await this.consumer?.connect();
        this.connected = true;
        opLogger.info("Consumer connected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_CONNECTION_FAILED",
          `Failed to connect consumer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "connect", error: String(error) }
        );

        opLogger.error("Consumer connection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });

        return qiError;
      }
    );
  }

  async disconnect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "disconnect" });

    if (!this.connected || !this.consumer) {
      opLogger.debug("Consumer already disconnected");
      return Ok(undefined);
    }

    opLogger.info("Disconnecting consumer");

    return fromAsyncTryCatch(
      async () => {
        await this.consumer?.disconnect();
        this.consumer = null;
        this.connected = false;
        this.subscribed = false;
        this.running = false;

        opLogger.info("Consumer disconnected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Failed to disconnect consumer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "disconnect", error: String(error) }
        );

        opLogger.error("Consumer disconnection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  isConnected(): boolean {
    return this.connected && this.consumer !== null;
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  async subscribe(config: SubscriptionConfig): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "subscribe",
      topics: config.topics,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_CONSUMER_FAILED",
        "Consumer not connected",
        { operation: "subscribe", topics: config.topics }
      );
      opLogger.error("Subscribe failed - consumer not connected");
      return Err(error);
    }

    // Step 1: Validate subscription config (sync operation)
    const configResult = this.validateSubscriptionConfig(config);
    if (configResult.tag === "failure") {
      return configResult;
    }

    const validatedConfig = configResult.value;

    // Step 2: Subscribe using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.info("Subscribing to topics", {
          topics: validatedConfig.topics,
          fromBeginning: validatedConfig.fromBeginning,
        });

        await this.consumer?.subscribe({
          topics: [...validatedConfig.topics],
          fromBeginning: validatedConfig.fromBeginning ?? false,
        });

        this.subscribed = true;

        opLogger.info("Successfully subscribed to topics", {
          topics: validatedConfig.topics,
        });

        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_SUBSCRIPTION_FAILED",
          `Failed to subscribe to topics: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "subscribe", topics: config.topics, error: String(error) }
        );

        opLogger.error("Topic subscription failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  // ===========================================================================
  // MESSAGE CONSUMPTION
  // ===========================================================================

  async run(config: ConsumerRunConfig): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "run" });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_CONSUMER_FAILED",
        "Consumer not connected",
        { operation: "run" }
      );
      opLogger.error("Run failed - consumer not connected");
      return Err(error);
    }

    if (!this.subscribed) {
      const error = this.createStreamingError(
        "STREAMING_CONSUMER_FAILED",
        "Consumer not subscribed to any topics",
        { operation: "run" }
      );
      opLogger.error("Run failed - consumer not subscribed");
      return Err(error);
    }

    if (this.running) {
      opLogger.debug("Consumer already running");
      return Ok(undefined);
    }

    opLogger.info("Starting consumer run loop");

    return fromAsyncTryCatch(
      async () => {
        // Wrap the original eachMessage handler with logging and error handling
        const wrappedConfig: ConsumerRunConfig = {
          ...config,
          eachMessage: async (payload: EachMessagePayload) => {
            const messageLogger = opLogger.child({
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset,
            });

            messageLogger.debug("Processing message", {
              messageSize: payload.message.value?.length || 0,
              hasKey: !!payload.message.key,
              hasHeaders: !!payload.message.headers,
            });

            const _consumedMessage: ConsumedMessage = {
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset,
              key: payload.message.key?.toString() || null,
              value: payload.message.value || Buffer.alloc(0),
              timestamp: payload.message.timestamp
                ? new Date(Number.parseInt(payload.message.timestamp))
                : new Date(),
              headers: payload.message.headers
                ? this.parseHeaders(
                    payload.message.headers as Record<string, Buffer | string | undefined>
                  )
                : {},
            };

            try {
              // Call the original handler if provided
              if (config.eachMessage) {
                await config.eachMessage(payload);
              }

              messageLogger.debug("Message processed successfully");
            } catch (error) {
              messageLogger.error("Message processing failed", new Error("Processing failed"), {
                operation: "processMessage",
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
                error: String(error),
              });
              throw error; // Re-throw to let KafkaJS handle retry logic
            }
          },
        };

        await this.consumer?.run(wrappedConfig);
        this.running = true;

        opLogger.info("Consumer run loop started successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_CONSUME_FAILED",
          `Failed to start consumer run loop: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "run", error: String(error) }
        );

        opLogger.error("Consumer run failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  // ===========================================================================
  // OFFSET MANAGEMENT
  // ===========================================================================

  async commitOffsets(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "commitOffsets" });

    if (!this.isConnected() || !this.running) {
      const error = this.createStreamingError(
        "STREAMING_CONSUMER_FAILED",
        "Consumer not connected or not running",
        { operation: "commitOffsets" }
      );
      opLogger.error("Commit offsets failed - consumer not ready");
      return Err(error);
    }

    opLogger.debug("Committing current offsets");

    return fromAsyncTryCatch(
      async () => {
        await this.consumer?.commitOffsets([]);
        opLogger.debug("Offsets committed successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_COMMIT_FAILED",
          `Failed to commit offsets: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "commitOffsets", error: String(error) }
        );

        opLogger.error("Offset commit failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  async seek(topic: string, partition: number, offset: string): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "seek",
      topic,
      partition,
      offset,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_CONSUMER_FAILED",
        "Consumer not connected",
        { operation: "seek", topic, partition, offset }
      );
      opLogger.error("Seek failed - consumer not connected");
      return Err(error);
    }

    opLogger.debug("Seeking to offset", { topic, partition, offset });

    return fromAsyncTryCatch(
      async () => {
        await this.consumer?.seek({ topic, partition, offset });

        opLogger.info("Successfully seeked to offset", {
          topic,
          partition,
          offset,
        });

        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_SEEK_FAILED",
          `Failed to seek to offset: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "seek", topic, partition, offset, error: String(error) }
        );

        opLogger.error("Seek operation failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createConsumerInstance(): Result<void, QiError> {
    try {
      this.consumer = this.kafka.consumer({
        groupId: this.consumerConfig.groupId,
        sessionTimeout: this.consumerConfig.sessionTimeout ?? 30000,
        heartbeatInterval: this.consumerConfig.heartbeatInterval ?? 3000,
        maxBytesPerPartition: this.consumerConfig.maxBytesPerPartition ?? 1048576, // 1MB
        minBytes: this.consumerConfig.minBytes ?? 1,
        maxWaitTimeInMs: this.consumerConfig.maxWaitTimeInMs ?? 5000,
      });

      return Ok(undefined);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_CONNECTION_FAILED",
          `Failed to create consumer instance: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "createConsumerInstance", error: String(error) }
        )
      );
    }
  }

  private validateSubscriptionConfig(
    config: SubscriptionConfig
  ): Result<SubscriptionConfig, QiError> {
    if (!config.topics || config.topics.length === 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          "Subscription topics cannot be empty",
          { operation: "validateSubscriptionConfig" }
        )
      );
    }

    const invalidTopics = config.topics.filter((topic) => !topic || topic.trim().length === 0);
    if (invalidTopics.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_INVALID_CONFIG",
          "All topic names must be non-empty strings",
          { operation: "validateSubscriptionConfig", invalidTopics }
        )
      );
    }

    return Ok(config);
  }

  private parseHeaders(
    headers: Record<string, Buffer | string | undefined>
  ): Record<string, string> {
    const parsed: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        parsed[key] = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
      }
    }

    return parsed;
  }

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {}
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "StreamingConsumer",
      clientId: this.streamingConfig.clientId,
      groupId: this.consumerConfig.groupId,
      brokers: this.streamingConfig.brokers,
      timestamp: Date.now(),
      ...context,
    });
  }
}
