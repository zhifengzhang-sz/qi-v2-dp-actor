# @qi/dp-actor Project Knowledge

Project-specific knowledge for the QiCore Data Processing Actors implementation.

## 🏗️ Project Architecture

### Core Identity
- **Name**: @qi/dp-actor ts-0.5.1
- **Purpose**: Market data DSL with FIX Protocol 4.4 compliance
- **Language**: TypeScript (Haskell implementation outdated)
- **Architecture**: Clean separation between vocabulary (DSL) and implementation (Utils)

### Layer Separation (MANDATORY)
```
DSL Layer     → Pure vocabulary (types, interfaces, constants)
├─ No dependencies
├─ No implementation logic  
└─ Pure contracts only

Utils Layer   → Implementation around DSL types
├─ Validation, factories, analytics
├─ Can import from DSL
└─ Never imported by DSL
```

### Quality Standards
- **Tests**: 599 unit tests (487 core + 112 MCP actors) + 30/31 integration tests must pass consistently
- **Build**: `bun run check` must be clean (typecheck + format + lint + test)
- **TypeScript**: Strict compilation, zero `any` without justification
- **Dependencies**: `@qi/base` for Result<T> patterns, `@qi/core` for infrastructure, MCP SDK for actor protocol

## 🎯 @qi/base and @qi/core Patterns

### @qi/base Result<T> Composition
@qi/base provides functional programming patterns for error handling:

```typescript
import { Ok, Err, type Result, create, flatMap, match, fromAsyncTryCatch } from '@qi/base';
import type { QiError } from '@qi/base';

// ✅ Correct - All operations return Result<T, QiError>
export function parsePrice(priceStr: string): Result<FinancialDecimal, QiError> {
  return flatMap(
    validated => FinancialDecimal.create(validated),
    validatePriceString(priceStr)
  );
}

// ✅ Correct - Async operations with Result<T>
const fetchFromKafka = async (topic: string): Promise<Result<MarketData, QiError>> => {
  return fromAsyncTryCatch(
    async () => {
      const result = await kafkaConsumer.fetch(topic);
      return result;
    },
    (error) => create('KAFKA_FETCH_ERROR', String(error), 'NETWORK')
  );
};

// ✅ Correct - Handling Results with match
match(
  data => console.log('Success:', data),
  error => console.error('Error:', error.message, error.context),
  resultValue
);
```

### @qi/core Infrastructure Integration
@qi/core provides Logger, Cache, and Config infrastructure:

```typescript
import { createLogger, createMemoryCache, type Logger, type ICache } from '@qi/core';

// ✅ Correct - Logger creation (returns Result<Logger>)
const loggerResult = createLogger({ level: 'info', pretty: true });
match(
  logger => {
    // Use 2-argument API always
    logger.info('Operation completed', {
      operation: 'fetchPrice',
      symbol: 'BTC/USD',
      duration: 123
    });
  },
  error => console.error('Logger creation failed:', error.message),
  loggerResult
);

// ✅ Correct - Cache creation (returns ICache directly)
const cache = createMemoryCache({
  maxSize: 10000,
  defaultTtl: 60  // seconds
});

// Cache operations return Result<T>
const cached = await cache.get('price:BTC/USD');
match(
  data => console.log('Cache hit:', data),
  error => console.log('Cache miss, fetching...'),
  cached
);
```

## 🎯 Known Patterns & Solutions

### Result<T> Usage
```typescript
// ✅ Correct - All operations return Result<T, QiError>
export function parsePrice(priceStr: string): Result<FinancialDecimal, QiError>

// ❌ Wrong - Never use Result<T, any>
export function parsePrice(priceStr: string): Result<FinancialDecimal, any>
```

### Logger Integration
```typescript
// ✅ Correct - 3-argument signature with proper property names
opLogger.error("Operation failed", undefined, {
  errorCode: qiError.code,
  errorCategory: qiError.category,
  errorMessage: qiError.message
});

// ❌ Wrong - Incorrect property names
opLogger.error("Operation failed", undefined, {
  code: qiError.code,        // Wrong property name
  category: qiError.category // Wrong property name
});
```

### MCP Actor Patterns
```typescript
// ✅ Correct - MCP SDK usage patterns
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// MCP Base Actor with proper lifecycle
protected async callTool(name: string, args: any): Promise<Result<any, Error>> {
  if (!this.isConnected) {
    await this.connect();
  }
  const result = await this.client.callTool({ name, arguments: args });
  return Ok(result);
}

// ❌ Wrong - Direct MCP client usage without Result<T> wrapping
const result = await this.client.callTool({ name, arguments: args }); // Should wrap in Result<T>
```

### Test Implementation Pattern
```typescript
// ✅ Correct - Test abstract classes using concrete test implementations
class TestMCPActor extends MCPBaseActor {
  public async testConnect(): Promise<Result<void, Error>> {
    return this.connect(); // Expose protected methods for testing
  }
}

// ❌ Wrong - Trying to test abstract class directly
const actor = new MCPBaseActor(context, command); // Cannot instantiate abstract class
```

### Type Safety
```typescript
// ✅ Correct - Documented any usage in validation functions
export function isValidDominanceMetrics(obj: unknown): obj is DominanceMetrics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;
  return typeof metrics.topInstrumentShare === "number";
}

// ❌ Wrong - Inappropriate any usage for known types
validatedTopics.map((t: any) => t.topic) // Should use TopicConfig type
```

## 🔌 KafkaJS Integration Patterns for Redpanda

### Basic KafkaJS Setup for Redpanda
```typescript
import { Kafka, Producer, Consumer } from 'kafkajs';

// ✅ Correct - Redpanda connection (Kafka-compatible)
const kafka = new Kafka({
  clientId: 'qi-dp-actor-streaming',
  brokers: ['localhost:9092'], // Redpanda brokers
  connectionTimeout: 3000,
  requestTimeout: 25000
});

// Producer setup
const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

// Consumer setup
const consumer = kafka.consumer({
  groupId: 'qi-market-data-consumer',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});
```

### Message Production with Result<T>
```typescript
import * as MD from '../md';

class RedpandaProducer {
  async sendMarketData(data: MD.MarketData<MD.Price>): Promise<Result<void, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        await this.producer.send({
          topic: 'market-data-prices',
          messages: [{
            key: this.buildKey(data.context),
            value: JSON.stringify(this.serializeMarketData(data)),
            timestamp: data.coreData.timestamp
          }]
        });
      },
      (error) => create(
        'REDPANDA_SEND_ERROR',
        `Failed to send to Redpanda: ${String(error)}`,
        'NETWORK',
        { symbol: data.context.instrument.symbol }
      )
    );
  }

  private buildKey(context: DSL.DataContext): string {
    return `${context.exchange.id}:${context.instrument.symbol}`;
  }

  private serializeMarketData(data: MD.MarketData<MD.Price>): object {
    return {
      context: data.context,
      coreData: data.coreData,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Message Consumption with MD Smart Constructors
```typescript
class RedpandaConsumer {
  async startConsuming(): Promise<Result<void, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'market-data-prices' });
        
        await this.consumer.run({
          eachMessage: async ({ message }) => {
            const result = await this.processMessage(message);
            match(
              () => {/* Success handled */},
              error => this.logger.error('Message processing failed', {
                error: error.message,
                offset: message.offset
              }),
              result
            );
          }
        });
      },
      (error) => create('REDPANDA_CONSUMER_ERROR', String(error), 'NETWORK')
    );
  }

  private async processMessage(message: KafkaMessage): Promise<Result<void, QiError>> {
    try {
      const rawData = JSON.parse(message.value?.toString() || '{}');
      
      // Use MD smart constructors for validation
      return flatMap(
        marketData => this.handleMarketData(marketData),
        flatMap(
          price => MD.MarketData.create(rawData.context, price),
          MD.Price.create(
            rawData.coreData.timestamp,
            rawData.coreData.price,
            rawData.coreData.size
          )
        )
      );
    } catch (error) {
      return Err(create('MESSAGE_PARSE_ERROR', String(error), 'VALIDATION'));
    }
  }
}
```

## 🎛️ MCP SDK Integration Patterns

### MCP Client Setup
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPBaseActor extends BaseActor {
  protected client: Client;
  protected transport: StdioClientTransport;
  protected isConnected = false;

  constructor(context: DSL.DataContext, serverCommand: string[]) {
    super(context);
    
    this.transport = new StdioClientTransport({
      command: serverCommand[0],
      args: serverCommand.slice(1)
    });
    
    this.client = new Client({
      name: 'qi-dp-actor',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
  }

  protected async callTool(name: string, args: any): Promise<Result<any, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        if (!this.isConnected) {
          await this.connect();
        }
        const result = await this.client.callTool({ name, arguments: args });
        return result;
      },
      (error) => create('MCP_TOOL_ERROR', String(error), 'NETWORK')
    );
  }
}
```

## 🏗️ MD Smart Constructor Usage Patterns

### Creating Market Data with Validation
```typescript
import * as MD from '../md';

// ✅ Correct - Use MD smart constructors for all market data creation
const createValidatedPrice = (timestamp: string, price: string, size: string): Result<MD.MarketData<MD.Price>, QiError> => {
  return flatMap(
    validatedPrice => flatMap(
      context => MD.MarketData.create(context, validatedPrice),
      createDataContext()
    ),
    MD.Price.create(timestamp, price, size)
  );
};

// ✅ Correct - All MD classes follow same pattern
const createValidatedLevel1 = (data: any): Result<MD.MarketData<MD.Level1>, QiError> => {
  return flatMap(
    level1 => flatMap(
      context => MD.MarketData.create(context, level1),
      createDataContext()
    ),
    MD.Level1.create(
      data.timestamp,
      data.bidPrice,
      data.bidSize,
      data.askPrice,
      data.askSize
    )
  );
};
```

## 🔗 Connection Management Patterns

### External System Connections
```typescript
abstract class BaseConnection {
  protected isConnected = false;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  
  abstract connect(): Promise<Result<void, QiError>>;
  abstract disconnect(): Promise<Result<void, QiError>>;
  abstract healthCheck(): Promise<Result<boolean, QiError>>;
  
  protected async withRetry<T>(operation: () => Promise<T>): Promise<Result<T, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        let lastError: Error | null = null;
        
        for (let i = 0; i < this.maxReconnectAttempts; i++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
          }
        }
        
        throw lastError || new Error('Max retry attempts reached');
      },
      (error) => create('CONNECTION_RETRY_FAILED', String(error), 'NETWORK')
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 🚨 Critical Issues History

### ✅ ALL ISSUES RESOLVED (6/6 - 100% Complete)
**Release**: ts-0.5.1 (2025-07-23)

1. **Type Safety** - Fixed 22 instances of `Result<T, any>` → `Result<T, QiError>`
2. **Logger API** - Fixed 16 incorrect 3-argument logger calls  
3. **DSL Interfaces** - Fixed 38 interface method signatures for consistency
4. **Logger Context Duplication** - Fixed double context merging + local optimization
5. **Architecture Types** - Eliminated 6 inappropriate `any`, documented 7 legitimate cases
6. **Result<T> Composition** - Fixed 5 `throw new Error()` statements breaking functional composition

### Latest Release Summary
**Major improvements**:
- ✅ **Complete MCP Actor Testing**: Added 112 comprehensive unit tests for all MCP actor classes
- ✅ **Test Implementation Pattern**: Established pattern for testing abstract classes using concrete test implementations
- ✅ **MCP SDK Integration**: Full Model Context Protocol integration with Client + StdioClientTransport patterns
- ✅ **Quality Compliance**: Fixed all Biome linter issues (forEach → for...of performance optimization)
- ✅ **Production Ready**: All 599 unit tests (487 core + 112 MCP) + 30/31 integration tests passing
- ✅ **No Stub Code**: Verified complete implementations throughout - no fake/stub code exists

## 🧪 Testing Patterns

### Unit Testing with Result<T>
```typescript
import { describe, it, expect } from 'vitest';
import { match } from '@qi/base';

describe('Price creation', () => {
  it('should create valid price', () => {
    const result = MD.Price.create('2025-01-01T12:00:00Z', '100.50', '1000');
    
    match(
      price => {
        expect(price.price).toBe('100.50');
        expect(price.size).toBe('1000');
      },
      error => {
        throw new Error(`Expected success but got error: ${error.message}`);
      },
      result
    );
  });
  
  it('should reject invalid price', () => {
    const result = MD.Price.create('invalid', 'not-a-number', '1000');
    
    expect(result.tag).toBe('failure');
    if (result.tag === 'failure') {
      expect(result.error.code).toBe('INVALID_TIMESTAMP');
    }
  });
});
```

### Integration Testing with External Systems
```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Redpanda Integration', () => {
  let redpandaReader: RedpandaReader;
  let testContext: DSL.DataContext;
  
  beforeEach(async () => {
    testContext = await createTestContext();
    redpandaReader = new RedpandaReader(testContext, {
      brokers: ['localhost:9092'],
      clientId: 'test-client'
    });
  });
  
  afterEach(async () => {
    await redpandaReader.disconnect();
  });
  
  it('should fetch real price data', async () => {
    const result = await redpandaReader.getCurrentPrice(testContext);
    
    match(
      price => {
        expect(price.context).toEqual(testContext);
        expect(price.coreData.price).toMatch(/^\d+\.\d+$/);
      },
      error => {
        throw new Error(`Price fetch failed: ${error.message}`);
      },
      result
    );
  });
});
```

## 📁 Project Structure

### Key Directories
```
lib/src/
├── dsl/           # Pure vocabulary layer (interfaces, types)
├── md/            # Market data implementations  
├── utils/         # Utilities around MD instances
├── base/          # Infrastructure (streaming, etc)
└── actor/         # Actor pattern implementations
    ├── abstract/  # BaseActor abstract class
    └── mcp/       # MCP (Model Context Protocol) actors
        ├── MCPBaseActor.ts
        ├── MCPMarketDataReader.ts
        ├── MCPMarketDataWriter.ts
        └── MCPStreamingReader.ts

lib/tests/
├── actor/mcp/     # Comprehensive MCP actor tests (112 tests)
├── dsl/           # DSL contract tests
├── md/            # Market data implementation tests
├── base/          # Infrastructure tests
└── integration/   # End-to-end integration tests

docs/
├── knowledge/     # This knowledge system
├── reports/       # Progress tracking and technical analysis
└── dsl/           # DSL behavioral contracts
```

### Important Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration
- `CLAUDE.md` - Claude Code instructions

## 🛠️ Development Workflow

### Standard Commands
```bash
bun run check           # Full quality check (typecheck + format + lint + test)
bun run build           # Production build
bun run test:watch      # Development testing
bun run test:integration # Integration tests (30/31 passing)
```

### Quality Gates
- All 599 unit tests (487 core + 112 MCP actors) and 30/31 integration tests must pass
- TypeScript compilation must be clean
- Biome linter must pass (performance rules: for...of instead of forEach)
- Biome formatting enforced

### Architecture Verification
- DSL layer has zero dependencies
- Utils layer properly types all operations
- No circular dependencies between layers
- All public APIs use Result<T, QiError> patterns

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.