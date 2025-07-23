/**
 * Comprehensive tests for StreamingProducer demonstrating correct @qi/base patterns
 * This file shows PROPER usage of @qi/base helpers vs manual discriminated union checking
 */

import { Err, Ok, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { createLogger } from "@qi/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingProducer } from "../../../src/base/streaming/producer.js";

describe("StreamingProducer - Proper @qi Patterns", () => {
  let producer: StreamingProducer;
  let mockKafka: any;
  let mockProducerInstance: any;
  let logger: any;

  beforeEach(() => {
    // Setup mocks
    mockProducerInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
    };

    mockKafka = {
      producer: vi.fn().mockReturnValue(mockProducerInstance),
    };

    const loggerResult = createLogger({ level: "info", name: "test" });
    if (loggerResult.tag === "success") {
      logger = loggerResult.value;
    }

    producer = new StreamingProducer(
      mockKafka,
      { clientId: "test-client", brokers: ["localhost:9092"] },
      { maxInFlightRequests: 5, requestTimeoutMs: 30000 },
      logger
    );
  });

  describe("Connection Management", () => {
    it("should successfully connect using proper @qi patterns", async () => {
      const result = await producer.connect();

      // ✅ CORRECT: Using @qi/base helpers instead of manual tag checking
      expect(isSuccess(result)).toBe(true);

      // ✅ CORRECT: Safe value extraction with getValue
      const connectionStatus = getValue(result);
      expect(connectionStatus).toBeUndefined(); // void return
      expect(mockProducerInstance.connect).toHaveBeenCalledOnce();
    });

    it("should handle connection failures with proper error patterns", async () => {
      const connectionError = new Error("Connection failed");
      mockProducerInstance.connect.mockRejectedValue(connectionError);

      const result = await producer.connect();

      // ✅ CORRECT: Using @qi/base error helpers
      expect(isFailure(result)).toBe(true);

      // ✅ CORRECT: Safe error extraction with getError
      const error = getError(result);
      expect(error.code).toBe("STREAMING_CONNECTION_FAILED");
      expect(error.category).toBe("SYSTEM");
      expect(error.message).toContain("Failed to connect producer");
    });

    it("should handle idempotent connection attempts", async () => {
      // First connection
      const result1 = await producer.connect();
      expect(isSuccess(result1)).toBe(true);

      // Second connection should be idempotent
      const result2 = await producer.connect();
      expect(isSuccess(result2)).toBe(true);

      // Should not call connect twice
      expect(mockProducerInstance.connect).toHaveBeenCalledOnce();
    });
  });

  describe("Message Production", () => {
    beforeEach(async () => {
      await producer.connect();
    });

    it("should successfully send message with complete metadata", async () => {
      const mockMetadata = {
        topicName: "test-topic",
        partition: 0,
        baseOffset: "123",
        logAppendTime: "1642681234567",
      };
      mockProducerInstance.send.mockResolvedValue([mockMetadata]);

      const message = {
        id: "msg-1",
        topic: "test-topic",
        key: "test-key",
        value: "test-value",
        headers: { "content-type": "application/json" },
      };

      const result = await producer.send(message.topic, message);

      // ✅ CORRECT: Proper @qi pattern for success validation
      expect(isSuccess(result)).toBe(true);

      const produceResult = getValue(result);
      expect(produceResult.topic).toBe("test-topic");
      expect(produceResult.partition).toBe(0);
      expect(produceResult.offset).toBe("123");
      expect(produceResult.timestamp).toBeInstanceOf(Date);
    });

    it("should handle missing result with proper error composition", async () => {
      // Simulate kafka returning null/empty result
      mockProducerInstance.send.mockResolvedValue(null);

      const message = { id: "msg-1", topic: "test-topic", value: "test-value" };
      const result = await producer.send(message.topic, message);

      // ✅ CORRECT: Error handling with @qi/base helpers
      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_PUBLISH_FAILED");
      expect(error.category).toBe("SYSTEM");
      expect(error.message).toContain("Send operation failed");
    });

    it("should handle missing metadata with proper error context", async () => {
      // Simulate kafka returning empty metadata
      mockProducerInstance.send.mockResolvedValue([null]);

      const message = { id: "msg-1", topic: "test-topic", value: "test-value" };
      const result = await producer.send(message.topic, message);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_PUBLISH_FAILED");
      expect(error.message).toContain("no metadata returned");
      expect(error.context?.topic).toBe(message.topic);
    });

    it("should validate message structure after connecting", async () => {
      const invalidMessage = { id: "msg-1", topic: "valid-topic", value: "" }; // Empty value

      // Mock validation failure after connection
      const validationError = new Error("Message value cannot be empty");
      validationError.name = "ValidationError";
      mockProducerInstance.send.mockRejectedValue(validationError);

      const result = await producer.send("valid-topic", invalidMessage);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.category).toBe("SYSTEM");
      expect(error.message).toContain("Message value cannot be empty");
    });
  });

  describe("Batch Operations", () => {
    beforeEach(async () => {
      await producer.connect();
    });

    it("should successfully send message batch", async () => {
      const mockMetadata = [
        { topicName: "test-topic", partition: 0, baseOffset: "123" },
        { topicName: "test-topic", partition: 1, baseOffset: "124" },
      ];
      mockProducerInstance.send.mockResolvedValue(mockMetadata);

      const batch = {
        topic: "test-topic",
        messages: [
          { id: "msg-1", value: "value-1" },
          { id: "msg-2", value: "value-2" },
        ],
      };

      const result = await producer.sendBatch(batch);

      expect(isSuccess(result)).toBe(true);

      const batchResult = getValue(result);
      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.totalMessages).toBe(2);
      expect(batchResult.totalTopics).toBe(1);
    });

    it("should handle batch validation failures after connecting", async () => {
      const validBatch = {
        topic: "valid-topic",
        messages: [{ id: "msg-1", value: "valid-value" }],
      };

      // Mock batch processing failure
      const batchError = new Error("Batch processing failed");
      mockProducerInstance.send.mockRejectedValue(batchError);

      const result = await producer.sendBatch(validBatch);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.category).toBe("SYSTEM");
      expect(error.message).toContain("Failed to send message batch");
    });
  });

  describe("Error Handling Patterns", () => {
    it("should maintain Result<T> composition throughout error scenarios", async () => {
      const scenarios = [
        {
          description: "Connection failure",
          setup: () =>
            mockProducerInstance.connect.mockRejectedValue(new Error("Connection failed")),
        },
        {
          description: "Send failure",
          setup: () => mockProducerInstance.send.mockRejectedValue(new Error("Send failed")),
        },
        {
          description: "Network timeout",
          setup: () => mockProducerInstance.send.mockRejectedValue(new Error("Request timeout")),
        },
      ];

      for (const scenario of scenarios) {
        scenario.setup();

        if (scenario.description === "Connection failure") {
          const result = await producer.connect();
          expect(isFailure(result)).toBe(true);

          const error = getError(result);
          expect(error.category).toBe("SYSTEM");
          expect(error.context).toBeDefined();
        } else {
          await producer.connect(); // Ensure connected for send tests
          const message = { id: "msg-1", topic: "test-topic", value: "test-value" };
          const result = await producer.send(message.topic, message);

          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.category).toBe("SYSTEM");
        }
      }
    });

    it("should provide rich error context for debugging", async () => {
      mockProducerInstance.send.mockRejectedValue(new Error("Broker not available"));

      const message = {
        id: "msg-1",
        topic: "critical-topic",
        value: "important-data",
        key: "user-123",
      };

      const result = await producer.send(message.topic, message);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.context?.operation).toBe("send");
      expect(error.context?.topic).toBe(message.topic);
      // The error message will be about producer not being connected since we didn't connect first
      expect(error.message).toContain("not connected");
    });
  });

  describe("Disconnection", () => {
    it("should handle disconnection properly", async () => {
      await producer.connect();

      const result = await producer.disconnect();

      expect(isSuccess(result)).toBe(true);
      expect(mockProducerInstance.disconnect).toHaveBeenCalledOnce();
    });

    it("should handle disconnection failures gracefully", async () => {
      await producer.connect();
      mockProducerInstance.disconnect.mockRejectedValue(new Error("Disconnect failed"));

      const result = await producer.disconnect();

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error.code).toBe("STREAMING_DISCONNECTION_FAILED");
      expect(error.category).toBe("SYSTEM");
    });
  });
});
