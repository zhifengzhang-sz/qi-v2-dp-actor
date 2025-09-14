/**
 * ConnectorFactory - Factory pattern for creating different streaming connectors
 *
 * Allows runtime selection of different streaming backends while maintaining
 * a consistent interface across the application.
 */

import type { Result } from "@qi/base";
import { Err, Ok, create } from "@qi/base";
import type { Logger } from "@qi/core";
import { createLogger } from "@qi/core";

import type {
  ConnectorFactoryConfig,
  IStreamingConnector,
} from "../interfaces/StreamingConnector.js";
import { StreamingBackend } from "../interfaces/StreamingConnector.js";

// Import different connector implementations
import { PlatformaticKafkaConnector } from "../backends/PlatformaticKafkaConnector.js";
// Future implementations can be imported here:
// import { ConfluentKafkaConnector } from '../backends/ConfluentKafkaConnector.js';
// import { KafkaJSConnector } from '../backends/KafkaJSConnector.js';

export class ConnectorFactory {
  static async createConnector(
    config: ConnectorFactoryConfig
  ): Promise<Result<IStreamingConnector, Error>> {
    let actualLogger: Logger;

    if (config.logger) {
      actualLogger = config.logger;
    } else {
      const loggerResult = createLogger({ level: "info" });
      if (typeof loggerResult === "object" && "success" in loggerResult && loggerResult.success) {
        actualLogger = (loggerResult as any).data;
      } else {
        throw new Error("Failed to create logger");
      }
    }

    try {
      switch (config.backend) {
        case StreamingBackend.PLATFORMATIC_KAFKA:
          return Ok(new PlatformaticKafkaConnector(actualLogger));

        case StreamingBackend.CONFLUENT_KAFKA:
          return Err(new Error("Confluent Kafka connector not yet implemented"));

        case StreamingBackend.KAFKAJS:
          return Err(new Error("KafkaJS is deprecated and no longer maintained"));

        case StreamingBackend.NODE_RDKAFKA:
          return Err(new Error("node-rdkafka has performance and compatibility issues"));

        default:
          return Err(new Error(`Unknown streaming backend: ${config.backend}`));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to create connector: ${errorMessage}`));
    }
  }

  /**
   * Get recommended backend for production use
   */
  static getRecommendedBackend(): StreamingBackend {
    return StreamingBackend.PLATFORMATIC_KAFKA;
  }

  /**
   * Get available backends
   */
  static getAvailableBackends(): StreamingBackend[] {
    return [
      StreamingBackend.PLATFORMATIC_KAFKA,
      // Add others when implemented:
      // StreamingBackend.CONFLUENT_KAFKA,
    ];
  }
}
