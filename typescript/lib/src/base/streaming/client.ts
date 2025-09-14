/**
 * StreamingClient - Default Kafka/Redpanda streaming client
 *
 * This is a convenient wrapper around the KafkaJS implementation,
 * providing the default streaming client with environment-based configuration.
 *
 * For specific implementations, use:
 * - clients/kafkajs-client.ts
 * - clients/confluent-client.ts
 * - clients/platformatic-client.ts
 */

import { type Result } from "@qi/base";
import type { QiError } from "@qi/base";
import type {
  IStreamingClient,
  StreamingConfig,
} from "./types.js";
import {
  KafkaJSStreamingClient,
  createKafkaJSStreamingClient,
} from "./clients/kafkajs-client.js";

// =============================================================================
// DEFAULT STREAMING CLIENT
// =============================================================================

/**
 * StreamingClient - Default implementation using KafkaJS
 */
export class StreamingClient extends KafkaJSStreamingClient implements IStreamingClient {}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create StreamingClient using default KafkaJS implementation
 */
export function createStreamingClient(config?: Partial<StreamingConfig>): Result<IStreamingClient, QiError> {
  return createKafkaJSStreamingClient(config);
}

/**
 * Create StreamingClient with explicit configuration
 */
export function createStreamingClientWithConfig(config: Partial<StreamingConfig>): Result<IStreamingClient, QiError> {
  return createKafkaJSStreamingClient(config);
}