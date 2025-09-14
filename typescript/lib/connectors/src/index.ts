/**
 * QiCore Data Processing Connectors
 * Abstracted streaming infrastructure with multiple backend support
 */

// Core abstraction interfaces
export type {
  IStreamingConnector,
  IStreamingProducer,
  IStreamingConsumer,
  StreamingMessage,
  StreamingProducerConfig,
  StreamingConsumerConfig,
  ConnectorFactoryConfig,
} from "./interfaces/StreamingConnector.js";

export { StreamingBackend } from "./interfaces/StreamingConnector.js";

// Factory for creating connectors
export { ConnectorFactory } from "./factories/ConnectorFactory.js";

// Backend implementations
export { PlatformaticKafkaConnector } from "./backends/PlatformaticKafkaConnector.js";

// Redpanda-specific implementations using abstraction
export { RedpandaReader } from "./RedpandaReader.js";
export { RedpandaWriter } from "./RedpandaWriter.js";

// Configuration types
export type { RedpandaReaderConfig } from "./RedpandaReader.js";
export type { RedpandaWriterConfig } from "./RedpandaWriter.js";
