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

// Connector abstraction layer
export type {
  IStreamingConnector,
  IStreamingProducer as IConnectorProducer,
  IStreamingConsumer as IConnectorConsumer,
  StreamingMessage as ConnectorMessage,
  StreamingProducerConfig,
  StreamingConsumerConfig,
  ConnectorFactoryConfig,
  StreamingBackend,
} from "./interfaces/StreamingConnector.js";

// =============================================================================
// IMPLEMENTATION EXPORTS
// =============================================================================

export { StreamingProducer } from "./producer.js";
export { StreamingConsumer } from "./consumer.js";
export { StreamingAdmin } from "./admin.js";
export {
  StreamingClient,
  createStreamingClient,
  createStreamingClientFromEnv,
} from "./client.js";

// Connector factory and implementations
export { ConnectorFactory } from "./factories/ConnectorFactory.js";
export { PlatformaticKafkaConnector } from "./impl/platformatic/PlatformaticKafkaConnector.js";

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
