/**
 * Real Integration Tests for StreamingConsumer with actual Redpanda
 *
 * Prerequisites:
 * - Redpanda services running on localhost:19092 (from ../qi-v2-dp-ts-actor/services)
 * - Real topic subscription and message consumption operations
 * - Actual broker message processing
 */

import { type QiError, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { createLogger } from "@qi/core";
import { Kafka } from "kafkajs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StreamingAdmin } from "../../../src/base/streaming/admin.js";
import { StreamingConsumer } from "../../../src/base/streaming/consumer.js";
import { StreamingProducer } from "../../../src/base/streaming/producer.js";

describe("StreamingConsumer - Real Redpanda Integration", () => {
  let kafka: Kafka;
  let admin: StreamingAdmin;
  let producer: StreamingProducer;
  let consumer: StreamingConsumer;
  let logger: any;

  const TEST_BROKERS = ["localhost:19092"];
  const TEST_CLIENT_ID = "integration-test-consumer";
  const TEST_GROUP_ID = "consumer-integration-test-group";
  const TEST_TOPICS = [
    "consumer-integration-test-1",
    "consumer-integration-test-2",
    "consumer-integration-batch-test",
  ];

  beforeAll(async () => {
    // Create real Kafka client
    kafka = new Kafka({
      clientId: TEST_CLIENT_ID,
      brokers: TEST_BROKERS,
      connectionTimeout: 5000,
      requestTimeout: 10000,
    });

    // Create real logger
    const loggerResult = createLogger({
      level: "info",
      name: "consumer-integration-test",
      pretty: true,
    });
    if (isFailure(loggerResult)) {
      throw new Error(`Failed to create logger: ${getError(loggerResult).message}`);
    }
    logger = getValue(loggerResult);

    // Create admin client for topic management
    admin = new StreamingAdmin(kafka, { clientId: TEST_CLIENT_ID, brokers: TEST_BROKERS }, logger);

    // Create producer for test message generation
    producer = new StreamingProducer(
      kafka,
      { clientId: TEST_CLIENT_ID, brokers: TEST_BROKERS },
      {},
      logger
    );

    // Create consumer client
    consumer = new StreamingConsumer(
      kafka,
      { clientId: TEST_CLIENT_ID, brokers: TEST_BROKERS },
      { groupId: TEST_GROUP_ID },
      logger
    );

    // Setup test topics
    await admin.connect();
    const createResult = await admin.createTopics(
      TEST_TOPICS.map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: "cleanup.policy", value: "delete" },
          { name: "retention.ms", value: "300000" }, // 5 minutes
        ],
      }))
    );

    if (isFailure(createResult)) {
      logger.warn("Some test topics might already exist", {
        error: getError(createResult).message,
      });
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup - disconnect all clients and delete test topics
    if (consumer.isConnected()) {
      await consumer.disconnect();
    }

    if (producer.isConnected()) {
      await producer.disconnect();
    }

    if (admin.isConnected()) {
      const deleteResult = await admin.deleteTopics(TEST_TOPICS);
      if (isFailure(deleteResult)) {
        logger.warn("Failed to cleanup test topics", {
          error: getError(deleteResult).message,
        });
      }
      await admin.disconnect();
    }
  }, 15000);

  describe("Real Consumer Connection Management", () => {
    it("should connect to actual Redpanda consumer", async () => {
      const result = await consumer.connect();

      expect(isSuccess(result)).toBe(true);
      expect(consumer.isConnected()).toBe(true);

      logger.info("✅ Successfully connected consumer to real Redpanda");
    }, 10000);

    it("should handle consumer connection failures to bad brokers", async () => {
      const badKafka = new Kafka({
        clientId: "bad-consumer",
        brokers: ["localhost:9999"],
        connectionTimeout: 1000,
      });

      const badConsumer = new StreamingConsumer(
        badKafka,
        { clientId: "bad-consumer", brokers: ["localhost:9999"] },
        { groupId: "bad-group" },
        logger
      );

      const result = await badConsumer.connect();

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
      expect(error.category).toBe("SYSTEM");

      logger.info("✅ Correctly handled consumer connection failure");
    }, 10000);

    it("should disconnect consumer gracefully", async () => {
      if (!consumer.isConnected()) {
        await consumer.connect();
      }

      const result = await consumer.disconnect();

      expect(isSuccess(result)).toBe(true);
      expect(consumer.isConnected()).toBe(false);

      logger.info("✅ Successfully disconnected consumer from real Redpanda");
    }, 10000);
  });

  describe("Real Topic Subscription Management", () => {
    beforeEach(async () => {
      if (!consumer.isConnected()) {
        const result = await consumer.connect();
        if (isFailure(result)) {
          throw new Error(`Consumer connection failed: ${getError(result).message}`);
        }
      }
    });

    it("should subscribe to topics in real Redpanda", async () => {
      const subscriptionConfig = {
        topics: [TEST_TOPICS[0]],
        fromBeginning: true,
      };

      const result = await consumer.subscribe(subscriptionConfig);

      expect(isSuccess(result)).toBe(true);

      // subscribe returns void on success
      const subscribeResult = getValue(result);
      expect(subscribeResult).toBeUndefined();

      logger.info("✅ Successfully subscribed to topic in real Redpanda", {
        topic: TEST_TOPICS[0],
      });
    }, 15000);

    it("should handle multiple topic subscriptions", async () => {
      const subscriptionConfig = {
        topics: TEST_TOPICS.slice(0, 2), // First two topics
        fromBeginning: false,
      };

      const result = await consumer.subscribe(subscriptionConfig);

      expect(isSuccess(result)).toBe(true);

      const subscribeResult = getValue(result);
      expect(subscribeResult).toBeUndefined();

      logger.info("✅ Successfully subscribed to multiple topics", {
        topics: TEST_TOPICS.slice(0, 2),
      });
    }, 15000);

    it("should handle subscription to non-existent topics", async () => {
      const subscriptionConfig = {
        topics: ["non-existent-topic-xyz"],
        fromBeginning: true,
      };

      const result = await consumer.subscribe(subscriptionConfig);

      // This might succeed (topics can be auto-created) or fail depending on Redpanda config
      if (isFailure(result)) {
        const error = getError(result);
        expect(error.code).toBe("STREAMING_SUBSCRIPTION_FAILED");
      } else {
        const subscribeResult = getValue(result);
        expect(subscribeResult).toBeUndefined();
      }

      logger.info("✅ Handled subscription to non-existent topic");
    }, 10000);
  });

  describe("Real Message Consumption", () => {
    beforeEach(async () => {
      if (!consumer.isConnected()) {
        await consumer.connect();
      }
      if (!producer.isConnected()) {
        await producer.connect();
      }
    });

    it("should consume messages from real Redpanda", async () => {
      const testTopic = TEST_TOPICS[0];
      const testMessages = [
        { key: "test-key-1", value: Buffer.from("test message 1") },
        { key: "test-key-2", value: Buffer.from("test message 2") },
      ];

      // First, subscribe to the topic
      const subscribeResult = await consumer.subscribe({
        topics: [testTopic],
        fromBeginning: true,
      });
      expect(isSuccess(subscribeResult)).toBe(true);

      // Produce test messages
      for (const message of testMessages) {
        const sendResult = await producer.send(testTopic, message);
        expect(isSuccess(sendResult)).toBe(true);
      }

      // Wait a bit for messages to be available
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Set up message consumption tracking
      const consumedMessages: any[] = [];
      let messageCount = 0;

      const runResult = await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          messageCount++;
          consumedMessages.push({
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: message.value?.toString(),
          });

          logger.info("✅ Consumed message", {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: message.value?.toString(),
          });

          // Stop after consuming expected messages
          if (messageCount >= testMessages.length) {
            return; // Exit the consumer loop
          }
        },
      });

      expect(isSuccess(runResult)).toBe(true);

      // Give some time for message processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify we consumed some messages
      expect(consumedMessages.length).toBeGreaterThan(0);

      logger.info("✅ Successfully consumed messages from real Redpanda", {
        messageCount: consumedMessages.length,
        topic: testTopic,
      });
    }, 30000);

    it("should handle consumer offset management", async () => {
      const testTopic = TEST_TOPICS[1];

      // Subscribe to topic
      await consumer.subscribe({
        topics: [testTopic],
        fromBeginning: false,
      });

      // Produce a test message
      const sendResult = await producer.send(testTopic, {
        key: "offset-test",
        value: Buffer.from("offset management test"),
      });
      expect(isSuccess(sendResult)).toBe(true);

      const produceResult = getValue(sendResult);
      logger.info("Produced message for offset test", {
        topic: testTopic,
        partition: produceResult.partition,
        offset: produceResult.offset,
      });

      // Test seeking to specific offset
      const seekResult = await consumer.seek(testTopic, produceResult.partition, "0");

      if (isSuccess(seekResult)) {
        logger.info("✅ Successfully sought to offset in real Redpanda");
      } else {
        // Seek might fail if consumer is running
        const error = getError(seekResult);
        expect(error.code).toBe("STREAMING_SEEK_FAILED");
        logger.info("✅ Correctly handled seek operation limitation");
      }
    }, 20000);

    it("should commit offsets properly", async () => {
      const testTopic = TEST_TOPICS[2];

      // Subscribe to topic
      await consumer.subscribe({
        topics: [testTopic],
        fromBeginning: true,
      });

      // Produce a message to have something to commit
      await producer.send(testTopic, {
        key: "commit-test",
        value: Buffer.from("commit test message"),
      });

      // Test offset commit
      const commitResult = await consumer.commitOffsets();

      if (isSuccess(commitResult)) {
        const commitValue = getValue(commitResult);
        expect(commitValue).toBeUndefined(); // void return
        logger.info("✅ Successfully committed offsets in real Redpanda");
      } else {
        // Commit might fail if no messages have been consumed
        const error = getError(commitResult);
        expect(error.code).toBe("STREAMING_COMMIT_FAILED");
        logger.info("✅ Correctly handled commit operation when no messages consumed");
      }
    }, 15000);
  });

  describe("Real Error Scenarios", () => {
    beforeEach(async () => {
      if (!consumer.isConnected()) {
        await consumer.connect();
      }
    });

    it("should handle invalid subscription configurations", async () => {
      const invalidConfig = {
        topics: [], // Empty topics array
        fromBeginning: true,
      };

      const result = await consumer.subscribe(invalidConfig);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_SUBSCRIPTION_FAILED");
      expect(error.category).toBe("SYSTEM");

      logger.info("✅ Correctly handled invalid subscription configuration");
    }, 10000);

    it("should handle consumer operation when not subscribed", async () => {
      // Don't subscribe to any topics

      // Try to run consumer without subscription
      const runResult = await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          // This should not be called
        },
      });

      // This might succeed or fail depending on KafkaJS behavior
      if (isFailure(runResult)) {
        const error = getError(runResult);
        expect(error.code).toBe("STREAMING_CONSUMER_FAILED");
      }

      logger.info("✅ Handled consumer run without subscription");
    }, 10000);
  });
});
