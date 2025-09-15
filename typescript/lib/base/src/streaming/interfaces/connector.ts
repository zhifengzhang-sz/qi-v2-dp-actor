/**
 * Streaming Connector Interface - Abstract layer for different streaming backends
 *
 * Provides a unified interface that can be implemented by different streaming
 * technologies (Platformatic Kafka, KafkaJS, Confluent, etc.)
 */

import type { QiError, Result } from "@qi/base";
import type { Logger } from "@qi/core";
import type { IStreamingAdmin, IStreamingConsumer, IStreamingProducer } from "../types.js";

export interface Message {
  readonly key?: string;
  readonly value: string;
  readonly timestamp?: number;
  readonly partition?: number;
  readonly headers?: Record<string, string>;
}

export interface ProducerConfig {
  readonly brokers: string[];
  readonly clientId: string;
  readonly ssl?: boolean;
  readonly sasl?: {
    mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    username: string;
    password: string;
  };
}

export interface ConsumerConfig extends ProducerConfig {
  readonly groupId: string;
  readonly autoOffsetReset?: "earliest" | "latest";
  readonly enableAutoCommit?: boolean;
}

export interface AdminConfig extends ProducerConfig {
  // Admin-specific configuration
  readonly requestTimeout?: number;
}

export interface TopicConfig {
  readonly topic: string;
  readonly numPartitions?: number;
  readonly replicationFactor?: number;
  readonly configEntries?: ReadonlyArray<{
    readonly name: string;
    readonly value: string;
  }>;
}

export interface IProducer {
  connect(): Promise<Result<void, Error>>;
  produce(topic: string, message: Message): Promise<Result<void, Error>>;
  produceBatch(topic: string, messages: Message[]): Promise<Result<void, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

export interface IConsumer {
  connect(): Promise<Result<void, Error>>;
  subscribe(topics: string[]): Promise<Result<void, Error>>;
  consume(): Promise<Result<Message[], Error>>;
  commit(): Promise<Result<void, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

export interface TopicMetadata {
  readonly name: string;
  readonly partitions: readonly {
    readonly partitionId: number;
    readonly leader: number;
    readonly replicas: readonly number[];
    readonly isr: readonly number[];
  }[];
}

export interface IAdmin {
  connect(): Promise<Result<void, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  createTopics(topics: TopicConfig[]): Promise<Result<void, QiError>>;
  deleteTopics(topicNames: string[]): Promise<Result<void, QiError>>;
  listTopics(): Promise<Result<string[], QiError>>;
  getTopicMetadata(topics: string[]): Promise<Result<TopicMetadata[], QiError>>;
}

export interface IConnector {
  createProducer(config: ProducerConfig): Promise<Result<IProducer, Error>>;
  createConsumer(config: ConsumerConfig): Promise<Result<IConsumer, Error>>;
  createAdmin(config: AdminConfig): Promise<Result<IAdmin, Error>>;
  disconnect(): Promise<Result<void, Error>>;
}

// Alias for consistency with existing code
export interface IStreamingConnector {
  getProducer(config: StreamingProducerConfig): Promise<Result<IStreamingProducer, QiError>>;
  getConsumer(config: StreamingConsumerConfig): Promise<Result<IStreamingConsumer, QiError>>;
  getAdmin(): Promise<Result<IStreamingAdmin, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
}

// Re-export the real interfaces from types.ts to ensure compatibility
export type { IStreamingProducer, IStreamingConsumer, IStreamingAdmin } from "../types.js";

export interface StreamingMessage {
  readonly key?: string;
  readonly value: Buffer;
}

export interface StreamingProducerConfig {
  readonly maxInFlightRequests?: number;
  readonly idempotent?: boolean;
}

export interface StreamingConsumerConfig {
  readonly groupId: string;
}

export type StreamingBackend = "confluent" | "platformatic";

export interface ConnectorFactoryConfig {
  readonly backend: StreamingBackend;
  readonly logger?: {
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}
