/**
 * StreamingAdmin - Kafka/Redpanda admin operations implementation
 *
 * Implements topic and cluster administration with @qi/base Result<T> patterns
 * and @qi/core infrastructure integration for proper observability and error handling.
 */

import { Err, Ok, type Result, create, flatMap, fromAsyncTryCatch, match } from "@qi/base";
import type { QiError } from "@qi/base";
import type { Logger } from "@qi/core";
import { type Admin, type ITopicConfig, ITopicMetadata, type Kafka } from "kafkajs";
import type {
  IStreamingAdmin,
  StreamingConfig,
  StreamingErrorCode,
  StreamingErrorContext,
  TopicConfig,
  TopicMetadata,
} from "./types.js";

export class StreamingAdmin implements IStreamingAdmin {
  private admin: Admin | null = null;
  private connected = false;
  private readonly operationLogger: Logger;

  constructor(
    private readonly kafka: Kafka,
    private readonly streamingConfig: StreamingConfig,
    private readonly logger: Logger
  ) {
    this.operationLogger = this.logger.child({
      component: "StreamingAdmin",
      clientId: this.streamingConfig.clientId,
    });
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  async connect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "connect" });

    if (this.connected) {
      opLogger.debug("Admin client already connected");
      return Ok(undefined);
    }

    opLogger.info("Connecting admin client", {
      brokers: this.streamingConfig.brokers,
    });

    // Step 1: Create admin instance (sync operation)
    const instanceResult = this.createAdminInstance();
    if (instanceResult.tag === "failure") {
      return instanceResult;
    }

    // Step 2: Connect using fromAsyncTryCatch for the async operation
    return fromAsyncTryCatch(
      async () => {
        await this.admin?.connect();
        this.connected = true;
        opLogger.info("Admin client connected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_CONNECTION_FAILED",
          `Failed to connect admin client: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "connect", error: String(error) }
        );

        opLogger.error("Admin client connection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });

        return qiError;
      }
    );
  }

  async disconnect(): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({ operation: "disconnect" });

    if (!this.connected || !this.admin) {
      opLogger.debug("Admin client already disconnected");
      return Ok(undefined);
    }

    opLogger.info("Disconnecting admin client");

    return fromAsyncTryCatch(
      async () => {
        await this.admin?.disconnect();
        this.admin = null;
        this.connected = false;

        opLogger.info("Admin client disconnected successfully");
        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_DISCONNECTION_FAILED",
          `Failed to disconnect admin client: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "disconnect", error: String(error) }
        );

        opLogger.error("Admin client disconnection failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  isConnected(): boolean {
    return this.connected && this.admin !== null;
  }

  // ===========================================================================
  // TOPIC MANAGEMENT
  // ===========================================================================

  async createTopics(topics: readonly TopicConfig[]): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "createTopics",
      topicCount: topics.length,
      topicNames: topics.map((t) => t.topic),
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        "Admin client not connected",
        { operation: "createTopics", topics: topics.map((t) => t.topic) }
      );
      opLogger.error("Create topics failed - admin not connected", new Error(error.message));
      return Err(error);
    }

    // Step 1: Validate topic configs (sync operation)
    const configsResult = this.validateTopicConfigs(topics);
    if (configsResult.tag === "failure") {
      return configsResult;
    }

    const validatedTopics = configsResult.value;

    // Step 2: Create topics using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.info("Creating topics", {
          topics: validatedTopics.map((t: TopicConfig) => ({
            name: t.topic,
            partitions: t.numPartitions,
            replicationFactor: t.replicationFactor,
          })),
        });

        const kafkaTopics: ITopicConfig[] = validatedTopics.map((topic: TopicConfig) => ({
          topic: topic.topic,
          numPartitions: topic.numPartitions ?? 1,
          replicationFactor: topic.replicationFactor ?? 1,
          ...(topic.configEntries && {
            configEntries: topic.configEntries.map((entry: { name: string; value: string }) => ({
              name: entry.name,
              value: entry.value,
            })),
          }),
        }));

        await this.admin?.createTopics({
          topics: kafkaTopics,
          waitForLeaders: true,
        });

        opLogger.info("Topics created successfully");

        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_TOPIC_CREATE_FAILED",
          `Failed to create topics: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "createTopics", topics: topics.map((t) => t.topic), error: String(error) }
        );

        opLogger.error("Topic creation failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  async deleteTopics(topicNames: readonly string[]): Promise<Result<void, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "deleteTopics",
      topicCount: topicNames.length,
      topicNames,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        "Admin client not connected",
        { operation: "deleteTopics", topics: topicNames }
      );
      opLogger.error("Delete topics failed - admin not connected", new Error(error.message));
      return Err(error);
    }

    // Step 1: Validate topic names (sync operation)
    const namesResult = this.validateTopicNames(topicNames);
    if (namesResult.tag === "failure") {
      return namesResult;
    }

    const validatedNames = namesResult.value;

    // Step 2: Delete topics using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.info("Deleting topics");

        await this.admin?.deleteTopics({
          topics: [...validatedNames],
        });

        opLogger.info("Topics deleted successfully");

        return undefined;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_TOPIC_DELETE_FAILED",
          `Failed to delete topics: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "deleteTopics", topics: topicNames, error: String(error) }
        );

        opLogger.error("Topic deletion failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  async listTopics(): Promise<Result<readonly string[], QiError>> {
    const opLogger = this.operationLogger.child({ operation: "listTopics" });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        "Admin client not connected",
        { operation: "listTopics" }
      );
      opLogger.error("List topics failed - admin not connected", new Error(error.message));
      return Err(error);
    }

    opLogger.debug("Listing topics");

    return fromAsyncTryCatch(
      async () => {
        const topics = await this.admin?.listTopics();
        if (!topics) {
          // Return empty array as valid result rather than throwing
          opLogger.warn("List topics returned undefined, treating as empty list");
          return [];
        }

        opLogger.debug("Topics listed successfully", {
          topicCount: topics.length,
          topicNames: topics,
        });

        return topics;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_METADATA_FAILED",
          `Failed to list topics: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "listTopics", error: String(error) }
        );

        opLogger.error("Topic listing failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  async getTopicMetadata(
    topics: readonly string[]
  ): Promise<Result<readonly TopicMetadata[], QiError>> {
    const opLogger = this.operationLogger.child({
      operation: "getTopicMetadata",
      topicCount: topics.length,
      topicNames: topics,
    });

    if (!this.isConnected()) {
      const error = this.createStreamingError(
        "STREAMING_ADMIN_FAILED",
        "Admin client not connected",
        { operation: "getTopicMetadata", topics }
      );
      opLogger.error("Get topic metadata failed - admin not connected", new Error(error.message));
      return Err(error);
    }

    // Step 1: Validate topic names (sync operation)
    const topicsResult = this.validateTopicNamesForMetadata(topics);
    if (topicsResult.tag === "failure") {
      return topicsResult;
    }

    const validatedTopics = topicsResult.value;

    // Step 2: Fetch metadata using fromAsyncTryCatch
    return fromAsyncTryCatch(
      async () => {
        opLogger.debug("Fetching topic metadata");

        const metadata = await this.admin?.fetchTopicMetadata({
          topics: [...validatedTopics],
        });
        if (!metadata) {
          // Return empty metadata as valid result rather than throwing
          opLogger.warn("Fetch topic metadata returned undefined, treating as empty metadata");
          return [];
        }

        const topicMetadata: TopicMetadata[] = metadata.topics.map((topic) => ({
          name: topic.name,
          partitions: topic.partitions.map((partition) => ({
            partitionId: partition.partitionId,
            leader: partition.leader,
            replicas: partition.replicas,
            isr: partition.isr,
          })),
        }));

        opLogger.debug("Topic metadata fetched successfully", {
          topicCount: topicMetadata.length,
          totalPartitions: topicMetadata.reduce((sum, topic) => sum + topic.partitions.length, 0),
        });

        return topicMetadata;
      },
      (error) => {
        const qiError = this.createStreamingError(
          "STREAMING_METADATA_FAILED",
          `Failed to fetch topic metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "getTopicMetadata", topics, error: String(error) }
        );

        opLogger.error("Topic metadata fetch failed", undefined, {
          errorCode: qiError.code,
          errorCategory: qiError.category,
          errorMessage: qiError.message,
        });
        return qiError;
      }
    );
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createAdminInstance(): Result<void, QiError> {
    try {
      this.admin = this.kafka.admin();
      return Ok(undefined);
    } catch (error) {
      return Err(
        this.createStreamingError(
          "STREAMING_CONNECTION_FAILED",
          `Failed to create admin instance: ${error instanceof Error ? error.message : "Unknown error"}`,
          { operation: "createAdminInstance", error: String(error) }
        )
      );
    }
  }

  private validateTopicConfigs(
    topics: readonly TopicConfig[]
  ): Result<readonly TopicConfig[], QiError> {
    if (!topics || topics.length === 0) {
      return Err(
        this.createStreamingError("STREAMING_TOPIC_CREATE_FAILED", "Topic list cannot be empty", {
          operation: "validateTopicConfigs",
        })
      );
    }

    const invalidTopics = topics.filter((topic) => !topic.topic || topic.topic.trim().length === 0);
    if (invalidTopics.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_TOPIC_CREATE_FAILED",
          "All topic names must be non-empty strings",
          { operation: "validateTopicConfigs", invalidTopics: invalidTopics.length }
        )
      );
    }

    const invalidPartitions = topics.filter(
      (topic) => topic.numPartitions !== undefined && topic.numPartitions < 1
    );
    if (invalidPartitions.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_TOPIC_CREATE_FAILED",
          "Number of partitions must be at least 1",
          {
            operation: "validateTopicConfigs",
            invalidPartitions: invalidPartitions.map((t) => t.topic),
          }
        )
      );
    }

    const invalidReplication = topics.filter(
      (topic) => topic.replicationFactor !== undefined && topic.replicationFactor < 1
    );
    if (invalidReplication.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_TOPIC_CREATE_FAILED",
          "Replication factor must be at least 1",
          {
            operation: "validateTopicConfigs",
            invalidReplication: invalidReplication.map((t) => t.topic),
          }
        )
      );
    }

    return Ok(topics);
  }

  private validateTopicNames(topicNames: readonly string[]): Result<readonly string[], QiError> {
    if (!topicNames || topicNames.length === 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_TOPIC_DELETE_FAILED",
          "Topic name list cannot be empty",
          {
            operation: "validateTopicNames",
          }
        )
      );
    }

    const invalidNames = topicNames.filter((name) => !name || name.trim().length === 0);
    if (invalidNames.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_TOPIC_DELETE_FAILED",
          "All topic names must be non-empty strings",
          { operation: "validateTopicNames", invalidNames }
        )
      );
    }

    return Ok(topicNames);
  }

  private validateTopicNamesForMetadata(
    topicNames: readonly string[]
  ): Result<readonly string[], QiError> {
    if (!topicNames || topicNames.length === 0) {
      return Err(
        this.createStreamingError("STREAMING_METADATA_FAILED", "Topic name list cannot be empty", {
          operation: "validateTopicNamesForMetadata",
        })
      );
    }

    const invalidNames = topicNames.filter((name) => !name || name.trim().length === 0);
    if (invalidNames.length > 0) {
      return Err(
        this.createStreamingError(
          "STREAMING_METADATA_FAILED",
          "All topic names must be non-empty strings",
          { operation: "validateTopicNamesForMetadata", invalidNames }
        )
      );
    }

    return Ok(topicNames);
  }

  private createStreamingError(
    code: StreamingErrorCode,
    message: string,
    context: Partial<StreamingErrorContext> = {}
  ): QiError {
    return create(code, message, "SYSTEM", {
      component: "StreamingAdmin",
      clientId: this.streamingConfig.clientId,
      brokers: this.streamingConfig.brokers,
      timestamp: Date.now(),
      ...context,
    });
  }
}
