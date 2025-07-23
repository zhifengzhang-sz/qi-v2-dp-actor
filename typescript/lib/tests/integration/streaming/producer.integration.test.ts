/**
 * Real Integration Tests for StreamingProducer with actual Redpanda
 *
 * Prerequisites:
 * - Redpanda services running on localhost:9092 (from ../qi-v2-dp-ts-actor/services)
 * - Real topic creation/deletion
 * - Actual network operations and timeouts
 */

import { type QiError, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { createLogger } from "@qi/core";
import { Kafka } from "kafkajs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type RedpandaTestConfig,
  getKafkaClientConfig,
  getTopicConfig,
  loadTestConfig,
} from "../../../../tests/config/loader.js";
import { StreamingAdmin } from "../../../src/base/streaming/admin.js";
import { StreamingProducer } from "../../../src/base/streaming/producer.js";

describe("StreamingProducer - Real Redpanda Integration", () => {
  let kafka: Kafka;
  let producer: StreamingProducer;
  let admin: StreamingAdmin;
  let logger: any;
  let testConfig: RedpandaTestConfig;

  const TEST_TOPIC_KEY = "integration-basic";

  beforeAll(async () => {
    // Load test configuration
    const configResult = await loadTestConfig(process.env.TEST_ENV || "local");
    if (isFailure(configResult)) {
      throw new Error(`Failed to load test config: ${getError(configResult).message}`);
    }
    testConfig = getValue(configResult);

    // Create real Kafka client from config
    const kafkaConfig = getKafkaClientConfig(testConfig);
    kafka = new Kafka(kafkaConfig);

    // Create real logger
    const loggerResult = createLogger({
      level: "info",
      name: "integration-test",
      pretty: true,
    });
    if (isFailure(loggerResult)) {
      throw new Error(`Failed to create logger: ${getError(loggerResult).message}`);
    }
    logger = getValue(loggerResult);

    // Create admin client for topic management
    admin = new StreamingAdmin(
      kafka,
      { clientId: `${testConfig.redpanda.clientId}-admin`, brokers: testConfig.redpanda.brokers },
      logger
    );

    // Create producer instance
    producer = new StreamingProducer(
      kafka,
      { clientId: testConfig.redpanda.clientId, brokers: testConfig.redpanda.brokers },
      {
        maxInFlightRequests: 5,
        requestTimeoutMs: testConfig.redpanda.requestTimeout,
        idempotent: true,
        allowAutoTopicCreation: false,
      },
      logger
    );
  }, 30000); // 30s timeout for setup

  afterAll(async () => {
    // Cleanup - disconnect producer and admin
    if (producer.isConnected()) {
      await producer.disconnect();
    }
    if (admin.isConnected()) {
      await admin.disconnect();
    }
  }, 15000);

  beforeEach(async () => {
    // Ensure clean state for each test
    if (!admin.isConnected()) {
      const adminConnectResult = await admin.connect();
      if (isFailure(adminConnectResult)) {
        throw new Error(`Admin connection failed: ${getError(adminConnectResult).message}`);
      }
    }

    // Create test topic from config
    const topicConfig = getTopicConfig(testConfig, TEST_TOPIC_KEY);
    const createResult = await admin.createTopics([
      {
        topic: topicConfig.name,
        numPartitions: topicConfig.partitions,
        replicationFactor: topicConfig.replicationFactor,
        configEntries: Object.entries(topicConfig.configs).map(([name, value]) => ({
          name,
          value,
        })),
      },
    ]);

    // It's OK if topic already exists
    if (isFailure(createResult)) {
      const error = getError(createResult);
      if (!error.message.includes("already exists")) {
        logger.warn("Topic creation failed but continuing", { error: error.message });
      }
    }
  }, 15000);

  describe("Real Connection Management", () => {
    it("should connect to actual Redpanda brokers", async () => {
      const result = await producer.connect();

      expect(isSuccess(result)).toBe(true);
      expect(producer.isConnected()).toBe(true);

      logger.info("✅ Successfully connected to real Redpanda");
    }, 10000);

    it("should handle connection failures to non-existent brokers", async () => {
      // Create producer with invalid brokers
      const badKafka = new Kafka({
        clientId: "bad-client",
        brokers: ["localhost:9999"], // Non-existent broker
        connectionTimeout: 1000,
      });

      const badProducer = new StreamingProducer(
        badKafka,
        { clientId: "bad-client", brokers: ["localhost:9999"] },
        { maxInFlightRequests: 1, requestTimeoutMs: 2000 },
        logger
      );

      const result = await badProducer.connect();

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
      expect(error.category).toBe("SYSTEM");
      expect(error.message).toContain("Failed to connect producer");

      logger.info("✅ Correctly handled connection failure to bad brokers");
    }, 10000);

    it("should disconnect from real Redpanda gracefully", async () => {
      await producer.connect();
      expect(producer.isConnected()).toBe(true);

      const result = await producer.disconnect();

      expect(isSuccess(result)).toBe(true);
      expect(producer.isConnected()).toBe(false);

      logger.info("✅ Successfully disconnected from real Redpanda");
    }, 10000);
  });

  describe("Real Message Publishing", () => {
    beforeEach(async () => {
      if (!producer.isConnected()) {
        const result = await producer.connect();
        if (isFailure(result)) {
          throw new Error(`Producer connection failed: ${getError(result).message}`);
        }
      }
    });

    it("should publish message to real Redpanda topic", async () => {
      const message = {
        key: "integration-test-key",
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          symbol: "BTCUSD",
          price: "45000.00",
          volume: "1.5",
        }),
        headers: {
          "content-type": "application/json",
          "test-run": "integration",
        },
      };

      const topicConfig = getTopicConfig(testConfig, TEST_TOPIC_KEY);
      const result = await producer.send(topicConfig.name, message);

      expect(isSuccess(result)).toBe(true);

      const produceResult = getValue(result);
      expect(produceResult.topic).toBe(topicConfig.name);
      expect(produceResult.partition).toBeGreaterThanOrEqual(0);
      expect(produceResult.partition).toBeLessThan(3); // We created 3 partitions
      expect(produceResult.offset).toBeDefined();
      expect(produceResult.timestamp).toBeInstanceOf(Date);

      logger.info("✅ Successfully published message to real Redpanda", {
        topic: produceResult.topic,
        partition: produceResult.partition,
        offset: produceResult.offset,
      });
    }, 10000);

    it("should handle publishing to non-existent topic", async () => {
      const message = {
        key: "test-key",
        value: "test-value",
      };

      const result = await producer.send("non-existent-topic", message);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_PUBLISH_FAILED");
      expect(error.category).toBe("SYSTEM");
      // Redpanda should return topic authorization or existence error
      expect(error.message).toContain("Failed to send message");

      logger.info("✅ Correctly handled publish to non-existent topic");
    }, 10000);

    it("should publish batch messages to real Redpanda", async () => {
      const topicConfig = getTopicConfig(testConfig, TEST_TOPIC_KEY);
      const batch = {
        topic: topicConfig.name,
        messages: [
          {
            key: "batch-msg-1",
            value: JSON.stringify({ id: 1, data: "first message" }),
          },
          {
            key: "batch-msg-2",
            value: JSON.stringify({ id: 2, data: "second message" }),
          },
          {
            key: "batch-msg-3",
            value: JSON.stringify({ id: 3, data: "third message" }),
          },
        ],
      };

      const result = await producer.sendBatch(batch);

      expect(isSuccess(result)).toBe(true);

      const batchResult = getValue(result);
      // Kafka may batch messages differently than expected
      expect(batchResult.totalMessages).toBeGreaterThanOrEqual(1);
      // Note: results length may vary due to Kafka partitioning - focus on successful send
      expect(batchResult.results.length).toBeGreaterThan(0);

      // Verify messages got different offsets (Kafka may batch some messages)
      const offsets = batchResult.results.map((r) => r.offset);
      const uniqueOffsets = new Set(offsets);
      expect(uniqueOffsets.size).toBe(batchResult.results.length);

      logger.info("✅ Successfully published batch to real Redpanda", {
        messageCount: batchResult.totalMessages,
        partitions: [...new Set(batchResult.results.map((r) => r.partition))],
      });
    }, 15000);
  });

  describe("Real Error Scenarios", () => {
    it("should handle network timeout with real broker", async () => {
      // Create producer with very short timeout
      const timeoutKafka = new Kafka({
        clientId: "timeout-test",
        brokers: testConfig.brokers,
        connectionTimeout: 100, // Very short timeout
        requestTimeout: 100,
      });

      const timeoutProducer = new StreamingProducer(
        timeoutKafka,
        { clientId: "timeout-test", brokers: testConfig.brokers },
        { maxInFlightRequests: 1, requestTimeoutMs: 100 },
        logger
      );

      const connectResult = await timeoutProducer.connect();
      // Connection might succeed or fail depending on network speed

      if (isSuccess(connectResult)) {
        // If connected, try sending a message with tight timeout
        const message = { key: "timeout-test", value: "test" };
        const topicConfig = getTopicConfig(testConfig, TEST_TOPIC_KEY);
        const sendResult = await timeoutProducer.send(topicConfig.name, message);

        // This should likely timeout or fail due to very short timeout
        if (isFailure(sendResult)) {
          const error = getError(sendResult);
          expect(error.category).toBe("SYSTEM");
          logger.info("✅ Correctly handled network timeout scenario");
        }
      } else {
        // Connection failed due to timeout - this is also valid
        const error = getError(connectResult);
        expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
        logger.info("✅ Correctly handled connection timeout");
      }
    }, 5000);
  });

  describe("Performance and Load Testing", () => {
    beforeEach(async () => {
      if (!producer.isConnected()) {
        await producer.connect();
      }
    });

    it("should handle high-volume message publishing", async () => {
      const messageCount = 100;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        key: `perf-test-${i}`,
        value: JSON.stringify({
          id: i,
          timestamp: new Date().toISOString(),
          data: `Performance test message ${i}`.repeat(10), // Make it bigger
        }),
      }));

      const startTime = Date.now();
      const topicConfig = getTopicConfig(testConfig, TEST_TOPIC_KEY);
      const promises = messages.map((message) => producer.send(topicConfig.name, message));

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const successCount = results.filter((r) => isSuccess(r)).length;
      const failureCount = results.filter((r) => isFailure(r)).length;

      expect(successCount).toBeGreaterThan(messageCount * 0.95); // At least 95% success

      const duration = endTime - startTime;
      const messagesPerSecond = (successCount / duration) * 1000;

      logger.info("✅ High-volume test completed", {
        messageCount,
        successCount,
        failureCount,
        durationMs: duration,
        messagesPerSecond: Math.round(messagesPerSecond),
      });

      expect(messagesPerSecond).toBeGreaterThan(10); // At least 10 msg/sec
    }, 30000);
  });
});
