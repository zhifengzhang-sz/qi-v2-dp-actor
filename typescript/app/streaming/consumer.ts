#!/usr/bin/env bun
/**
 * Simple Consumer Example
 *
 * Demonstrates how to use @qi/base streaming module to consume messages from Kafka/Redpanda.
 * This example shows basic usage patterns, error handling, and graceful shutdown.
 */

import { match } from "@qi/base";
import { createStreamingClient } from "../../lib/base/src/streaming/index.js";
import type { StreamingConfig } from "../../lib/base/src/streaming/types.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const config: StreamingConfig = {
  clientId: "example-consumer",
  brokers: [
    process.env.KAFKA_BROKERS || "localhost:9092"
  ],
  connectionTimeout: 3000,
  requestTimeout: 25000,
  retryAttempts: 3,
};

const TOPIC_NAME = process.env.TOPIC_NAME || "example-events";
const GROUP_ID = process.env.GROUP_ID || "example-consumer-group";
const AUTO_COMMIT = process.env.AUTO_COMMIT !== "false"; // Default true

// =============================================================================
// CONSUMER LOGIC
// =============================================================================

async function runConsumer() {
  console.log("🚀 Starting Consumer Example");
  console.log(`📡 Brokers: ${config.brokers.join(", ")}`);
  console.log(`📝 Topic: ${TOPIC_NAME}`);
  console.log(`👥 Group ID: ${GROUP_ID}`);
  console.log(`🔄 Auto commit: ${AUTO_COMMIT}`);
  console.log();

  // Create streaming client
  const clientResult = createStreamingClient("confluent", config);
  if (clientResult.tag === "failure") {
    console.error("❌ Failed to create streaming client:", clientResult.error.message);
    process.exit(1);
  }

  const client = clientResult.value;

  // Get consumer instance
  const consumerResult = await client.getConsumer({
    groupId: GROUP_ID,
    autoOffsetReset: "earliest", // Start from beginning if no previous offset
    enableAutoCommit: AUTO_COMMIT,
  });

  if (consumerResult.tag === "failure") {
    console.error("❌ Failed to create consumer:", consumerResult.error.message);
    process.exit(1);
  }

  const consumer = consumerResult.value;
  console.log("✅ Consumer created successfully");

  // Connect consumer
  const connectResult = await consumer.connect();
  match(
    () => console.log("✅ Consumer connected successfully"),
    (error) => {
      console.error("❌ Failed to connect consumer:", error.message);
      process.exit(1);
    },
    connectResult
  );

  // Subscribe to topic
  const subscribeResult = await consumer.subscribe({
    topics: [TOPIC_NAME],
    fromBeginning: true,
  });

  match(
    () => console.log(`✅ Subscribed to topic: ${TOPIC_NAME}`),
    (error) => {
      console.error("❌ Failed to subscribe to topic:", error.message);
      process.exit(1);
    },
    subscribeResult
  );

  // Message processing statistics
  let messageCount = 0;
  let errorCount = 0;
  let lastCommitTime = Date.now();
  const startTime = Date.now();

  // Start consuming messages
  console.log("👂 Starting to consume messages...");
  console.log("   Press Ctrl+C to stop\n");

  const runResult = await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      messageCount++;

      try {
        // Parse message
        const messageValue = message.value?.toString('utf8') || '';
        const messageData = JSON.parse(messageValue);

        // Log message details
        console.log(`📨 Message ${messageCount}:`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Key: ${message.key?.toString() || 'null'}`);
        console.log(`   Timestamp: ${message.timestamp}`);
        console.log(`   Headers: ${JSON.stringify(message.headers || {})}`);
        console.log(`   Data: ${JSON.stringify(messageData, null, 2)}`);

        // Simulate message processing
        await simulateProcessing(messageData);

        // Manual commit every 5 messages if auto-commit is disabled
        if (!AUTO_COMMIT && messageCount % 5 === 0) {
          const commitResult = await consumer.commitOffsets();
          match(
            () => {
              lastCommitTime = Date.now();
              console.log(`   ✅ Committed offsets (${messageCount} messages processed)`);
            },
            (error) => {
              errorCount++;
              console.error(`   ❌ Commit failed: ${error.message}`);
            },
            commitResult
          );
        }

        console.log(`   ⚡ Processing complete\n`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing message ${messageCount}:`, error);
        console.error(`   Topic: ${topic}, Partition: ${partition}, Offset: ${message.offset}\n`);
      }
    },
  });

  match(
    () => console.log("✅ Consumer run completed"),
    (error) => {
      console.error("❌ Consumer run failed:", error.message);
      process.exit(1);
    },
    runResult
  );

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await shutdown(client, consumer, messageCount, errorCount, startTime);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await shutdown(client, consumer, messageCount, errorCount, startTime);
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function simulateProcessing(messageData: any): Promise<void> {
  // Simulate different processing times based on message type
  const processingTime = getProcessingTime(messageData.data?.action || 'unknown');
  await new Promise(resolve => setTimeout(resolve, processingTime));
}

function getProcessingTime(action: string): number {
  // Simulate different processing complexities
  const processingTimes: Record<string, number> = {
    'user_login': 50,
    'user_logout': 20,
    'page_view': 10,
    'button_click': 5,
    'form_submit': 100,
    'search_query': 75,
    'product_view': 30,
    'add_to_cart': 40,
    'purchase': 200, // Complex processing
    'user_signup': 150,
  };

  return processingTimes[action] || 25; // Default processing time
}

async function shutdown(client: any, consumer: any, messageCount: number, errorCount: number, startTime: number) {
  const duration = Date.now() - startTime;
  const messagesPerSecond = messageCount / (duration / 1000);

  console.log('\n📊 Final Statistics:');
  console.log(`   📨 Messages processed: ${messageCount}`);
  console.log(`   ❌ Processing errors: ${errorCount}`);
  console.log(`   ⏱️  Total duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`   📈 Messages per second: ${messagesPerSecond.toFixed(2)}`);
  console.log(`   ✅ Success rate: ${((messageCount - errorCount) / messageCount * 100).toFixed(1)}%`);

  // Final commit if manual commit mode
  if (!AUTO_COMMIT && messageCount > 0) {
    console.log('\n💾 Final offset commit...');
    const commitResult = await consumer.commitOffsets();
    match(
      () => console.log('✅ Final commit successful'),
      (error) => console.error('❌ Final commit failed:', error.message),
      commitResult
    );
  }

  console.log('\n🔌 Disconnecting consumer...');
  const disconnectResult = await consumer.disconnect();
  match(
    () => console.log('✅ Consumer disconnected'),
    (error) => console.error('❌ Consumer disconnect error:', error.message),
    disconnectResult
  );

  console.log('🔌 Disconnecting client...');
  const clientDisconnectResult = await client.disconnect();
  match(
    () => console.log('✅ Client disconnected'),
    (error) => console.error('❌ Client disconnect error:', error.message),
    clientDisconnectResult
  );

  console.log('👋 Consumer example finished');
  process.exit(0);
}

// =============================================================================
// MAIN
// =============================================================================

if (import.meta.main) {
  runConsumer().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}