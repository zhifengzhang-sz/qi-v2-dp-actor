# QiCore DP Actor Implementation TODO

## Overview

This document provides a comprehensive TODO list for completing the qi-v2-dp-actor/typescript implementation to support the qi-v2-is integration. The missing components are organized by priority and implementation complexity.

## Current Status

### ✅ Completed Components (ts-0.6.0)
- **DSL Layer**: Complete vocabulary (types, interfaces, operations)
- **MD Layer**: Smart constructors for all market data types
- **Utils Layer**: Analytics, precision arithmetic, validation
- **Abstract Actors**: Base classes for all actor types
- **Redpanda Actors**: Complete streaming integration
- **Testing**: 655 tests passing with comprehensive coverage

### 🔄 Missing Components for qi-v2-is Integration

## Priority 1: Core Data Source Actors (Week 1-2)

### HTTP-based Market Data Readers

#### 1.1 CoinGecko Reader
**File**: `lib/src/actor/http/CoinGeckoReader.ts`
**Extends**: `HTTPReader` (abstract base class)

**Requirements**:
- [ ] Implement `getCurrentPrice()` method
- [ ] Implement `getOHLCV()` method  
- [ ] Implement `getMarketAnalytics()` method
- [ ] Add rate limiting (50 req/min free, 500 req/min pro)
- [ ] Add symbol mapping (BTC-USD → bitcoin)
- [ ] Add error handling and retry logic
- [ ] Add response caching with TTL

**API Endpoints**:
```typescript
// Price endpoint
GET /api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true

// OHLC endpoint  
GET /api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1

// Global market data
GET /api/v3/global
```

**Test Requirements**:
- [ ] Unit tests with mocked responses
- [ ] Integration tests with real API (test account)
- [ ] Rate limiting tests
- [ ] Error handling tests
- [ ] Cache behavior tests

---

#### 1.2 Binance Reader  
**File**: `lib/src/actor/http/BinanceReader.ts`
**Extends**: `HTTPReader`

**Requirements**:
- [ ] Implement `getCurrentPrice()` using `/ticker/price`
- [ ] Implement `getLevel1()` using `/depth?limit=1`
- [ ] Implement `getOHLCV()` using `/klines`
- [ ] Add exchange info caching
- [ ] Add symbol normalization (BTC/USD → BTCUSDT)
- [ ] Add weight-based rate limiting (1200 weight/min)
- [ ] Support testnet and mainnet endpoints

**API Endpoints**:
```typescript
// Price endpoint
GET /api/v3/ticker/price?symbol=BTCUSDT

// Order book depth
GET /api/v3/depth?symbol=BTCUSDT&limit=1

// Kline/candlestick data
GET /api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1

// Exchange info (cached)
GET /api/v3/exchangeInfo
```

**Test Requirements**:
- [ ] Unit tests with mocked responses
- [ ] Integration tests with Binance testnet
- [ ] Weight tracking and rate limiting tests
- [ ] Symbol normalization tests
- [ ] Reconnection logic tests

---

#### 1.3 TwelveData Reader
**File**: `lib/src/actor/http/TwelveDataReader.ts`  
**Extends**: `HTTPReader`

**Requirements**:
- [ ] Implement multi-asset support (crypto, stocks, forex)
- [ ] Implement `getCurrentPrice()` using `/price`
- [ ] Implement `getOHLCV()` using `/time_series`
- [ ] Add instrument type detection
- [ ] Add market hours validation
- [ ] Support real-time and delayed data
- [ ] Add batch request optimization

**API Endpoints**:
```typescript
// Real-time price
GET /price?symbol=BTCUSD&apikey=xxx

// Time series data
GET /time_series?symbol=AAPL&interval=1h&outputsize=1&apikey=xxx

// Multiple symbols (batch)
GET /price?symbol=BTCUSD,ETHUSD,AAPL&apikey=xxx
```

**Test Requirements**:
- [ ] Multi-asset integration tests
- [ ] Batch request tests
- [ ] Market hours validation tests
- [ ] Rate limiting compliance tests

---

#### 1.4 Alpha Vantage Reader
**File**: `lib/src/actor/http/AlphaVantageReader.ts`
**Extends**: `HTTPReader`

**Requirements**:
- [ ] Implement stock market data retrieval
- [ ] Implement `getCurrentPrice()` using `GLOBAL_QUOTE`
- [ ] Implement `getOHLCV()` using `TIME_SERIES_INTRADAY`
- [ ] Add fundamental data support
- [ ] Add economic indicators
- [ ] Support adjusted/unadjusted prices
- [ ] Add corporate actions handling

**API Endpoints**:
```typescript
// Current quote
GET /query?function=GLOBAL_QUOTE&symbol=IBM&apikey=xxx

// Intraday time series  
GET /query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=xxx

// Daily adjusted
GET /query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&apikey=xxx
```

**Test Requirements**:
- [ ] Stock market data integration tests
- [ ] Fundamental data parsing tests
- [ ] Corporate actions handling tests

---

### Base HTTP Reader Infrastructure

#### 1.5 HTTPReader Abstract Base Class
**File**: `lib/src/actor/http/HTTPReader.ts`
**Extends**: `Reader`

**Requirements**:
- [ ] HTTP client with configurable timeout/retries
- [ ] Rate limiting with per-provider limits
- [ ] Response caching with configurable TTL
- [ ] Request/response logging
- [ ] Circuit breaker for failed endpoints
- [ ] Request queuing for burst protection

**Implementation**:
```typescript
export abstract class HTTPReader extends Reader {
  protected httpClient: HTTPClient;
  protected rateLimiter: RateLimiter;
  protected cache: LRUCache<string, any>;
  protected circuitBreaker: CircuitBreaker;
  
  constructor(config: HTTPReaderConfig) {
    super();
    this.setupHttpClient(config);
    this.setupRateLimiting(config);
    this.setupCaching(config);
    this.setupCircuitBreaker(config);
  }
  
  protected async makeRequest<T>(endpoint: string, params?: any): Promise<Result<T>>;
  protected abstract transformToPrice(data: any, context: DataContext): Result<Price>;
  protected abstract transformToLevel1(data: any, context: DataContext): Result<Level1>;
  protected abstract transformToOHLCV(data: any, context: DataContext): Result<OHLCV>;
}
```

---

## Priority 2: WebSocket Streaming Actors (Week 2)

### 2.1 Binance WebSocket Streaming Reader
**File**: `lib/src/actor/websocket/BinanceStreamingReader.ts`
**Extends**: `WebSocketStreamingReader`

**Requirements**:
- [ ] Real-time trade streams (`<symbol>@trade`)
- [ ] Order book updates (`<symbol>@depth`)
- [ ] 24hr ticker statistics (`<symbol>@ticker`)
- [ ] Kline/candlestick streams (`<symbol>@kline_<interval>`)
- [ ] Combined stream support
- [ ] Auto-reconnection with exponential backoff
- [ ] Heartbeat/ping handling
- [ ] Stream subscription management

**WebSocket Streams**:
```typescript
// Individual streams
wss://stream.binance.com:9443/ws/btcusdt@trade
wss://stream.binance.com:9443/ws/btcusdt@depth
wss://stream.binance.com:9443/ws/btcusdt@ticker

// Combined stream
wss://stream.binance.com:9443/stream?streams=btcusdt@trade/btcusdt@depth/btcusdt@ticker
```

**Test Requirements**:
- [ ] Stream connection and data parsing tests
- [ ] Reconnection logic tests
- [ ] Multi-symbol subscription tests
- [ ] Message rate and latency tests

---

### 2.2 Generic WebSocket Reader
**File**: `lib/src/actor/websocket/GenericWSReader.ts`
**Extends**: `WebSocketStreamingReader`

**Requirements**:
- [ ] Configurable WebSocket endpoints
- [ ] Pluggable message parsers
- [ ] Generic subscription management
- [ ] Configurable heartbeat handling
- [ ] Authentication support (API keys, tokens)
- [ ] Custom reconnection strategies

**Configuration**:
```typescript
interface GenericWSConfig {
  url: string;
  subscriptions: SubscriptionConfig[];
  messageParser: (data: any) => MarketData<any> | null;
  heartbeatConfig?: HeartbeatConfig;
  authConfig?: AuthConfig;
  reconnectConfig: ReconnectConfig;
}
```

---

### 2.3 WebSocket Base Class Infrastructure
**File**: `lib/src/actor/websocket/WebSocketStreamingReader.ts`
**Extends**: `StreamingReader`

**Requirements**:
- [ ] WebSocket lifecycle management
- [ ] Connection pooling for multiple streams
- [ ] Subscription state management  
- [ ] Message queuing and buffering
- [ ] Error recovery and reconnection
- [ ] Performance monitoring (latency, throughput)

---

## Priority 3: Storage and Persistence Actors (Week 3)

### 3.1 TimescaleDB Writer
**File**: `lib/src/actor/database/TimescaleDBWriter.ts`
**Extends**: `Writer`

**Requirements**:
- [ ] Hypertable creation and management
- [ ] Batch insert optimization
- [ ] Connection pooling
- [ ] Schema migrations
- [ ] Compression policies
- [ ] Continuous aggregates
- [ ] Data retention policies

**Database Schema**:
```sql
-- Prices table (hypertable)
CREATE TABLE prices (
  timestamp TIMESTAMPTZ NOT NULL,
  exchange_id VARCHAR(50) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  size DECIMAL(20,8) NOT NULL,
  trade_id VARCHAR(100),
  aggressor VARCHAR(10)
);

-- Convert to hypertable
SELECT create_hypertable('prices', 'timestamp');

-- Compression policy
SELECT add_compression_policy('prices', INTERVAL '7 days');
```

**Test Requirements**:
- [ ] Database schema creation tests
- [ ] Batch insert performance tests
- [ ] Compression policy tests
- [ ] Connection pooling tests

---

### 3.2 TimescaleDB Reader
**File**: `lib/src/actor/database/TimescaleDBReader.ts`
**Extends**: `Reader`

**Requirements**:
- [ ] Historical data queries
- [ ] Time-based aggregations
- [ ] Performance optimization (indexes)
- [ ] Query result caching
- [ ] Parallel query execution
- [ ] Data export capabilities

**Query Examples**:
```sql
-- Get OHLCV data
SELECT 
  time_bucket('1 hour', timestamp) AS hour,
  first(price, timestamp) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, timestamp) AS close,
  sum(size) AS volume
FROM prices 
WHERE symbol = 'BTCUSDT' 
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

---

### 3.3 Redis Cache Actor
**File**: `lib/src/actor/cache/RedisActor.ts`
**Implements**: `MarketDataReader`, `MarketDataWriter`

**Requirements**:
- [ ] Key-value caching for market data
- [ ] Time-based expiration (TTL)
- [ ] Pub/sub for real-time updates
- [ ] Connection pooling
- [ ] Cluster support
- [ ] Memory usage monitoring

**Cache Strategies**:
```typescript
// Price caching
key: `price:${exchangeId}:${symbol}`
ttl: 30 seconds

// OHLCV caching  
key: `ohlcv:${exchangeId}:${symbol}:${timeframe}`
ttl: timeframe duration

// Market analytics caching
key: `analytics:${market}:${region}`
ttl: 5 minutes
```

---

### 3.4 SQLite Actor (Development)
**File**: `lib/src/actor/database/SQLiteActor.ts`
**Implements**: `MarketDataReader`, `MarketDataWriter`

**Requirements**:
- [ ] Local development database
- [ ] Schema migrations
- [ ] CRUD operations
- [ ] Transaction support
- [ ] Backup/restore functionality
- [ ] WAL mode for concurrent access

---

## Priority 4: File I/O Actors (Week 3-4)

### 4.1 CSV Reader/Writer
**Files**: 
- `lib/src/actor/file/CSVReader.ts`
- `lib/src/actor/file/CSVWriter.ts`

**Requirements**:
- [ ] CSV parsing with configurable formats
- [ ] Streaming for large files
- [ ] Data validation during parsing
- [ ] Export market data to CSV
- [ ] Compression support (gzip)
- [ ] Progress reporting for large files

**CSV Formats**:
```csv
# Price data
timestamp,exchange,symbol,price,size,trade_id,aggressor
2025-01-01T12:00:00Z,BINANCE,BTCUSDT,45000.50,1.25,12345,BUY

# OHLCV data
timestamp,exchange,symbol,open,high,low,close,volume
2025-01-01T12:00:00Z,BINANCE,BTCUSDT,45000,45100,44900,45050,125.5
```

---

### 4.2 JSON Actor
**File**: `lib/src/actor/file/JSONActor.ts`

**Requirements**:
- [ ] JSON file reading/writing
- [ ] Schema validation (JSON Schema)
- [ ] Pretty printing options
- [ ] Streaming JSON for large datasets
- [ ] Configuration file management

---

### 4.3 Parquet Actor
**File**: `lib/src/actor/file/ParquetActor.ts`

**Requirements**:
- [ ] Columnar storage for analytical workloads
- [ ] Compression (Snappy, LZ4, GZIP)
- [ ] Schema evolution support
- [ ] Partition support for time series
- [ ] Integration with analytical tools

---

## Priority 5: Strategy Support Components (Week 4)

### 5.1 Technical Indicators Calculator
**File**: `lib/src/utils/indicators/IndicatorCalculator.ts`

**Requirements**:
- [ ] Integration with `technicalindicators` library
- [ ] Custom indicator implementations
- [ ] Streaming indicator updates
- [ ] Indicator composition and chaining
- [ ] Performance optimization

**Indicators**:
```typescript
interface IndicatorCalculator {
  // Moving averages
  calculateSMA(prices: number[], period: number): number[];
  calculateEMA(prices: number[], period: number): number[];
  calculateWMA(prices: number[], period: number): number[];
  
  // Oscillators
  calculateRSI(prices: number[], period: number): number[];
  calculateMACD(prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACDResult[];
  calculateStochastic(high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number): StochasticResult[];
  
  // Volatility
  calculateBollingerBands(prices: number[], period: number, stdDev: number): BollingerBandsResult[];
  calculateATR(high: number[], low: number[], close: number[], period: number): number[];
  
  // Volume
  calculateOBV(close: number[], volume: number[]): number[];
  calculateVWAP(high: number[], low: number[], close: number[], volume: number[]): number[];
}
```

---

### 5.2 Pattern Recognition
**File**: `lib/src/utils/patterns/PatternRecognizer.ts`

**Requirements**:
- [ ] Candlestick pattern recognition
- [ ] Chart pattern detection
- [ ] Support/resistance level identification
- [ ] Trend line detection
- [ ] Pattern confidence scoring

**Patterns**:
```typescript
interface PatternRecognizer {
  // Candlestick patterns
  detectDoji(ohlcv: OHLCV[]): PatternResult[];
  detectHammer(ohlcv: OHLCV[]): PatternResult[];
  detectEngulfing(ohlcv: OHLCV[]): PatternResult[];
  
  // Chart patterns
  detectTriangle(ohlcv: OHLCV[]): PatternResult[];
  detectHeadAndShoulders(ohlcv: OHLCV[]): PatternResult[];
  detectFlag(ohlcv: OHLCV[]): PatternResult[];
  
  // Support/Resistance
  findSupportLevels(ohlcv: OHLCV[], lookback: number): SupportLevel[];
  findResistanceLevels(ohlcv: OHLCV[], lookback: number): ResistanceLevel[];
}
```

---

### 5.3 Backtesting Engine
**File**: `lib/src/strategy/BacktestEngine.ts`

**Requirements**:
- [ ] Historical simulation framework
- [ ] Performance metrics calculation
- [ ] Walk-forward analysis
- [ ] Monte Carlo simulation
- [ ] Commission and slippage modeling
- [ ] Multiple timeframe support

**Backtesting Flow**:
```typescript
class BacktestEngine {
  async runBacktest(config: BacktestConfig): Promise<Result<BacktestResult>> {
    // Load historical data
    const data = await this.loadHistoricalData(config);
    
    // Initialize strategy
    const strategy = this.createStrategy(config.strategyType, config.strategyConfig);
    
    // Run simulation
    const trades = await this.simulateTrading(strategy, data, config);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(trades, config);
    
    // Generate report
    return Ok({
      config,
      trades,
      metrics,
      charts: this.generateCharts(trades, data)
    });
  }
}
```

---

## Priority 6: Integration and Orchestration (Week 5)

### 6.1 CCXT Universal Adapter
**File**: `lib/src/actor/ccxt/CCXTAdapter.ts`

**Requirements**:
- [ ] Universal exchange interface using CCXT
- [ ] Support 100+ exchanges
- [ ] Unified API normalization
- [ ] Error handling and retry logic
- [ ] Exchange-specific optimizations
- [ ] Market data and trading support

**CCXT Integration**:
```typescript
export class CCXTAdapter implements MarketDataReader {
  private exchange: ccxt.Exchange;
  
  constructor(exchangeId: string, config: CCXTConfig) {
    const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt] as any;
    this.exchange = new ExchangeClass(config);
  }
  
  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    try {
      const ticker = await this.exchange.fetchTicker(context.instrument.symbol);
      const price = Price.create(
        new Date(ticker.timestamp).toISOString(),
        ticker.last.toString(),
        ticker.baseVolume?.toString() || "0"
      );
      
      return price.map(p => ({ context, coreData: p }));
    } catch (error) {
      return this.handleCCXTError(error);
    }
  }
}
```

---

### 6.2 Data Pipeline Orchestrator  
**File**: `lib/src/pipeline/DataPipeline.ts`

**Requirements**:
- [ ] Pipeline composition and execution
- [ ] Parallel and sequential processing
- [ ] Error handling and recovery
- [ ] Data transformation stages
- [ ] Performance monitoring
- [ ] Pipeline visualization

**Pipeline Builder**:
```typescript
class DataPipelineBuilder {
  private stages: PipelineStage[] = [];
  
  addReader(id: string, reader: MarketDataReader, contexts: DataContext[]): this {
    this.stages.push(new ReaderStage(id, reader, contexts));
    return this;
  }
  
  addTransform(id: string, transformer: DataTransformer): this {
    this.stages.push(new TransformStage(id, transformer));
    return this;
  }
  
  addWriter(id: string, writer: MarketDataWriter): this {
    this.stages.push(new WriterStage(id, writer));
    return this;
  }
  
  build(): DataPipeline {
    return new DataPipeline(this.stages);
  }
}
```

---

### 6.3 Actor Orchestrator
**File**: `lib/src/orchestration/ActorOrchestrator.ts`

**Requirements**:
- [ ] Actor lifecycle management
- [ ] Dependency injection
- [ ] Configuration management
- [ ] Health monitoring
- [ ] Graceful shutdown
- [ ] Resource cleanup

---

## Testing Strategy

### Test Categories

#### 6.4 Unit Tests
**Pattern**: `lib/tests/actor/{category}/{ActorName}.test.ts`

**Requirements**:
- [ ] Mock external dependencies
- [ ] Test error scenarios  
- [ ] Validate transformations
- [ ] Test configuration handling
- [ ] Performance benchmarks

#### 6.5 Integration Tests
**Pattern**: `lib/tests/integration/{category}/`

**Requirements**:
- [ ] Real API integration tests
- [ ] Database integration tests
- [ ] End-to-end pipeline tests
- [ ] Performance tests
- [ ] Load tests

#### 6.6 Contract Tests
**File**: `lib/tests/contracts/`

**Requirements**:
- [ ] Verify DSL contract compliance
- [ ] Interface compatibility tests
- [ ] Data structure validation
- [ ] Error handling compliance

---

## Development Setup

### 6.7 Development Environment
**Requirements**:
- [ ] Docker Compose setup for dependencies
- [ ] Development configuration templates
- [ ] API key management
- [ ] Local testing guides
- [ ] Debug configuration

**Docker Compose**:
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: trading_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_pass
      
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
```

---

## Documentation Requirements

### 6.8 API Documentation
**Requirements**:
- [ ] Complete TypeScript API docs
- [ ] Usage examples for each actor
- [ ] Configuration guides
- [ ] Error handling guides
- [ ] Performance tuning guides

### 6.9 Integration Guides
**Requirements**:
- [ ] Step-by-step integration guides
- [ ] Common patterns and best practices
- [ ] Troubleshooting guides
- [ ] Production deployment guides

---

## Release Timeline

### Week 1-2: Core Data Sources
- Complete HTTP readers (CoinGecko, Binance, TwelveData, AlphaVantage)
- Complete WebSocket streaming (Binance, Generic)
- Create comprehensive tests

### Week 3: Storage Layer
- Complete database actors (TimescaleDB, SQLite)
- Complete cache actors (Redis)
- Complete file I/O actors (CSV, JSON, Parquet)

### Week 4: Strategy Support
- Complete technical indicators
- Complete pattern recognition
- Complete backtesting engine

### Week 5: Integration
- Complete CCXT adapter
- Complete pipeline orchestration
- End-to-end testing

### Week 6: Documentation and Release
- Complete API documentation
- Complete integration guides
- Performance optimization
- Production deployment guides
- Release ts-0.7.0

---

## Success Criteria

### Technical Metrics
- [ ] All planned actors implemented and tested
- [ ] >95% test coverage for new components
- [ ] <100ms latency for real-time data
- [ ] >1000 requests/second throughput
- [ ] Zero memory leaks in long-running tests

### Integration Metrics  
- [ ] qi-v2-is successfully integrated
- [ ] All major data sources working
- [ ] Real-time trading pipeline operational
- [ ] Production deployment successful
- [ ] Documentation complete and accurate

### Quality Metrics
- [ ] All TypeScript compilation errors resolved
- [ ] All linting issues resolved
- [ ] All tests passing in CI/CD
- [ ] Performance benchmarks met
- [ ] Security audit passed

This comprehensive TODO provides a clear roadmap for completing the qi-v2-dp-actor implementation to support the qi-v2-is integration requirements.