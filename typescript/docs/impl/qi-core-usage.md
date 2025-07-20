# DSL Implementation with @qi/core

## Overview

This guide documents the correct usage of @qi/core tools in the QiCore Data Processing Actors DSL implementation, based on the official qi-v2-qicore tutorials and integration patterns. The @qi/core tools provide essential infrastructure capabilities: Config, Logger, and Cache.

## Key Principles

### 1. All Tools Use Result<T> Consistently

Every @qi/core tool follows the same Result<T> pattern from @qi/base:

```typescript
import { createLogger, createCache, ConfigBuilder } from '@qi/core';
import { match } from '@qi/base';

// All tool creation returns Result<T>
const loggerResult = createLogger({ level: 'info', name: 'dsl' });
const cacheResult = createCache({ backend: 'memory', maxSize: 1000 });
const configResult = ConfigBuilder.fromYamlFile('./config.yaml').build();

// Handle all Results consistently with match()
match(
  logger => console.log('Logger ready'),
  error => console.error('Logger failed:', error.message),
  loggerResult
);
```

### 2. Tools Compose Naturally

@qi/core tools are designed to work together with Config providing foundation for other tools:

```typescript
// Load configuration first
const configResult = ConfigBuilder
  .fromYamlFile('./config.yaml')
  .merge(ConfigBuilder.fromEnv('APP_'))
  .build();

match(
  config => {
    // Use config to create logger
    const loggerResult = createLogger({
      level: config.get('logging.level', 'info'),
      name: config.get('app.name', 'dsl')
    });
    
    match(
      logger => {
        // Use config to create cache
        const cacheResult = createCache({
          backend: config.get('cache.backend', 'memory'),
          maxSize: config.get('cache.maxSize', 1000)
        });
        
        match(
          cache => startDSL(config, logger, cache),
          error => logger.error('Cache creation failed', error),
          cacheResult
        );
      },
      error => console.error('Logger creation failed:', error.message),
      loggerResult
    );
  },
  error => console.error('Configuration failed:', error.message),
  configResult
);
```

### 3. Structured Operations with Context

All tools support structured data and context management for observability:

```typescript
// Logger with market data context
const marketLogger = logger.withContext({
  exchange: 'binance',
  symbol: 'BTC/USD',
  operation: 'price_fetch'
});

marketLogger.info('Fetching price data', undefined, {
  timestamp: Date.now(),
  requestId: 'req_123'
});

// Cache with structured keys
await cache.set('price:binance:BTC/USD', priceData, 300);
```

## Configuration Management Patterns

### 1. Multi-Source Configuration Loading

Use ConfigBuilder for loading configuration from multiple sources with clear precedence:

```typescript
import { ConfigBuilder } from '@qi/core';
import { z } from 'zod';

// Define DSL configuration schema
const dslConfigSchema = z.object({
  dsl: z.object({
    validation: z.object({
      strictMode: z.boolean().default(true),
      maxPrecision: z.number().default(8)
    }),
    retry: z.object({
      maxAttempts: z.number().default(3),
      backoffMs: z.number().default(1000)
    })
  }),
  exchanges: z.object({
    binance: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().default('https://api.binance.com'),
      timeout: z.number().default(5000)
    }),
    coingecko: z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().default('https://api.coingecko.com'),
      timeout: z.number().default(10000)
    })
  }),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    pretty: z.boolean().default(false)
  }),
  cache: z.object({
    backend: z.enum(['memory', 'redis']).default('memory'),
    maxSize: z.number().default(1000),
    defaultTtl: z.number().default(300)
  })
});

// Load configuration with precedence: base → environment → validation
const configResult = ConfigBuilder
  .fromYamlFile('./config/dsl.yaml')           // Base configuration
  .merge(ConfigBuilder.fromEnv('DSL_'))        // Environment overrides (DSL_LOGGING_LEVEL, etc.)
  .validateWith(dslConfigSchema)               // Schema validation
  .build();
```

### 2. Environment Variable Mapping

Environment variables are automatically nested based on naming convention:

```bash
# Environment variables
DSL_LOGGING_LEVEL=debug
DSL_LOGGING_PRETTY=true
DSL_EXCHANGES_BINANCE_TIMEOUT=10000
DSL_CACHE_BACKEND=redis
DSL_CACHE_MAX_SIZE=5000
```

```typescript
// Becomes this configuration structure
{
  logging: {
    level: "debug",
    pretty: true
  },
  exchanges: {
    binance: {
      timeout: 10000
    }
  },
  cache: {
    backend: "redis",
    maxSize: 5000
  }
}
```

### 3. Configuration Usage in DSL

```typescript
// Use configuration throughout DSL implementation
class MarketDataService {
  constructor(
    private config: Config,
    private logger: Logger,
    private cache: ICache
  ) {}

  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>, QiError>> {
    const timeout = this.config.get(`exchanges.${context.exchange}.timeout`, 5000);
    const strictMode = this.config.get('dsl.validation.strictMode', true);
    
    const operationLogger = this.logger.child({
      operation: 'getCurrentPrice',
      exchange: context.exchange,
      symbol: context.symbol
    });

    operationLogger.info('Fetching current price', undefined, {
      timeout,
      strictMode,
      context
    });

    // Implementation with configured timeout and validation
    // ...
  }
}
```

## Logger Integration Patterns

### 1. Structured Logging for Market Data Operations

Replace console.log with structured logging that integrates with Result<T>:

```typescript
import { createLogger } from '@qi/core';
import { match, flatMap } from '@qi/base';

// Create logger with DSL context
const loggerResult = createLogger({
  level: 'info',
  name: 'dsl',
  pretty: process.env.NODE_ENV === 'development'
});

match(
  logger => {
    const marketLogger = logger.withContext({
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

      opLogger.info('Starting price fetch', undefined, {
        timestamp: Date.now(),
        symbol
      });

      const result = await fetchPriceFromAPI(symbol);

      // Log based on Result<T> outcome
      match(
        price => opLogger.info('Price fetched successfully', undefined, {
          symbol,
          price: price.price,
          timestamp: price.timestamp,
          size: price.size
        }),
        error => opLogger.error('Price fetch failed', error, {
          symbol,
          errorCategory: error.category,
          shouldRetry: error.category === 'NETWORK',
          endpoint: error.context?.endpoint
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

```typescript
class DSLRequestHandler {
  constructor(private logger: Logger) {}

  async processMarketDataRequest(request: MarketDataRequest): Promise<Result<MarketDataResponse, QiError>> {
    // Create request-scoped logger
    const requestLogger = this.logger.withContext({
      requestId: request.id,
      clientId: request.clientId,
      operation: 'processMarketDataRequest'
    });

    requestLogger.info('Processing market data request', undefined, {
      dataType: request.dataType,
      symbols: request.symbols,
      timeframe: request.timeframe
    });

    // Create operation-specific loggers
    const validationLogger = requestLogger.child({ stage: 'validation' });
    const fetchLogger = requestLogger.child({ stage: 'data_fetch' });
    const transformLogger = requestLogger.child({ stage: 'transformation' });

    // Use throughout processing pipeline
    return flatMap(
      validatedRequest => {
        validationLogger.debug('Request validation passed');
        return this.fetchData(validatedRequest, fetchLogger);
      },
      this.validateRequest(request, validationLogger)
    );
  }

  private async fetchData(request: ValidatedRequest, logger: Logger): Promise<Result<RawData, QiError>> {
    logger.info('Fetching market data', undefined, {
      sources: request.dataSources,
      symbols: request.symbols
    });

    // Implementation with structured logging
    // ...
  }
}
```

### 3. Error Logging with Rich Context

```typescript
// Log errors with comprehensive context for debugging
async function validateAndCreatePrice(
  value: number,
  context: DataContext
): Promise<Result<MarketData<Price>, QiError>> {
  const opLogger = logger.child({
    operation: 'validateAndCreatePrice',
    exchange: context.exchange,
    symbol: context.symbol
  });

  return flatMap(
    decimal => {
      opLogger.debug('Price validation passed', undefined, {
        originalValue: value,
        decimalValue: decimal.toString(),
        precision: decimal.decimalPlaces()
      });

      return success({
        context,
        coreData: {
          timestamp: new Date(),
          price: decimal.toNumber(),
          size: 1.0
        }
      });
    },
    flatMap(
      decimal => {
        if (decimal.value.lte(0)) {
          const error = createMarketDataError(
            'INVALID_PRICE',
            'Price must be positive',
            'VALIDATION',
            {
              symbol: context.symbol,
              exchange: context.exchange,
              value,
              decimalValue: decimal.toString()
            }
          );

          // Log validation error with full context
          opLogger.error('Price validation failed', error, {
            originalValue: value,
            decimalValue: decimal.toString(),
            validationRule: 'price_must_be_positive',
            exchange: context.exchange,
            symbol: context.symbol
          });

          return failure(error);
        }
        return success(decimal);
      },
      FinancialDecimal.create(value)
    )
  );
}
```

## Cache Integration Patterns

### 1. Market Data Caching with Cache-Aside Pattern

```typescript
import { createCache } from '@qi/core';
import { match } from '@qi/base';

// Create cache for market data
const cacheResult = createCache<MarketData<Price>>({
  backend: 'memory',
  maxSize: 10000,
  defaultTtl: 60  // 1 minute for price data
});

match(
  cache => {
    class CachedMarketDataService {
      constructor(
        private cache: ICache<MarketData<Price>>,
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
            opLogger.debug('Cache hit', undefined, {
              price: price.coreData.price,
              cacheAge: Date.now() - price.coreData.timestamp.getTime()
            });
            return success(price);
          },
          async error => {
            opLogger.debug('Cache miss, fetching from source', undefined, {
              reason: error.message
            });

            // Cache miss - fetch from API
            const fetchResult = await this.fetchPriceFromAPI(context);

            // Cache successful result
            match(
              price => {
                this.cache.set(cacheKey, price, 60);  // Cache for 1 minute
                opLogger.debug('Price cached', undefined, {
                  price: price.coreData.price,
                  ttl: 60
                });
              },
              error => {
                opLogger.debug('Price fetch failed, not caching', undefined, {
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
  },
  error => console.error('Cache creation failed:', error.message),
  cacheResult
);
```

### 2. Batch Operations for Multiple Symbols

```typescript
// Efficiently cache multiple market data points
async function cacheMultiplePrices(
  prices: Record<string, MarketData<Price>>,
  ttl: number = 300
): Promise<void> {
  const cacheData: Record<string, MarketData<Price>> = {};
  
  for (const [symbol, price] of Object.entries(prices)) {
    const cacheKey = `price:${price.context.exchange}:${symbol}`;
    cacheData[cacheKey] = price;
  }

  await cache.mset(cacheData, ttl);
  
  logger.debug('Batch cached prices', undefined, {
    count: Object.keys(cacheData).length,
    symbols: Object.keys(prices),
    ttl
  });
}

// Batch retrieve multiple prices
async function getCachedPrices(
  contexts: DataContext[]
): Promise<Record<string, MarketData<Price>>> {
  const cacheKeys = contexts.map(ctx => `price:${ctx.exchange}:${ctx.symbol}`);
  
  const cached = await cache.mget(cacheKeys);
  
  match(
    prices => {
      const hitCount = Object.keys(prices).length;
      logger.debug('Batch cache lookup', undefined, {
        requested: cacheKeys.length,
        hits: hitCount,
        hitRate: (hitCount / cacheKeys.length) * 100
      });
      return prices;
    },
    error => {
      logger.warn('Batch cache lookup failed', error);
      return {};
    },
    cached
  );
}
```

### 3. Cache Performance Monitoring for DSL

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

    this.logger.info('Cache performance metrics', undefined, {
      hitRate: hitRate.toFixed(2),
      hits: stats.hits,
      misses: stats.misses,
      totalOperations: stats.hits + stats.misses,
      cacheSize: stats.size,
      efficiency: hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : 'needs_improvement'
    });

    // Alert on poor cache performance
    if (hitRate < 50 && stats.hits + stats.misses > 100) {
      this.logger.warn('Poor cache performance detected', undefined, {
        hitRate: hitRate.toFixed(2),
        recommendedAction: 'review_cache_strategy'
      });
    }
  }
}
```

## Integration with Result<T> Patterns

### 1. Tool Composition with Error Handling

```typescript
// Initialize all tools with proper error handling
async function initializeDSLInfrastructure(): Promise<Result<DSLInfrastructure, QiError>> {
  const configResult = ConfigBuilder
    .fromYamlFile('./config.yaml')
    .merge(ConfigBuilder.fromEnv('DSL_'))
    .validateWith(dslConfigSchema)
    .build();

  return flatMap(
    config => flatMap(
      logger => flatMap(
        cache => success({
          config,
          logger: logger.withContext({ service: 'dsl' }),
          cache
        }),
        createCache({
          backend: config.get('cache.backend', 'memory'),
          maxSize: config.get('cache.maxSize', 1000)
        })
      ),
      createLogger({
        level: config.get('logging.level', 'info'),
        name: config.get('app.name', 'dsl'),
        pretty: config.get('logging.pretty', false)
      })
    ),
    configResult
  );
}

interface DSLInfrastructure {
  config: Config;
  logger: Logger;
  cache: ICache;
}
```

### 2. Error Category Handling Across Tools

```typescript
// Handle different error categories appropriately
function handleInfrastructureError(error: QiError, operation: string): void {
  switch (error.category) {
    case 'VALIDATION':
      // Configuration or schema validation errors - never retry
      logger.error('Infrastructure validation error', error, {
        operation,
        action: 'fix_configuration',
        retryable: false
      });
      process.exit(1);
      break;

    case 'NETWORK':
      // Network issues with Redis, etc. - retry with backoff
      logger.warn('Infrastructure network error', error, {
        operation,
        action: 'retry_with_backoff',
        retryable: true
      });
      // Implement retry logic or fallback to memory cache
      break;

    case 'SYSTEM':
      // System issues - limited retry
      logger.error('Infrastructure system error', error, {
        operation,
        action: 'limited_retry',
        retryable: true
      });
      // Implement limited retry or graceful degradation
      break;

    default:
      logger.error('Unknown infrastructure error', error, {
        operation,
        action: 'investigate',
        retryable: false
      });
  }
}
```

## Environment-Based Configuration

### 1. Development Environment Setup

```yaml
# config/development.yaml
dsl:
  validation:
    strictMode: false  # More lenient for development
    maxPrecision: 12   # Higher precision for testing
  retry:
    maxAttempts: 1     # Fail fast in development
    backoffMs: 100

logging:
  level: debug
  pretty: true         # Pretty print for development

cache:
  backend: memory
  maxSize: 100         # Smaller cache for development
```

### 2. Production Environment Setup

```yaml
# config/production.yaml
dsl:
  validation:
    strictMode: true   # Strict validation in production
    maxPrecision: 8    # Financial precision
  retry:
    maxAttempts: 3     # Retry network failures
    backoffMs: 1000

logging:
  level: info
  pretty: false        # JSON format for log aggregation

cache:
  backend: redis
  maxSize: 50000       # Large cache for production
```

### 3. Environment Selection

```typescript
// Automatically select environment configuration
import { getLoggerEnvironmentConfig } from '@qi/core';

const environmentConfig = getLoggerEnvironmentConfig();
const configResult = ConfigBuilder
  .fromYamlFile('./config/base.yaml')
  .merge(ConfigBuilder.fromYamlFile(`./config/${process.env.NODE_ENV || 'development'}.yaml`))
  .merge(ConfigBuilder.fromEnv('DSL_'))
  .merge(ConfigBuilder.fromObject({
    logging: environmentConfig  // Environment-specific logging
  }))
  .validateWith(dslConfigSchema)
  .build();
```

## Best Practices Summary

### 1. Tool Creation and Error Handling
- Always handle tool creation with `match()` - tools can fail to initialize
- Use `flatMap()` for composing tool initialization
- Fail fast on configuration errors, retry on network errors

### 2. Configuration Management
- Load from multiple sources with clear precedence: base → environment → validation
- Use schemas for validation and type safety
- Store sensitive data in environment variables, not config files

### 3. Structured Logging
- Replace all `console.log` with structured logging
- Use context accumulation for request/operation tracking
- Log both success and failure cases with rich context
- Include market data specific context (exchange, symbol, operation)

### 4. Cache Strategy
- Use cache-aside pattern for data that can be safely cached
- Implement appropriate TTL based on data freshness requirements
- Monitor cache performance and adjust strategy based on hit rates
- Use batch operations for efficiency when working with multiple keys

### 5. Result<T> Integration
- All tools return `Result<T>` - handle with `match()` or functional composition
- Propagate errors through `flatMap()` chains
- Include tool-specific context in error messages
- Use error categories to determine retry strategies

## Import Patterns

### Complete Import for DSL Implementation

```typescript
import {
  // Configuration
  ConfigBuilder,
  type Config,
  type ConfigError,
  
  // Logging
  createLogger,
  getLoggerEnvironmentConfig,
  type Logger,
  type LoggerError,
  
  // Caching
  createCache,
  createRedisCache,
  type ICache,
  type CacheError,
  
  // Common types
  type Result
} from '@qi/core';

import {
  // Result handling
  match,
  map,
  flatMap,
  
  // Result creation
  success,
  failure,
  
  // Error creation
  create,
  validationError,
  networkError,
  
  // Query functions
  isSuccess,
  isFailure
} from '@qi/base';
```

## Implementation Status

✅ **Current DSL @qi/core Integration:**
- Comprehensive usage patterns documented
- Configuration schema defined for DSL operations
- Structured logging with market data context
- Cache strategies for market data performance
- All patterns use proper Result<T> error handling
- Environment-based configuration management
- Tool composition with error propagation
- Performance monitoring and observability

The DSL implementation now has proper guidance for using @qi/core tools consistently with the same quality and patterns shown in the qi-v2-qicore tutorials.