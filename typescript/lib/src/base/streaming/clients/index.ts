/**
 * Streaming Client Implementations
 *
 * Multiple Kafka client implementations without over-engineering.
 * Each implementation provides the same IStreamingClient interface
 * but uses different underlying Kafka libraries.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { IStreamingClient, StreamingConfig, ProducerConfig, ConsumerConfig } from "../types.js";

// =============================================================================
// IMPLEMENTATION EXPORTS
// =============================================================================

// KafkaJS Implementation (default)
export {
  KafkaJSStreamingClient,
  createKafkaJSStreamingClient,
} from "./kafkajs-client.js";

// Confluent Implementation (stub - requires @confluentinc/kafka-javascript)
export {
  ConfluentStreamingClient,
  createConfluentStreamingClient,
} from "./confluent-client.js";

// Platformatic Implementation (stub - requires @platformatic/kafka)
export {
  PlatformaticStreamingClient,
  createPlatformaticStreamingClient,
} from "./platformatic-client.js";

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

import { type Result } from "@qi/base";
import type { QiError } from "@qi/base";
import type { IStreamingClient, StreamingConfig } from "../types.js";
import { createKafkaJSStreamingClient } from "./kafkajs-client.js";
import { createConfluentStreamingClient } from "./confluent-client.js";
import { createPlatformaticStreamingClient } from "./platformatic-client.js";

/**
 * Supported streaming client implementations
 */
export type StreamingClientType = "kafkajs" | "confluent" | "platformatic";

/**
 * Create streaming client by implementation type
 */
export function createStreamingClientByType(
  type: StreamingClientType,
  config?: Partial<StreamingConfig>
): Result<IStreamingClient, QiError> {
  switch (type) {
    case "kafkajs":
      return createKafkaJSStreamingClient(config);
    case "confluent":
      return createConfluentStreamingClient(config);
    case "platformatic":
      return createPlatformaticStreamingClient(config);
    default:
      // TypeScript ensures this is unreachable, but add runtime check
      throw new Error(`Unsupported streaming client type: ${type as string}`);
  }
}

/**
 * Create streaming client from environment variable or default to KafkaJS
 */
export function createStreamingClientFromEnv(
  config?: Partial<StreamingConfig>
): Result<IStreamingClient, QiError> {
  const clientType = (process.env["STREAMING_CLIENT_TYPE"] as StreamingClientType) || "kafkajs";
  return createStreamingClientByType(clientType, config);
}