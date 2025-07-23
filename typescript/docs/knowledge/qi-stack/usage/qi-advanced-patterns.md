# @qi/base & @qi/core Advanced Patterns

## Pro-Level Implementation Insights

This document captures advanced patterns discovered during real production implementation, going beyond basic API usage to architectural decision-making and complex integration scenarios.

## Advanced Pattern 1: fromAsyncTryCatch Architecture

### The Anti-Pattern Recognition

**Common Anti-Pattern**: Mixing async/await with flatMap
```typescript
// ❌ ANTI-PATTERN: Creates nested Promise<Result> complexity
return flatMap(
  async (validatedMessage) => {
    try {
      const result = await someAsyncOperation(validatedMessage);
      return success(result);
    } catch (error) {
      return failure(createError(error));
    }
  },
  validateMessage(message)
);
```

**Problems**:
- Type becomes `Result<Promise<Result<T>>>`
- Error handling is split between async/await and Result patterns
- Composition chains become difficult to reason about

### The Pro Pattern: Systematic fromAsyncTryCatch

```typescript
// ✅ PRO PATTERN: Clean separation of sync validation and async operations
async function publishMessage(message: StreamingMessage): Promise<Result<ProduceResult, QiError>> {
  // Step 1: Sync validation (pure Result composition)
  const messageResult = validateMessage(message);
  if (messageResult.tag === 'failure') {
    return messageResult;
  }
  
  // Step 2: Async operation with fromAsyncTryCatch
  return fromAsyncTryCatch(
    async () => {
      // Pure async code - no Result handling here
      const kafkaResult = await producer.send(messageResult.value);
      return new ProduceResult(kafkaResult);
    },
    (error) => {
      // Transform any error to QiError with proper context
      return create(
        'PUBLISH_FAILED',
        `Failed to publish message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SYSTEM',
        { operation: 'publishMessage', error: String(error) }
      );
    }
  );
}
```

### Architecture Decision Framework

**When to use fromAsyncTryCatch**:
1. **Clean async boundary** - Separate sync validation from async operations
2. **External system integration** - Database, APIs, file system, message queues
3. **Error transformation** - Converting library errors to domain QiError types

**When NOT to use fromAsyncTryCatch**:
1. **Sync-only operations** - Use regular flatMap composition
2. **Already-wrapped Results** - When the async function returns `Promise<Result<T>>`

## Advanced Pattern 2: Logger API Production Patterns

### The Discovery: Working Examples Trump Documentation

**What the documentation suggested**:
```typescript
// Documentation showed mixed patterns
logger.error('message', context);           // 2-arg
logger.error('message', error, context);    // 3-arg
```

**What actually works in production**:
```typescript
// ✅ VERIFIED: Logger always uses 2-argument API
logger.info('Operation completed', { context: 'data' });
logger.error('Operation failed', { message: error.message, context: 'data' });

// ❌ WRONG: 3-argument format doesn't exist in actual implementation
logger.error('Operation failed', error, { context: 'data' });
```

### Pro Pattern: Structured Logging with Context Accumulation

```typescript
// ✅ PRO PATTERN: Build contextual loggers through composition
class StreamingProducer {
  private readonly operationLogger: Logger;

  constructor(private logger: Logger) {
    // Build base context
    this.operationLogger = logger.child({
      component: 'StreamingProducer',
      clientId: this.config.clientId,
    });
  }

  async send(message: StreamingMessage): Promise<Result<ProduceResult, QiError>> {
    // Build operation-specific context
    const opLogger = this.operationLogger.child({
      operation: 'send',
      messageKey: message.key,
    });

    return fromAsyncTryCatch(
      async () => {
        opLogger.debug('Sending message', {
          messageSize: message.value.length,
          hasKey: !!message.key,
        });
        
        const result = await this.producer.send(message);
        
        opLogger.info('Message sent successfully', {
          partition: result.partition,
          offset: result.offset,
        });
        
        return result;
      },
      (error) => {
        // ✅ PRO TIP: Logger context, not Error objects
        opLogger.error('Send operation failed', {
          message: error.message,
          messageKey: message.key,
        });
        
        return create('SEND_FAILED', error.message, 'SYSTEM', {
          operation: 'send',
          messageKey: message.key,
        });
      }
    );
  }
}
```

### Architecture Decision: Child Loggers vs Context Objects

**Use child loggers for**:
- Component-level context (persists across operations)
- Operation-level context (spans multiple log calls)
- Request/transaction context

**Use context objects for**:
- Call-specific data (changes every log call)
- Dynamic runtime values
- Error details

## Advanced Pattern 3: TypeScript exactOptionalPropertyTypes Integration

### The Constraint: Ultra-Strict Type Safety

With `exactOptionalPropertyTypes: true`, TypeScript enforces that optional properties cannot be `undefined` unless explicitly typed as such.

**The Problem**:
```typescript
// ❌ FAILS with exactOptionalPropertyTypes
process.env.SOME_VAR || 'default'  // env vars might be undefined

// ❌ FAILS: partition might be undefined but Message requires number|undefined
message: {
  partition: msg.partition,  // Type error!
}
```

### Pro Pattern: Defensive Optional Property Handling

```typescript
// ✅ PRO PATTERN: Use conditional property spreading
const kafkaMessage = {
  key: message.key || null,
  value: message.value,
  // Only include partition if it's actually defined
  ...(message.partition !== undefined && { partition: message.partition }),
  // Only include timestamp if it exists  
  ...(message.timestamp && { timestamp: message.timestamp.getTime().toString() }),
  headers: message.headers || {},
};
```

### Environment Variable Pro Pattern

```typescript
// ✅ PRO PATTERN: Handle TypeScript strict property access
const config = {
  streaming: {
    // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature
    clientId: process.env['STREAMING_CLIENTID'] || 'default-client',
    // biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript noPropertyAccessFromIndexSignature  
    brokers: (process.env['STREAMING_BROKERS'] || 'localhost:9092').split(','),
  }
};
```

**Why bracket notation?**:
- `noPropertyAccessFromIndexSignature: true` requires bracket notation for dynamic property access
- Environment variables are dynamic properties on the process.env object
- Linter can be safely ignored when TypeScript configuration requires this pattern

## Advanced Pattern 4: Optional Chaining with Result Composition

### The Challenge: Balancing Safety and Functionality

When refactoring non-null assertions to optional chaining, you must maintain Result composition patterns.

**The Problem**:
```typescript
// Before: Unsafe but functional
await this.producer!.send(record);

// Naive fix: Safe but breaks composition  
const result = await this.producer?.send(record);  // result might be undefined
return success(result);  // ❌ Type error: undefined not assignable
```

### Pro Pattern: Explicit Null Checks with Meaningful Errors

```typescript
// ✅ PRO PATTERN: Check for null state with domain-appropriate errors
return fromAsyncTryCatch(
  async () => {
    const result = await this.producer?.send(record);
    if (!result || result.length === 0) {
      throw new Error('Send operation failed - no result returned');
    }
    
    const metadata = result[0];
    if (!metadata) {
      throw new Error('Send operation failed - no metadata returned');
    }
    
    return new ProduceResult(metadata);
  },
  (error) => create('SEND_FAILED', error.message, 'SYSTEM', { operation: 'send' })
);
```

**Why not just `this.producer!`?**:
- Non-null assertions hide potential runtime errors
- Optional chaining with explicit checks provides better error messages
- Failed state checks become part of the error handling strategy

## Advanced Pattern 5: Cache Integration Architecture

### The Discovery: Cache Returns Values Directly

**What the documentation implied**:
```typescript
// Implied pattern: cache operations return Results
const cacheResult = cache.get(key);
if (cacheResult.tag === 'failure') // ...
```

**What actually works**:
```typescript
// ✅ VERIFIED: Cache operations return values directly, no Result wrapper
const cache = createMemoryCache({ maxSize: 1000, defaultTtl: 300 });
const cachedValue = await cache.get(key);  // T | undefined, not Result<T>
```

### Pro Pattern: Cache-Aside with Result Composition

```typescript
// ✅ PRO PATTERN: Integrate cache directly into Result composition
async function getCachedMarketData(context: DataContext): Promise<Result<MarketData, QiError>> {
  const cacheKey = `price:${context.exchange}:${context.symbol}`;
  
  // Step 1: Try cache (direct value, not Result)
  const cached = await this.cache.get(cacheKey);
  if (cached) {
    this.logger.info('Cache hit', { 
      cacheKey,
      age: Date.now() - cached.timestamp.getTime() 
    });
    return success(cached);
  }

  // Step 2: Cache miss - fetch from source with Result composition
  this.logger.info('Cache miss, fetching from source', { cacheKey });
  
  return fromAsyncTryCatch(
    async () => {
      const marketData = await this.fetchFromAPI(context);
      
      // Cache successful result (no Result wrapper needed)
      await this.cache.set(cacheKey, marketData, 60);
      
      this.logger.info('Data cached successfully', {
        cacheKey,
        ttl: 60,
      });
      
      return marketData;
    },
    (error) => {
      this.logger.error('Fetch and cache failed', {
        cacheKey,
        error: error.message,
      });
      return create('FETCH_FAILED', error.message, 'SYSTEM', { cacheKey });
    }
  );
}
```

## Advanced Pattern 6: Memory-First Architecture

### The Meta-Learning: Working Code > Documentation

**Key Insight**: During implementation, actual working examples in `qi-v2-qicore/typescript/app/` proved more reliable than documentation files.

### Pro Pattern: Verification-First Development

```typescript
// ✅ PRO PATTERN: Always verify patterns against working code
// 1. Read working examples first
// 2. Extract patterns from verified implementations  
// 3. Apply patterns to new code
// 4. Test against same validation criteria

// Example from qi-v2-qicore/typescript/app/basic-result/src/index.ts
const loggerResult = createLogger({ level: 'info', pretty: true });
if (loggerResult.tag === 'failure') throw new Error('Logger failed');
const logger = loggerResult.value;

// ✅ Apply this exact pattern, not documented variations
```

### Architecture Decision: Source of Truth Priority

1. **Working examples** in qi-v2-qicore (highest priority)
2. **Type definitions** in actual libraries
3. **Implementation guides** in docs/qicore/usage/
4. **API documentation** (lowest priority - often incomplete)

## Meta-Pattern: Pro-Level Thinking

### The Mindset Shift

**Beginner**: "How do I use this API?"
**Intermediate**: "How do I compose these operations?"
**Pro**: "How do I architect systems that are maintainable, debuggable, and composable?"

### Pro-Level Questions

1. **Error Context**: "Six months from now, will this error message help someone debug the problem?"
2. **Type Safety**: "Does this code prevent entire classes of runtime errors?"
3. **Composition**: "Can this pattern compose cleanly with other operations?"
4. **Observability**: "Can I trace the data flow through logs and understand what happened?"
5. **Testing**: "Can I test this code's error paths without complex mocking?"

### Pro-Level Standards

**Code Quality Gates**:
- ✅ All async operations use fromAsyncTryCatch with proper error transformation
- ✅ All logging uses 2-argument API with structured context
- ✅ All optional properties handle undefined states explicitly
- ✅ All cache operations integrate cleanly with Result composition
- ✅ All patterns match verified working examples

**Architecture Quality Gates**:
- ✅ Clear separation between sync validation and async operations
- ✅ Consistent error types and error context throughout system
- ✅ Composable operations that work together naturally
- ✅ Observable operations with meaningful logs at appropriate levels
- ✅ Type-safe operations that catch errors at compile time

## Summary: The Pro-Level @qi Stack

**@qi/base mastery**:
- fromAsyncTryCatch for async boundaries
- flatMap composition for dependent operations
- Proper error context for debugging
- Type-safe Result handling

**@qi/core mastery**:
- Child logger patterns for context accumulation
- 2-argument logger API exclusively  
- Direct cache integration (no Result wrapper)
- Environment configuration with TypeScript strict compatibility

**System mastery**:
- Verification against working examples
- Memory-first architecture decisions
- Composable error handling strategies
- Production-ready observability patterns

The key insight: **Pro-level means your code works reliably in production and can be maintained by other developers months later**.