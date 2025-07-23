/**
 * Redpanda Test Configuration
 * Environment-specific settings for integration tests
 */

export interface RedpandaConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout: number;
  requestTimeout: number;
  ssl?: boolean;
  sasl?: {
    mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    username: string;
    password: string;
  };
  retry?: {
    initialRetryTime: number;
    retries: number;
  };
}

export interface TestTopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  configs?: Record<string, string>;
}

/**
 * Local Development Redpanda (docker-compose)
 */
export const LOCAL_REDPANDA: RedpandaConfig = {
  brokers: ["localhost:19092"],
  clientId: "qi-dp-actor-test",
  connectionTimeout: 5000,
  requestTimeout: 10000,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
};

/**
 * CI/CD Environment Redpanda
 */
export const CI_REDPANDA: RedpandaConfig = {
  brokers: ["redpanda:9092"], // Internal docker network
  clientId: "qi-dp-actor-ci-test",
  connectionTimeout: 10000,
  requestTimeout: 15000,
  retry: {
    initialRetryTime: 200,
    retries: 5,
  },
};

/**
 * Production-like Redpanda (with authentication)
 */
export const PROD_LIKE_REDPANDA: RedpandaConfig = {
  brokers: process.env.REDPANDA_BROKERS?.split(",") || ["localhost:19092"],
  clientId: "qi-dp-actor-prod-test",
  connectionTimeout: 8000,
  requestTimeout: 12000,
  ssl: process.env.REDPANDA_SSL === "true",
  sasl: process.env.REDPANDA_USERNAME
    ? {
        mechanism: "scram-sha-256",
        username: process.env.REDPANDA_USERNAME,
        password: process.env.REDPANDA_PASSWORD || "",
      }
    : undefined,
  retry: {
    initialRetryTime: 500,
    retries: 8,
  },
};

/**
 * Test Topic Configurations
 */
export const TEST_TOPICS = {
  INTEGRATION_BASIC: {
    name: "qi-integration-basic",
    partitions: 3,
    replicationFactor: 1,
    configs: {
      "cleanup.policy": "delete",
      "retention.ms": "300000", // 5 minutes
      "segment.ms": "60000", // 1 minute
    },
  } as TestTopicConfig,

  INTEGRATION_BATCH: {
    name: "qi-integration-batch",
    partitions: 6,
    replicationFactor: 1,
    configs: {
      "cleanup.policy": "delete",
      "retention.ms": "600000", // 10 minutes
      "max.message.bytes": "1048576", // 1MB
    },
  } as TestTopicConfig,

  PERFORMANCE_TEST: {
    name: "qi-performance-test",
    partitions: 12,
    replicationFactor: 1,
    configs: {
      "cleanup.policy": "delete",
      "retention.ms": "120000", // 2 minutes
      "segment.ms": "30000", // 30 seconds
      "compression.type": "snappy",
    },
  } as TestTopicConfig,

  ERROR_SIMULATION: {
    name: "qi-error-simulation",
    partitions: 1,
    replicationFactor: 1,
    configs: {
      "cleanup.policy": "delete",
      "retention.ms": "60000", // 1 minute
      "max.message.bytes": "1024", // Very small for testing limits
    },
  } as TestTopicConfig,
};

/**
 * Get Redpanda configuration based on environment
 */
export function getRedpandaConfig(): RedpandaConfig {
  const testEnv = process.env.TEST_ENV;

  switch (testEnv) {
    case "ci":
      return CI_REDPANDA;
    case "prod-like":
      return PROD_LIKE_REDPANDA;
    default:
      return LOCAL_REDPANDA;
  }
}

/**
 * Test timeouts based on environment
 */
export const TEST_TIMEOUTS = {
  CONNECTION: process.env.CI === "true" ? 15000 : 10000,
  OPERATION: process.env.CI === "true" ? 20000 : 15000,
  PERFORMANCE: process.env.CI === "true" ? 60000 : 30000,
  CLEANUP: process.env.CI === "true" ? 30000 : 15000,
};

/**
 * Retry configuration for flaky network operations
 */
export const RETRY_CONFIG = {
  maxAttempts: process.env.CI === "true" ? 5 : 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
};
