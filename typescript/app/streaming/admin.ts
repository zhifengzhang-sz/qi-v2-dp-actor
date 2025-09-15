#!/usr/bin/env bun
/**
 * Simple Admin Example
 *
 * Demonstrates how to use @qi/base streaming module for topic management.
 * This example shows topic creation, listing, and metadata operations.
 */

import { match } from "@qi/base";
import { createStreamingClient } from "../../lib/base/src/streaming/index.js";
import type { StreamingConfig, TopicConfig } from "../../lib/base/src/streaming/types.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const config: StreamingConfig = {
  clientId: "example-admin",
  brokers: [
    process.env.KAFKA_BROKERS || "localhost:9092"
  ],
  connectionTimeout: 3000,
  requestTimeout: 25000,
  retryAttempts: 3,
};

const TOPIC_NAME = process.env.TOPIC_NAME || "example-events";

// =============================================================================
// ADMIN LOGIC
// =============================================================================

async function runAdmin() {
  console.log("🚀 Starting Admin Example");
  console.log(`📡 Brokers: ${config.brokers.join(", ")}`);
  console.log(`📝 Topic: ${TOPIC_NAME}`);
  console.log();

  // Create streaming client
  const clientResult = createStreamingClient("confluent", config);
  if (clientResult.tag === "failure") {
    console.error("❌ Failed to create streaming client:", clientResult.error.message);
    process.exit(1);
  }

  const client = clientResult.value;

  // Get admin instance
  const adminResult = await client.getAdmin();
  if (adminResult.tag === "failure") {
    console.error("❌ Failed to create admin:", adminResult.error.message);
    process.exit(1);
  }

  const admin = adminResult.value;
  console.log("✅ Admin created successfully");

  // Connect admin
  const connectResult = await admin.connect();
  match(
    () => console.log("✅ Admin connected successfully"),
    (error) => {
      console.error("❌ Failed to connect admin:", error.message);
      process.exit(1);
    },
    connectResult
  );

  try {
    // List existing topics
    console.log("\n📋 Listing existing topics...");
    await listTopics(admin);

    // Check if our topic exists
    console.log(`\n🔍 Checking if topic '${TOPIC_NAME}' exists...`);
    const topicExists = await checkTopicExists(admin, TOPIC_NAME);

    if (!topicExists) {
      // Create the topic
      console.log(`\n➕ Creating topic '${TOPIC_NAME}'...`);
      await createExampleTopic(admin, TOPIC_NAME);

      // Wait a moment for topic creation to propagate
      console.log("⏳ Waiting for topic creation to propagate...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      // List topics again to confirm creation
      console.log("\n📋 Listing topics after creation...");
      await listTopics(admin);
    } else {
      console.log(`✅ Topic '${TOPIC_NAME}' already exists`);
    }

    // Get topic metadata
    console.log(`\n🔍 Getting metadata for topic '${TOPIC_NAME}'...`);
    await getTopicMetadata(admin, TOPIC_NAME);

    // Demonstrate cleanup (optional)
    if (process.env.CLEANUP_TOPIC === "true") {
      console.log(`\n🗑️  Cleaning up - deleting topic '${TOPIC_NAME}'...`);
      await deleteTopic(admin, TOPIC_NAME);

      console.log("\n📋 Final topic list:");
      await listTopics(admin);
    }

  } finally {
    // Always disconnect
    console.log("\n🔌 Disconnecting admin...");
    const disconnectResult = await admin.disconnect();
    match(
      () => console.log("✅ Admin disconnected"),
      (error) => console.error("❌ Admin disconnect error:", error.message),
      disconnectResult
    );

    console.log("🔌 Disconnecting client...");
    const clientDisconnectResult = await client.disconnect();
    match(
      () => console.log("✅ Client disconnected"),
      (error) => console.error("❌ Client disconnect error:", error.message),
      clientDisconnectResult
    );
  }

  console.log("\n👋 Admin example finished");
}

// =============================================================================
// ADMIN OPERATIONS
// =============================================================================

async function listTopics(admin: any): Promise<void> {
  const listResult = await admin.listTopics();
  match(
    (topics: readonly string[]) => {
      console.log(`✅ Found ${topics.length} topics:`);
      topics.forEach((topic, index) => {
        const marker = topic.startsWith('_') ? '🔧' : '📝'; // System vs user topics
        console.log(`   ${marker} ${index + 1}. ${topic}`);
      });
      if (topics.length === 0) {
        console.log("   (No topics found)");
      }
    },
    (error) => {
      console.error("❌ Failed to list topics:", error.message);
      console.error(`   Error code: ${error.code}`);
    },
    listResult
  );
}

async function checkTopicExists(admin: any, topicName: string): Promise<boolean> {
  const listResult = await admin.listTopics();
  return match(
    (topics: readonly string[]) => topics.includes(topicName),
    () => false,
    listResult
  );
}

async function createExampleTopic(admin: any, topicName: string): Promise<void> {
  const topicConfig: TopicConfig = {
    topic: topicName,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '604800000' }, // 7 days
      { name: 'compression.type', value: 'snappy' },
      { name: 'max.message.bytes', value: '1000000' }, // 1MB
    ]
  };

  const createResult = await admin.createTopics([topicConfig]);
  match(
    () => {
      console.log(`✅ Topic '${topicName}' created successfully`);
      console.log(`   Partitions: ${topicConfig.numPartitions}`);
      console.log(`   Replication Factor: ${topicConfig.replicationFactor}`);
      console.log(`   Configuration entries: ${topicConfig.configEntries?.length || 0}`);
    },
    (error) => {
      console.error(`❌ Failed to create topic '${topicName}':`, error.message);
      console.error(`   Error code: ${error.code}`);
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Topic '${topicName}' already exists, continuing...`);
      }
    },
    createResult
  );
}

async function getTopicMetadata(admin: any, topicName: string): Promise<void> {
  const metadataResult = await admin.getTopicMetadata([topicName]);
  match(
    (metadata: any[]) => {
      console.log(`✅ Metadata for topic '${topicName}':`);
      metadata.forEach((topicMeta) => {
        console.log(`   📝 Topic: ${topicMeta.name}`);
        console.log(`   🔢 Partitions: ${topicMeta.partitions.length}`);

        topicMeta.partitions.forEach((partition: any) => {
          console.log(`      Partition ${partition.partitionId}:`);
          console.log(`        👑 Leader: ${partition.leader}`);
          console.log(`        📋 Replicas: [${partition.replicas.join(', ')}]`);
          console.log(`        ✅ In-Sync Replicas: [${partition.isr.join(', ')}]`);
        });
      });
    },
    (error) => {
      console.error(`❌ Failed to get metadata for topic '${topicName}':`, error.message);
      console.error(`   Error code: ${error.code}`);
    },
    metadataResult
  );
}

async function deleteTopic(admin: any, topicName: string): Promise<void> {
  const deleteResult = await admin.deleteTopics([topicName]);
  match(
    () => {
      console.log(`✅ Topic '${topicName}' deleted successfully`);
    },
    (error) => {
      console.error(`❌ Failed to delete topic '${topicName}':`, error.message);
      console.error(`   Error code: ${error.code}`);
    },
    deleteResult
  );
}

// =============================================================================
// MAIN
// =============================================================================

if (import.meta.main) {
  runAdmin().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}