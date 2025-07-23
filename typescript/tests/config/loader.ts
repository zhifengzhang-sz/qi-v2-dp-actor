/**
 * Test Configuration Loader using @qi/core ConfigBuilder
 * Loads and validates Redpanda test configurations
 */

import { type QiError, type Result, getError, getValue, isFailure, isSuccess } from "@qi/base";
import { ConfigBuilder, type ValidatedConfig } from "@qi/core";

export interface RedpandaTestConfig {
  redpanda: {
    brokers: string[];
    clientId: string;
    connectionTimeout: number;
    requestTimeout: number;
    ssl: boolean;
    retry: {
      initialRetryTime: number;
      retries: number;
    };
    sasl?: {
      mechanism: string;
      username: string;
      password: string;
    };
  };
  topics: Record<
    string,
    {
      name: string;
      partitions: number;
      replicationFactor: number;
      configs: Record<string, string>;
    }
  >;
  timeouts: {
    connection: number;
    operation: number;
    performance: number;
    cleanup: number;
  };
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Load test configuration using @qi/core ConfigBuilder
 */
export async function loadTestConfig(
  environment = "local"
): Promise<Result<RedpandaTestConfig, QiError>> {
  const configFile = `tests/config/redpanda.${environment}.json`;

  // Load base configuration
  const configResult = await ConfigBuilder.fromJsonFile(configFile);

  if (isFailure(configResult)) {
    return configResult;
  }

  // Merge with environment variables
  const mergedConfigResult = configResult.value
    .merge(ConfigBuilder.fromEnv("REDPANDA"))
    .merge(ConfigBuilder.fromEnv("TEST"));

  // Validate with schema and build
  const validatedResult = await mergedConfigResult
    .validateWithSchemaFile("tests/config/redpanda.schema.json")
    .buildValidated();

  if (isFailure(validatedResult)) {
    return validatedResult;
  }

  const config = getValue(validatedResult);

  // Extract and validate the configuration
  try {
    const testConfig: RedpandaTestConfig = {
      redpanda: {
        brokers: config.get("redpanda.brokers"),
        clientId: config.get("redpanda.clientId"),
        connectionTimeout: config.get("redpanda.connectionTimeout"),
        requestTimeout: config.get("redpanda.requestTimeout"),
        ssl: config.getOr("redpanda.ssl", false),
        retry: {
          initialRetryTime: config.get("redpanda.retry.initialRetryTime"),
          retries: config.get("redpanda.retry.retries"),
        },
      },
      topics: config.get("topics"),
      timeouts: {
        connection: config.get("timeouts.connection"),
        operation: config.get("timeouts.operation"),
        performance: config.get("timeouts.performance"),
        cleanup: config.get("timeouts.cleanup"),
      },
      retry: {
        maxAttempts: config.get("retry.maxAttempts"),
        baseDelayMs: config.get("retry.baseDelayMs"),
        maxDelayMs: config.get("retry.maxDelayMs"),
        backoffMultiplier: config.get("retry.backoffMultiplier"),
      },
    };

    // Add SASL config if credentials are provided
    const username = config.getOr("redpanda.sasl.username", process.env.REDPANDA_USERNAME);
    const password = config.getOr("redpanda.sasl.password", process.env.REDPANDA_PASSWORD);

    if (username && password) {
      testConfig.redpanda.sasl = {
        mechanism: config.getOr("redpanda.sasl.mechanism", "scram-sha-256"),
        username,
        password,
      };
    }

    return { tag: "success", value: testConfig };
  } catch (error) {
    return {
      tag: "failure",
      error: {
        code: "TEST_CONFIG_INVALID",
        message: `Invalid test configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "VALIDATION" as const,
        context: { environment, configFile, error: String(error) },
      },
    };
  }
}

/**
 * Load YAML configuration using @qi/core ConfigBuilder
 */
export async function loadYamlTestConfig(): Promise<Result<RedpandaTestConfig, QiError>> {
  const configFile = "tests/config/redpanda.yaml";

  // Load YAML configuration
  const configResult = await ConfigBuilder.fromYamlFile(configFile);

  if (isFailure(configResult)) {
    return configResult;
  }

  // Get current environment
  const environment = process.env.TEST_ENV || "local";

  // Merge environment-specific overrides
  const mergedConfigResult = configResult.value
    .merge(ConfigBuilder.fromEnv("REDPANDA"))
    .merge(ConfigBuilder.fromEnv("TEST"));

  // Build the configuration
  const validatedResult = await mergedConfigResult.buildValidated();

  if (isFailure(validatedResult)) {
    return validatedResult;
  }

  const config = getValue(validatedResult);

  try {
    // Get base configuration
    const baseConfig = {
      redpanda: config.get("redpanda"),
      topics: config.get("topics"),
      timeouts: config.get("timeouts"),
      retry: config.get("retry"),
    };

    // Apply environment-specific overrides if they exist
    const envOverrides = config.getOr(`environments.${environment}`, {});

    // Deep merge environment overrides
    const testConfig: RedpandaTestConfig = {
      redpanda: {
        ...baseConfig.redpanda,
        ...(envOverrides.redpanda || {}),
      },
      topics: baseConfig.topics,
      timeouts: {
        ...baseConfig.timeouts,
        ...(envOverrides.timeouts || {}),
      },
      retry: {
        ...baseConfig.retry,
        ...(envOverrides.retry || {}),
      },
    };

    // Handle SASL configuration with environment variables
    if (testConfig.redpanda.sasl) {
      testConfig.redpanda.sasl.username = testConfig.redpanda.sasl.username.replace(
        "${REDPANDA_USERNAME}",
        process.env.REDPANDA_USERNAME || ""
      );
      testConfig.redpanda.sasl.password = testConfig.redpanda.sasl.password.replace(
        "${REDPANDA_PASSWORD}",
        process.env.REDPANDA_PASSWORD || ""
      );
    }

    return { tag: "success", value: testConfig };
  } catch (error) {
    return {
      tag: "failure",
      error: {
        code: "TEST_CONFIG_YAML_INVALID",
        message: `Invalid YAML test configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "VALIDATION" as const,
        context: { environment, configFile, error: String(error) },
      },
    };
  }
}

/**
 * Get topic configuration by name
 */
export function getTopicConfig(config: RedpandaTestConfig, topicKey: string) {
  return config.topics[topicKey];
}

/**
 * Get Kafka client configuration from test config
 */
export function getKafkaClientConfig(config: RedpandaTestConfig) {
  return {
    clientId: config.redpanda.clientId,
    brokers: config.redpanda.brokers,
    connectionTimeout: config.redpanda.connectionTimeout,
    requestTimeout: config.redpanda.requestTimeout,
    ssl: config.redpanda.ssl,
    sasl: config.redpanda.sasl,
    retry: {
      initialRetryTime: config.redpanda.retry.initialRetryTime,
      retries: config.redpanda.retry.retries,
    },
  };
}
