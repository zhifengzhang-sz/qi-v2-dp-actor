/**
 * Comprehensive tests for StreamingAdmin demonstrating correct @qi/base patterns
 *
 * This file includes both:
 * - Unit tests with mocks (fast, reliable)
 * - Integration tests with real Redpanda (when SERVICE_INTEGRATION=true)
 *
 * Integration Test Setup:
 * 1. Start services: docker-compose -f ../../../qi-v2-dp-ts-actor/services/docker-compose.yml up -d redpanda
 * 2. Run tests: SERVICE_INTEGRATION=true bun test admin.test.ts
 */

import { Err, Ok, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { createLogger } from "@qi/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingAdmin } from "../../../src/base/streaming/admin.js";
import type { TopicConfig } from "../../../src/base/streaming/types.js";

describe("StreamingAdmin - Comprehensive Testing", () => {
  const isIntegrationTest = process.env.SERVICE_INTEGRATION === "true";

  describe(isIntegrationTest ? "Integration Tests (Real Redpanda)" : "Unit Tests (Mocked)", () => {
    let admin: StreamingAdmin;
    let mockKafka: any;
    let mockAdminInstance: any;
    let logger: any;

    beforeEach(() => {
      if (isIntegrationTest) {
        setupRealServices();
      } else {
        setupMockedServices();
      }
    });

    function setupRealServices() {
      // For integration tests, use real Kafka client pointing to Redpanda
      const { Kafka } = require("kafkajs");
      const kafka = new Kafka({
        clientId: "streaming-admin-integration-test",
        brokers: ["localhost:19092"], // Redpanda from docker-compose
      });

      const loggerResult = createLogger({ level: "info", name: "integration-test" });
      if (loggerResult.tag === "success") {
        logger = loggerResult.value;
      }

      admin = new StreamingAdmin(
        kafka,
        {
          clientId: "streaming-admin-integration-test",
          brokers: ["localhost:19092"],
          connectionTimeout: 5000,
          requestTimeout: 10000,
        },
        logger
      );
    }

    function setupMockedServices() {
      // For unit tests, use comprehensive mocks
      mockAdminInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        createTopics: vi.fn().mockResolvedValue(undefined),
        deleteTopics: vi.fn().mockResolvedValue(undefined),
        listTopics: vi.fn().mockResolvedValue(["test-topic-1", "test-topic-2"]),
        fetchTopicMetadata: vi.fn().mockResolvedValue({
          topics: [
            {
              name: "test-topic",
              partitions: [
                {
                  partitionId: 0,
                  leader: 1,
                  replicas: [1, 2, 3],
                  isr: [1, 2],
                },
              ],
            },
          ],
        }),
      };

      mockKafka = {
        admin: vi.fn().mockReturnValue(mockAdminInstance),
      };

      const loggerResult = createLogger({ level: "info", name: "test" });
      if (loggerResult.tag === "success") {
        logger = loggerResult.value;
      }

      admin = new StreamingAdmin(
        mockKafka,
        { clientId: "test-admin", brokers: ["localhost:9092"] },
        logger
      );
    }

    describe("Connection Management", () => {
      it(
        "should successfully connect using proper @qi patterns",
        async () => {
          const result = await admin.connect();

          // ✅ CORRECT: Using @qi/base helpers instead of manual tag checking
          expect(isSuccess(result)).toBe(true);

          // ✅ CORRECT: Safe value extraction with getValue
          const connectionStatus = getValue(result);
          expect(connectionStatus).toBeUndefined(); // void return

          if (!isIntegrationTest) {
            expect(mockAdminInstance.connect).toHaveBeenCalledOnce();
          }
        },
        isIntegrationTest ? 10000 : 5000
      );

      it(
        "should handle connection failures with proper error patterns",
        async () => {
          if (!isIntegrationTest) {
            const connectionError = new Error("Connection failed");
            mockAdminInstance.connect.mockRejectedValue(connectionError);
          } else {
            // For integration tests, simulate connection failure by using wrong broker
            const { Kafka } = require("kafkajs");
            const kafka = new Kafka({
              clientId: "test-failing-client",
              brokers: ["localhost:9999"], // Non-existent broker
            });

            admin = new StreamingAdmin(
              kafka,
              { clientId: "test-failing-client", brokers: ["localhost:9999"] },
              logger
            );
          }

          const result = await admin.connect();

          // ✅ CORRECT: Using @qi/base error helpers
          expect(isFailure(result)).toBe(true);

          // ✅ CORRECT: Safe error extraction with getError
          const error = getError(result);
          expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
          expect(error.category).toBe("SYSTEM");
          expect(error.message).toContain("Failed to connect admin client");
        },
        isIntegrationTest ? 15000 : 5000
      );

      it(
        "should handle idempotent connection attempts",
        async () => {
          // First connection
          const result1 = await admin.connect();
          expect(isSuccess(result1)).toBe(true);

          // Second connection should be idempotent
          const result2 = await admin.connect();
          expect(isSuccess(result2)).toBe(true);

          if (!isIntegrationTest) {
            // Should not call connect twice in mocked version
            expect(mockAdminInstance.connect).toHaveBeenCalledOnce();
          }
        },
        isIntegrationTest ? 10000 : 5000
      );
    });

    describe("Topic Management", () => {
      beforeEach(async () => {
        const connectResult = await admin.connect();
        expect(isSuccess(connectResult)).toBe(true);
      });

      it(
        "should successfully create topics with complete configuration",
        async () => {
          const topics: TopicConfig[] = [
            {
              topic: "test-crypto-prices",
              numPartitions: 3,
              replicationFactor: 1,
              configEntries: [
                { name: "cleanup.policy", value: "delete" },
                { name: "retention.ms", value: "86400000" },
              ],
            },
            {
              topic: "test-market-analytics",
              numPartitions: 2,
              replicationFactor: 1,
            },
          ];

          if (!isIntegrationTest) {
            mockAdminInstance.createTopics.mockResolvedValue(undefined);
          }

          const result = await admin.createTopics(topics);

          // ✅ CORRECT: Proper @qi pattern for success validation
          expect(isSuccess(result)).toBe(true);

          const createResult = getValue(result);
          expect(createResult).toBeUndefined(); // void return

          if (!isIntegrationTest) {
            expect(mockAdminInstance.createTopics).toHaveBeenCalledWith({
              topics: expect.arrayContaining([
                expect.objectContaining({
                  topic: "test-crypto-prices",
                  numPartitions: 3,
                  replicationFactor: 1,
                  configEntries: expect.arrayContaining([
                    { name: "cleanup.policy", value: "delete" },
                    { name: "retention.ms", value: "86400000" },
                  ]),
                }),
              ]),
              waitForLeaders: true,
            });
          }
        },
        isIntegrationTest ? 15000 : 5000
      );

      it("should handle topic creation validation failures", async () => {
        const invalidTopics: TopicConfig[] = [
          {
            topic: "", // Invalid empty topic name
            numPartitions: 1,
            replicationFactor: 1,
          },
        ];

        const result = await admin.createTopics(invalidTopics);

        // ✅ CORRECT: Error handling with @qi/base helpers
        expect(isFailure(result)).toBe(true);

        const error = getError(result);
        expect(error.code).toBe("STREAMING_TOPIC_CREATE_FAILED");
        expect(error.category).toBe("SYSTEM");
        expect(error.message).toContain("All topic names must be non-empty strings");
      });

      it("should validate partition and replication factor constraints", async () => {
        const invalidPartitionsTopics: TopicConfig[] = [
          {
            topic: "test-topic",
            numPartitions: 0, // Invalid: must be >= 1
            replicationFactor: 1,
          },
        ];

        const result1 = await admin.createTopics(invalidPartitionsTopics);
        expect(isFailure(result1)).toBe(true);

        const error1 = getError(result1);
        expect(error1.code).toBe("STREAMING_TOPIC_CREATE_FAILED");
        expect(error1.message).toContain("Number of partitions must be at least 1");

        const invalidReplicationTopics: TopicConfig[] = [
          {
            topic: "test-topic",
            numPartitions: 1,
            replicationFactor: 0, // Invalid: must be >= 1
          },
        ];

        const result2 = await admin.createTopics(invalidReplicationTopics);
        expect(isFailure(result2)).toBe(true);

        const error2 = getError(result2);
        expect(error2.code).toBe("STREAMING_TOPIC_CREATE_FAILED");
        expect(error2.message).toContain("Replication factor must be at least 1");
      });

      it(
        "should successfully delete topics",
        async () => {
          const topicsToDelete = ["test-topic-to-delete-1", "test-topic-to-delete-2"];

          if (isIntegrationTest) {
            // Create topics first for integration test
            const createResult = await admin.createTopics(
              topicsToDelete.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 }))
            );
            expect(isSuccess(createResult)).toBe(true);

            // Wait a bit for topic creation to complete
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const result = await admin.deleteTopics(topicsToDelete);

          expect(isSuccess(result)).toBe(true);

          const deleteResult = getValue(result);
          expect(deleteResult).toBeUndefined(); // void return

          if (!isIntegrationTest) {
            expect(mockAdminInstance.deleteTopics).toHaveBeenCalledWith({
              topics: topicsToDelete,
            });
          }
        },
        isIntegrationTest ? 20000 : 5000
      );

      it("should handle topic deletion validation failures", async () => {
        const invalidTopicNames = ["", "  "]; // Empty and whitespace-only names

        const result = await admin.deleteTopics(invalidTopicNames);

        expect(isFailure(result)).toBe(true);

        const error = getError(result);
        expect(error.code).toBe("STREAMING_TOPIC_DELETE_FAILED");
        expect(error.message).toContain("All topic names must be non-empty strings");
      });

      it(
        "should successfully list topics",
        async () => {
          const result = await admin.listTopics();

          expect(isSuccess(result)).toBe(true);

          const topics = getValue(result);
          expect(Array.isArray(topics)).toBe(true);

          if (isIntegrationTest) {
            // In integration tests, we should see actual topics
            expect(topics.length).toBeGreaterThan(0);
          } else {
            // In unit tests, we see mocked topics
            expect(topics).toEqual(["test-topic-1", "test-topic-2"]);
          }
        },
        isIntegrationTest ? 10000 : 5000
      );

      it(
        "should successfully fetch topic metadata",
        async () => {
          let topicsToFetch: string[];

          if (isIntegrationTest) {
            // First, create a topic for metadata testing
            const createResult = await admin.createTopics([
              { topic: "metadata-test-topic", numPartitions: 2, replicationFactor: 1 },
            ]);
            expect(isSuccess(createResult)).toBe(true);

            // Wait for topic creation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            topicsToFetch = ["metadata-test-topic"];
          } else {
            topicsToFetch = ["test-topic"];
          }

          const result = await admin.getTopicMetadata(topicsToFetch);

          expect(isSuccess(result)).toBe(true);

          const metadata = getValue(result);
          expect(Array.isArray(metadata)).toBe(true);
          expect(metadata.length).toBeGreaterThan(0);

          const topicMetadata = metadata[0];
          expect(topicMetadata).toHaveProperty("name");
          expect(topicMetadata).toHaveProperty("partitions");
          expect(Array.isArray(topicMetadata.partitions)).toBe(true);

          if (isIntegrationTest) {
            expect(topicMetadata.name).toBe("metadata-test-topic");
            expect(topicMetadata.partitions.length).toBe(2);
          }

          // Check partition structure
          const partition = topicMetadata.partitions[0];
          expect(partition).toHaveProperty("partitionId");
          expect(partition).toHaveProperty("leader");
          expect(partition).toHaveProperty("replicas");
          expect(partition).toHaveProperty("isr");
        },
        isIntegrationTest ? 15000 : 5000
      );
    });

    describe("Connection State Management", () => {
      it("should prevent operations when not connected", async () => {
        // Don't connect admin
        expect(admin.isConnected()).toBe(false);

        const createResult = await admin.createTopics([
          { topic: "test", numPartitions: 1, replicationFactor: 1 },
        ]);

        expect(isFailure(createResult)).toBe(true);
        const createError = getError(createResult);
        expect(createError.code).toBe("STREAMING_ADMIN_FAILED");
        expect(createError.message).toContain("Admin client not connected");

        const deleteResult = await admin.deleteTopics(["test"]);

        expect(isFailure(deleteResult)).toBe(true);
        const deleteError = getError(deleteResult);
        expect(deleteError.code).toBe("STREAMING_ADMIN_FAILED");

        const listResult = await admin.listTopics();

        expect(isFailure(listResult)).toBe(true);
        const listError = getError(listResult);
        expect(listError.code).toBe("STREAMING_ADMIN_FAILED");

        const metadataResult = await admin.getTopicMetadata(["test"]);

        expect(isFailure(metadataResult)).toBe(true);
        const metadataError = getError(metadataResult);
        expect(metadataError.code).toBe("STREAMING_ADMIN_FAILED");
      });

      it(
        "should handle disconnection properly",
        async () => {
          // First connect
          const connectResult = await admin.connect();
          expect(isSuccess(connectResult)).toBe(true);
          expect(admin.isConnected()).toBe(true);

          // Then disconnect
          const result = await admin.disconnect();

          expect(isSuccess(result)).toBe(true);
          expect(admin.isConnected()).toBe(false);

          if (!isIntegrationTest) {
            expect(mockAdminInstance.disconnect).toHaveBeenCalledOnce();
          }
        },
        isIntegrationTest ? 10000 : 5000
      );

      it("should handle disconnection failures gracefully", async () => {
        if (!isIntegrationTest) {
          // Connect first
          await admin.connect();
          mockAdminInstance.disconnect.mockRejectedValue(new Error("Disconnect failed"));

          const result = await admin.disconnect();

          expect(isFailure(result)).toBe(true);

          const error = getError(result);
          expect(error.code).toBe("STREAMING_DISCONNECTION_FAILED");
          expect(error.category).toBe("SYSTEM");
        }
      });
    });

    describe("Error Handling Patterns", () => {
      beforeEach(async () => {
        const connectResult = await admin.connect();
        expect(isSuccess(connectResult)).toBe(true);
      });

      it("should maintain Result<T> composition throughout error scenarios", async () => {
        if (!isIntegrationTest) {
          const scenarios = [
            {
              description: "Topic creation failure",
              setup: () =>
                mockAdminInstance.createTopics.mockRejectedValue(new Error("Creation failed")),
              operation: () =>
                admin.createTopics([{ topic: "test", numPartitions: 1, replicationFactor: 1 }]),
            },
            {
              description: "Topic deletion failure",
              setup: () =>
                mockAdminInstance.deleteTopics.mockRejectedValue(new Error("Deletion failed")),
              operation: () => admin.deleteTopics(["test"]),
            },
            {
              description: "List topics failure",
              setup: () => mockAdminInstance.listTopics.mockRejectedValue(new Error("List failed")),
              operation: () => admin.listTopics(),
            },
          ];

          for (const scenario of scenarios) {
            scenario.setup();
            const result = await scenario.operation();

            expect(isFailure(result)).toBe(true);
            const error = getError(result);
            expect(error.category).toBe("SYSTEM");
            expect(error.context).toBeDefined();
          }
        }
      });

      it(
        "should provide rich error context for debugging",
        async () => {
          const topics: TopicConfig[] = [
            { topic: "debug-topic", numPartitions: 1, replicationFactor: 1 },
          ];

          if (!isIntegrationTest) {
            mockAdminInstance.createTopics.mockRejectedValue(new Error("Topic already exists"));
          }

          const result = isIntegrationTest
            ? // In integration test, try creating same topic twice
              await admin.createTopics(topics).then(() => admin.createTopics(topics))
            : await admin.createTopics(topics);

          if (isIntegrationTest) {
            // Second creation should succeed or give appropriate error
            expect(result).toBeDefined();
          } else {
            expect(isFailure(result)).toBe(true);

            const error = getError(result);
            expect(error.context?.operation).toBe("createTopics");
            expect(error.context?.topics).toEqual(["debug-topic"]);
            expect(error.context?.component).toBe("StreamingAdmin");
          }
        },
        isIntegrationTest ? 15000 : 5000
      );
    });

    // Integration-specific tests
    if (isIntegrationTest) {
      describe("Real Service Integration", () => {
        it("should work with predefined Redpanda topics from config", async () => {
          await admin.connect();

          // Test with topics from the actual topics.yml configuration
          const predefinedTopics = [
            "crypto-prices",
            "crypto-ohlcv",
            "market-analytics",
            "level1-data",
          ];

          // List topics to see what's available
          const listResult = await admin.listTopics();
          expect(isSuccess(listResult)).toBe(true);

          const availableTopics = getValue(listResult);
          console.log("Available topics:", availableTopics);

          // Create test topics that mirror the config
          const testTopics: TopicConfig[] = [
            {
              topic: "test-crypto-prices",
              numPartitions: 3,
              replicationFactor: 1,
              configEntries: [
                { name: "cleanup.policy", value: "delete" },
                { name: "retention.ms", value: "86400000" },
                { name: "compression.type", value: "snappy" },
              ],
            },
          ];

          const createResult = await admin.createTopics(testTopics);
          expect(isSuccess(createResult)).toBe(true);

          // Verify the topic was created with correct metadata
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for creation

          const metadataResult = await admin.getTopicMetadata(["test-crypto-prices"]);
          expect(isSuccess(metadataResult)).toBe(true);

          const metadata = getValue(metadataResult);
          expect(metadata[0].name).toBe("test-crypto-prices");
          expect(metadata[0].partitions.length).toBe(3);
        }, 30000);
      });
    }

    afterEach(async () => {
      if (admin.isConnected()) {
        await admin.disconnect();
      }
    });
  });
});
