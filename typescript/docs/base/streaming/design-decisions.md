# Streaming Module Design Decisions

This document captures key architectural decisions made during the development of the base streaming module.

## 1. Transport-Only Layer Design

**Decision**: Keep the module focused solely on data transport, excluding schema management, business logic, and stream processing.

**Rationale**:
- **Single Responsibility**: Each layer should have one clear purpose
- **Reusability**: Schema-agnostic transport can be used for any data format
- **Testability**: Fewer concerns make the module easier to test
- **Performance**: No unnecessary overhead from unused features
- **Flexibility**: Users can choose their own schema/processing strategies

**Alternatives Considered**:
- Full-featured streaming framework (rejected: too complex)
- Schema Registry integration (rejected: belongs at application level)
- Built-in stream processing (rejected: violates SRP)

## 2. Factory Pattern for Implementation Selection

**Decision**: Use factory pattern to enable runtime selection between Confluent and Platformatic implementations.

**Rationale**:
- **Runtime flexibility**: Can switch implementations without code changes
- **Testing**: Easy to mock different implementations
- **Gradual migration**: Can migrate between implementations incrementally
- **Vendor neutrality**: Not locked into specific streaming provider

**Implementation**:
```typescript
const client = createStreamingClient("confluent", config);
// vs
const client = createStreamingClient("platformatic", config);
```

**Alternatives Considered**:
- Compile-time selection (rejected: less flexible)
- Multiple separate modules (rejected: code duplication)
- Plugin architecture (rejected: unnecessary complexity)

## 3. Result<T> Pattern for All Operations

**Decision**: All operations return `Result<T, QiError>` following @qi/base patterns.

**Rationale**:
- **Explicit error handling**: Forces developers to handle errors
- **Type safety**: Compiler ensures error cases are considered
- **Consistency**: Matches other @qi modules
- **Composability**: Results can be chained and transformed
- **No exceptions**: Predictable control flow

**Example**:
```typescript
const result = await producer.send(topic, message);
if (result.tag === "failure") {
  // Handle error with full context
  console.error(result.error.message);
}
```

**Alternatives Considered**:
- Exception-based error handling (rejected: unpredictable)
- Error callbacks (rejected: callback hell)
- Promise rejection (rejected: harder to compose)

## 4. Raw Buffer for Message Values

**Decision**: Use `Buffer` type for message values rather than typed objects.

**Rationale**:
- **Schema independence**: Works with any serialization format
- **Performance**: No automatic serialization/deserialization overhead
- **Flexibility**: Users choose JSON, Avro, Protobuf, or custom formats
- **Simplicity**: Clear separation between transport and serialization

**Example**:
```typescript
interface StreamingMessage {
  readonly value: Buffer;  // Raw bytes
  readonly key?: string;   // Simple string key
}
```

**Alternatives Considered**:
- Generic `StreamingMessage<T>` (rejected: adds complexity)
- JSON-only messages (rejected: too restrictive)
- Auto-serialization (rejected: performance and flexibility concerns)

## 5. Async/Sync Operation Separation

**Decision**: Use `fromAsyncTryCatch` for async operations and `fromTryCatch` for sync validation.

**Rationale**:
- **Clear separation**: Sync validation separate from async I/O
- **Performance**: Validate inputs before expensive operations
- **Error context**: Better error messages for validation vs I/O failures
- **Composability**: Easier to test and debug

**Pattern**:
```typescript
async sendMessage(message: StreamingMessage): Promise<Result<void, QiError>> {
  // Step 1: Sync validation
  const validated = this.validateMessage(message);
  if (isFailure(validated)) {
    return Promise.resolve(validated);
  }

  // Step 2: Async operation
  return fromAsyncTryCatch(
    async () => { /* I/O operation */ },
    (error) => this.createError("SEND_FAILED", error.message)
  );
}
```

**Alternatives Considered**:
- Combined async validation (rejected: harder to debug)
- Exception-based validation (rejected: inconsistent with Result<T>)

## 6. Connection State Management

**Decision**: Track connection state explicitly and validate before operations.

**Rationale**:
- **Fail fast**: Catch connection issues before attempting operations
- **Resource management**: Prevent resource leaks
- **User experience**: Clear error messages for disconnected clients
- **Debugging**: Easier to diagnose connection issues

**Implementation**:
```typescript
class StreamingProducer {
  private connected = false;

  async send(topic: string, message: StreamingMessage): Promise<Result<ProduceResult, QiError>> {
    if (!this.isConnected()) {
      return Err(this.createError("PRODUCER_NOT_CONNECTED", "Producer not connected"));
    }
    // ... operation
  }
}
```

**Alternatives Considered**:
- Automatic reconnection (rejected: adds complexity and unpredictability)
- Lazy connection (rejected: harder to handle failures)

## 7. Client Instance Caching

**Decision**: Cache producer and consumer instances by configuration.

**Rationale**:
- **Resource efficiency**: Avoid creating duplicate connections
- **Performance**: Reuse established connections
- **Consistency**: Same configuration = same instance
- **Resource limits**: Respect broker connection limits

**Implementation**:
```typescript
class StreamingClient {
  private producers = new Map<string, IStreamingProducer>();

  async getProducer(config?: ProducerConfig): Promise<Result<IStreamingProducer, QiError>> {
    const key = JSON.stringify(config || {});
    if (this.producers.has(key)) {
      return Ok(this.producers.get(key)!);
    }
    // Create new instance and cache
  }
}
```

**Alternatives Considered**:
- No caching (rejected: inefficient)
- Global connection pooling (rejected: too complex)
- Time-based expiration (rejected: unnecessary complexity)

## 8. KafkaJS as Primary Implementation

**Decision**: Use KafkaJS as the initial/primary Kafka implementation.

**Rationale**:
- **Maturity**: Well-established Node.js Kafka client
- **Community**: Large community and good documentation
- **Features**: Supports all basic Kafka operations needed
- **TypeScript support**: Good TypeScript definitions
- **Maintenance**: Actively maintained

**Future considerations**:
- Confluent's official JavaScript client when mature
- Platformatic Kafka integration when available

## 9. Configuration Schema Design

**Decision**: Use simple, flat configuration objects without complex validation schemas.

**Rationale**:
- **Simplicity**: Easy to understand and use
- **Flexibility**: Easy to extend without breaking changes
- **Performance**: No runtime schema validation overhead
- **TypeScript**: Compile-time validation through interfaces

**Example**:
```typescript
interface StreamingConfig {
  readonly clientId: string;
  readonly brokers: readonly string[];
  readonly connectionTimeout?: number;
  // Simple, typed properties
}
```

**Alternatives Considered**:
- Zod schema validation (rejected: runtime overhead)
- Complex nested configuration (rejected: harder to use)
- Environment variable injection (rejected: belongs at app level)

## 10. Error Code Categorization

**Decision**: Use specific error codes with consistent naming patterns.

**Rationale**:
- **Debugging**: Easy to identify specific failure types
- **Monitoring**: Can alert on specific error patterns
- **Recovery**: Different errors may need different recovery strategies
- **Consistency**: Predictable error code format

**Pattern**:
```typescript
type StreamingErrorCode =
  | "STREAMING_CONNECTION_FAILED"
  | "STREAMING_PRODUCER_FAILED"
  | "STREAMING_CONSUMER_FAILED"
  | "STREAMING_ADMIN_FAILED";
```

**Alternatives Considered**:
- Generic error messages (rejected: harder to debug)
- HTTP-style numeric codes (rejected: less descriptive)
- Hierarchical error codes (rejected: unnecessary complexity)