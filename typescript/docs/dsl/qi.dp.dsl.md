# @qi/dp Market Data DSL - TypeScript Implementation Guide

**Package**: `@qi/dp/actor`  
**Module**: `lib/src/dsl/`  
**Language**: TypeScript

This document defines the TypeScript implementation guide for the @qi/dp Market Data DSL, using `@qi/base` foundation module for error handling.

**Reference**: This TypeScript implementation guide is based on the language-agnostic [@qi/dp DSL Contracts](../../docs/dsl/qi.dp.dsl.contracts.md), providing pure TypeScript interfaces for data and contracts defined there.

## Architecture Principles

The DSL follows **file-scoped namespacing** with ES6 module organization:

- **types.ts**: Context and supporting type vocabulary  
- **market-data.ts**: Core FIX Protocol 4.4 market data vocabulary
- **operations.ts**: Operation interface vocabulary

**Key Principle**: DSL defines pure vocabulary for market data domain using file scope as namespace.

## Foundation Module Usage

### @qi/base (Required)

All DSL operations must use foundation error handling from `@qi/base`:

```typescript
import { 
  type Result, 
  type QiError, 
  success,
  failure,
  match,
  create
} from '@qi/base';

// Import DSL modules with file-scoped namespacing
import * as DSL from './dsl/index.js';
import * as MD from './md/index.js';  // Future implementations

// Usage example
const price: DSL.Price = { 
  timestamp: '2025-01-01T00:00:00Z',
  price: '100.50',
  size: '1.0'
};

// Future concrete implementation
const priceImpl = new MD.Price(price);
```

---

# DSL Structure

The DSL consists of two fundamental parts:

## Part I: Data

### Data Context Types
Data context provides WHO/WHERE/WHAT identification for market data.

### Data Content Types  
Data content contains the core market data compliant with FIX Protocol 4.4.

## Part II: Contracts

### Data Context Contracts
Contracts for managing data context lifecycle and operations.

### Data Content Contracts
Contracts for reading, writing, and streaming data content that implement the data platform functionality.

---

# Part I: Data

## Data Context Types

Data context provides complete identification for market data through a three-layer structure.

### Market

Market classification and segment information:

```typescript
type MarketType =
  | 'EQUITY'
  | 'CRYPTO'
  | 'FOREX'
  | 'COMMODITY'
  | 'BOND'
  | 'DERIVATIVE';

type Segment = 
  | 'CASH'
  | 'FUTURES'
  | 'OPTIONS';

interface Market {
  type: MarketType;    // Market classification
  region: string;      // Two-letter region code
  segment: Segment;    // Market segment
}
```

### Exchange

Exchange identification and operational information:

```typescript
interface Exchange {
  id: string;          // Exchange identifier
  name: string;        // Exchange name
  mic: string | null;  // Market Identifier Code (ISO 10383)
  timezone: string;    // IANA timezone identifier
}
```

### Instrument

Financial instrument details and classification:

```typescript
type AssetClass = 
  | 'STOCK'
  | 'CRYPTO' 
  | 'CURRENCY'
  | 'COMMODITY'
  | 'BOND'
  | 'INDEX';

interface Instrument {
  symbol: string;      // Trading symbol
  isin: string | null; // International Securities Identification Number
  name: string;        // Instrument name
  assetClass: AssetClass; // Asset classification
  currency: string;    // Base currency code
}
```

### DataContext

Complete context wrapper combining all identification layers:

```typescript
interface DataContext {
  market: Market;      // Market information
  exchange: Exchange;  // Exchange information  
  instrument: Instrument; // Instrument information
}
```

### Context Query Types

Types for querying and filtering data context:

```typescript
interface ContextQuery {
  marketType: MarketType | null;     // Filter by market type
  exchangeId: string | null;         // Filter by exchange ID
  assetClass: AssetClass | null;     // Filter by asset class
  symbol: string | null;             // Filter by symbol pattern
  region: string | null;             // Filter by region
}
```

## Data Content Types

Data content represents the core market data, strictly compliant with FIX Protocol 4.4.

### Numeric Precision

All financial values use `decimal` type for precise arithmetic:

```typescript
type decimal = string; // Decimal representation for financial precision
```

### Price Data

**FIX Protocol 4.4 Compliance**: MDEntryType=2 (Trade)
- **Required Tags**: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize)  
- **Optional Tags**: 1003 (TradeID), 54 (Side)

```typescript
type Side = 'BUY' | 'SELL'; // FIX Tag 54 values: 1=Buy, 2=Sell

interface Price {
  timestamp: string;     // FIX Tag 273 (MDEntryTime) - ISO 8601 timestamp
  price: decimal;        // FIX Tag 270 (MDEntryPrice) - Decimal price value  
  size: decimal;         // FIX Tag 271 (MDEntrySize) - Decimal size value
  tradeId?: string;      // FIX Tag 1003 (TradeID) - Optional trade identifier
  aggressor?: Side;      // FIX Tag 54 (Side) - Optional aggressor side
}
```

### Level1 Data

**FIX Protocol 4.4 Compliance**: MDEntryType=0 (Bid) and MDEntryType=1 (Offer)
- **Required Tags**: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize)
- **Optional Tags**: 117 (QuoteID)
- **Market Data Entry**: Two entries - one for bid, one for ask

```typescript
interface Level1 {
  timestamp: string;     // FIX Tag 273 (MDEntryTime) - ISO 8601 timestamp
  bidPrice: decimal;     // FIX Tag 270 (MDEntryPrice) + MDEntryType=0 - Decimal bid price
  bidSize: decimal;      // FIX Tag 271 (MDEntrySize) + MDEntryType=0 - Decimal bid size
  askPrice: decimal;     // FIX Tag 270 (MDEntryPrice) + MDEntryType=1 - Decimal ask price
  askSize: decimal;      // FIX Tag 271 (MDEntrySize) + MDEntryType=1 - Decimal ask size
  quoteId?: string;      // FIX Tag 117 (QuoteID) - Optional quote identifier
  bidTime?: string;      // FIX Tag 273 (MDEntryTime) for bid specifically
  askTime?: string;      // FIX Tag 273 (MDEntryTime) for ask specifically
}
```

### OHLCV Data

**FIX Protocol 4.4 Compliance**: Derived from MDEntryType=2 (Trade) aggregations
- **Aggregation Fields**: open (first 270), high (max 270), low (min 270), close (last 270), volume (sum 271)
- **Industry Standard**: Used by Bloomberg, Thomson Reuters, TradingView

```typescript
interface OHLCV {
  timestamp: string;               // ISO 8601 timestamp (bar start time)
  open: decimal;                   // First trade price in period - FIX Tag 270
  high: decimal;                   // Highest trade price in period - FIX Tag 270
  low: decimal;                    // Lowest trade price in period - FIX Tag 270
  close: decimal;                  // Last trade price in period - FIX Tag 270
  volume: decimal;                 // Total volume traded in period - sum of FIX Tag 271
  baseVolume?: decimal;            // Optional decimal base volume
  quoteVolume?: decimal;           // Optional decimal quote volume
  tradeCount?: number;             // Optional trade count
  weightedAveragePrice?: decimal;  // Optional decimal VWAP
}
```

### MarketDepth Data

**FIX Protocol 4.4 Compliance**: Multi-level MDEntryType=0 (Bid) and MDEntryType=1 (Offer)
- **Required Tags**: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize), 1023 (MDPriceLevel)
- **Market Data Entries**: Multiple entries per side, ordered by price level

```typescript
interface DepthLevel {
  price: decimal;        // FIX Tag 270 (MDEntryPrice) - Decimal price at level
  size: decimal;         // FIX Tag 271 (MDEntrySize) - Decimal size at level
  level: number;         // FIX Tag 1023 (MDPriceLevel) - Book level (1-based)
}

interface MarketDepth {
  timestamp: string;      // FIX Tag 273 (MDEntryTime) - ISO 8601 timestamp
  bids: DepthLevel[];     // Bid side (MDEntryType=0) - sorted by price descending
  asks: DepthLevel[];     // Ask side (MDEntryType=1) - sorted by price ascending
  sequenceNumber?: number;    // Optional sequence number
  totalBidSize?: decimal;     // Optional decimal total bid size
  totalAskSize?: decimal;     // Optional decimal total ask size
}
```

### Core Data Union

Union type of all core market data types:

```typescript
type CoreMarketData = Price | Level1 | OHLCV | MarketDepth;
```

### Market Data Wrapper

Container combining context with core data:

```typescript
interface MarketData<T extends CoreMarketData> {
  context: DataContext; // WHO/WHERE/WHAT identification
  coreData: T;         // Core FIX Protocol data
}
```

### Supporting Types

Additional types for data operations:

```typescript
interface DateRange {
  startDate: string;    // ISO 8601 date string
  endDate: string;      // ISO 8601 date string
}

type Timeframe = 
  | '1s' | '5s'
  | '1m' | '5m' | '15m'
  | '1h' | '4h'
  | '1d' | '1w' | '1M' | '1Y';

type Levels = 1 | 5 | 10 | 50 | 100 | 500 | 1000;
```

### Universal Data Laws

1. **Two-Part Structure**: All market data follows `MarketData = DataContext + CoreMarketData`
2. **Numeric Precision**: All financial values must use `decimal` type
3. **Timestamp Format**: All timestamps must be ISO 8601 strings
4. **Non-Null Constraints**: All required fields must be non-null
5. **Range Validation**: All numeric values must be finite (no NaN/Infinity)
6. **Temporal Ordering**: Timestamps must represent valid chronological order

---

# Part II: Contracts

## Data Context Contracts

### MarketDataContextManager Interface

Contract for managing data context lifecycle and operations:

```typescript
interface MarketDataContextManager {
  createContext(market: Market, exchange: Exchange, instrument: Instrument): Promise<Result<DataContext>>;
  getContext(query: ContextQuery): Promise<Result<DataContext[]>>;
  updateMarket(context: DataContext, market: Market): Promise<Result<DataContext>>;
  updateExchange(context: DataContext, exchange: Exchange): Promise<Result<DataContext>>;
  updateInstrument(context: DataContext, instrument: Instrument): Promise<Result<DataContext>>;
  validateContext(context: DataContext): Promise<Result<void>>;
}
```

**Contract Laws**:
1. **createContext**: All components must be valid according to their contracts
2. **getContext**: Empty query returns all available contexts
3. **update*** operations**: Preserve other components, validate new component
4. **validateContext**: Validates each component and cross-component consistency

## Data Content Contracts

### MarketDataReader Interface

Contract for current data retrieval operations:

```typescript
interface MarketDataReader {
  getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;
  getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;
  getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;
  getMarketDepth(context: DataContext, levels: Levels): Promise<Result<MarketData<MarketDepth>>>;
  getOHLCV(context: DataContext, timeframe: Timeframe): Promise<Result<MarketData<OHLCV>>>;
}
```

### HistoricalMarketDataReader Interface

Contract for historical data retrieval operations:

```typescript
interface HistoricalMarketDataReader {
  getPriceHistory(context: DataContext, dateRange: DateRange): Promise<Result<MarketData<Price>[]>>;
  getLevel1History(context: DataContext, dateRange: DateRange): Promise<Result<MarketData<Level1>[]>>;
  getOHLCVHistory(context: DataContext, timeframe: Timeframe, dateRange: DateRange): Promise<Result<MarketData<OHLCV>[]>>;
  getMarketDepthHistory(context: DataContext, levels: Levels, dateRange: DateRange): Promise<Result<MarketData<MarketDepth>[]>>;
}
```

### StreamingMarketDataReader Interface

Contract for real-time data subscription operations:

```typescript
interface Subscription {
  readonly id: string;
  readonly context: DataContext;
  readonly isActive: boolean;
}

interface StreamingMarketDataReader {
  subscribePriceStream(context: DataContext, callback: (data: MarketData<Price>) => void): Promise<Result<Subscription>>;
  subscribeLevel1Stream(context: DataContext, callback: (data: MarketData<Level1>) => void): Promise<Result<Subscription>>;
  subscribeMarketDepthStream(context: DataContext, levels: Levels, callback: (data: MarketData<MarketDepth>) => void): Promise<Result<Subscription>>;
  subscribeOHLCVStream(context: DataContext, timeframe: Timeframe, callback: (data: MarketData<OHLCV>) => void): Promise<Result<Subscription>>;
  unsubscribe(subscription: Subscription): Promise<Result<void>>;
}
```

### MarketDataWriter Interface

Contract for data writing operations:

```typescript
interface MarketDataWriter {
  writePrice(data: MarketData<Price>): Promise<Result<void>>;
  writePrices(data: MarketData<Price>[]): Promise<Result<void>>;
  writeLevel1(data: MarketData<Level1>): Promise<Result<void>>;
  writeMarketDepth(data: MarketData<MarketDepth>): Promise<Result<void>>;
  writeOHLCV(data: MarketData<OHLCV>): Promise<Result<void>>;
  writeOHLCVBatch(data: MarketData<OHLCV>[]): Promise<Result<void>>;
}
```

### HistoricalMarketDataWriter Interface

Contract for historical data writing operations:

```typescript
interface HistoricalMarketDataWriter {
  writePriceHistory(data: MarketData<Price>[]): Promise<Result<void>>;
  writeLevel1History(data: MarketData<Level1>[]): Promise<Result<void>>;
  writeOHLCVHistory(data: MarketData<OHLCV>[]): Promise<Result<void>>;
  writeMarketDepthHistory(data: MarketData<MarketDepth>[]): Promise<Result<void>>;
}
```

### StreamingMarketDataWriter Interface

Contract for real-time data publishing operations:

```typescript
interface PriceStream {
  write(data: Price): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface Level1Stream {
  write(data: Level1): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface MarketDepthStream {
  write(data: MarketDepth): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface OHLCVStream {
  write(data: OHLCV): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface StreamingMarketDataWriter {
  startPriceStream(context: DataContext): Promise<Result<PriceStream>>;
  startLevel1Stream(context: DataContext): Promise<Result<Level1Stream>>;
  startMarketDepthStream(context: DataContext, levels: Levels): Promise<Result<MarketDepthStream>>;
  startOHLCVStream(context: DataContext, timeframe: Timeframe): Promise<Result<OHLCVStream>>;
}
```

### Universal Contract Laws

1. **All operations return Result<T>** for functional error handling
2. **Context determines routing** - implementations use DataContext for source/destination routing  
3. **FIX Protocol compliance** - all core data must comply with FIX 4.4 where applicable
4. **Chronological ordering** - historical operations maintain temporal order
5. **Resource management** - streaming operations must provide proper cleanup
6. **Error categories** - use appropriate ErrorCategory (VALIDATION, NETWORK, TIMEOUT, etc.)