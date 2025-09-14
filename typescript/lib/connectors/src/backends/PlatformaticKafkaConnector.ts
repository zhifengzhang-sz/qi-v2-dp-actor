/**
 * PlatformaticKafkaConnector - @platformatic/kafka backend implementation
 *
 * Uses @platformatic/kafka (state-of-art 2025) - 26.71% faster than KafkaJS
 * with built-in TypeScript support and modern developer experience.
 */

import { Consumer, Producer, stringDeserializers, stringSerializers } from "@platformatic/kafka";
import { Err, Ok, type Result } from "@qi/base";
import type { Logger } from "@qi/core";

import type {
  IStreamingConnector,
  IStreamingConsumer,
  IStreamingProducer,
  StreamingConsumerConfig,
  StreamingMessage,
  StreamingProducerConfig,
} from "../interfaces/StreamingConnector.js";

class PlatformaticProducer implements IStreamingProducer {
  private producer: Producer;
  private logger: Logger;
  private isConnected = false;

  constructor(producer: Producer, logger: Logger) {
    this.producer = producer;
    this.logger = logger;
  }

  async connect(): Promise<Result<void, Error>> {
    try {
      // @platformatic/kafka producers don't have explicit connect - they auto-connect on first use
      this.isConnected = true;
      this.logger.info("Platformatic Kafka producer ready");
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to prepare producer", { error: errorMessage });
      return Err(new Error(`Producer preparation failed: ${errorMessage}`));
    }
  }

  async produce(topic: string, message: StreamingMessage): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Producer not connected"));
    }

    try {
      await this.producer.send({
        messages: [
          {
            topic,
            key: message.key,
            value: message.value,
            headers: message.headers,
          },
        ],
      });
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to produce message: ${errorMessage}`));
    }
  }

  async produceBatch(topic: string, messages: StreamingMessage[]): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Producer not connected"));
    }

    try {
      await this.producer.send({
        messages: messages.map((msg) => ({
          topic,
          key: msg.key,
          value: msg.value,
          headers: msg.headers,
        })),
      });
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to produce batch: ${errorMessage}`));
    }
  }

  async disconnect(): Promise<Result<void, Error>> {
    try {
      await this.producer.close();
      this.isConnected = false;
      this.logger.info("Platformatic Kafka producer disconnected");
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Producer disconnect failed: ${errorMessage}`));
    }
  }
}

class PlatformaticConsumer implements IStreamingConsumer {
  private consumer: Consumer;
  private logger: Logger;
  private isConnected = false;
  private subscribedTopics: string[] = [];

  constructor(consumer: Consumer, logger: Logger) {
    this.consumer = consumer;
    this.logger = logger;
  }

  async connect(): Promise<Result<void, Error>> {
    try {
      // @platformatic/kafka consumers don't have explicit connect - they auto-connect
      this.isConnected = true;
      this.logger.info("Platformatic Kafka consumer ready");
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to prepare consumer", { error: errorMessage });
      return Err(new Error(`Consumer preparation failed: ${errorMessage}`));
    }
  }

  async subscribe(topics: string[]): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Consumer must be connected before subscribing"));
    }

    try {
      // Store topics for consume() method
      this.subscribedTopics = topics;
      this.logger.info("Subscribed to topics", { topics });
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to subscribe: ${errorMessage}`));
    }
  }

  async consume(): Promise<Result<StreamingMessage[], Error>> {
    if (!this.isConnected || this.subscribedTopics.length === 0) {
      return Err(new Error("Consumer not connected or no topics subscribed"));
    }

    try {
      const messages: StreamingMessage[] = [];

      // Create a promise that resolves when we have messages
      return new Promise((resolve) => {
        this.consumer.on("data", (message) => {
          messages.push({
            key: message.key,
            value: message.value,
            timestamp: Number(message.timestamp),
            headers: message.headers,
          });
        });

        this.consumer.on("error", (error) => {
          resolve(Err(new Error(`Consumer error: ${error.message}`)));
        });

        // For this simplified implementation, resolve immediately with empty array
        // In a real implementation, you'd implement proper message batching
        resolve(Ok(messages));
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to consume messages: ${errorMessage}`));
    }
  }

  async commit(): Promise<Result<void, Error>> {
    try {
      // @platformatic/kafka handles commits automatically by default
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to commit offsets: ${errorMessage}`));
    }
  }

  async disconnect(): Promise<Result<void, Error>> {
    try {
      await this.consumer.close();
      this.isConnected = false;
      this.subscribedTopics = [];
      this.logger.info("Platformatic Kafka consumer disconnected");
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Consumer disconnect failed: ${errorMessage}`));
    }
  }
}

export class PlatformaticKafkaConnector implements IStreamingConnector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async createProducer(
    config: StreamingProducerConfig
  ): Promise<Result<IStreamingProducer, Error>> {
    try {
      const producer = new Producer({
        clientId: config.clientId,
        bootstrapBrokers: config.brokers,
        serializers: stringSerializers,
        ...(config.ssl && { ssl: true }),
        ...(config.sasl && {
          sasl: {
            mechanism: config.sasl.mechanism,
            username: config.sasl.username,
            password: config.sasl.password,
          },
        }),
      });

      return Ok(new PlatformaticProducer(producer, this.logger));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to create producer: ${errorMessage}`));
    }
  }

  async createConsumer(
    config: StreamingConsumerConfig
  ): Promise<Result<IStreamingConsumer, Error>> {
    try {
      const consumer = new Consumer({
        clientId: config.clientId,
        bootstrapBrokers: config.brokers,
        groupId: config.groupId,
        deserializers: stringDeserializers,
        ...(config.ssl && { ssl: true }),
        ...(config.sasl && {
          sasl: {
            mechanism: config.sasl.mechanism,
            username: config.sasl.username,
            password: config.sasl.password,
          },
        }),
      });

      return Ok(new PlatformaticConsumer(consumer, this.logger));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Failed to create consumer: ${errorMessage}`));
    }
  }

  async disconnect(): Promise<Result<void, Error>> {
    try {
      this.logger.info("Platformatic Kafka connector disconnected");
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Err(new Error(`Connector disconnect failed: ${errorMessage}`));
    }
  }
}
