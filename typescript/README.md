# QiCore v4.0 Data Processing Actors - TypeScript Implementation

**Market data DSL and actor system implemented in modern TypeScript with full type safety**

## Overview

This TypeScript implementation provides the complete market data DSL and actor system defined by the QiCore v4.0 contracts. It builds on the QiCore Foundation (`@qi/qicore-foundation`) to implement FIX Protocol-compliant market data processing with cryptocurrency sources, streaming capabilities, and MCP server integration.

## Project Structure

```
typescript/
├── README.md                     # This file
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── src/
│   ├── dsl/                      # qi/dp/dsl implementation
│   │   ├── types.ts             # Market data types (FIX compliant)
│   │   ├── context.ts           # DataContext implementation
│   │   ├── reader.ts            # MarketDataReader interface
│   │   ├── writer.ts            # MarketDataWriter interface
│   │   ├── combinator.ts        # Functional composition utilities
│   │   └── index.ts             # DSL exports
│   ├── market/                   # qi/dp/market implementation
│   │   ├── crypto/              # Cryptocurrency actors
│   │   │   ├── coingecko.ts     # CoinGecko data source
│   │   │   ├── binance.ts       # Binance data source
│   │   │   └── twelvedata.ts    # TwelveData multi-asset source
│   │   ├── streaming/           # Streaming targets
│   │   │   ├── kafka.ts         # Kafka/Redpanda streaming
│   │   │   └── timescale.ts     # TimescaleDB time-series
│   │   ├── types.ts             # Market-specific types
│   │   └── index.ts             # Market exports
│   ├── mcp/                      # qi/mcp implementation
│   │   ├── server.ts            # MCP server implementation
│   │   ├── tools.ts             # MCP tool definitions
│   │   ├── client.ts            # MCP client utilities
│   │   └── index.ts             # MCP exports
│   └── index.ts                  # Main exports
├── tests/                        # Test suite
│   ├── dsl/                      # DSL contract tests
│   │   ├── types.test.ts        # Type validation tests
│   │   ├── reader.test.ts       # Reader interface tests
│   │   └── writer.test.ts       # Writer interface tests
│   ├── market/                   # Market actor tests
│   │   ├── crypto/              # Cryptocurrency source tests
│   │   └── integration/         # End-to-end tests
│   ├── mcp/                      # MCP server tests
│   │   ├── server.test.ts       # MCP server tests
│   │   └── tools.test.ts        # MCP tools tests
│   └── contracts/                # Contract compliance tests
│       └── dsl-compliance.test.ts # DSL contract verification
├── docs/                         # TypeScript-specific docs
│   ├── api/                      # API documentation
│   ├── examples/                 # Usage examples
│   └── guides/                   # Implementation guides
└── examples/                     # Code examples
    ├── basic-market-data.ts     # Basic DSL usage
    ├── crypto-pipeline.ts       # Cryptocurrency data pipeline
    ├── streaming-analytics.ts   # Real-time analytics
    └── mcp-server.ts            # MCP server setup
```

## Installation

```bash
# Install dependencies with bun (including QiCore Foundation)
bun install

# Build the library
bun run build

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Run integration tests with live data
bun run test:integration

# Format and lint code
bun run format
bun run lint

# Type checking
bun run typecheck

# Complete check (format + lint + test + typecheck)
bun run check

# Start MCP server
bun run start:mcp

# Generate documentation
bun run docs
```

## Quick Start

### Basic Market Data Reading

```typescript
import { 
  DataContext, Market, Exchange, Instrument, AssetClass,
  MarketDataReader, Price, Level1, OHLCV,
  success, failure 
} from '@qi/dp-actor';

// Create Bitcoin context for Coinbase
const btcContext: DataContext = {
  market: {
    type: Market.CRYPTO,
    region: 'GLOBAL',
    segment: 'CASH'
  },
  exchange: {
    id: 'COINBASE',
    name: 'Coinbase Pro',
    mic: null,
    timezone: 'UTC'
  },
  instrument: {
    symbol: 'BTC-USD',
    isin: null,
    name: 'Bitcoin',
    assetClass: AssetClass.CRYPTO,
    currency: 'USD'
  }
};

// Create CoinGecko reader
const coinGeckoReader = await createCoinGeckoReader({
  apiKey: process.env.COINGECKO_API_KEY,
  rateLimit: { requestsPerMinute: 50 }
});

// Read current Bitcoin price
const priceResult = await coinGeckoReader.getCurrentPrice(btcContext);

priceResult.match(
  (marketData) => {
    console.log(`${marketData.context.exchange.name} ${marketData.context.instrument.symbol}: $${marketData.coreData.price}`);
    // Output: "Coinbase Pro BTC-USD: $45123.45"
  },
  (error) => {
    console.error(`Failed to get price: ${error.message}`);
  }
);
```

### Market Data Pipeline

```typescript
import { 
  createCoinGeckoReader, 
  createTimescaleWriter,
  createPipelineComposer 
} from '@qi/dp-actor';

// Setup data sources and targets
const sources = {
  coingecko: await createCoinGeckoReader(coinGeckoConfig),
  binance: await createBinanceReader(binanceConfig)
};

const targets = {
  timescale: await createTimescaleWriter(timescaleConfig),
  kafka: await createKafkaWriter(kafkaConfig)
};

// Create processing pipeline
const pipeline = createPipelineComposer()
  // Read from multiple sources
  .addReader('btc-prices', sources.coingecko, [btcContext, ethContext])
  .addReader('depth-data', sources.binance, [btcContext])
  
  // Transform data
  .transform('enrichment', (marketData) => ({
    ...marketData,
    coreData: {
      ...marketData.coreData,
      metadata: {
        processedAt: new Date().toISOString(),
        source: marketData.context.exchange.id
      }
    }
  }))
  
  // Write to multiple targets
  .addWriter('storage', targets.timescale)
  .addWriter('streaming', targets.kafka)
  
  // Error handling
  .onError((error, context) => {
    logger.error('Pipeline error', error, { context });
  });

// Execute pipeline
const result = await pipeline.execute();
```

### Real-Time Streaming

```typescript
import { 
  createBinanceStreamingReader,
  StreamingConfig,
  MarketDataStream 
} from '@qi/dp-actor';

// Setup streaming configuration
const streamingConfig: StreamingConfig = {
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
  dataTypes: ['trade', 'depth', 'ticker'],
  reconnect: true,
  maxReconnectAttempts: 5
};

// Create streaming reader
const streamingReader = await createBinanceStreamingReader(streamingConfig);

// Process real-time data
streamingReader.stream()
  .filter(marketData => marketData.coreData.price > 40000) // Filter high-value trades
  .map(marketData => enrichWithAnalytics(marketData))     // Add analytics
  .buffer(100)                                            // Batch for efficiency
  .subscribe({
    next: async (batch) => {
      // Write batch to TimescaleDB
      await targets.timescale.publishPrices(batch);
      
      // Publish to Kafka for real-time consumers
      await targets.kafka.publishPrices(batch);
    },
    error: (error) => {
      logger.error('Streaming error', error);
    },
    complete: () => {
      logger.info('Stream completed');
    }
  });
```

### MCP Server Integration

```typescript
import { 
  createMCPServer, 
  MCPTool, 
  MCPToolHandler 
} from '@qi/dp-actor';

// Define MCP tools for market data access
const marketDataTools: MCPTool[] = [
  {
    name: 'get_crypto_price',
    description: 'Get current cryptocurrency price',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Trading pair symbol (e.g., BTC-USD)' },
        exchange: { type: 'string', description: 'Exchange ID (e.g., COINBASE)' }
      },
      required: ['symbol', 'exchange']
    }
  },
  {
    name: 'get_market_analytics',
    description: 'Get market-wide analytics',
    inputSchema: {
      type: 'object',
      properties: {
        market: { type: 'string', enum: ['CRYPTO', 'EQUITY', 'FOREX'] }
      },
      required: ['market']
    }
  },
  {
    name: 'publish_price_data',
    description: 'Publish price data to storage',
    inputSchema: {
      type: 'object',
      properties: {
        marketData: { type: 'object', description: 'Market data object' },
        target: { type: 'string', description: 'Target storage system' }
      },
      required: ['marketData', 'target']
    }
  }
];

// Create MCP server with actor composition
const mcpServer = createMCPServer({
  name: 'qi-crypto-data-server',
  version: '4.0.0',
  tools: marketDataTools,
  
  // Inject data sources and targets
  sources: { coingecko: sources.coingecko, binance: sources.binance },
  targets: { timescale: targets.timescale, kafka: targets.kafka }
});

// Define tool handlers
mcpServer.addToolHandler('get_crypto_price', async (args) => {
  const context = createContextFromSymbol(args.symbol, args.exchange);
  const priceResult = await sources.coingecko.getCurrentPrice(context);
  
  return priceResult.match(
    (marketData) => ({
      success: true,
      data: {
        symbol: args.symbol,
        exchange: args.exchange,
        price: marketData.coreData.price,
        timestamp: marketData.coreData.timestamp,
        volume: marketData.coreData.size
      }
    }),
    (error) => ({
      success: false,
      error: error.message,
      code: error.code
    })
  );
});

mcpServer.addToolHandler('get_market_analytics', async (args) => {
  const analyticsResult = await sources.coingecko.getMarketAnalytics(args.market);
  
  return analyticsResult.match(
    (marketData) => ({
      success: true,
      data: {
        totalMarketCap: marketData.coreData.totalMarketCap,
        totalVolume: marketData.coreData.totalVolume,
        instrumentCount: marketData.coreData.instrumentCount,
        dominanceMetrics: marketData.coreData.dominanceMetrics,
        changeMetrics: marketData.coreData.changeMetrics
      }
    }),
    (error) => ({
      success: false,
      error: error.message,
      code: error.code
    })
  );
});

// Start MCP server
await mcpServer.start(8080);
console.log('QiCore MCP Server running on port 8080');
```

## Type Definitions

### Core DSL Types

```typescript
// Two-part market data structure
export interface MarketData<T extends CoreMarketData> {
  context: DataContext;      // WHO/WHERE/WHAT identification
  coreData: T;              // PURE market data (FIX compliant)
}

// Context identification
export interface DataContext {
  market: Market;           // Market classification
  exchange: Exchange;       // Exchange identification
  instrument: Instrument;   // Financial instrument details
}

export interface Market {
  type: MarketType;         // EQUITY, CRYPTO, FOREX, COMMODITY, BOND
  region: string;           // Geographic region (US, EU, ASIA, GLOBAL)
  segment: string;          // Market segment (CASH, FUTURES, OPTIONS)
}

export interface Exchange {
  id: string;               // Unique exchange identifier
  name: string;             // Human-readable exchange name
  mic: string | null;       // ISO 10383 Market Identifier Code
  timezone: string;         // Exchange timezone (IANA)
}

export interface Instrument {
  symbol: string;           // Exchange-specific symbol
  isin: string | null;      // International Securities Identification Number
  name: string;             // Human-readable instrument name
  assetClass: AssetClass;   // Classification of the underlying asset
  currency: string;         // Base currency (ISO 4217)
}

export enum MarketType {
  EQUITY = 'EQUITY',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  DERIVATIVE = 'DERIVATIVE'
}

export enum AssetClass {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  CURRENCY = 'CURRENCY',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  INDEX = 'INDEX'
}
```

### FIX Protocol Compliant Market Data

```typescript
// Real-time trade data (FIX MDEntryType=2)
export interface Price extends CoreMarketData {
  timestamp: string;        // ISO 8601 datetime (FIX Tag 273)
  price: number;           // Trade execution price (FIX Tag 270)
  size: number;            // Trade quantity/volume (FIX Tag 271)
  tradeId?: string;        // Unique trade identifier (FIX Tag 1003)
  aggressor?: Side;        // BUY or SELL aggressor (FIX Tag 54)
}

// Top-of-book quotes (FIX MDEntryType=0/1)
export interface Level1 extends CoreMarketData {
  timestamp: string;        // Quote observation time (FIX Tag 273)
  bidPrice: number;        // Best bid price (FIX Tag 270 + MDEntryType=0)
  bidSize: number;         // Best bid size (FIX Tag 271 + MDEntryType=0)
  askPrice: number;        // Best ask price (FIX Tag 270 + MDEntryType=1)
  askSize: number;         // Best ask size (FIX Tag 271 + MDEntryType=1)
  quoteId?: string;        // Unique quote identifier (FIX Tag 117)
  bidTime?: string;        // Bid-specific timestamp
  askTime?: string;        // Ask-specific timestamp
}

// Time-series aggregated data
export interface OHLCV extends CoreMarketData {
  timestamp: string;        // Bar/candle start time
  open: number;            // First trade price in period
  high: number;            // Highest trade price in period
  low: number;             // Lowest trade price in period
  close: number;           // Last trade price in period
  volume: number;          // Total volume traded in period
  tradeCount?: number;     // Number of trades in period
  weightedPrice?: number;  // Volume-weighted average price (VWAP)
}

// Multi-level order book
export interface MarketDepth extends CoreMarketData {
  timestamp: string;        // Depth capture time (FIX Tag 273)
  bids: DepthLevel[];      // Bid side of order book (MDEntryType=0)
  asks: DepthLevel[];      // Ask side of order book (MDEntryType=1)
  bookId?: string;         // Unique order book snapshot identifier
}

export interface DepthLevel {
  price: number;           // Price level (FIX Tag 270)
  size: number;            // Quantity at this level (FIX Tag 271)
  level: number;           // Book level (FIX Tag 1023), 1=top
}

// Market-wide analytics
export interface MarketAnalytics extends CoreMarketData {
  timestamp: string;            // Analytics calculation time
  totalMarketCap: number;      // Total market capitalization
  totalVolume: number;         // Total trading volume (period-specific)
  instrumentCount: number;     // Number of active instruments
  dominanceMetrics: DominanceMetrics;   // Market share percentages
  changeMetrics: ChangeMetrics;         // Period-over-period changes
  volatilityMetrics: VolatilityMetrics; // Market volatility measures
}

export interface DominanceMetrics {
  topInstrumentShare: number;    // Largest instrument market share (%)
  top5InstrumentShare: number;   // Top 5 instruments market share (%)
  top10InstrumentShare: number;  // Top 10 instruments market share (%)
}

export interface ChangeMetrics {
  change1h: number;             // 1-hour percentage change
  change24h: number;            // 24-hour percentage change
  change7d: number;             // 7-day percentage change
  change30d: number;            // 30-day percentage change
}

export interface VolatilityMetrics {
  volatility24h: number;        // 24-hour price volatility
  volatility7d: number;         // 7-day price volatility
  volatility30d: number;        // 30-day price volatility
}

export enum Side {
  BUY = 'BUY',
  SELL = 'SELL'
}

// Base interface for all market data
export interface CoreMarketData {
  timestamp: string;
}
```

### Reader/Writer Interfaces

```typescript
// Market data reading operations
export interface MarketDataReader {
  // Single operations
  getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;
  getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;
  getOHLCV(context: DataContext, timeframe: string): Promise<Result<MarketData<OHLCV>>>;
  getMarketDepth(context: DataContext, levels: number): Promise<Result<MarketData<MarketDepth>>>;
  
  // Batch operations
  getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;
  getOHLCVHistory(
    context: DataContext, 
    timeframe: string, 
    range: DateRange
  ): Promise<Result<MarketData<OHLCV>[]>>;
  
  // Market-wide operations
  getMarketAnalytics(market: MarketType): Promise<Result<MarketData<MarketAnalytics>>>;
}

// Market data writing operations
export interface MarketDataWriter {
  // Single operations
  publishPrice(data: MarketData<Price>): Promise<Result<void>>;
  publishLevel1(data: MarketData<Level1>): Promise<Result<void>>;
  publishOHLCV(data: MarketData<OHLCV>): Promise<Result<void>>;
  publishMarketDepth(data: MarketData<MarketDepth>): Promise<Result<void>>;
  publishAnalytics(data: MarketData<MarketAnalytics>): Promise<Result<void>>;
  
  // Batch operations
  publishPrices(data: MarketData<Price>[]): Promise<Result<void>>;
  publishOHLCVBatch(data: MarketData<OHLCV>[]): Promise<Result<void>>;
}

export interface DateRange {
  start: string;    // ISO 8601 datetime
  end: string;      // ISO 8601 datetime
}
```

### Streaming Types

```typescript
// Streaming market data
export interface MarketDataStream<T extends CoreMarketData> {
  filter(predicate: (data: MarketData<T>) => boolean): MarketDataStream<T>;
  map<U extends CoreMarketData>(
    transform: (data: MarketData<T>) => MarketData<U>
  ): MarketDataStream<U>;
  buffer(size: number): MarketDataStream<T[]>;
  throttle(intervalMs: number): MarketDataStream<T>;
  subscribe(observer: StreamObserver<T>): Subscription;
}

export interface StreamObserver<T extends CoreMarketData> {
  next: (data: MarketData<T> | MarketData<T>[]) => void | Promise<void>;
  error?: (error: QiError) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

// Streaming configuration
export interface StreamingConfig {
  symbols: string[];
  dataTypes: ('trade' | 'depth' | 'ticker' | 'ohlcv')[];
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}
```

### MCP Integration Types

```typescript
// MCP server configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPTool[];
  sources: Record<string, MarketDataReader>;
  targets: Record<string, MarketDataWriter>;
}

// MCP tool definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// MCP tool handler
export type MCPToolHandler = (args: any) => Promise<MCPResponse>;

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
}

// JSON Schema for tool input validation
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}
```

## Advanced Features

### Functional Composition

```typescript
import { pipe, compose } from '@qi/dp-actor/functional';

// Compose readers for parallel data fetching
const multiSourceReader = compose(
  sources.coingecko.getCurrentPrice,
  sources.binance.getCurrentPrice,
  sources.twelvedata.getCurrentPrice
);

// Parallel execution with fastest-wins semantics
const fasterPrice = await race([
  sources.coingecko.getCurrentPrice(btcContext),
  sources.binance.getCurrentPrice(btcContext)
]);

// Pipeline composition with error handling
const enrichmentPipeline = pipe(
  addTimestamp,
  addVolatilityMetrics,
  addTechnicalIndicators,
  validateMarketData
);

const enrichedData = await enrichmentPipeline(rawMarketData);
```

### Custom Actor Implementation

```typescript
import { MarketDataReader, DataContext, Result } from '@qi/dp-actor';

// Implement custom data source
export class CustomExchangeReader implements MarketDataReader {
  constructor(private config: CustomExchangeConfig) {}
  
  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    try {
      // Custom API integration
      const response = await this.apiClient.get(`/price/${context.instrument.symbol}`);
      
      // Transform to standardized format
      const price: Price = {
        timestamp: new Date(response.timestamp).toISOString(),
        price: response.last_price,
        size: response.volume,
        tradeId: response.trade_id
      };
      
      return success({
        context,
        coreData: price
      });
    } catch (error) {
      return failure(QiError.fromError(error, 'NETWORK'));
    }
  }
  
  // Implement other required methods...
}

// Register custom actor
const customReader = new CustomExchangeReader(customConfig);
const pipeline = createPipelineComposer()
  .addReader('custom-exchange', customReader, [btcContext]);
```

### Real-Time Analytics

```typescript
import { createAnalyticsEngine, MovingAverage, RSI, MACD } from '@qi/dp-actor/analytics';

// Create real-time analytics engine
const analyticsEngine = createAnalyticsEngine({
  indicators: [
    new MovingAverage('sma_20', 20),
    new MovingAverage('ema_12', 12, 'exponential'),
    new RSI('rsi_14', 14),
    new MACD('macd', 12, 26, 9)
  ]
});

// Process streaming data with analytics
streamingReader.stream()
  .map(marketData => analyticsEngine.process(marketData))
  .filter(enrichedData => enrichedData.coreData.indicators.rsi_14 > 70) // Overbought
  .subscribe({
    next: async (overboughtData) => {
      // Trigger alerts or automated trading
      await alertingService.send({
        type: 'OVERBOUGHT_ALERT',
        symbol: overboughtData.context.instrument.symbol,
        rsi: overboughtData.coreData.indicators.rsi_14,
        timestamp: overboughtData.coreData.timestamp
      });
    }
  });
```

## Performance Optimization

### Batching and Caching

```typescript
import { BatchProcessor, CacheLayer } from '@qi/dp-actor/performance';

// Create batch processor for high-throughput scenarios
const batchProcessor = new BatchProcessor<MarketData<Price>>({
  batchSize: 1000,
  flushInterval: 5000, // 5 seconds
  maxConcurrency: 10
});

// Add caching layer for frequently accessed data
const cachedReader = new CacheLayer(sources.coingecko, {
  ttl: 30000, // 30 seconds
  maxSize: 10000,
  keyGenerator: (context) => `${context.exchange.id}:${context.instrument.symbol}`
});

// Use cached reader in pipeline
const optimizedPipeline = createPipelineComposer()
  .addReader('cached-coingecko', cachedReader, contexts)
  .addProcessor('batcher', batchProcessor)
  .addWriter('batch-storage', targets.timescale);
```

### Connection Pooling

```typescript
import { ConnectionPool } from '@qi/dp-actor/networking';

// Create connection pool for external APIs
const apiPool = new ConnectionPool({
  maxConnections: 50,
  timeout: 10000,
  retryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential'
  }
});

// Use pooled connections in readers
const pooledReader = createCoinGeckoReader({
  ...config,
  connectionPool: apiPool
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createMockReader, createTestContext } from '@qi/dp-actor/testing';

describe('MarketDataReader', () => {
  it('should return valid price data', async () => {
    const mockReader = createMockReader({
      getCurrentPrice: () => success({
        context: createTestContext('BTC-USD'),
        coreData: {
          timestamp: '2024-01-01T12:00:00Z',
          price: 45000,
          size: 1.5
        }
      })
    });
    
    const result = await mockReader.getCurrentPrice(createTestContext('BTC-USD'));
    
    expect(result.isSuccess()).toBe(true);
    expect(result.unwrap().coreData.price).toBe(45000);
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('CoinGecko Integration', () => {
  let reader: MarketDataReader;
  
  beforeAll(async () => {
    reader = await createCoinGeckoReader({
      apiKey: process.env.COINGECKO_API_KEY_TEST,
      testMode: true
    });
  });
  
  it('should fetch real Bitcoin price', async () => {
    const btcContext = createBitcoinContext();
    const result = await reader.getCurrentPrice(btcContext);
    
    expect(result.isSuccess()).toBe(true);
    const marketData = result.unwrap();
    expect(marketData.coreData.price).toBeGreaterThan(0);
    expect(marketData.context.instrument.symbol).toBe('BTC-USD');
  });
});
```

### Contract Compliance Tests

```typescript
import { verifyDSLCompliance } from '@qi/dp-actor/contracts';

describe('DSL Contract Compliance', () => {
  it('should satisfy all DSL contracts', async () => {
    const readers = [sources.coingecko, sources.binance];
    const writers = [targets.timescale, targets.kafka];
    
    const complianceResult = await verifyDSLCompliance({
      readers,
      writers,
      testContexts: [btcContext, ethContext]
    });
    
    expect(complianceResult.isCompliant).toBe(true);
    expect(complianceResult.violations).toHaveLength(0);
  });
});
```

## Dependencies

### Core Dependencies
- **@qi/qicore-foundation**: ^4.0.0 - Foundation types and infrastructure
- **typescript**: ^5.0.0 - Modern TypeScript features
- **@types/node**: ^20.0.0 - Node.js type definitions

### HTTP/API Dependencies
- **axios**: ^1.6.0 - HTTP client for API integration
- **ws**: ^8.0.0 - WebSocket client for streaming data
- **ioredis**: ^5.0.0 - Redis client for caching

### Streaming Dependencies
- **kafkajs**: ^2.2.0 - Kafka client for streaming
- **@timescale/toolkit**: ^1.0.0 - TimescaleDB integration

### MCP Dependencies
- **@modelcontextprotocol/sdk**: ^1.0.0 - MCP server implementation
- **express**: ^4.18.0 - HTTP server for MCP endpoints
- **ajv**: ^8.12.0 - JSON schema validation

### Development Dependencies
- **vitest**: ^1.0.0 - Fast unit testing
- **@typescript-eslint**: ESLint for TypeScript
- **prettier**: Code formatting
- **fast-check**: Property-based testing

## Contract Compliance

This TypeScript implementation satisfies **ALL** DSL contracts defined in `../docs/dsl/qi.v4.dsl.contracts.md`:

- ✅ **Two-Part Structure**: DataContext + CoreMarketData separation
- ✅ **FIX Protocol 4.4**: Complete compliance for financial data
- ✅ **Type Safety**: All numeric fields validated, timestamps ISO 8601
- ✅ **Composition Laws**: Reader/writer compatibility verified
- ✅ **Error Handling**: Proper Result<T> error propagation
- ✅ **Universal Laws**: All behavioral contracts satisfied

## Related Projects

- **[@qi/qicore-foundation](../qi-v2-qicore/typescript)**: Foundation this project builds on
- **QiCore Applications**: Applications using this DSL for market data processing

---

**QiCore Data Processing Actors TypeScript**: Production-ready market data DSL with mathematical rigor, FIX Protocol compliance, and high-performance streaming capabilities.