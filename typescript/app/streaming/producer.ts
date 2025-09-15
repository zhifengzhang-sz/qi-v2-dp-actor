#!/usr/bin/env bun
/**
 * Simple Producer Example
 *
 * Demonstrates how to use @qi/base streaming module to send messages to Kafka/Redpanda.
 * This example shows basic usage patterns, error handling, and graceful shutdown.
 */

import { match } from "@qi/base";
import { createStreamingClient } from "../../lib/base/src/streaming/index.js";
import type { StreamingConfig } from "../../lib/base/src/streaming/types.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const config: StreamingConfig = {
  clientId: "example-producer",
  brokers: [
    process.env.KAFKA_BROKERS || "localhost:9092"
  ],
  connectionTimeout: 3000,
  requestTimeout: 25000,
  retryAttempts: 3,
};

const TOPIC_NAME = process.env.TOPIC_NAME || "example-events";
const MESSAGE_INTERVAL = Number.parseInt(process.env.MESSAGE_INTERVAL || "1000");
const TOTAL_MESSAGES = Number.parseInt(process.env.TOTAL_MESSAGES || "10");

// =============================================================================
// PRODUCER LOGIC
// =============================================================================

async function runProducer() {
  console.log("🚀 Starting Producer Example");
  console.log(`📡 Brokers: ${config.brokers.join(", ")}`);
  console.log(`📝 Topic: ${TOPIC_NAME}`);
  console.log(`⏱️  Interval: ${MESSAGE_INTERVAL}ms`);
  console.log(`📊 Total messages: ${TOTAL_MESSAGES}`);
  console.log();

  // Create streaming client
  const clientResult = createStreamingClient("confluent", config);
  if (clientResult.tag === "failure") {
    console.error("❌ Failed to create streaming client:", clientResult.error.message);
    process.exit(1);
  }

  const client = clientResult.value;

  // Get producer instance
  const producerResult = await client.getProducer({
    maxInFlightRequests: 1,
    idempotent: true,
  });

  if (producerResult.tag === "failure") {
    console.error("❌ Failed to create producer:", producerResult.error.message);
    process.exit(1);
  }

  const producer = producerResult.value;
  console.log("✅ Producer created successfully");

  // Connect producer
  const connectResult = await producer.connect();
  match(
    () => console.log("✅ Producer connected successfully"),
    (error) => {
      console.error("❌ Failed to connect producer:", error.message);
      process.exit(1);
    },
    connectResult
  );

  // Send messages
  let messagesSent = 0;
  let successCount = 0;
  let errorCount = 0;

  const sendInterval = setInterval(async () => {
    if (messagesSent >= TOTAL_MESSAGES) {
      clearInterval(sendInterval);
      await shutdown(client, producer, successCount, errorCount);
      return;
    }

    messagesSent++;
    const messageId = `msg-${messagesSent}-${Date.now()}`;

    const message = {
      key: messageId,
      value: Buffer.from(JSON.stringify({
        id: messageId,
        timestamp: new Date().toISOString(),
        counter: messagesSent,
        data: {
          userId: `user-${Math.floor(Math.random() * 1000)}`,
          action: getRandomAction(),
          metadata: {
            source: "producer-example",
            version: "1.0.0",
          }
        }
      }), 'utf8'),
      headers: {
        'content-type': 'application/json',
        'producer-id': config.clientId,
        'message-version': '1.0',
      }
    };

    console.log(`📤 Sending message ${messagesSent}/${TOTAL_MESSAGES}: ${messageId}`);

    const sendResult = await producer.send(TOPIC_NAME, message);
    match(
      (result) => {
        successCount++;
        console.log(`  ✅ Sent to partition ${result.partition}, offset ${result.offset}`);
      },
      (error) => {
        errorCount++;
        console.error(`  ❌ Send failed: ${error.message}`);
        console.error(`     Error code: ${error.code}`);
      },
      sendResult
    );

  }, MESSAGE_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    clearInterval(sendInterval);
    await shutdown(client, producer, successCount, errorCount);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    clearInterval(sendInterval);
    await shutdown(client, producer, successCount, errorCount);
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRandomAction(): string {
  const actions = [
    'user_login',
    'user_logout',
    'page_view',
    'button_click',
    'form_submit',
    'search_query',
    'product_view',
    'add_to_cart',
    'purchase',
    'user_signup'
  ];
  return actions[Math.floor(Math.random() * actions.length)];
}

async function shutdown(client: any, producer: any, successCount: number, errorCount: number) {
  console.log('\n📊 Final Statistics:');
  console.log(`   ✅ Messages sent successfully: ${successCount}`);
  console.log(`   ❌ Messages failed: ${errorCount}`);
  console.log(`   📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);

  console.log('\n🔌 Disconnecting producer...');
  const disconnectResult = await producer.disconnect();
  match(
    () => console.log('✅ Producer disconnected'),
    (error) => console.error('❌ Producer disconnect error:', error.message),
    disconnectResult
  );

  console.log('🔌 Disconnecting client...');
  const clientDisconnectResult = await client.disconnect();
  match(
    () => console.log('✅ Client disconnected'),
    (error) => console.error('❌ Client disconnect error:', error.message),
    clientDisconnectResult
  );

  console.log('👋 Producer example finished');
  process.exit(0);
}

// =============================================================================
// MAIN
// =============================================================================

if (import.meta.main) {
  runProducer().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}