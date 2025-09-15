/**
 * ConnectorFactory - Factory functions for creating different streaming client wrapper implementations
 *
 * Allows runtime selection between confluent and platformatic client implementations
 * while maintaining a consistent interface across the application.
 */

import type { QiError, Result } from "@qi/base";
import { Err, create } from "@qi/base";
import type { IStreamingConnector } from "../interfaces/connector.js";
import type { StreamingConfig } from "../types.js";

// Import different connector implementations
// import { PlatformaticKafkaConnector } from "../impl/platformatic/connector.js";
// import { ConfluentKafkaConnector } from "../impl/confluent/connector.js";

export function createConnector(
  implementation: "confluent" | "platformatic",
  _config: StreamingConfig,
  logger?: {
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  },
): Result<IStreamingConnector, QiError> {
  // Create a basic logger if none provided
  const _basicLogger = logger || {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  switch (implementation) {
    case "platformatic":
      return Err(
        create(
          "STREAMING_IMPLEMENTATION_UNAVAILABLE",
          "Platformatic connector implementation not available - missing @platformatic/kafka dependency",
          "CONFIGURATION",
          { implementation },
        ),
      );

    case "confluent":
      return Err(
        create(
          "STREAMING_IMPLEMENTATION_UNAVAILABLE",
          "Confluent connector implementation not available - missing @confluentinc/kafka-javascript dependency",
          "CONFIGURATION",
          { implementation },
        ),
      );

    default:
      return Err(
        create(
          "STREAMING_INVALID_CONFIG",
          `Unknown streaming implementation: ${implementation}`,
          "CONFIGURATION",
          { implementation },
        ),
      );
  }
}

/**
 * Get recommended implementation for production use
 */
export function getRecommendedImplementation(): "confluent" | "platformatic" {
  return "confluent"; // Confluent is the recommended choice for production
}

/**
 * Get available implementations
 */
export function getAvailableImplementations(): ("confluent" | "platformatic")[] {
  return ["confluent", "platformatic"];
}

// Legacy class-based factory for backward compatibility
// biome-ignore lint/complexity/noStaticOnlyClass: Required for backward compatibility
export class ConnectorFactory {
  static createConnector = createConnector;
  static getRecommendedImplementation = getRecommendedImplementation;
  static getAvailableImplementations = getAvailableImplementations;
}
