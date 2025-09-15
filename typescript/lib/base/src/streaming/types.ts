/**
 * Base Layer Streaming Types
 *
 * Type definitions for Kafka/Redpanda streaming operations using @qi/core
 * configuration patterns and @qi/base Result<T> types.
 */

import type { QiError, Result } from "@qi/base";

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Streaming infrastructure configuration
 * Following @qi/core configuration patterns
 */
export interface StreamingConfig {
  /** Kafka client ID for connection identification */
  readonly clientId: string;

  /** Redpanda/Kafka broker addresses */
  readonly brokers: readonly string[];

  /** Connection timeout in milliseconds */
  readonly connectionTimeout?: number;

  /** Request timeout in milliseconds */
  readonly requestTimeout?: number;

  /** Number of retry attempts for failed operations */
  readonly retryAttempts?: number;

  /** Security configuration for authentication */
  readonly security?: {
    readonly mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    readonly username?: string;
    readonly password?: string;
  };
}

/**
 * Producer-specific configuration
 */
export interface ProducerConfig {
  /** Maximum number of in-flight requests */
  readonly maxInFlightRequests?: number;

  /** Enable idempotent producer */
  readonly idempotent?: boolean;

  /** Transaction timeout in milliseconds */
  readonly transactionTimeout?: number;

  /** Allow automatic topic creation */
  readonly allowAutoTopicCreation?: boolean;
}

/**
 * Consumer-specific configuration
 */
export interface ConsumerConfig {
  /** Consumer group ID */
  readonly groupId: string;

  /** Session timeout in milliseconds */
  readonly sessionTimeout?: number;

  /** Heartbeat interval in milliseconds */
  readonly heartbeatInterval?: number;

  /** Maximum bytes to fetch per request */
  readonly maxBytesPerPartition?: number;

  /** Minimum bytes to fetch before returning */
  readonly minBytes?: number;

  /** Maximum wait time for fetch */
  readonly maxWaitTimeInMs?: number;
}

/**
 * Consumer run configuration for message processing
 */
export interface ConsumerRunConfig {
  /** Function to process each message */
  readonly eachMessage?: (payload: {
    readonly topic: string;
    readonly partition: number;
    readonly message: {
      readonly key: Buffer | null;
      readonly value: Buffer | null;
      readonly timestamp: string;
      readonly offset: string;
      readonly headers?: Record<string, Buffer | string | undefined>;
    };
  }) => Promise<void>;
}

/**
 * Topic configuration for admin operations
 */
export interface TopicConfig {
  /** Topic name */
  readonly topic: string;

  /** Number of partitions */
  readonly numPartitions?: number;

  /** Replication factor */
  readonly replicationFactor?: number;

  /** Topic-specific configurations */
  readonly configEntries?: ReadonlyArray<{
    readonly name: string;
    readonly value: string;
  }>;
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Message format for streaming operations
 */
export interface StreamingMessage {
  readonly key?: string;
  readonly value: Buffer;
  readonly partition?: number;
  readonly timestamp?: Date;
  readonly headers?: Record<string, string>;
}

/**
 * Batch of messages for efficient operations
 */
export interface MessageBatch {
  readonly topic: string;
  readonly messages: readonly StreamingMessage[];
}

// =============================================================================
// OPERATION RESULT TYPES
// =============================================================================

/**
 * Result of successful produce operation
 */
export interface ProduceResult {
  readonly topic: string;
  readonly partition: number;
  readonly offset: string;
  readonly timestamp: Date;
}

/**
 * Result of successful batch produce operation
 */
export interface BatchProduceResult {
  readonly results: readonly ProduceResult[];
  readonly totalMessages: number;
  readonly totalTopics: number;
}

/**
 * Consumed message with metadata
 */
export interface ConsumedMessage {
  readonly topic: string;
  readonly partition: number;
  readonly offset: string;
  readonly key: string | null;
  readonly value: Buffer;
  readonly timestamp: Date;
  readonly headers?: Record<string, string>;
}

/**
 * Subscription configuration for consumers
 */
export interface SubscriptionConfig {
  readonly topics: readonly string[];
  readonly fromBeginning?: boolean;
}

/**
 * Topic metadata information
 */
export interface TopicMetadata {
  readonly name: string;
  readonly partitions: readonly {
    readonly partitionId: number;
    readonly leader: number;
    readonly replicas: readonly number[];
    readonly isr: readonly number[];
  }[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Streaming-specific error contexts
 * Using flexible Record type to allow additional context fields
 */
export interface StreamingErrorContext extends Record<string, unknown> {
  readonly operation: string;
  readonly topic?: string;
  readonly partition?: number;
  readonly offset?: string;
  readonly consumerGroup?: string;
  readonly brokers?: readonly string[];
  readonly timestamp?: number;
}

/**
 * Custom streaming error codes following @qi/base patterns
 */
export type StreamingErrorCode =
  | "STREAMING_CONNECTION_FAILED"
  | "STREAMING_DISCONNECTION_FAILED"
  | "STREAMING_PRODUCER_FAILED"
  | "STREAMING_CONSUMER_FAILED"
  | "STREAMING_ADMIN_FAILED"
  | "STREAMING_TOPIC_CREATE_FAILED"
  | "STREAMING_TOPIC_DELETE_FAILED"
  | "STREAMING_SUBSCRIPTION_FAILED"
  | "STREAMING_PUBLISH_FAILED"
  | "STREAMING_BATCH_PUBLISH_FAILED"
  | "STREAMING_CONSUME_FAILED"
  | "STREAMING_COMMIT_FAILED"
  | "STREAMING_SEEK_FAILED"
  | "STREAMING_METADATA_FAILED"
  | "STREAMING_INVALID_CONFIG"
  | "STREAMING_INVALID_MESSAGE"
  | "STREAMING_TIMEOUT";

// =============================================================================
// INTERFACE ABSTRACTIONS
// =============================================================================

/**
 * Streaming producer interface
 * Returns Result<T> for all operations following @qi/base patterns
 */
export interface IStreamingProducer {
  connect(): Promise<Result<void, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  send(topic: string, message: StreamingMessage): Promise<Result<ProduceResult, QiError>>;
  sendBatch(batch: MessageBatch): Promise<Result<BatchProduceResult, QiError>>;
  isConnected(): boolean;
}

/**
 * Streaming consumer interface
 * Returns Result<T> for all operations following @qi/base patterns
 */
export interface IStreamingConsumer {
  connect(): Promise<Result<void, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  subscribe(config: SubscriptionConfig): Promise<Result<void, QiError>>;
  run(config: ConsumerRunConfig): Promise<Result<void, QiError>>;
  commitOffsets(): Promise<Result<void, QiError>>;
  seek(topic: string, partition: number, offset: string): Promise<Result<void, QiError>>;
  isConnected(): boolean;
}

/**
 * Streaming admin interface
 * Returns Result<T> for all operations following @qi/base patterns
 */
export interface IStreamingAdmin {
  connect(): Promise<Result<void, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  createTopics(topics: readonly TopicConfig[]): Promise<Result<void, QiError>>;
  deleteTopics(topicNames: readonly string[]): Promise<Result<void, QiError>>;
  listTopics(): Promise<Result<readonly string[], QiError>>;
  getTopicMetadata(topics: readonly string[]): Promise<Result<readonly TopicMetadata[], QiError>>;
  isConnected(): boolean;
}

/**
 * Streaming client orchestrator interface
 * Coordinates producer, consumer, and admin operations with @qi/core infrastructure
 */
export interface IStreamingClient {
  getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>>;
  getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>>;
  getAdmin(): Promise<Result<IStreamingAdmin, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  isHealthy(): Promise<Result<boolean, QiError>>;
}
