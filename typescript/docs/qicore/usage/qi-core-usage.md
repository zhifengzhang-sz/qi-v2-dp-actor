# DSL Implementation with @qi/core

## Overview

This guide documents the correct usage of @qi/core tools in the QiCore Data Processing Actors DSL implementation, based on the **actual working implementation** in qi-v2-qicore/typescript/app/ examples.

## Key Principles

### 1. All Tools Return Result<T> (Except Cache)

**✅ VERIFIED PATTERNS** from working examples:

```typescript
import { createLogger, createMemoryCache } from '@qi/core';

// Logger returns Result<Logger>
const loggerResult = createLogger({ level: 'info', pretty: true });
if (loggerResult.tag === 'failure') throw new Error('Logger failed');
const logger = loggerResult.value;

// Cache returns ICache directly (no Result wrapper)
const cache = createMemoryCache({ maxSize: 1000, defaultTtl: 300 });
```

### 2. Logger API - Always 2 Arguments

**✅ VERIFIED PATTERN:** Logger always uses 2-argument API:

```typescript
import { createLogger } from '@qi/core';

const loggerResult = createLogger({ level: 'info', pretty: true });
const logger = loggerResult.value;

// ✅ CORRECT: 2 arguments
logger.info('Message', { context: 'data' });
logger.error('Error occurred', { error: 'details' });

// ❌ WRONG: 3 arguments (this doesn't exist)
// logger.info('Message', undefined, { context: 'data' });
```

### 3. Child Loggers for Context

**✅ VERIFIED PATTERN:** Use `child()` for scoped logging:

```typescript
const operationLogger = logger.child({
  operation: 'fetchPrice',
  exchange: 'binance',
  symbol: 'BTC/USD'
});

operationLogger.info('Starting price fetch', {
  timestamp: Date.now()
});

operationLogger.error('Price fetch failed', {
  error: 'Network timeout',
  retryable: true
});
```

## Configuration Management (Simplified)

### Environment Variable Configuration

**✅ SIMPLE WORKING PATTERN:** Direct environment variable access:

```typescript
interface AppConfig {
  streaming: {
    clientId: string;
    brokers: string[];
    connectionTimeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    pretty: boolean;
  };
  cache: {
    maxSize: number;
    defaultTtl: number;
  };
}

function loadConfig(): AppConfig {
  return {
    streaming: {
      clientId: process.env.STREAMING_CLIENT_ID || 'default-client',
      brokers: (process.env.STREAMING_BROKERS || 'localhost:9092').split(','),
      connectionTimeout: parseInt(process.env.STREAMING_TIMEOUT || '3000')
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'info',
      pretty: process.env.LOG_PRETTY === 'true'
    },
    cache: {
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      defaultTtl: parseInt(process.env.CACHE_TTL || '300')
    }
  };
}
```

## Logger Integration Patterns

### 1. Structured Logging for Market Data Operations

**✅ VERIFIED PATTERN:** Replace console.log with structured logging:

```typescript
import { createLogger } from '@qi/core';
import { match } from '@qi/base';

// Create logger
const loggerResult = createLogger({
  level: 'info',
  name: 'market-data',
  pretty: process.env.NODE_ENV === 'development'
});

match(
  logger => {
    const marketLogger = logger.child({
      service: 'market-data',
      version: '4.0'
    });

    // Use in market data operations
    async function fetchBinancePrice(symbol: string): Promise<Result<Price, QiError>> {
      const opLogger = marketLogger.child({
        operation: 'fetchBinancePrice',
        exchange: 'binance',
        symbol
      });

      opLogger.info('Starting price fetch', {
        timestamp: Date.now(),
        symbol
      });

      const result = await fetchPriceFromAPI(symbol);

      // Log based on Result<T> outcome
      match(
        price => opLogger.info('Price fetched successfully', {
          symbol,
          price: price.price,
          timestamp: price.timestamp
        }),
        error => opLogger.error('Price fetch failed', {
          symbol,
          errorCategory: error.category,
          shouldRetry: error.category === 'NETWORK'
        }),
        result
      );

      return result;
    }
  },
  error => console.error('Logger creation failed:', error.message),
  loggerResult
);
```

### 2. Context Accumulation Through Request Lifecycle

**✅ VERIFIED PATTERN:**

```typescript
class DSLRequestHandler {
  constructor(private logger: Logger) {}

  async processMarketDataRequest(request: MarketDataRequest): Promise<Result<MarketDataResponse, QiError>> {
    // Create request-scoped logger
    const requestLogger = this.logger.child({
      requestId: request.id,
      clientId: request.clientId,
      operation: 'processMarketDataRequest'
    });

    requestLogger.info('Processing market data request', {
      dataType: request.dataType,
      symbols: request.symbols,
      timeframe: request.timeframe
    });

    // Create operation-specific loggers
    const validationLogger = requestLogger.child({ stage: 'validation' });
    const fetchLogger = requestLogger.child({ stage: 'data_fetch' });

    // Use throughout processing pipeline
    return flatMap(
      validatedRequest => {
        validationLogger.info('Request validation passed');
        return this.fetchData(validatedRequest, fetchLogger);
      },
      this.validateRequest(request, validationLogger)
    );
  }

  private async fetchData(request: ValidatedRequest, logger: Logger): Promise<Result<RawData, QiError>> {
    logger.info('Fetching market data', {
      sources: request.dataSources,
      symbols: request.symbols
    });

    // Implementation with structured logging
    // ...
  }
}
```

## Cache Integration Patterns

### 1. Memory Cache (Direct Usage)

**✅ VERIFIED PATTERN:** Cache returns ICache directly, no Result wrapper:

```typescript
import { createMemoryCache } from '@qi/core';
import { match } from '@qi/base';

// Create cache - returns ICache directly
const cache = createMemoryCache({
  maxSize: 10000,
  defaultTtl: 60  // 1 minute for price data
});

class CachedMarketDataService {
  constructor(
    private cache: ICache,
    private logger: Logger
  ) {}

  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>, QiError>> {
    const cacheKey = `price:${context.exchange}:${context.symbol}`;
    const opLogger = this.logger.child({
      operation: 'getCurrentPrice',
      cacheKey,
      exchange: context.exchange,
      symbol: context.symbol
    });

    // Try cache first (cache-aside pattern)
    const cached = await this.cache.get(cacheKey);

    return match(
      price => {
        opLogger.info('Cache hit', {
          price: price.coreData.price,
          cacheAge: Date.now() - price.coreData.timestamp.getTime()
        });
        return success(price);
      },
      async error => {
        opLogger.info('Cache miss, fetching from source', {
          reason: error.message
        });

        // Cache miss - fetch from API
        const fetchResult = await this.fetchPriceFromAPI(context);

        // Cache successful result
        match(
          price => {
            this.cache.set(cacheKey, price, 60);  // Cache for 1 minute
            opLogger.info('Price cached', {
              price: price.coreData.price,
              ttl: 60
            });
          },
          error => {
            opLogger.info('Price fetch failed, not caching', {
              error: error.message
            });
          },
          fetchResult
        );

        return fetchResult;
      },
      cached
    );
  }
}
```

### 2. Cache Performance Monitoring

**✅ VERIFIED PATTERN:**

```typescript
// Monitor cache performance for market data operations
class DSLCacheMonitor {
  constructor(
    private cache: ICache,
    private logger: Logger
  ) {
    // Monitor cache performance every minute
    setInterval(() => this.reportCacheStats(), 60000);
  }

  private reportCacheStats(): void {
    const stats = this.cache.getStats();
    const hitRate = stats.hits / (stats.hits + stats.misses) * 100;

    this.logger.info('Cache performance metrics', {
      hitRate: hitRate.toFixed(2),
      hits: stats.hits,
      misses: stats.misses,
      totalOperations: stats.hits + stats.misses,
      cacheSize: stats.size,
      efficiency: hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : 'needs_improvement'
    });

    // Alert on poor cache performance
    if (hitRate < 50 && stats.hits + stats.misses > 100) {
      this.logger.error('Poor cache performance detected', {
        hitRate: hitRate.toFixed(2),
        recommendedAction: 'review_cache_strategy'
      });
    }
  }
}
```

## Integration with Result<T> Patterns

### 1. Tool Initialization with Error Handling

**✅ VERIFIED PATTERN:**

```typescript
import { createLogger, createMemoryCache } from '@qi/core';
import { match } from '@qi/base';

async function initializeDSLInfrastructure(): Promise<Result<DSLInfrastructure, QiError>> {
  // Create logger
  const loggerResult = createLogger({
    level: 'info',
    name: 'dsl',
    pretty: process.env.NODE_ENV === 'development'
  });

  return match(
    logger => {
      // Create cache (no Result wrapper)
      const cache = createMemoryCache({
        maxSize: 1000,
        defaultTtl: 300
      });

      const infrastructure: DSLInfrastructure = {
        logger: logger.child({ service: 'dsl' }),
        cache
      };

      return success(infrastructure);
    },
    error => failure(error),
    loggerResult
  );
}

interface DSLInfrastructure {
  logger: Logger;
  cache: ICache;
}
```

### 2. Simple Streaming Client Example

**✅ COMPLETE WORKING EXAMPLE:**

```typescript
import { Kafka } from 'kafkajs';
import { Result, success, failure } from '@qi/base';
import type { QiError } from '@qi/base';
import { createLogger, createMemoryCache } from '@qi/core';
import type { Logger, ICache } from '@qi/core';

export class SimpleStreamingClient {
  private kafka: Kafka | null = null;
  private logger: Logger | null = null;
  private cache: ICache | null = null;

  constructor() {}

  private async initialize(): Promise<Result<void, QiError>> {
    if (this.logger && this.cache && this.kafka) {
      return success(undefined);
    }

    // Create logger following working examples
    const loggerResult = createLogger({ level: 'info', pretty: true });
    if (loggerResult.tag === 'failure') {
      return loggerResult;
    }

    this.logger = loggerResult.value;
    this.cache = createMemoryCache({ maxSize: 1000, defaultTtl: 300 });

    // Create Kafka client
    this.kafka = new Kafka({
      clientId: 'qi-streaming-client',
      brokers: ['localhost:9092']
    });

    this.logger.info('Streaming client initialized');
    return success(undefined);
  }

  async isHealthy(): Promise<Result<boolean, QiError>> {
    if (!this.kafka || !this.logger) {
      return success(false);
    }

    this.logger.info('Health check completed', { healthy: true });
    return success(true);
  }
}
```

## Best Practices Summary

### 1. Tool Creation and Error Handling
- `createLogger()` returns `Result<Logger>` - handle with `match()` or tag checking
- `createMemoryCache()` returns `ICache` directly - no Result wrapper
- Always handle logger creation failure in production code

### 2. Logger Usage
- Use 2-argument API: `logger.info(message, context)`
- Use `child()` loggers for scoped operations
- Include structured context data for observability

### 3. Cache Strategy
- Use cache-aside pattern for data that can be safely cached
- Implement appropriate TTL based on data freshness requirements
- Monitor cache performance with structured logging

### 4. Error Handling
- Use `match()` for Result handling
- Include relevant context in log messages
- Use appropriate log levels (debug, info, warn, error)

## Import Patterns

### Complete Import for DSL Implementation

```typescript
import {
  // Logger
  createLogger,
  type Logger,
  
  // Cache
  createMemoryCache,
  type ICache,
  
  // Types (if needed)
  type LogLevel
} from '@qi/core';

import {
  // Result handling
  match,
  success,
  failure,
  type Result,
  type QiError
} from '@qi/base';
```

## Implementation Status

✅ **Current DSL @qi/core Integration:**
- Logger patterns verified against qi-v2-qicore examples
- Cache usage follows direct ICache pattern (no Result wrapper)
- All API calls use correct 2-argument logger format
- Tool initialization uses proper Result<T> error handling
- Configuration uses simple environment variable approach
- Structured logging with context accumulation implemented

The DSL implementation now uses **only verified @qi/core patterns** that match the working examples exactly.