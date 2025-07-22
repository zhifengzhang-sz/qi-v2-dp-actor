/**
 * StreamingClient - Simple implementation following actual @qi/core patterns
 * Based on working examples from qi-v2-qicore/typescript/app/
 */

import { type Result, create, failure, success } from "@qi/base";
import type { QiError } from "@qi/base";
import { createLogger, createMemoryCache } from "@qi/core";
import type { ICache, Logger } from "@qi/core";
import { Kafka } from "kafkajs";

import { StreamingAdmin } from "./admin.js";
import { StreamingConsumer } from "./consumer.js";
import { StreamingProducer } from "./producer.js";
import type {
  ConsumerConfig,
  IStreamingAdmin,
  IStreamingClient,
  IStreamingConsumer,
  IStreamingProducer,
  ProducerConfig,
  StreamingConfig,
} from "./types.js";

export class StreamingClient implements IStreamingClient {
  private kafka: Kafka | null = null;
  private logger: Logger | null = null;
  private cache: ICache | null = null;
  private producers = new Map<string, StreamingProducer>();
  private consumers = new Map<string, StreamingConsumer>();
  private admin: StreamingAdmin | null = null;

  private async initialize(): Promise<Result<void, QiError>> {
    if (this.logger && this.cache && this.kafka) {
      return success(undefined);
    }

    // Create logger following working examples
    const loggerResult = createLogger({ level: "info", pretty: true });
    if (loggerResult.tag === "failure") {
      return loggerResult;
    }

    this.logger = loggerResult.value;
    this.cache = createMemoryCache({ maxSize: 1000, defaultTtl: 300 });

    // Create Kafka client
    this.kafka = new Kafka({
      clientId: "qi-streaming-client",
      brokers: ["localhost:9092"],
    });

    this.logger.info("Streaming client initialized");
    return success(undefined);
  }

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") return initResult;

    const producerKey = JSON.stringify(config || {});

    if (this.producers.has(producerKey)) {
      const producer = this.producers.get(producerKey);
      if (!producer) {
        return failure(
          create("PRODUCER_NOT_FOUND", `Producer not found: ${producerKey}`, "SYSTEM", {
            producerKey,
            availableProducers: Array.from(this.producers.keys()),
          })
        );
      }
      return success(producer);
    }

    const streamingConfig: StreamingConfig = {
      clientId: "qi-streaming-client",
      brokers: ["localhost:9092"],
    };

    if (!this.kafka || !this.logger) {
      return failure(
        create("CLIENT_NOT_INITIALIZED", "Kafka client or logger not initialized", "SYSTEM", {
          kafka: !!this.kafka,
          logger: !!this.logger,
        })
      );
    }

    const producer = new StreamingProducer(this.kafka, streamingConfig, config || {}, this.logger);

    this.producers.set(producerKey, producer);
    return success(producer);
  }

  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") return initResult;

    const consumerKey = config.groupId;

    if (this.consumers.has(consumerKey)) {
      const consumer = this.consumers.get(consumerKey);
      if (!consumer) {
        return failure(
          create("CONSUMER_NOT_FOUND", `Consumer not found: ${consumerKey}`, "SYSTEM", {
            consumerKey,
            availableConsumers: Array.from(this.consumers.keys()),
          })
        );
      }
      return success(consumer);
    }

    const streamingConfig: StreamingConfig = {
      clientId: "qi-streaming-client",
      brokers: ["localhost:9092"],
    };

    if (!this.kafka || !this.logger) {
      return failure(
        create("CLIENT_NOT_INITIALIZED", "Kafka client or logger not initialized", "SYSTEM", {
          kafka: !!this.kafka,
          logger: !!this.logger,
        })
      );
    }

    const consumer = new StreamingConsumer(this.kafka, streamingConfig, config, this.logger);

    this.consumers.set(consumerKey, consumer);
    return success(consumer);
  }

  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>> {
    const initResult = await this.initialize();
    if (initResult.tag === "failure") return initResult;

    if (this.admin) {
      return success(this.admin);
    }

    const streamingConfig: StreamingConfig = {
      clientId: "qi-streaming-client",
      brokers: ["localhost:9092"],
    };

    if (!this.kafka || !this.logger) {
      return failure(
        create("CLIENT_NOT_INITIALIZED", "Kafka client or logger not initialized", "SYSTEM", {
          kafka: !!this.kafka,
          logger: !!this.logger,
        })
      );
    }

    this.admin = new StreamingAdmin(this.kafka, streamingConfig, this.logger);

    return success(this.admin);
  }

  async disconnect(): Promise<Result<void, QiError>> {
    if (!this.logger) return success(undefined);

    this.logger.info("Disconnecting streaming client");

    // Disconnect all components
    for (const producer of this.producers.values()) {
      await producer.disconnect();
    }
    for (const consumer of this.consumers.values()) {
      await consumer.disconnect();
    }
    if (this.admin) {
      await this.admin.disconnect();
    }

    this.producers.clear();
    this.consumers.clear();
    this.admin = null;
    this.kafka = null;

    this.logger.info("Streaming client disconnected");
    return success(undefined);
  }

  async isHealthy(): Promise<Result<boolean, QiError>> {
    if (!this.kafka || !this.logger) {
      return success(false);
    }

    try {
      const adminResult = await this.getAdmin();
      if (adminResult.tag === "failure") return success(false);

      const admin = adminResult.value;
      const connectResult = await admin.connect();
      if (connectResult.tag === "failure") return success(false);

      const listResult = await admin.listTopics();
      const healthy = listResult.tag === "success";

      this.logger.debug("Health check completed", { healthy });
      return success(healthy);
    } catch {
      return success(false);
    }
  }
}

// Factory function following working patterns
export function createStreamingClient(): StreamingClient {
  return new StreamingClient();
}
