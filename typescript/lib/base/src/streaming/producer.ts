/**
 * StreamingProducer - Kafka/Redpanda producer implementation
 *
 * Implements message publishing with @qi/base Result<T> patterns and @qi/core
 * infrastructure integration for proper observability and error handling.
 */

import { Err, Ok, type Result, create, fromAsyncTryCatch, fromTryCatch, isFailure, match } from "@qi/base";
import type { QiError } from "@qi/base";
import type { Logger } from "@qi/core";
import type { Kafka, Producer } from "kafkajs";
import type {
  BatchProduceResult,
  IStreamingProducer,
  MessageBatch,
  ProduceResult,
  ProducerConfig,
  StreamingConfig,
  StreamingErrorCode,
  StreamingErrorContext,
  StreamingMessage,
} from "./types.js";

export class StreamingProducer implements IStreamingProducer {
  private producer: Producer | null = null;
  private connected = false;
  private readonly operationLogger: Logger;

  constructor(
    private readonly kafka: Kafka,
    private readonly streamingConfig: StreamingConfig,
    private readonly producerConfig: ProducerConfig,
    private readonly logger: Logger,
  ) {
    this.operationLogger = this.logger.child({
      component: "StreamingProducer",
      clientId: this.streamingConfig.clientId,
    });
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  async connect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "connect" });

    if (this.connected) {
      opLogger.debug("Producer already connected");
      return Ok(undefined);
    }

    opLogger.info("Connecting producer", {
      brokers: this.streamingConfig.brokers,
      config: this.producerConfig,
    });

    // Step 1: Create producer instance (sync operation)
    const instanceResult = this.createProducerInstance();
    if (isFailure(instanceResult)) {
      return instanceResult;
    }

    // Step 2: Connect using fromAsyncTryCatch for the async operation
    return fromAsyncTryCatch(
      async () => {
        await this.producer?.connect();
        this.connected = true;
        opLogger.info("Producer connected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_CONNECTION_FAILED",
          `Failed to connect producer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "connect", error: String(error) },
        );

        opLogger.error("Producer connection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });

        return qiError;
      },
    );
  }

  async disconnect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "disconnect" });

    if (!this.connected || !this.producer) {
      opLogger.debug("Producer already disconnected");
      return Ok(undefined);
    }

    opLogger.info("Disconnecting producer");

    return fromAsyncTryCatch(
      async () => {
        await this.producer?.disconnect();
        this.producer = null;
        this.connected = false;

        opLogger.info("Producer disconnected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Failed to disconnect producer: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "disconnect", error: String(error) },
        );

        opLogger.error("Producer disconnection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      },
    );
  }

  isConnected(): boolean {
    return this.connected && this.producer !== null;
  }

  // ===========================================================================
  // MESSAGE PUBLISHING
  // ===========================================================================

  async send(topic: string, message: StreamingMessage): Promise<Result<ProduceResult, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "send",
      topic,
      messageKey: message.key,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_PRODUCER_FAILED",
        "Producer not connected",
        { operation: "send", topic },
      );
      opLogger.error("Send failed - producer not connected");
      return Err(error);
    }

    // Step 1: Validate message (sync operation)
    const validatedMessage = this.validateMessage(message);
    if (isFailure(validatedMessage)) {
      return Promise.resolve(validatedMessage);
    }

    // Step 2: Send message using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.debug("Sending message", {
          topic,
          messageSize: validatedMessage.value.value.length,
          hasKey: !!validatedMessage.value.key,
          hasHeaders: !!validatedMessage.value.headers,
        });

        const record = {
          topic,
          messages: [
            {
              key: validatedMessage.value.key || null,
              value: validatedMessage.value.value,
              ...(validatedMessage.value.partition !== undefined && {
                partition: validatedMessage.value.partition,
              }),
              ...(validatedMessage.value.timestamp && {
                timestamp: validatedMessage.value.timestamp.getTime().toString(),
              }),
              headers: validatedMessage.value.headers || {},
            },
          ],
        };

        const result = await this.producer?.send(record);
        if (!result || result.length === 0) {
          // This is an error condition - throw descriptive error for fromAsyncTryCatch
          opLogger.warn("Send operation returned no result");
          throw new Error("Send operation failed - no result returned");
        }
        const metadata = result[0];
        if (!metadata) {
          // This is an error condition - throw descriptive error for fromAsyncTryCatch
          opLogger.warn("Send operation returned no metadata");
          throw new Error("Send operation failed - no metadata returned");
        }

        const produceResult: ProduceResult = {
          topic: metadata.topicName,
          partition: metadata.partition,
          offset: metadata.baseOffset || "0",
          timestamp: new Date(Number.parseInt(metadata.logAppendTime || Date.now().toString())),
        };

        opLogger.info("Message sent successfully", {
          partition: produceResult.partition,
          offset: produceResult.offset,
        });

        return produceResult;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_PUBLISH_FAILED",
          `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "send", topic, error: String(error) },
        );

        opLogger.error("Message send failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      },
    );
  }

  async sendBatch(batch: MessageBatch): Promise<Result<BatchProduceResult, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "sendBatch",
      topic: batch.topic,
      messageCount: batch.messages.length,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_PRODUCER_FAILED",
        "Producer not connected",
        { operation: "sendBatch", topic: batch.topic },
      );
      opLogger.error("Batch send failed - producer not connected");
      return Err(error);
    }

    // Step 1: Validate batch (sync operation)
    const validatedBatch = this.validateMessageBatch(batch);
    if (isFailure(validatedBatch)) {
      return Promise.resolve(validatedBatch);
    }

    // Step 2: Send batch using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.debug("Sending message batch", {
          topic: validatedBatch.value.topic,
          messageCount: validatedBatch.value.messages.length,
          totalSize: validatedBatch.value.messages.reduce((sum, msg) => sum + msg.value.length, 0),
        });

        const record = {
          topic: validatedBatch.value.topic,
          messages: validatedBatch.value.messages.map((msg) => ({
            key: msg.key || null,
            value: msg.value,
            ...(msg.partition !== undefined && { partition: msg.partition }),
            ...(msg.timestamp && { timestamp: msg.timestamp.getTime().toString() }),
            headers: msg.headers || {},
          })),
        };

        const results = await this.producer?.send(record);
        if (!results) {
          // This is an error condition - throw descriptive error for fromAsyncTryCatch
          opLogger.warn("Send batch operation returned no results");
          throw new Error("Send batch operation failed - no results returned");
        }

        const produceResults: ProduceResult[] = results.map((metadata) => ({
          topic: metadata.topicName,
          partition: metadata.partition,
          offset: metadata.baseOffset || "0",
          timestamp: new Date(Number.parseInt(metadata.logAppendTime || Date.now().toString())),
        }));

        const batchResult: BatchProduceResult = {
          results: produceResults,
          totalMessages: produceResults.length,
          totalTopics: 1,
        };

        opLogger.info("Message batch sent successfully", {
          partitions: [...new Set(produceResults.map((r) => r.partition))],
        });

        return batchResult;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_BATCH_PUBLISH_FAILED",
          `Failed to send message batch: ${error instanceof Error ? error.message : "Unknown error"}`,
          {
            operation: "sendBatch",
            topic: batch.topic,
            messageCount: batch.messages.length,
            error: String(error),
          },
        );

        opLogger.error("Message batch send failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      },
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createProducerInstance(): Result<void, QiError> {
    return fromTryCatch(
      () => {
        this.producer = this.kafka.producer({
          maxInFlightRequests: this.producerConfig.maxInFlightRequests ?? 1,
          idempotent: this.producerConfig.idempotent ?? true,
          transactionTimeout: this.producerConfig.transactionTimeout ?? 30000,
          allowAutoTopicCreation: this.producerConfig.allowAutoTopicCreation ?? false,
        });
        return undefined;
      },
      (error) => this.createStreamingError(
        "STREAMING_CONNECTION_FAILED",
        `Failed to create producer instance: ${error instanceof Error ? error.message : "Unknown error"}`,
        { operation: "createProducerInstance", error: String(error) },
      )
    );
  }

  private validateMessage(message: StreamingMessage): Result<StreamingMessage, QiError> {
    if (!message.value || message.value.length === 0) {
      return Err(
        this.createStreamingError("STREAMING_INVALID_MESSAGE", "Message value cannot be empty", {
          operation: "validateMessage",
        }),
      );
    }

    if (message.key && typeof message.key !== "string") {
      return Err(
        this.createStreamingError("STREAMING_INVALID_MESSAGE", "Message key must be a string", {
          operation: "validateMessage",
          keyType: typeof message.key,
        }),
      );
    }

    return Ok(message);
  }

  private validateMessageBatch(batch: MessageBatch): Result<MessageBatch, QiError> {
    if (!batch.topic || batch.topic.trim().length === 0) {
      return Err(
        this.createStreamingError("STREAMING_INVALID_MESSAGE", "Batch topic cannot be empty", {
          operation: "validateMessageBatch",
        }),
      );
    }

    if (!batch.messages || batch.messages.length === 0) {
      return Err(
        this.createStreamingError("STREAMING_INVALID_MESSAGE", "Message batch cannot be empty", {
          operation: "validateMessageBatch",
          topic: batch.topic,
        }),
      );
    }

    // Validate each message in the batch
    for (let i = 0; i < batch.messages.length; i++) {
      const message = batch.messages[i];
      if (!message) {
        return Err(
          this.createStreamingError("STREAMING_INVALID_MESSAGE", `Missing message at index ${i}`, {
            operation: "validateMessageBatch",
            topic: batch.topic,
            messageIndex: i,
          }),
        );
      }
      const messageResult = this.validateMessage(message);
      if (isFailure(messageResult)) {
        return Err(
          this.createStreamingError(
            "STREAMING_INVALID_MESSAGE",
            `Invalid message at index ${i}: ${messageResult.error.message}`,
            { operation: "validateMessageBatch", topic: batch.topic, messageIndex: i },
          ),
        );
      }
    }

    return Ok(batch);
  }

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {},
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "StreamingProducer",
      clientId: this.streamingConfig.clientId,
      brokers: this.streamingConfig.brokers,
      timestamp: Date.now(),
      ...context,
    });
  }
}
