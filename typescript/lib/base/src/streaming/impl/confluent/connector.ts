/**
 * ConfluentKafkaConnector - @confluentinc/kafka-javascript backend implementation
 *
 * Uses @confluentinc/kafka-javascript - official Confluent client with enterprise support
 * Built on librdkafka for high performance and reliability.
 */

import { KafkaJS } from "@confluentinc/kafka-javascript";
import { Err, Ok, type Result, fromAsyncTryCatch } from "@qi/base";
import type { Logger } from "@qi/core";

import type {
  AdminConfig,
  ConsumerConfig,
  IAdmin,
  IConnector,
  IConsumer,
  IProducer,
  Message,
  ProducerConfig,
  TopicConfig,
} from "../../interfaces/connector.js";

class ConfluentProducer implements IProducer {
  private producer: any; // TODO: Type properly once we have the actual types
  private logger: Logger;
  private isConnected = false;

  constructor(producer: any, logger: Logger) {
    this.producer = producer;
    this.logger = logger;
  }

  async connect(): Promise<Result<void, Error>> {
    return fromAsyncTryCatch(
      async () => {
        await this.producer.connect();
        this.isConnected = true;
        this.logger.info("Confluent Kafka producer connected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to connect producer", { error: errorMessage });
        return new Error(`Producer connection failed: ${errorMessage}`);
      },
    );
  }

  async produce(topic: string, message: Message): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Producer not connected"));
    }

    return fromAsyncTryCatch(
      async () => {
        await this.producer.send({
          topic,
          messages: [
            {
              key: message.key,
              value: message.value,
              headers: message.headers,
              timestamp: message.timestamp?.toString(),
            },
          ],
        });
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to produce message: ${errorMessage}`);
      },
    );
  }

  async produceBatch(topic: string, messages: Message[]): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Producer not connected"));
    }

    return fromAsyncTryCatch(
      async () => {
        await this.producer.send({
          topic,
          messages: messages.map((msg) => ({
            key: msg.key,
            value: msg.value,
            headers: msg.headers,
            timestamp: msg.timestamp?.toString(),
          })),
        });
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to produce batch: ${errorMessage}`);
      },
    );
  }

  async disconnect(): Promise<Result<void, Error>> {
    return fromAsyncTryCatch(
      async () => {
        await this.producer.disconnect();
        this.isConnected = false;
        this.logger.info("Confluent Kafka producer disconnected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to disconnect producer: ${errorMessage}`);
      },
    );
  }
}

class ConfluentConsumer implements IConsumer {
  private consumer: any;
  private logger: Logger;
  private isConnected = false;
  private subscribedTopics: string[] = [];

  constructor(consumer: any, logger: Logger) {
    this.consumer = consumer;
    this.logger = logger;
  }

  async connect(): Promise<Result<void, Error>> {
    return fromAsyncTryCatch(
      async () => {
        await this.consumer.connect();
        this.isConnected = true;
        this.logger.info("Confluent Kafka consumer connected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to connect consumer", { error: errorMessage });
        return new Error(`Consumer connection failed: ${errorMessage}`);
      },
    );
  }

  async subscribe(topics: string[]): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Consumer not connected"));
    }

    return fromAsyncTryCatch(
      async () => {
        await this.consumer.subscribe({ topics });
        this.subscribedTopics = topics;
        this.logger.info(`Subscribed to topics: ${topics.join(", ")}`);
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to subscribe: ${errorMessage}`);
      },
    );
  }

  async consume(): Promise<Result<Message[], Error>> {
    if (!this.isConnected || this.subscribedTopics.length === 0) {
      return Err(new Error("Consumer not ready or no topics subscribed"));
    }

    return fromAsyncTryCatch(
      async () => {
        const batch = await this.consumer.fetch();
        const messages: Message[] = [];

        for (const message of batch.messages) {
          messages.push({
            key: message.key?.toString(),
            value: message.value?.toString() || "",
            timestamp: message.timestamp ? Number(message.timestamp) : undefined,
            partition: message.partition,
            headers: message.headers || {},
          });
        }

        return messages;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to consume messages: ${errorMessage}`);
      },
    );
  }

  async commit(): Promise<Result<void, Error>> {
    if (!this.isConnected) {
      return Err(new Error("Consumer not connected"));
    }

    return fromAsyncTryCatch(
      async () => {
        await this.consumer.commitOffsets();
        this.logger.debug("Commit operation completed");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to commit: ${errorMessage}`);
      },
    );
  }

  async disconnect(): Promise<Result<void, Error>> {
    return fromAsyncTryCatch(
      async () => {
        await this.consumer.disconnect();
        this.isConnected = false;
        this.subscribedTopics = [];
        this.logger.info("Confluent Kafka consumer disconnected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to disconnect consumer: ${errorMessage}`);
      },
    );
  }
}

class ConfluentAdmin implements IAdmin {
  private admin: any;
  private logger: Logger;
  private isConnected = false;

  constructor(admin: any, logger: Logger) {
    this.admin = admin;
    this.logger = logger;
  }

  async connect(): Promise<Result<void, import("@qi/base").QiError>> {
    return fromAsyncTryCatch(
      async () => {
        await this.admin.connect();
        this.isConnected = true;
        this.logger.info("Confluent Kafka admin connected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to connect admin", { error: errorMessage });
        return new Error(`Admin connection failed: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }

  async disconnect(): Promise<Result<void, import("@qi/base").QiError>> {
    return fromAsyncTryCatch(
      async () => {
        await this.admin.disconnect();
        this.isConnected = false;
        this.logger.info("Confluent Kafka admin disconnected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to disconnect admin: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }

  async createTopics(topics: TopicConfig[]): Promise<Result<void, import("@qi/base").QiError>> {
    if (!this.isConnected) {
      return Err(new Error("Admin not connected") as any); // TODO: Proper QiError
    }

    return fromAsyncTryCatch(
      async () => {
        await this.admin.createTopics({
          topics: topics.map((topic) => ({
            topic: topic.topic,
            numPartitions: topic.numPartitions || 1,
            replicationFactor: topic.replicationFactor || 1,
            configEntries: topic.configEntries || [],
          })),
        });
        this.logger.info(`Created topics: ${topics.map((t) => t.topic).join(", ")}`);
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to create topics: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }

  async deleteTopics(topicNames: string[]): Promise<Result<void, import("@qi/base").QiError>> {
    if (!this.isConnected) {
      return Err(new Error("Admin not connected") as any); // TODO: Proper QiError
    }

    return fromAsyncTryCatch(
      async () => {
        await this.admin.deleteTopics({ topics: topicNames });
        this.logger.info(`Deleted topics: ${topicNames.join(", ")}`);
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to delete topics: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }

  async listTopics(): Promise<Result<string[], import("@qi/base").QiError>> {
    if (!this.isConnected) {
      return Err(new Error("Admin not connected") as any); // TODO: Proper QiError
    }

    return fromAsyncTryCatch(
      async () => {
        const metadata = await this.admin.fetchMetadata();
        const topics = metadata.topics.map((topic: any) => topic.name);
        this.logger.debug(`Listed ${topics.length} topics`);
        return topics;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to list topics: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }

  async getTopicMetadata(topics: string[]): Promise<Result<any, import("@qi/base").QiError>> {
    if (!this.isConnected) {
      return Err(new Error("Admin not connected") as any); // TODO: Proper QiError
    }

    return fromAsyncTryCatch(
      async () => {
        const metadata = await this.admin.fetchMetadata({ topics });
        this.logger.debug(`Retrieved metadata for ${topics.length} topics`);
        return metadata;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to get topic metadata: ${errorMessage}`) as any; // TODO: Proper QiError
      },
    );
  }
}

export class ConfluentKafkaConnector implements IConnector {
  private logger: Logger;
  private kafka: any;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private createKafkaInstance(config: ProducerConfig | ConsumerConfig | AdminConfig) {
    const kafkaConfig = {
      "bootstrap.servers": config.brokers.join(","),
      "client.id": config.clientId,
    };

    if (config.ssl) {
      kafkaConfig["security.protocol"] = "SASL_SSL";
    }

    if (config.sasl) {
      kafkaConfig["sasl.mechanisms"] = config.sasl.mechanism.toUpperCase().replace("-", "_");
      kafkaConfig["sasl.username"] = config.sasl.username;
      kafkaConfig["sasl.password"] = config.sasl.password;
    }

    return KafkaJS.kafka(kafkaConfig);
  }

  async createProducer(config: ProducerConfig): Promise<Result<IProducer, Error>> {
    return fromAsyncTryCatch(
      async () => {
        const kafka = this.createKafkaInstance(config);
        const producer = kafka.producer();
        return new ConfluentProducer(producer, this.logger);
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to create producer: ${errorMessage}`);
      },
    );
  }

  async createConsumer(config: ConsumerConfig): Promise<Result<IConsumer, Error>> {
    return fromAsyncTryCatch(
      async () => {
        const kafka = this.createKafkaInstance(config);
        const consumer = kafka.consumer({ groupId: config.groupId });
        return new ConfluentConsumer(consumer, this.logger);
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to create consumer: ${errorMessage}`);
      },
    );
  }

  async createAdmin(config: AdminConfig): Promise<Result<IAdmin, Error>> {
    return fromAsyncTryCatch(
      async () => {
        const kafka = this.createKafkaInstance(config);
        const admin = kafka.admin();
        return new ConfluentAdmin(admin, this.logger);
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to create admin: ${errorMessage}`);
      },
    );
  }

  async disconnect(): Promise<Result<void, Error>> {
    return fromAsyncTryCatch(
      async () => {
        // Confluent handles connection management automatically
        this.logger.info("Confluent Kafka connector disconnected");
        return undefined;
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Error(`Failed to disconnect connector: ${errorMessage}`);
      },
    );
  }
}
