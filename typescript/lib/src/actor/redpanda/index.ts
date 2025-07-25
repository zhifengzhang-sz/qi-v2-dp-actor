/**
 * Redpanda Generic Actors
 *
 * Concrete implementations of MarketDataReader and MarketDataWriter using Redpanda/Kafka streaming.
 * Part of the ts-0.6.0 "Generic Concrete Implementations" layer.
 *
 * Features:
 * - Full @qi/base Result<T> composition
 * - Complete @qi/core infrastructure integration (config, logger, cache)
 * - Redpanda/Kafka streaming using existing lib/src/base/streaming/ infrastructure
 * - Write deduplication and batching support
 * - Environment-based configuration
 * - Production-ready error handling and observability
 */

export { RepandaReader } from "./RepandaReader";
export { RepandaWriter } from "./RepandaWriter";

// Type exports for configuration
export type {
  // Re-export streaming types that users might need
  StreamingConfig,
  ProducerConfig,
  ConsumerConfig,
  StreamingMessage,
  MessageBatch,
  ConsumedMessage,
  ProduceResult,
  BatchProduceResult,
} from "../../base/streaming";
