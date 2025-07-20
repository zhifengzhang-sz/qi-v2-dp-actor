# @qi/dp Market Data DSL - TypeScript Specification

This document defines the TypeScript implementation contracts for the @qi/dp Market Data DSL, including usage of `@qi/base` and `@qi/core` foundation modules.

**Dependencies**: This specification implements [@qi/dp DSL Contracts](../../docs/dsl/qi.dp.dsl.contracts.md) using TypeScript with strict compliance to the language-agnostic contracts.

## Foundation Module Usage

### @qi/base (Required)

All DSL operations must use foundation error handling from `@qi/base`:

```typescript
import { 
  type Result, 
  type QiError, 
  type ErrorCategory,
  success,
  failure,
  isSuccess,
  isFailure,
  getValue,
  getError,
  map,
  flatMap,
  networkError,
  validationError
} from '@qi/base';

// All DSL operations return Result<T> for functional error handling
type DSLOperation<T> = (...args: any[]) => Promise<Result<T>>;

// Error categories used in DSL operations
const DSL_ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION' as ErrorCategory,
  NOT_FOUND: 'NOT_FOUND' as ErrorCategory,
  NETWORK: 'NETWORK' as ErrorCategory,
  PARSING: 'PARSING' as ErrorCategory,
  TIMEOUT: 'TIMEOUT' as ErrorCategory,
} as const;

// Example DSL operation signatures
const getCurrentPrice: (context: DataContext) => Promise<Result<MarketData<Price>>> = async (context) => {
  try {
    const priceData = await fetchPriceData(context);
    return success(priceData);
  } catch (error) {
    return failure(networkError('Failed to fetch price data', { context, error }));
  }
};

// Example using functional Result transformations
const transformPrice = async (context: DataContext): Promise<Result<number>> => {
  const result = await getCurrentPrice(context);
  
  // Using map: function comes first, result second
  return map((marketData: MarketData<Price>) => marketData.coreData.price, result);
};

// Example using flatMap for chaining operations
const validateAndGetPrice = async (context: DataContext): Promise<Result<MarketData<Price>>> => {
  const result = await getCurrentPrice(context);
  
  // Using flatMap: function comes first, result second  
  return flatMap((marketData: MarketData<Price>) => {
    if (marketData.coreData.price <= 0) {
      return failure(validationError('Invalid price value', { price: marketData.coreData.price }));
    }
    return success(marketData);
  }, result);
};
```

### @qi/core (Required)

All DSL implementations must use QiCore Foundation infrastructure modules:

```typescript
import { Config, ConfigManager } from '@qi/core/config';
import { Logger, LogContext } from '@qi/core/logger';
import { Cache, CacheKey, CacheTTL } from '@qi/core/cache';

// Configuration management for data sources
interface MarketDataConfig extends Config {
  dataSources: {
    coinGecko: {
      apiKey: string;
      baseUrl: string;
      rateLimits: {
        requestsPerMinute: number;
      };
    };
    binance: {
      apiKey: string;
      secretKey: string;
      baseUrl: string;
    };
  };
  caching: {
    pricesTTL: CacheTTL;
    level1TTL: CacheTTL;
    ohlcvTTL: CacheTTL;
  };
}

// Logging with structured context
interface MarketDataLogContext extends LogContext {
  operation: string;
  exchange: string;
  symbol: string;
  timestamp: string;
}

// Caching for performance optimization
interface MarketDataCacheKey extends CacheKey {
  type: 'price' | 'level1' | 'ohlcv' | 'depth';
  context: DataContext;
  timeframe?: Timeframe;
}

// Usage in DSL implementation
class MarketDataService {
  constructor(
    private config: ConfigManager<MarketDataConfig>,
    private logger: Logger<MarketDataLogContext>,
    private cache: Cache<MarketDataCacheKey, any>
  ) {}

  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    const logContext: MarketDataLogContext = {
      operation: 'getCurrentPrice',
      exchange: context.exchange.id,
      symbol: context.instrument.symbol,
      timestamp: new Date().toISOString(),
    };

    this.logger.info('Fetching current price', logContext);

    // Check cache first
    const cacheKey: MarketDataCacheKey = { type: 'price', context };
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Price found in cache', logContext);
      return Result.success(cached);
    }

    // Fetch from data source
    try {
      const price = await this.fetchPriceFromSource(context);
      await this.cache.set(cacheKey, price, this.config.get().caching.pricesTTL);
      this.logger.info('Price fetched successfully', logContext);
      return Result.success(price);
    } catch (error) {
      this.logger.error('Failed to fetch price', { ...logContext, error: error.message });
      return Result.failure(new QiError(DSL_ERROR_CATEGORIES.NETWORK, 'Price fetch failed', error));
    }
  }
}
```

## TypeScript Precision Requirements

DSL implementations must use `Decimal` type for all financial values to guarantee 8 decimal place precision:

```typescript
// Required: Use decimal.js for financial precision
import Decimal from 'decimal.js';

// All financial values use Decimal type
interface Price {
  readonly timestamp: string;      // ISO 8601 datetime
  readonly price: Decimal;         // 8 decimal precision guaranteed
  readonly size: Decimal;          // 8 decimal precision guaranteed
  readonly tradeId?: string;
  readonly aggressor?: Side;
}

// Type validation using Decimal built-in methods
const isValidPrice = (value: Decimal): boolean => {
  return value.isPositive() && value.isFinite() && !value.isNaN();
};

const isValidSize = (value: Decimal): boolean => {
  return value.greaterThanOrEqualTo(0) && value.isFinite() && !value.isNaN();
};
```

**Note**: For advanced financial calculations, formatting, and utility functions, see `precision.md` documentation.

## TypeScript Batch Operation Implementation

TypeScript implementations must handle batch operations with proper error aggregation:

```typescript
// Batch error type for collecting individual failures
interface BatchError<T> extends QiError {
  readonly failedItems: Array<{
    item: T;
    index: number;
    error: QiError;
  }>;
  readonly successfulItems: Array<{
    item: T;
    index: number;
    result: any;
  }>;
  readonly successRate: number; // Percentage of successful operations
}

// Batch operation result type
type BatchResult<T, R> = Result<{
  results: R[];
  errors: BatchError<T> | null;
  successRate: number;
}>;

// Example batch price writing implementation
const writePrices = async (
  prices: MarketData<Price>[],
  writer: MarketDataWriter
): Promise<BatchResult<MarketData<Price>, void>> => {
  const results: Array<{ success: boolean; index: number; error?: QiError }> = [];
  const failedItems: BatchError<MarketData<Price>>['failedItems'] = [];
  const successfulItems: BatchError<MarketData<Price>>['successfulItems'] = [];
  
  // Process all items, collecting errors
  for (let i = 0; i < prices.length; i++) {
    try {
      const result = await writer.writePrice(prices[i]);
      if (result.isSuccess()) {
        successfulItems.push({ item: prices[i], index: i, result: undefined });
        results.push({ success: true, index: i });
      } else {
        const error = result.getError();
        failedItems.push({ item: prices[i], index: i, error });
        results.push({ success: false, index: i, error });
      }
    } catch (error) {
      const qiError = new QiError('NETWORK', 'Unexpected error during write', error);
      failedItems.push({ item: prices[i], index: i, error: qiError });
      results.push({ success: false, index: i, error: qiError });
    }
  }
  
  const successRate = (successfulItems.length / prices.length) * 100;
  
  // Determine if batch operation succeeds (>50% success rate)
  if (successRate >= 50) {
    const batchError = failedItems.length > 0 ? {
      ...new QiError('PARTIAL_FAILURE', `${failedItems.length} items failed`),
      failedItems,
      successfulItems,
      successRate
    } as BatchError<MarketData<Price>> : null;
    
    return Result.success({
      results: successfulItems.map(() => undefined),
      errors: batchError,
      successRate
    });
  } else {
    const batchError: BatchError<MarketData<Price>> = {
      ...new QiError('BATCH_FAILURE', `Batch failed: ${successRate}% success rate`),
      failedItems,
      successfulItems,
      successRate
    };
    return Result.failure(batchError);
  }
};
```

## TypeScript Time Handling Implementation

TypeScript implementation must use proper timezone-aware date handling:

```typescript
// Required: Use date-fns for timezone-aware operations
import { parseISO, formatISO, isValid, isFuture, differenceInSeconds } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Timestamp validation with timezone requirements
const isValidTimestamp = (timestamp: Date): boolean => {
  return isValid(timestamp) && 
         !isFuture(timestamp, { comparisonDate: new Date(Date.now() + 5 * 60 * 1000) }) && // Not more than 5 minutes in future
         differenceInSeconds(new Date(), timestamp) < 86400; // Not older than 24 hours for real-time data
};

// Timestamp creation helper
const createTimestamp = (isoString: string): Result<Date> => {
  try {
    const parsed = parseISO(isoString);
    
    if (!isValid(parsed)) {
      return Result.failure(new QiError('VALIDATION', 'Invalid timestamp format'));
    }
    
    if (!isValidTimestamp(parsed)) {
      return Result.failure(new QiError('VALIDATION', 'Timestamp outside acceptable range'));
    }
    
    return Result.success(parsed);
  } catch (error) {
    return Result.failure(new QiError('PARSING', 'Failed to parse timestamp', error));
  }
};

// Market data with proper timestamp handling
interface TimestampedMarketData<T> {
  readonly context: DataContext;
  readonly coreData: T;
  readonly timestamp: Date;        // Source timestamp (exchange time)
  readonly receivedAt?: Date;      // When data was received by our system
  readonly processedAt?: Date;     // When processing completed
}

// Timestamp validation for market data
const validateMarketDataTimestamp = <T>(data: TimestampedMarketData<T>): Result<void> => {
  if (!isValidTimestamp(data.timestamp)) {
    return Result.failure(new QiError('VALIDATION', 'Invalid source timestamp'));
  }
  
  if (data.receivedAt && !isValidTimestamp(data.receivedAt)) {
    return Result.failure(new QiError('VALIDATION', 'Invalid received timestamp'));
  }
  
  if (data.processedAt && !isValidTimestamp(data.processedAt)) {
    return Result.failure(new QiError('VALIDATION', 'Invalid processed timestamp'));
  }
  
  // Validate timestamp ordering
  if (data.receivedAt && data.timestamp > data.receivedAt) {
    return Result.failure(new QiError('VALIDATION', 'Source timestamp cannot be after received timestamp'));
  }
  
  if (data.processedAt && data.receivedAt && data.receivedAt > data.processedAt) {
    return Result.failure(new QiError('VALIDATION', 'Received timestamp cannot be after processed timestamp'));
  }
  
  return Result.success(undefined);
};

// Example usage with proper timezone handling
const formatTimestampForLog = (timestamp: Date): string => {
  return formatISO(timestamp, { representation: 'complete' }); // Always includes timezone
};
```

## Contract Categories Overview

### All DSL Contracts Implementation Summary

| Category | Contract | TypeScript Type | Purpose | FIX Compliance |
|----------|----------|-----------------|---------|----------------|
| **Context Types** | `DataContext` | interface | Market/Exchange/Instrument ID | N/A |
| | `Market` | interface | Market classification | N/A |
| | `Exchange` | interface | Exchange identification | N/A |
| | `Instrument` | interface | Financial instrument details | N/A |
| **Core Data Types** | `Price` | interface | Real-time trade data | MDEntryType=2 (Trade) |
| | `Level1` | interface | Top-of-book quotes | MDEntryType=0/1 (Bid/Offer) |
| | `OHLCV` | interface | Time-series aggregated data | Derived from Trade aggregations |
| | `MarketDepth` | interface | Multi-level order book | Multi-level MDEntryType=0/1 |
| **Support Types** | `DepthLevel` | interface | Single order book level | FIX price level |
| | `AssetClass` | union type | Asset classification | N/A |
| | `MarketType` | union type | Market type classification | N/A |
| | `Side` | union type | Trade aggressor side | FIX Tag 54 |
| | `ContextQuery` | interface | Context query criteria | N/A |
| **Context Management** | `MarketDataContextManager` | interface | Context lifecycle management | N/A |
| **Reading Operations** | `MarketDataReader` | interface | Current data retrieval | All FIX compliant |
| | `HistoricalMarketDataReader` | interface | Historical data retrieval | All FIX compliant |
| | `StreamingMarketDataReader` | interface | Real-time data streaming | All FIX compliant |
| **Writing Operations** | `MarketDataWriter` | interface | Data writing | All FIX compliant |
| | `HistoricalMarketDataWriter` | interface | Historical data writing | All FIX compliant |
| | `StreamingMarketDataWriter` | interface | Real-time data writing | All FIX compliant |
| **Composite Types** | `MarketData<T>` | generic interface | Context + Core data wrapper | FIX compliant core data |
| | `DateRange` | interface | Time period specification | N/A |
| | `Timeframe` | type alias | Time interval specification | N/A |
| | `Levels` | type alias | Order book depth specification | N/A |

### TypeScript Type Legend
- **interface**: TypeScript interface defining object structure with named fields
- **union type**: TypeScript union type (`'A' | 'B'`) for enumerated values
- **generic interface**: Parameterized interface with type variables (`<T>`)
- **type alias**: TypeScript type alias for primitive or validated types

### Implementation Notes
- All interfaces include comprehensive runtime validation functions
- Factory functions provided for safe object creation with Result<T> error handling
- Type guards ensure runtime type safety beyond compile-time checking
- Constants exported for common values (exchanges, timeframes, depth levels)

## Data Context Types

### DataContext

```typescript
import { Market, Exchange, Instrument } from './types';

/**
 * Complete identification for market data context
 * Implements: qi.dp.dsl.contracts.md#DataContext
 */
interface DataContext {
  readonly market: Market;
  readonly exchange: Exchange;
  readonly instrument: Instrument;
}

// Type guards for validation
const isValidDataContext = (obj: any): obj is DataContext => {
  return obj != null &&
         isValidMarket(obj.market) &&
         isValidExchange(obj.exchange) &&
         isValidInstrument(obj.instrument);
};
```

### Market

```typescript
/**
 * Market classification with discriminated union
 * Implements: qi.dp.dsl.contracts.md#Market
 */
type MarketType = 'EQUITY' | 'CRYPTO' | 'FOREX' | 'COMMODITY' | 'BOND' | 'DERIVATIVE';

interface Market {
  readonly type: MarketType;
  readonly region: string; // ISO country code or 'GLOBAL'
  readonly segment: 'CASH' | 'FUTURES' | 'OPTIONS';
}

// Type guards and validators
const isValidMarketType = (type: string): type is MarketType => {
  return ['EQUITY', 'CRYPTO', 'FOREX', 'COMMODITY', 'BOND', 'DERIVATIVE'].includes(type);
};

const isValidRegion = (region: string): boolean => {
  return /^[A-Z]{2}|GLOBAL$/.test(region);
};

const isValidMarket = (obj: any): obj is Market => {
  return obj != null &&
         isValidMarketType(obj.type) &&
         isValidRegion(obj.region) &&
         ['CASH', 'FUTURES', 'OPTIONS'].includes(obj.segment);
};

// Factory functions
const createMarket = (type: MarketType, region: string, segment: Market['segment']): Result<Market> => {
  if (!isValidMarketType(type)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, `Invalid market type: ${type}`));
  }
  if (!isValidRegion(region)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, `Invalid region: ${region}`));
  }
  return Result.success({ type, region, segment });
};
```

### Exchange

```typescript
/**
 * Exchange identification data
 * Implements: qi.dp.dsl.contracts.md#Exchange
 */
interface Exchange {
  readonly id: string;
  readonly name: string;
  readonly mic: string | null; // ISO 10383 Market Identifier Code
  readonly timezone: string; // IANA timezone
}

// Validation patterns
const EXCHANGE_ID_PATTERN = /^[A-Z0-9_]+$/;
const MIC_PATTERN = /^[A-Z]{4}$/;
const TIMEZONE_PATTERN = /^[A-Za-z]+\/[A-Za-z_]+$/;

const isValidExchange = (obj: any): obj is Exchange => {
  return obj != null &&
         typeof obj.id === 'string' &&
         EXCHANGE_ID_PATTERN.test(obj.id) &&
         obj.id.length >= 1 && obj.id.length <= 50 &&
         typeof obj.name === 'string' &&
         obj.name.length >= 1 && obj.name.length <= 200 &&
         (obj.mic === null || (typeof obj.mic === 'string' && MIC_PATTERN.test(obj.mic))) &&
         typeof obj.timezone === 'string' &&
         TIMEZONE_PATTERN.test(obj.timezone);
};

// Factory function
const createExchange = (
  id: string,
  name: string,
  mic: string | null,
  timezone: string
): Result<Exchange> => {
  const exchange = { id, name, mic, timezone };
  if (!isValidExchange(exchange)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid exchange data'));
  }
  return Result.success(exchange);
};

// Common exchanges
export const EXCHANGES = {
  NYSE: { id: 'NYSE', name: 'New York Stock Exchange', mic: 'XNYS', timezone: 'America/New_York' },
  BINANCE: { id: 'BINANCE', name: 'Binance', mic: null, timezone: 'UTC' },
  COINBASE: { id: 'COINBASE', name: 'Coinbase Pro', mic: null, timezone: 'America/New_York' },
  KRAKEN: { id: 'KRAKEN', name: 'Kraken Digital Asset Exchange', mic: null, timezone: 'UTC' },
} as const satisfies Record<string, Exchange>;
```

### Instrument

```typescript
/**
 * Financial instrument details
 * Implements: qi.dp.dsl.contracts.md#Instrument
 */
type AssetClass = 'STOCK' | 'CRYPTO' | 'CURRENCY' | 'COMMODITY' | 'BOND' | 'INDEX';

interface Instrument {
  readonly symbol: string;
  readonly isin: string | null; // ISO 6166 ISIN format
  readonly name: string;
  readonly assetClass: AssetClass;
  readonly currency: string; // ISO 4217 currency code
}

// Validation patterns
const SYMBOL_PATTERN = /^[A-Z0-9\-_\.]+$/;
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{10}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const isValidAssetClass = (assetClass: string): assetClass is AssetClass => {
  return ['STOCK', 'CRYPTO', 'CURRENCY', 'COMMODITY', 'BOND', 'INDEX'].includes(assetClass);
};

const isValidInstrument = (obj: any): obj is Instrument => {
  return obj != null &&
         typeof obj.symbol === 'string' &&
         SYMBOL_PATTERN.test(obj.symbol) &&
         obj.symbol.length >= 1 && obj.symbol.length <= 50 &&
         (obj.isin === null || (typeof obj.isin === 'string' && ISIN_PATTERN.test(obj.isin))) &&
         typeof obj.name === 'string' &&
         obj.name.length >= 1 && obj.name.length <= 200 &&
         isValidAssetClass(obj.assetClass) &&
         typeof obj.currency === 'string' &&
         CURRENCY_PATTERN.test(obj.currency);
};

// Factory function
const createInstrument = (
  symbol: string,
  isin: string | null,
  name: string,
  assetClass: AssetClass,
  currency: string
): Result<Instrument> => {
  const instrument = { symbol, isin, name, assetClass, currency };
  if (!isValidInstrument(instrument)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid instrument data'));
  }
  return Result.success(instrument);
};
```

## Core Market Data Types

The DSL defines four core market data types that map directly to FIX Protocol 4.4 standards. These types represent the fundamental vocabulary of financial market data.

**Note**: Market analytics and derived metrics have been moved to the separate Analytics layer in `docs/data-manager/analytics.md` for proper architectural separation. The DSL focuses solely on pure market data vocabulary.

### MarketData Wrapper

```typescript
/**
 * Two-part structure: context + core data
 * Implements: qi.dp.dsl.contracts.md#MarketData
 */
interface MarketData<T extends CoreMarketData> {
  readonly context: DataContext;
  readonly coreData: T;
}

// Base type for all core market data  
type CoreMarketData = Price | Level1 | OHLCV | MarketDepth;

// Type guard
const isValidMarketData = <T extends CoreMarketData>(
  obj: any,
  coreDataValidator: (data: any) => data is T
): obj is MarketData<T> => {
  return obj != null &&
         isValidDataContext(obj.context) &&
         coreDataValidator(obj.coreData);
};

// Factory function
const createMarketData = <T extends CoreMarketData>(
  context: DataContext,
  coreData: T
): MarketData<T> => {
  return { context, coreData };
};
```

### Price Data

```typescript
/**
 * Real-time trade/tick data (FIX MDEntryType=2)
 * Implements: qi.dp.dsl.contracts.md#Price
 * 
 * FIX Protocol 4.4 Compliance:
 * - MDEntryType=2 (Trade)
 * - Required Tags: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize)
 * - Optional Tags: 1003 (TradeID), 54 (Side)
 */
type Side = 'BUY' | 'SELL'; // FIX Tag 54 values: 1=Buy, 2=Sell

interface Price {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime
  readonly price: Decimal; // FIX Tag 270 (MDEntryPrice) - 8 decimal precision
  readonly size: Decimal; // FIX Tag 271 (MDEntrySize) - 8 decimal precision
  readonly tradeId?: string; // FIX Tag 1003 (TradeID) - Optional trade identifier
  readonly aggressor?: Side; // FIX Tag 54 (Side) - Optional trade aggressor
}

// Validation
const isValidISO8601 = (timestamp: string): boolean => {
  return !isNaN(Date.parse(timestamp));
};

// Note: isPositiveFinite function removed - now using Decimal validation methods

const isValidSide = (side: string): side is Side => {
  return side === 'BUY' || side === 'SELL';
};

const isValidPrice = (obj: any): obj is Price => {
  return obj != null &&
         typeof obj.timestamp === 'string' &&
         isValidISO8601(obj.timestamp) &&
         obj.price instanceof Decimal &&
         obj.price.isPositive() && obj.price.isFinite() && !obj.price.isNaN() &&
         obj.size instanceof Decimal &&
         obj.size.isPositive() && obj.size.isFinite() && !obj.size.isNaN() &&
         (obj.tradeId === undefined || typeof obj.tradeId === 'string') &&
         (obj.aggressor === undefined || isValidSide(obj.aggressor));
};

// Factory function
const createPrice = (
  timestamp: string,
  price: Decimal,
  size: Decimal,
  tradeId?: string,
  aggressor?: Side
): Result<Price> => {
  const priceData = { timestamp, price, size, tradeId, aggressor };
  if (!isValidPrice(priceData)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid price data'));
  }
  return Result.success(priceData);
};
```

### Level1 Data

```typescript
/**
 * Top-of-book bid/ask quotes (FIX MDEntryType=0/1)
 * Implements: qi.dp.dsl.contracts.md#Level1
 * 
 * FIX Protocol 4.4 Compliance:
 * - MDEntryType=0 (Bid) and MDEntryType=1 (Offer)
 * - Required Tags: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize)
 * - Optional Tags: 117 (QuoteID)
 * - Market Data Entry: Two entries - one for bid, one for ask
 */
interface Level1 {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime
  readonly bidPrice: Decimal; // FIX Tag 270 (MDEntryPrice) + MDEntryType=0 - 8 decimal precision
  readonly bidSize: Decimal; // FIX Tag 271 (MDEntrySize) + MDEntryType=0 - 8 decimal precision
  readonly askPrice: Decimal; // FIX Tag 270 (MDEntryPrice) + MDEntryType=1 - 8 decimal precision
  readonly askSize: Decimal; // FIX Tag 271 (MDEntrySize) + MDEntryType=1 - 8 decimal precision
  readonly quoteId?: string; // FIX Tag 117 (QuoteID) - Optional quote identifier
  readonly bidTime?: string; // FIX Tag 273 (MDEntryTime) for bid specifically
  readonly askTime?: string; // FIX Tag 273 (MDEntryTime) for ask specifically
}

const isValidLevel1 = (obj: any): obj is Level1 => {
  return obj != null &&
         typeof obj.timestamp === 'string' &&
         isValidISO8601(obj.timestamp) &&
         obj.bidPrice instanceof Decimal &&
         obj.bidPrice.isPositive() && obj.bidPrice.isFinite() && !obj.bidPrice.isNaN() &&
         obj.bidSize instanceof Decimal &&
         obj.bidSize.isPositive() && obj.bidSize.isFinite() && !obj.bidSize.isNaN() &&
         obj.askPrice instanceof Decimal &&
         obj.askPrice.isPositive() && obj.askPrice.isFinite() && !obj.askPrice.isNaN() &&
         obj.askSize instanceof Decimal &&
         obj.askSize.isPositive() && obj.askSize.isFinite() && !obj.askSize.isNaN() &&
         obj.askPrice.greaterThanOrEqual(obj.bidPrice) && // No crossed market
         (obj.quoteId === undefined || typeof obj.quoteId === 'string') &&
         (obj.bidTime === undefined || (typeof obj.bidTime === 'string' && isValidISO8601(obj.bidTime))) &&
         (obj.askTime === undefined || (typeof obj.askTime === 'string' && isValidISO8601(obj.askTime)));
};

// Factory function
const createLevel1 = (
  timestamp: string,
  bidPrice: Decimal,
  bidSize: Decimal,
  askPrice: Decimal,
  askSize: Decimal,
  quoteId?: string,
  bidTime?: string,
  askTime?: string
): Result<Level1> => {
  const level1Data = { timestamp, bidPrice, bidSize, askPrice, askSize, quoteId, bidTime, askTime };
  if (!isValidLevel1(level1Data)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid Level1 data'));
  }
  return Result.success(level1Data);
};
```

### OHLCV Data

```typescript
/**
 * Time-series aggregated price data (derived from FIX Trade aggregations)
 * Implements: qi.dp.dsl.contracts.md#OHLCV
 */
interface OHLCV {
  readonly timestamp: string; // ISO 8601 datetime (bar start time)
  readonly open: Decimal; // First trade price in period - 8 decimal precision
  readonly high: Decimal; // Highest trade price in period - 8 decimal precision
  readonly low: Decimal; // Lowest trade price in period - 8 decimal precision
  readonly close: Decimal; // Last trade price in period - 8 decimal precision
  readonly volume: Decimal; // Total volume traded in period - 8 decimal precision
  readonly tradeCount?: number; // Optional number of trades
  readonly weightedPrice?: Decimal; // Optional VWAP - 8 decimal precision
}

const isValidOHLCV = (obj: any): obj is OHLCV => {
  return obj != null &&
         typeof obj.timestamp === 'string' &&
         isValidISO8601(obj.timestamp) &&
         obj.open instanceof Decimal &&
         obj.open.isPositive() && obj.open.isFinite() && !obj.open.isNaN() &&
         obj.high instanceof Decimal &&
         obj.high.isPositive() && obj.high.isFinite() && !obj.high.isNaN() &&
         obj.low instanceof Decimal &&
         obj.low.isPositive() && obj.low.isFinite() && !obj.low.isNaN() &&
         obj.close instanceof Decimal &&
         obj.close.isPositive() && obj.close.isFinite() && !obj.close.isNaN() &&
         obj.volume instanceof Decimal &&
         obj.volume.isPositive() && obj.volume.isFinite() && !obj.volume.isNaN() &&
         obj.low.lessThanOrEqual(obj.open) && obj.open.lessThanOrEqual(obj.high) && // OHLC constraints
         obj.low.lessThanOrEqual(obj.close) && obj.close.lessThanOrEqual(obj.high) &&
         obj.low.lessThanOrEqual(obj.high) &&
         (obj.tradeCount === undefined || (Number.isInteger(obj.tradeCount) && obj.tradeCount > 0)) &&
         (obj.weightedPrice === undefined || (obj.weightedPrice instanceof Decimal && obj.weightedPrice.isPositive() && obj.weightedPrice.isFinite() && !obj.weightedPrice.isNaN()));
};

// Factory function
const createOHLCV = (
  timestamp: string,
  open: Decimal,
  high: Decimal,
  low: Decimal,
  close: Decimal,
  volume: Decimal,
  tradeCount?: number,
  weightedPrice?: Decimal
): Result<OHLCV> => {
  const ohlcvData = { timestamp, open, high, low, close, volume, tradeCount, weightedPrice };
  if (!isValidOHLCV(ohlcvData)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid OHLCV data'));
  }
  return Result.success(ohlcvData);
};
```

### MarketDepth Data

```typescript
/**
 * Multi-level order book depth (FIX multi-level MDEntryType=0/1)
 * Implements: qi.dp.dsl.contracts.md#MarketDepth
 * 
 * FIX Protocol 4.4 Compliance:
 * - MDEntryType=0 (Bid) and MDEntryType=1 (Offer) at multiple levels
 * - Required Tags: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize), 1023 (MDPriceLevel)
 * - Market Data Entries: Multiple entries per side, ordered by price level
 */
interface DepthLevel {
  readonly price: Decimal; // FIX Tag 270 (MDEntryPrice) - Price level - 8 decimal precision
  readonly size: Decimal; // FIX Tag 271 (MDEntrySize) - Quantity at this level - 8 decimal precision
  readonly level: number; // FIX Tag 1023 (MDPriceLevel) - Book level (1=top)
}

interface MarketDepth {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime when depth was captured
  readonly bids: readonly DepthLevel[]; // Bid side (MDEntryType=0) - sorted by price descending
  readonly asks: readonly DepthLevel[]; // Ask side (MDEntryType=1) - sorted by price ascending
  readonly bookId?: string; // Optional book snapshot identifier
}

const isValidDepthLevel = (obj: any): obj is DepthLevel => {
  return obj != null &&
         obj.price instanceof Decimal &&
         obj.price.isPositive() && obj.price.isFinite() && !obj.price.isNaN() &&
         obj.size instanceof Decimal &&
         obj.size.isPositive() && obj.size.isFinite() && !obj.size.isNaN() &&
         typeof obj.level === 'number' &&
         Number.isInteger(obj.level) &&
         obj.level > 0;
};

const isValidMarketDepth = (obj: any): obj is MarketDepth => {
  if (obj == null ||
      typeof obj.timestamp !== 'string' ||
      !isValidISO8601(obj.timestamp) ||
      !Array.isArray(obj.bids) ||
      !Array.isArray(obj.asks) ||
      (obj.bookId !== undefined && typeof obj.bookId !== 'string')) {
    return false;
  }

  // Validate all levels
  if (!obj.bids.every(isValidDepthLevel) || !obj.asks.every(isValidDepthLevel)) {
    return false;
  }

  // Check sorting: bids descending, asks ascending
  for (let i = 1; i < obj.bids.length; i++) {
    if (obj.bids[i].price.greaterThan(obj.bids[i - 1].price)) return false;
  }
  for (let i = 1; i < obj.asks.length; i++) {
    if (obj.asks[i].price.lessThan(obj.asks[i - 1].price)) return false;
  }

  // Check no crossed book (highest bid <= lowest ask)
  if (obj.bids.length > 0 && obj.asks.length > 0) {
    if (obj.bids[0].price.greaterThan(obj.asks[0].price)) return false;
  }

  return true;
};

// Factory function
const createMarketDepth = (
  timestamp: string,
  bids: DepthLevel[],
  asks: DepthLevel[],
  bookId?: string
): Result<MarketDepth> => {
  const depthData = { timestamp, bids, asks, bookId };
  if (!isValidMarketDepth(depthData)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid MarketDepth data'));
  }
  return Result.success(depthData);
};
```


## Support Types

### DateRange

```typescript
/**
 * Time period specification for historical data
 * Implements: qi.dp.dsl.contracts.md#DateRange
 */
interface DateRange {
  readonly startDate: string; // ISO 8601 datetime (inclusive)
  readonly endDate: string; // ISO 8601 datetime (inclusive)
}

const isValidDateRange = (obj: any): obj is DateRange => {
  return obj != null &&
         typeof obj.startDate === 'string' &&
         isValidISO8601(obj.startDate) &&
         typeof obj.endDate === 'string' &&
         isValidISO8601(obj.endDate) &&
         new Date(obj.startDate) <= new Date(obj.endDate);
};

const createDateRange = (startDate: string, endDate: string): Result<DateRange> => {
  const dateRange = { startDate, endDate };
  if (!isValidDateRange(dateRange)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid date range'));
  }
  return Result.success(dateRange);
};
```

### Timeframe

```typescript
/**
 * Time intervals for OHLCV aggregated data
 * Implements: qi.dp.dsl.contracts.md#Timeframe
 */
type TimeframeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M';
type Timeframe = string; // Pattern: /^\d+[smhdwM]$/

const TIMEFRAME_PATTERN = /^(\d+)([smhdwM])$/;

const isValidTimeframe = (timeframe: string): timeframe is Timeframe => {
  const match = timeframe.match(TIMEFRAME_PATTERN);
  return match !== null && parseInt(match[1]) > 0;
};

const parseTimeframe = (timeframe: Timeframe): { value: number; unit: TimeframeUnit } | null => {
  const match = timeframe.match(TIMEFRAME_PATTERN);
  if (!match) return null;
  return {
    value: parseInt(match[1]),
    unit: match[2] as TimeframeUnit,
  };
};

// Common timeframes
export const TIMEFRAMES = {
  ONE_MINUTE: '1m',
  FIVE_MINUTES: '5m',
  FIFTEEN_MINUTES: '15m',
  THIRTY_MINUTES: '30m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w',
  ONE_MONTH: '1M',
} as const satisfies Record<string, Timeframe>;
```

### Levels

```typescript
/**
 * Order book depth specification
 * Implements: qi.dp.dsl.contracts.md#Levels
 */
type Levels = number; // Positive integer, 1-1000

const isValidLevels = (levels: number): levels is Levels => {
  return Number.isInteger(levels) && levels >= 1 && levels <= 1000;
};

// Common levels
export const DEPTH_LEVELS = {
  TOP_5: 5,
  TOP_10: 10,
  TOP_20: 20,
  TOP_50: 50,
  TOP_100: 100,
} as const satisfies Record<string, Levels>;
```

## Context Management Operations

### ContextQuery Type

Query criteria for retrieving market data contexts:

```typescript
/**
 * Query criteria for context retrieval
 * Null fields are ignored (wildcard match)
 * 
 * @example
 * // Query all crypto contexts
 * const cryptoQuery: ContextQuery = {
 *   marketType: 'CRYPTO',
 *   exchangeId: null,
 *   assetClass: null,
 *   symbol: null,
 *   region: null
 * };
 * 
 * @example  
 * // Query specific symbol on specific exchange
 * const btcCoinbaseQuery: ContextQuery = {
 *   marketType: null,
 *   exchangeId: 'COINBASE',
 *   assetClass: null,
 *   symbol: 'BTC-USD',
 *   region: null
 * };
 */
interface ContextQuery {
  readonly marketType: MarketType | null;  // Filter by market type
  readonly exchangeId: string | null;      // Filter by exchange ID
  readonly assetClass: AssetClass | null;  // Filter by asset class
  readonly symbol: string | null;          // Filter by instrument symbol
  readonly region: string | null;          // Filter by market region
}

// Type guard for ContextQuery
const isValidContextQuery = (obj: any): obj is ContextQuery => {
  return obj != null &&
         (obj.marketType === null || isValidMarketType(obj.marketType)) &&
         (obj.exchangeId === null || typeof obj.exchangeId === 'string') &&
         (obj.assetClass === null || isValidAssetClass(obj.assetClass)) &&
         (obj.symbol === null || typeof obj.symbol === 'string') &&
         (obj.region === null || typeof obj.region === 'string');
};

// Factory function for ContextQuery
const createContextQuery = (
  marketType: MarketType | null = null,
  exchangeId: string | null = null,
  assetClass: AssetClass | null = null,
  symbol: string | null = null,
  region: string | null = null
): Result<ContextQuery> => {
  const query: ContextQuery = {
    marketType,
    exchangeId,
    assetClass,
    symbol,
    region
  };
  
  if (!isValidContextQuery(query)) {
    return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid context query'));
  }
  
  return Result.success(query);
};
```

### MarketDataContextManager Interface

Manages market data context lifecycle - creation, retrieval, updates, and validation:

```typescript
/**
 * Market Data Context Manager
 * Handles CRUD operations for DataContext components
 * 
 * All operations return Result<T> for consistent error handling
 * All update operations preserve immutability (return new instances)
 */
interface MarketDataContextManager {
  /**
   * Create new market data context from components
   * Validates all components and their compatibility
   */
  createContext(
    market: Market,
    exchange: Exchange,
    instrument: Instrument
  ): Promise<Result<DataContext>>;
  
  /**
   * Query existing contexts by criteria
   * Empty query (all nulls) returns all available contexts
   * Results ordered by creation time (newest first)
   */
  getContext(query: ContextQuery): Promise<Result<DataContext[]>>;
  
  /**
   * Update market component of existing context
   * Returns new context with updated market, preserves other components
   */
  updateMarket(
    context: DataContext,
    newMarket: Market
  ): Promise<Result<DataContext>>;
  
  /**
   * Update exchange component of existing context
   * Returns new context with updated exchange, preserves other components
   */
  updateExchange(
    context: DataContext,
    newExchange: Exchange
  ): Promise<Result<DataContext>>;
  
  /**
   * Update instrument component of existing context
   * Returns new context with updated instrument, preserves other components
   */
  updateInstrument(
    context: DataContext,
    newInstrument: Instrument
  ): Promise<Result<DataContext>>;
  
  /**
   * Validate context consistency and component compatibility
   * Checks each component and cross-component relationships
   */
  validateContext(context: DataContext): Promise<Result<void>>;
}

// Example usage with proper error handling
const contextManagerExample = async (
  contextManager: MarketDataContextManager
): Promise<void> => {
  // Create context components
  const marketResult = createMarket('CRYPTO', 'GLOBAL', 'CASH');
  const exchangeResult = createExchange('COINBASE', 'Coinbase Pro', null, 'UTC');
  const instrumentResult = createInstrument('BTC-USD', null, 'Bitcoin', 'CRYPTO', 'USD');
  
  if (marketResult.isFailure() || exchangeResult.isFailure() || instrumentResult.isFailure()) {
    console.error('Failed to create context components');
    return;
  }
  
  // Create context
  const contextResult = await contextManager.createContext(
    marketResult.getData(),
    exchangeResult.getData(),
    instrumentResult.getData()
  );
  
  if (contextResult.isFailure()) {
    console.error('Failed to create context:', contextResult.getError().message);
    return;
  }
  
  const context = contextResult.getData();
  console.log('Created context:', context);
  
  // Query contexts
  const queryResult = createContextQuery('CRYPTO', null, null, null, 'GLOBAL');
  if (queryResult.isSuccess()) {
    const contextsResult = await contextManager.getContext(queryResult.getData());
    if (contextsResult.isSuccess()) {
      console.log('Found contexts:', contextsResult.getData().length);
    }
  }
  
  // Validate context
  const validationResult = await contextManager.validateContext(context);
  if (validationResult.isFailure()) {
    console.error('Context validation failed:', validationResult.getError().message);
  }
};
```

## Reading Operations Contracts

### MarketDataReader Interface

```typescript
/**
 * Core market data reading operations
 * Implements: qi.dp.dsl.contracts.md#MarketDataReader
 */
interface MarketDataReader {
  // Current data operations
  getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;
  getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;
  getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;
  getMarketDepth(context: DataContext, levels: Levels): Promise<Result<MarketData<MarketDepth>>>;
  getOHLCV(context: DataContext, timeframe: Timeframe): Promise<Result<MarketData<OHLCV>>>;
}

/**
 * Historical market data reading operations
 * Implements: qi.dp.dsl.contracts.md#HistoricalMarketDataReader
 */
interface HistoricalMarketDataReader {
  getPriceHistory(context: DataContext, dateRange: DateRange): Promise<Result<MarketData<Price>[]>>;
  getLevel1History(context: DataContext, dateRange: DateRange): Promise<Result<MarketData<Level1>[]>>;
  getOHLCVHistory(context: DataContext, timeframe: Timeframe, dateRange: DateRange): Promise<Result<MarketData<OHLCV>[]>>;
  getMarketDepthHistory(context: DataContext, levels: Levels, dateRange: DateRange): Promise<Result<MarketData<MarketDepth>[]>>;
}

/**
 * Real-time streaming data subscription
 * Implements: qi.dp.dsl.contracts.md#StreamingMarketDataReader
 */
interface Subscription {
  readonly id: string;
  readonly context: DataContext;
  readonly isActive: boolean;
}

interface StreamingMarketDataReader {
  subscribePriceStream(
    context: DataContext,
    callback: (data: MarketData<Price>) => void
  ): Promise<Result<Subscription>>;
  
  subscribeLevel1Stream(
    context: DataContext,
    callback: (data: MarketData<Level1>) => void
  ): Promise<Result<Subscription>>;
  
  subscribeMarketDepthStream(
    context: DataContext,
    levels: Levels,
    callback: (data: MarketData<MarketDepth>) => void
  ): Promise<Result<Subscription>>;
  
  subscribeOHLCVStream(
    context: DataContext,
    timeframe: Timeframe,
    callback: (data: MarketData<OHLCV>) => void
  ): Promise<Result<Subscription>>;
  
  unsubscribe(subscription: Subscription): Promise<Result<void>>;
}
```

## Writing Operations Contracts

### MarketDataWriter Interface

```typescript
/**
 * Core market data writing operations
 * Implements: qi.dp.dsl.contracts.md#MarketDataWriter
 */
interface MarketDataWriter {
  writePrice(data: MarketData<Price>): Promise<Result<void>>;
  writePrices(data: MarketData<Price>[]): Promise<Result<void>>;
  writeLevel1(data: MarketData<Level1>): Promise<Result<void>>;
  writeMarketDepth(data: MarketData<MarketDepth>): Promise<Result<void>>;
  writeOHLCV(data: MarketData<OHLCV>): Promise<Result<void>>;
  writeOHLCVBatch(data: MarketData<OHLCV>[]): Promise<Result<void>>;
}

/**
 * Historical market data writing operations
 * Implements: qi.dp.dsl.contracts.md#HistoricalMarketDataWriter
 */
interface HistoricalMarketDataWriter {
  writePriceHistory(data: MarketData<Price>[]): Promise<Result<void>>;
  writeLevel1History(data: MarketData<Level1>[]): Promise<Result<void>>;
  writeOHLCVHistory(data: MarketData<OHLCV>[]): Promise<Result<void>>;
  writeMarketDepthHistory(data: MarketData<MarketDepth>[]): Promise<Result<void>>;
}

/**
 * Real-time streaming data writing
 * Implements: qi.dp.dsl.contracts.md#StreamingMarketDataWriter
 */
interface PriceStream {
  write(price: Price): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface Level1Stream {
  write(level1: Level1): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface MarketDepthStream {
  write(depth: MarketDepth): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface OHLCVStream {
  write(ohlcv: OHLCV): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

interface StreamingMarketDataWriter {
  startPriceStream(context: DataContext): Promise<Result<PriceStream>>;
  startLevel1Stream(context: DataContext): Promise<Result<Level1Stream>>;
  startMarketDepthStream(context: DataContext, levels: Levels): Promise<Result<MarketDepthStream>>;
  startOHLCVStream(context: DataContext, timeframe: Timeframe): Promise<Result<OHLCVStream>>;
}
```

## Implementation Examples

### Basic Usage with @qi/core

```typescript
import { Result } from '@qi/base';
import { ConfigManager, Logger, Cache } from '@qi/core';

class CoinGeckoMarketDataReader implements MarketDataReader {
  constructor(
    private config: ConfigManager<MarketDataConfig>,
    private logger: Logger<MarketDataLogContext>,
    private cache: Cache<MarketDataCacheKey, any>
  ) {}

  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    // Validate context
    if (!isValidDataContext(context)) {
      return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid data context'));
    }

    // Set up logging context
    const logContext: MarketDataLogContext = {
      operation: 'getCurrentPrice',
      exchange: context.exchange.id,
      symbol: context.instrument.symbol,
      timestamp: new Date().toISOString(),
    };

    this.logger.info('Fetching current price', logContext);

    // Check cache
    const cacheKey: MarketDataCacheKey = { type: 'price', context };
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Price found in cache', logContext);
      return Result.success(cached);
    }

    try {
      // Fetch from CoinGecko API
      const coinGeckoConfig = this.config.get().dataSources.coinGecko;
      const response = await fetch(`${coinGeckoConfig.baseUrl}/simple/price?ids=${context.instrument.symbol}&vs_currencies=${context.instrument.currency}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const priceValue = data[context.instrument.symbol]?.[context.instrument.currency.toLowerCase()];
      
      if (priceValue === undefined) {
        return Result.failure(new QiError(DSL_ERROR_CATEGORIES.NOT_FOUND, 'Price not found'));
      }

      // Create price data
      const priceResult = createPrice(
        new Date().toISOString(),
        new Decimal(priceValue),
        new Decimal(1.0) // CoinGecko doesn't provide trade size
      );

      if (priceResult.isFailure()) {
        return priceResult;
      }

      const marketData = createMarketData(context, priceResult.getValue());

      // Cache the result
      await this.cache.set(cacheKey, marketData, this.config.get().caching.pricesTTL);

      this.logger.info('Price fetched successfully', { ...logContext, price: priceValue });
      return Result.success(marketData);

    } catch (error) {
      this.logger.error('Failed to fetch price', { ...logContext, error: error.message });
      return Result.failure(new QiError(DSL_ERROR_CATEGORIES.NETWORK, 'Price fetch failed', error));
    }
  }

  async getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>> {
    // Validate all contexts
    for (const context of contexts) {
      if (!isValidDataContext(context)) {
        return Result.failure(new QiError(DSL_ERROR_CATEGORIES.VALIDATION, 'Invalid data context in batch'));
      }
    }

    // Fetch prices in parallel
    const pricePromises = contexts.map(context => this.getCurrentPrice(context));
    const results = await Promise.all(pricePromises);

    // Check for failures
    const failures = results.filter(result => result.isFailure());
    if (failures.length > 0) {
      return Result.failure(failures[0].getError());
    }

    // Extract successful results
    const prices = results.map(result => result.getValue());
    return Result.success(prices);
  }

  // ... implement other methods following same pattern
}
```

### Context Creation Helpers

```typescript
/**
 * Helper functions for creating common market contexts
 */
export class ContextFactory {
  static createCryptoContext(symbol: string, exchange: Exchange, currency = 'USD'): Result<DataContext> {
    const marketResult = createMarket('CRYPTO', 'GLOBAL', 'CASH');
    if (marketResult.isFailure()) return marketResult;

    const instrumentResult = createInstrument(
      symbol,
      null, // Crypto typically doesn't have ISIN
      symbol, // Use symbol as name for simplicity
      'CRYPTO',
      currency
    );
    if (instrumentResult.isFailure()) return instrumentResult;

    return Result.success({
      market: marketResult.getValue(),
      exchange,
      instrument: instrumentResult.getValue(),
    });
  }

  static createEquityContext(symbol: string, name: string, isin: string | null = null): Result<DataContext> {
    const marketResult = createMarket('EQUITY', 'US', 'CASH');
    if (marketResult.isFailure()) return marketResult;

    const instrumentResult = createInstrument(symbol, isin, name, 'STOCK', 'USD');
    if (instrumentResult.isFailure()) return instrumentResult;

    return Result.success({
      market: marketResult.getValue(),
      exchange: EXCHANGES.NYSE,
      instrument: instrumentResult.getValue(),
    });
  }
}

// Usage examples
const btcContextResult = ContextFactory.createCryptoContext('bitcoin', EXCHANGES.COINBASE);
const aaplContextResult = ContextFactory.createEquityContext('AAPL', 'Apple Inc.', 'US0378331005');
```

## Type Export and Module Structure

```typescript
// Export all types for consumption
export type {
  // Foundation types
  Result,
  QiError,
  ErrorCategory,
  
  // Context types
  DataContext,
  Market,
  MarketType,
  Exchange,
  Instrument,
  AssetClass,
  
  // Core data types
  MarketData,
  CoreMarketData,
  Price,
  Level1,
  OHLCV,
  MarketDepth,
  DepthLevel,
  
  // Support types
  DateRange,
  Timeframe,
  TimeframeUnit,
  Levels,
  Side,
  ContextQuery,
  
  // Operation interfaces
  MarketDataContextManager,
  MarketDataReader,
  HistoricalMarketDataReader,
  StreamingMarketDataReader,
  MarketDataWriter,
  HistoricalMarketDataWriter,
  StreamingMarketDataWriter,
  
  // Streaming types
  Subscription,
  PriceStream,
  Level1Stream,
  MarketDepthStream,
  OHLCVStream,
  
  // Configuration types
  MarketDataConfig,
  MarketDataLogContext,
  MarketDataCacheKey,
};

// Export validation functions
export {
  isValidDataContext,
  isValidMarket,
  isValidExchange,
  isValidInstrument,
  isValidPrice,
  isValidLevel1,
  isValidOHLCV,
  isValidMarketDepth,
  isValidContextQuery,
  isValidDateRange,
  isValidTimeframe,
  isValidLevels,
};

// Export factory functions
export {
  createMarket,
  createExchange,
  createInstrument,
  createPrice,
  createLevel1,
  createOHLCV,
  createMarketDepth,
  createDateRange,
  createMarketData,
  createContextQuery,
  ContextFactory,
};

// Export constants
export {
  DSL_ERROR_CATEGORIES,
  EXCHANGES,
  TIMEFRAMES,
  DEPTH_LEVELS,
};
```

## Contract Compliance Notes

This TypeScript specification implements ALL contracts defined in `qi.dp.dsl.contracts.md` with:

1. **Strict Type Safety**: All data types include runtime validation
2. **FIX Protocol Compliance**: Price, Level1, OHLCV, and MarketDepth map to FIX Protocol fields
3. **Foundation Integration**: Mandatory usage of `@qi/base` and `@qi/core`
4. **Error Handling**: Functional error handling with Result<T>
5. **Two-Part Structure**: MarketData<T> wrapper preserves context separation
6. **Complete Interface Coverage**: All reader/writer operations implemented including historical writing
7. **Streaming Support**: Real-time subscription and writing interfaces
8. **Historical Data**: Time-range query and writing operations for all data types

Any TypeScript implementation claiming QiCore v4.0 DSL compatibility must implement ALL these interfaces and follow these exact type definitions.