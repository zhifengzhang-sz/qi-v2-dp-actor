/**
 * Streaming Connector Interface - Abstract layer for different streaming backends
 *
 * Provides a unified interface that can be implemented by different streaming
 * technologies (Platformatic Kafka, KafkaJS, Confluent, etc.)
 */

import type { Result } from "@qi/base";
import type { Logger } from "@qi/core";

export interface StreamingMessage {
  readonly key?: string;
  readonly value: string;
  readonly timestamp?: number;
  readonly partition?: number;
  readonly headers?: Record<string, string>;
}

export interface StreamingProducerConfig {
  readonly brokers: string[];
  readonly clientId: string;
  readonly ssl?: boolean;
  readonly sasl?: {
    mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    username: string;
    password: string;
  };
}

export interface StreamingConsumerConfig extends StreamingProducerConfig {
  readonly groupId: string;
  readonly autoOffsetReset?: "earliest" | "latest";
  readonly enableAutoCommit?: boolean;
}

export interface IStreamingProducer {
  connect(): Promise<Result<void, Error>>;
  produce(topic: string, message: StreamingMessage): Promise<Result<void, Error>>;
  produceBatch(topic: string, messages: StreamingMessage[]): Promise<Result<void, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

export interface IStreamingConsumer {
  connect(): Promise<Result<void, Error>>;
  subscribe(topics: string[]): Promise<Result<void, Error>>;
  consume(): Promise<Result<StreamingMessage[], Error>>;
  commit(): Promise<Result<void, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

export interface IStreamingConnector {
  createProducer(config: StreamingProducerConfig): Promise<Result<IStreamingProducer, Error>>;
  createConsumer(config: StreamingConsumerConfig): Promise<Result<IStreamingConsumer, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

export const StreamingBackend = {
  PLATFORMATIC_KAFKA: "platformatic-kafka",
  CONFLUENT_KAFKA: "confluent-kafka",
  KAFKAJS: "kafkajs",
  NODE_RDKAFKA: "node-rdkafka",
} as const;

export type StreamingBackend = (typeof StreamingBackend)[keyof typeof StreamingBackend];

export interface ConnectorFactoryConfig {
  readonly backend: StreamingBackend;
  readonly logger?: Logger;
}
