/**
 * Real Integration Tests for StreamingAdmin with actual Redpanda
 *
 * Prerequisites:
 * - Redpanda services running on localhost:9092 (from ../qi-v2-dp-ts-actor/services)
 * - Real topic management operations
 * - Actual broker metadata queries
 */

import { type QiError, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { createLogger } from "@qi/core";
import { Kafka } from "kafkajs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StreamingAdmin } from "../../../src/base/streaming/admin.js";

describe("StreamingAdmin - Real Redpanda Integration", () => {
  let kafka: Kafka;
  let admin: StreamingAdmin;
  let logger: any;

  const TEST_BROKERS = ["localhost:19092"];
  const TEST_CLIENT_ID = "integration-test-admin";
  const TEST_TOPICS = [
    "admin-integration-test-1",
    "admin-integration-test-2",
    "admin-integration-test-batch",
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
      name: "admin-integration-test",
      pretty: true,
    });
    if (isFailure(loggerResult)) {
      throw new Error(`Failed to create logger: ${getError(loggerResult).message}`);
    }
    logger = getValue(loggerResult);

    // Create admin client
    admin = new StreamingAdmin(kafka, { clientId: TEST_CLIENT_ID, brokers: TEST_BROKERS }, logger);
  }, 30000);

  afterAll(async () => {
    // Cleanup - delete test topics and disconnect
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

  describe("Real Connection Management", () => {
    it("should connect to actual Redpanda admin", async () => {
      const result = await admin.connect();

      expect(isSuccess(result)).toBe(true);
      expect(admin.isConnected()).toBe(true);

      logger.info("✅ Successfully connected admin to real Redpanda");
    }, 10000);

    it("should handle admin connection failures to bad brokers", async () => {
      const badKafka = new Kafka({
        clientId: "bad-admin",
        brokers: ["localhost:9999"],
        connectionTimeout: 1000,
      });

      const badAdmin = new StreamingAdmin(
        badKafka,
        { clientId: "bad-admin", brokers: ["localhost:9999"] },
        logger
      );

      const result = await badAdmin.connect();

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
      expect(error.category).toBe("SYSTEM");

      logger.info("✅ Correctly handled admin connection failure");
    }, 10000);

    it("should disconnect admin gracefully", async () => {
      if (!admin.isConnected()) {
        await admin.connect();
      }

      const result = await admin.disconnect();

      expect(isSuccess(result)).toBe(true);
      expect(admin.isConnected()).toBe(false);

      logger.info("✅ Successfully disconnected admin from real Redpanda");
    }, 10000);
  });

  describe("Real Topic Management", () => {
    beforeEach(async () => {
      if (!admin.isConnected()) {
        const result = await admin.connect();
        if (isFailure(result)) {
          throw new Error(`Admin connection failed: ${getError(result).message}`);
        }
      }
    });

    it("should create topic in real Redpanda", async () => {
      const topicConfigs = [
        {
          topic: TEST_TOPICS[0],
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: "cleanup.policy", value: "delete" },
            { name: "retention.ms", value: "300000" }, // 5 minutes
          ],
        },
      ];

      const result = await admin.createTopics(topicConfigs);

      expect(isSuccess(result)).toBe(true);

      // createTopics returns void on success
      const createResult = getValue(result);
      expect(createResult).toBeUndefined();

      logger.info("✅ Successfully created topic in real Redpanda", {
        topic: TEST_TOPICS[0],
        partitions: 3,
        replicationFactor: 1,
      });
    }, 15000);

    it("should handle duplicate topic creation gracefully", async () => {
      // First, ensure topic exists
      await admin.createTopics([
        {
          topic: TEST_TOPICS[1],
          numPartitions: 2,
          replicationFactor: 1,
        },
      ]);

      // Try to create same topic again
      const result = await admin.createTopics([
        {
          topic: TEST_TOPICS[1],
          numPartitions: 2,
          replicationFactor: 1,
        },
      ]);

      // Should either succeed (idempotent) or fail with "already exists"
      if (isFailure(result)) {
        const error = getError(result);
        expect(error.code).toBe("STREAMING_TOPIC_CREATE_FAILED");
        expect(error.message).toContain("already exists");
      } else {
        // createTopics returns void on success
        const createResult = getValue(result);
        expect(createResult).toBeUndefined();
      }

      logger.info("✅ Correctly handled duplicate topic creation");
    }, 15000);

    it("should create multiple topics in batch", async () => {
      const topicConfigs = [
        {
          topic: `${TEST_TOPICS[2]}-1`,
          numPartitions: 1,
          replicationFactor: 1,
        },
        {
          topic: `${TEST_TOPICS[2]}-2`,
          numPartitions: 2,
          replicationFactor: 1,
        },
      ];

      const result = await admin.createTopics(topicConfigs);

      expect(isSuccess(result)).toBe(true);

      // createTopics returns void on success
      const createResult = getValue(result);
      expect(createResult).toBeUndefined();

      logger.info("✅ Successfully created multiple topics", {
        topics: [`${TEST_TOPICS[2]}-1`, `${TEST_TOPICS[2]}-2`],
      });
    }, 15000);

    it("should list existing topics from real Redpanda", async () => {
      const result = await admin.listTopics();

      expect(isSuccess(result)).toBe(true);

      const topicNames = getValue(result);
      expect(Array.isArray(topicNames)).toBe(true);
      expect(topicNames.length).toBeGreaterThan(0);

      // Should include our test topics
      const hasTestTopic = topicNames.some((name) => name.includes("admin-integration-test"));
      expect(hasTestTopic).toBe(true);

      logger.info("✅ Successfully listed topics from real Redpanda", {
        topicCount: topicNames.length,
        sampleTopics: topicNames.slice(0, 5),
      });
    }, 10000);

    it("should get topic metadata from real Redpanda", async () => {
      // Ensure topic exists first
      await admin.createTopics([
        {
          topic: TEST_TOPICS[0],
          numPartitions: 3,
          replicationFactor: 1,
        },
      ]);

      const result = await admin.getTopicMetadata([TEST_TOPICS[0]]);

      expect(isSuccess(result)).toBe(true);

      const topicMetadataArray = getValue(result);
      expect(topicMetadataArray).toHaveLength(1);

      const topicMeta = topicMetadataArray[0];
      expect(topicMeta.name).toBe(TEST_TOPICS[0]);
      expect(topicMeta.partitions).toHaveLength(3);

      // Verify partition metadata
      for (const partition of topicMeta.partitions) {
        expect(partition.partitionId).toBeGreaterThanOrEqual(0);
        expect(partition.leader).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(partition.replicas)).toBe(true);
        expect(Array.isArray(partition.isr)).toBe(true); // in-sync replicas
      }

      logger.info("✅ Successfully retrieved topic metadata", {
        topic: topicMeta.name,
        partitionCount: topicMeta.partitions.length,
        partitionDetails: topicMeta.partitions.map((p) => ({
          id: p.partitionId,
          leader: p.leader,
          replicas: p.replicas.length,
        })),
      });
    }, 15000);

    it("should delete topics from real Redpanda", async () => {
      const testTopic = `${TEST_TOPICS[0]}-to-delete`;

      // First create the topic
      await admin.createTopics([
        {
          topic: testTopic,
          numPartitions: 1,
          replicationFactor: 1,
        },
      ]);

      // Then delete it
      const result = await admin.deleteTopics([testTopic]);

      expect(isSuccess(result)).toBe(true);

      // deleteTopics returns void on success
      const deleteResult = getValue(result);
      expect(deleteResult).toBeUndefined();

      // Verify topic is gone by listing topics
      const listResult = await admin.listTopics();
      if (isSuccess(listResult)) {
        const topicNames = getValue(listResult);
        expect(topicNames).not.toContain(testTopic);
      }

      logger.info("✅ Successfully deleted topic from real Redpanda", {
        deletedTopic: testTopic,
      });
    }, 15000);
  });

  describe("Real Error Scenarios", () => {
    beforeEach(async () => {
      if (!admin.isConnected()) {
        await admin.connect();
      }
    });

    it("should handle invalid topic configurations", async () => {
      const invalidConfigs = [
        {
          topic: "", // Empty topic name
          numPartitions: 1,
          replicationFactor: 1,
        },
      ];

      const result = await admin.createTopics(invalidConfigs);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_TOPIC_CREATE_FAILED");
      expect(error.category).toBe("SYSTEM");

      logger.info("✅ Correctly handled invalid topic configuration");
    }, 10000);

    it("should handle deletion of non-existent topics", async () => {
      const result = await admin.deleteTopics(["non-existent-topic-xyz"]);

      // This might succeed (idempotent) or fail depending on Redpanda config
      if (isFailure(result)) {
        const error = getError(result);
        expect(error.code).toBe("STREAMING_TOPIC_DELETE_FAILED");
      } else {
        // deleteTopics returns void on success (idempotent)
        const deleteResult = getValue(result);
        expect(deleteResult).toBeUndefined();
      }

      logger.info("✅ Handled deletion of non-existent topic");
    }, 10000);

    it("should handle metadata queries for non-existent topics", async () => {
      const result = await admin.getTopicMetadata(["non-existent-metadata-topic"]);

      // Should fail or return empty metadata
      if (isFailure(result)) {
        const error = getError(result);
        expect(error.code).toBe("STREAMING_METADATA_FAILED");
      } else {
        const metadataArray = getValue(result);
        // If it succeeds, metadata array might be empty
        expect(Array.isArray(metadataArray)).toBe(true);
      }

      logger.info("✅ Handled metadata query for non-existent topic");
    }, 10000);
  });
});
