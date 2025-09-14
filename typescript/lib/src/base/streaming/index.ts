/**
 * Base Streaming Infrastructure
 *
 * Kafka/Redpanda streaming operations using @qi/core infrastructure and
 * @qi/base Result<T> patterns for production-ready streaming applications.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Configuration types
  StreamingConfig,
  ProducerConfig,
  ConsumerConfig,
  TopicConfig,
  StreamingInfrastructure,
  // Message types
  StreamingMessage,
  MessageBatch,
  ConsumedMessage,
  SubscriptionConfig,
  // Result types
  ProduceResult,
  BatchProduceResult,
  TopicMetadata,
  // Error types
  StreamingErrorCode,
  StreamingErrorContext,
  // Interface types
  IStreamingClient,
  IStreamingProducer,
  IStreamingConsumer,
  IStreamingAdmin,
} from "./types.js";

// =============================================================================
// IMPLEMENTATION EXPORTS
// =============================================================================

export { StreamingProducer } from "./producer.js";
export { StreamingConsumer } from "./consumer.js";
export { StreamingAdmin } from "./admin.js";

// Default client (KafkaJS wrapper)
export {
  StreamingClient,
  createStreamingClient,
  createStreamingClientWithConfig,
} from "./client.js";

// Specific client implementations
export {
  KafkaJSStreamingClient,
  createKafkaJSStreamingClient,
  ConfluentStreamingClient,
  createConfluentStreamingClient,
  PlatformaticStreamingClient,
  createPlatformaticStreamingClient,
  createStreamingClientByType,
  createStreamingClientFromEnv,
  type StreamingClientType,
} from "./clients/index.js";

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

/**
 * Primary streaming client factory function
 *
 * Creates a streaming client from YAML configuration file using @qi/core
 * configuration management patterns.
 *
 * @param configPath Path to YAML configuration file
 * @returns Result<IStreamingClient, QiError>
 */
export { createStreamingClient as createClient } from "./client.js";
