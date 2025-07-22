/**
 * Base Infrastructure Layer
 *
 * Provides streaming and other infrastructure services using @qi/core and @qi/base
 * patterns for production-ready market data processing applications.
 */

// =============================================================================
// STREAMING INFRASTRUCTURE EXPORTS
// =============================================================================

export * from "./streaming/index.js";

// =============================================================================
// CONVENIENCE RE-EXPORTS FOR COMMON USAGE
// =============================================================================

/**
 * Primary streaming exports for most common use cases
 */
export type {
  IStreamingClient,
  IStreamingProducer,
  IStreamingConsumer,
  IStreamingAdmin,
  StreamingConfig,
  StreamingMessage,
  ProduceResult,
  ConsumedMessage,
} from "./streaming/index.js";

export { createClient as createStreamingClient } from "./streaming/index.js";
