# Base Streaming Module Architecture

The `lib/base/src/streaming` module provides a low-level, transport-focused abstraction for Kafka/Redpanda streaming operations using @qi/base Result<T> patterns.

## Design Philosophy

### Core Principle: Transport-Only Layer
This module follows the **Unix philosophy** of "do one thing and do it well":
- ✅ **Reliable data transport** over Kafka/Redpanda
- ✅ **Connection lifecycle management**
- ✅ **Error handling** with @qi/base Result<T>
- ❌ **Schema management** (user responsibility)
- ❌ **Business logic** (user responsibility)
- ❌ **Stream processing** (user responsibility)

### Key Characteristics
- **Schema-agnostic**: Works with raw `Buffer` data
- **Transport-focused**: Handles delivery, not content
- **Result-oriented**: All operations return `Result<T, QiError>`
- **Implementation-neutral**: Supports multiple backends via factory pattern

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│              (Schema, Business Logic)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 StreamingClient                         │
│              (Orchestration Layer)                      │
└─────────────┬───────────────────┬───────────────────────┘
              │                   │
┌─────────────▼─────────┐  ┌─────▼───────────────────────┐
│   ConnectorFactory    │  │    Interface Layer         │
│   (Implementation     │  │  IStreamingProducer        │
│    Selection)         │  │  IStreamingConsumer        │
└─────────────┬─────────┘  │  IStreamingAdmin           │
              │            └─────────────────────────────┘
┌─────────────▼─────────────────────────────────────────┐
│              Implementation Layer                      │
│    ConfluentConnector  │  PlatformaticConnector       │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. StreamingClient (Orchestrator)
**Location**: `src/streaming/client.ts`

Main entry point that coordinates all streaming operations.

```typescript
export class StreamingClient implements IStreamingClient {
  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>>;
  async getConsumer(config: ConsumerConfig): Promise<Result<IStreamingConsumer, QiError>>;
  async getAdmin(): Promise<Result<IStreamingAdmin, QiError>>;
  async disconnect(): Promise<Result<void, QiError>>;
  async isHealthy(): Promise<Result<boolean, QiError>>;
}
```

**Responsibilities**:
- Connector initialization via factory
- Client instance caching and reuse
- Graceful disconnection of all clients
- Health check coordination

### 2. Factory Pattern (Implementation Selection)
**Location**: `src/streaming/factories/factory.ts`

Enables runtime selection between streaming implementations.

```typescript
export function createConnector(
  implementation: "confluent" | "platformatic",
  config: StreamingConfig,
  logger?: Logger
): Result<IStreamingConnector, QiError>;
```

**Current implementations**:
- `confluent`: @confluentinc/kafka-javascript (not yet implemented)
- `platformatic`: @platformatic/kafka (not yet implemented)

### 3. Core Interfaces
**Location**: `src/streaming/interfaces/connector.ts`

Defines contracts for all streaming operations.

#### IStreamingProducer
```typescript
interface IStreamingProducer {
  connect(): Promise<Result<void, QiError>>;
  send(topic: string, message: StreamingMessage): Promise<Result<ProduceResult, QiError>>;
  sendBatch(batch: MessageBatch): Promise<Result<BatchProduceResult, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  isConnected(): boolean;
}
```

#### IStreamingConsumer
```typescript
interface IStreamingConsumer {
  connect(): Promise<Result<void, QiError>>;
  subscribe(config: SubscriptionConfig): Promise<Result<void, QiError>>;
  run(config: ConsumerRunConfig): Promise<Result<void, QiError>>;
  commitOffsets(): Promise<Result<void, QiError>>;
  seek(topic: string, partition: number, offset: string): Promise<Result<void, QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  isConnected(): boolean;
}
```

#### IStreamingAdmin
```typescript
interface IStreamingAdmin {
  connect(): Promise<Result<void, QiError>>;
  createTopics(topics: readonly TopicConfig[]): Promise<Result<void, QiError>>;
  deleteTopics(topicNames: readonly string[]): Promise<Result<void, QiError>>;
  listTopics(): Promise<Result<readonly string[], QiError>>;
  getTopicMetadata(topics: readonly string[]): Promise<Result<readonly TopicMetadata[], QiError>>;
  disconnect(): Promise<Result<void, QiError>>;
  isConnected(): boolean;
}
```

### 4. Data Types
**Location**: `src/streaming/types.ts`

#### StreamingMessage (Schema-Agnostic)
```typescript
interface StreamingMessage {
  readonly key?: string;
  readonly value: Buffer;        // Raw bytes - no schema assumptions
  readonly timestamp?: Date;
  readonly partition?: number;
  readonly headers?: Record<string, string>;
}
```

#### Configuration Types
```typescript
interface StreamingConfig {
  readonly clientId: string;
  readonly brokers: readonly string[];
  readonly connectionTimeout?: number;
  readonly requestTimeout?: number;
  readonly retryAttempts?: number;
  readonly security?: {
    readonly mechanism: "plain" | "scram-sha-256" | "scram-sha-512";
    readonly username?: string;
    readonly password?: string;
  };
}
```

## Implementation Details

### Current Implementation (KafkaJS-based)
**Locations**:
- `src/streaming/admin.ts`
- `src/streaming/producer.ts`
- `src/streaming/consumer.ts`

These provide the actual Kafka integration using KafkaJS as the transport layer.

**Key patterns**:
- All operations return `Result<T, QiError>`
- Async/sync separation using `fromAsyncTryCatch` and `fromTryCatch`
- Proper resource cleanup in disconnect methods
- Connection state management

### Excluded Implementations
**Locations**:
- `src/streaming/impl/confluent/connector.ts` (excluded from build)
- `src/streaming/impl/platformatic/connector.ts` (excluded from build)

These are incomplete stubs waiting for actual dependencies to be added.

## Usage Patterns

### Basic Producer Usage
```typescript
import { createStreamingClient } from "@qi/base/streaming";

const client = createStreamingClient("confluent", {
  clientId: "my-app",
  brokers: ["localhost:9092"]
});

const producer = await client.getProducer();
const result = await producer.send("events", {
  key: "user-123",
  value: Buffer.from(JSON.stringify({ action: "login" }), 'utf8')
});

if (result.tag === "success") {
  console.log("Message sent successfully");
}
```

### Basic Consumer Usage
```typescript
const consumer = await client.getConsumer({ groupId: "my-group" });

await consumer.subscribe({ topics: ["events"] });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const data = JSON.parse(message.value.toString('utf8'));
    console.log("Received:", data);
  }
});
```

### Topic Management
```typescript
const admin = await client.getAdmin();
await admin.connect();

// Create topics
await admin.createTopics([{
  topic: "events",
  numPartitions: 3,
  replicationFactor: 1
}]);

// List topics
const topics = await admin.listTopics();
console.log("Available topics:", topics);
```

## Error Handling

All operations follow @qi/base Result<T> patterns:

```typescript
const result = await producer.send(topic, message);

match(
  (produceResult) => {
    console.log(`Message sent to partition ${produceResult.partition}`);
  },
  (error) => {
    console.error(`Send failed: ${error.message}`);
    // error.code provides specific error type
    // error.category provides error category
  },
  result
);
```

## Extension Points

### Adding New Implementations
1. Implement `IStreamingConnector` interface
2. Add to `ConnectorFactory.createConnector()`
3. Update type unions for implementation selection

### Advanced Features (Application Level)
The module intentionally omits advanced features that belong at higher levels:

```typescript
// Application-level schema management
class SchemaAwareProducer {
  constructor(
    private streaming: IStreamingProducer,
    private schemaRegistry: SchemaRegistry
  ) {}

  async sendTyped<T>(topic: string, data: T, schema: Schema) {
    const serialized = await this.schemaRegistry.serialize(data, schema);
    return this.streaming.send(topic, {
      value: Buffer.from(serialized)
    });
  }
}
```

## Quality Standards

- **TypeScript compilation**: Must pass with no errors
- **Test coverage**: Core functionality must be tested
- **Result<T> patterns**: All operations must use @qi/base error handling
- **Resource cleanup**: All clients must properly disconnect
- **Connection management**: State tracking and lifecycle management
- **Build success**: Module must build for distribution

## Future Considerations

### Escape Hatch Pattern
Consider adding access to native clients for advanced features:

```typescript
interface IStreamingConnector {
  // ... existing methods
  getNativeClient(): Promise<Result<unknown, QiError>>;
}
```

This would allow applications to access Confluent/Platformatic-specific features while maintaining clean separation of concerns.