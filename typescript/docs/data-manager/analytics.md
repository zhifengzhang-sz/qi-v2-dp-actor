# @qi/dp Market Data Analytics TypeScript Specification

This document defines TypeScript implementations for analytics contracts that compute derived metrics and statistics from market data. The analytics layer operates **on top of** the DSL market data contracts and provides business intelligence for market analysis.

**Dependencies**: This specification builds on `@qi/base`, `@qi/core`, and `@qi/dp/dsl` for foundational types and market data.

## Core Principle

> **Analytics transform raw market data into business intelligence. They aggregate, compute, and derive insights from DSL market data types.**

## Foundation Dependencies

### @qi/base Integration

```typescript
import { Result, Success, Failure, match, success, failure, create } from '@qi/base';

// All analytics operations return Result<T>
type AnalyticsResult<T> = Result<T>;

// Error categories for analytics
const ANALYTICS_ERROR_CATEGORIES = {
  COMPUTATION: 'COMPUTATION',
  INSUFFICIENT_DATA: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  TIMEOUT: 'TIMEOUT'
} as const;
```

### @qi/core Integration

```typescript
import { Config } from '@qi/core/config';
import { Logger } from '@qi/core/logger';
import { Cache } from '@qi/core/cache';

// Analytics configuration interface
interface AnalyticsConfig extends Config {
  readonly calculationEngine: CalculationEngine;
  readonly precisionMode: PrecisionMode;
  readonly defaultTimeframes: Timeframe[];
  readonly maxHistoryWindow: number; // milliseconds
  readonly minDataPoints: number;
  readonly volatilityThresholds: VolatilityThresholds;
  readonly liquidityThresholds: LiquidityThresholds;
  readonly dominanceThresholds: DominanceThresholds;
  readonly cacheConfig: AnalyticsCacheConfig;
  readonly refreshInterval: number; // milliseconds
}

// Analytics logging context
interface AnalyticsLogContext {
  readonly operation: string;
  readonly market?: Market;
  readonly timeframe?: Timeframe;
  readonly calculationPeriod?: DateRange;
  readonly dataPoints?: number;
  readonly calculationDurationMs?: number;
}

// Analytics cache key structure
interface AnalyticsCacheKey {
  readonly operation: string;
  readonly market: Market;
  readonly period: DateRange;
  readonly parameters: Record<string, any>;
}
```

### DSL Integration

```typescript
import {
  MarketData,
  Price,
  Level1,
  OHLCV,
  MarketDepth,
  DataContext,
  Market,
  DateRange,
  Timeframe,
  Result
} from '@qi/dp/dsl';

// Analytics layer consumes DSL market data types
type AnalyticsInputData = 
  | MarketData<Price>[]
  | MarketData<Level1>[]
  | MarketData<OHLCV>[]
  | MarketData<MarketDepth>[];
```

## Market Analytics Data Types

### Core Analytics Types

```typescript
/**
 * Aggregate market statistics and derived metrics
 * Moved from DSL to Analytics layer for proper separation of concerns
 */
interface MarketAnalytics {
  readonly timestamp: string; // ISO 8601 datetime - when analytics were calculated
  readonly market: Market; // Market scope (from DSL)
  readonly calculationPeriod: DateRange; // Time period for analytics calculation
  
  // Market aggregates
  readonly totalMarketCap: Decimal; // Total market capitalization - 8 decimal precision
  readonly totalVolume: Decimal; // Total trading volume for period - 8 decimal precision
  readonly instrumentCount: number; // Number of active instruments
  readonly activeExchangeCount: number; // Number of exchanges with activity
  
  // Derived metrics
  readonly dominanceMetrics: DominanceMetrics;
  readonly changeMetrics: ChangeMetrics;
  readonly volatilityMetrics: VolatilityMetrics;
  readonly liquidityMetrics: LiquidityMetrics;
}

/**
 * Market dominance and concentration metrics
 */
interface DominanceMetrics {
  readonly topInstrumentShare: Decimal; // Largest instrument market share (%) - 8 decimal precision
  readonly top5InstrumentShare: Decimal; // Top 5 instruments market share (%) - 8 decimal precision
  readonly top10InstrumentShare: Decimal; // Top 10 instruments market share (%) - 8 decimal precision
  readonly exchangeConcentration: Decimal; // Herfindahl index for exchange concentration - 8 decimal precision
}

/**
 * Period-over-period percentage changes
 */
interface ChangeMetrics {
  readonly change1h: Decimal; // 1-hour percentage change - 8 decimal precision
  readonly change24h: Decimal; // 24-hour percentage change - 8 decimal precision  
  readonly change7d: Decimal; // 7-day percentage change - 8 decimal precision
  readonly change30d: Decimal; // 30-day percentage change - 8 decimal precision
  readonly changeYTD: Decimal; // Year-to-date percentage change - 8 decimal precision
}

/**
 * Price volatility and risk measures
 */
interface VolatilityMetrics {
  readonly volatility24h: Decimal; // 24-hour price volatility (standard deviation) - 8 decimal precision
  readonly volatility7d: Decimal; // 7-day price volatility - 8 decimal precision
  readonly volatility30d: Decimal; // 30-day price volatility - 8 decimal precision
  readonly averageTrueRange: Decimal; // Average True Range (ATR) - 8 decimal precision
  readonly betaToMarket: Decimal; // Beta coefficient relative to market - 8 decimal precision
}

/**
 * Market liquidity indicators
 */
interface LiquidityMetrics {
  readonly averageSpread: Decimal; // Average bid-ask spread percentage - 8 decimal precision
  readonly medianSpread: Decimal; // Median bid-ask spread percentage - 8 decimal precision
  readonly averageDepth: Decimal; // Average order book depth - 8 decimal precision
  readonly turnoverRatio: Decimal; // Volume/Market Cap ratio - 8 decimal precision
  readonly amihudRatio: Decimal; // Amihud illiquidity ratio - 8 decimal precision
}
```

### Analytics Configuration Types

```typescript
type CalculationEngine = 'STANDARD' | 'ENHANCED' | 'CUSTOM';
type PrecisionMode = 'FAST' | 'BALANCED' | 'PRECISE';

interface VolatilityThresholds {
  readonly lowThreshold: Decimal; // Below this is LOW volatility
  readonly highThreshold: Decimal; // Above this is HIGH volatility
}

interface LiquidityThresholds {
  readonly tightSpreadThreshold: Decimal; // Below this is tight spread
  readonly deepMarketThreshold: Decimal; // Above this is deep market
}

interface DominanceThresholds {
  readonly significantShareThreshold: Decimal; // Threshold for significant market share
  readonly concentrationThreshold: Decimal; // Threshold for market concentration warning
}

interface AnalyticsCacheConfig {
  readonly enabled: boolean;
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly keyPrefix: string;
}
```

### Analytics Summary Types

```typescript
/**
 * High-level market summary for executive reporting
 */
interface MarketSummary {
  readonly timestamp: string;
  readonly market: Market;
  readonly period: DateRange;
  
  // Key metrics
  readonly totalValue: Decimal; // Total market value
  readonly totalActivity: Decimal; // Total trading activity
  readonly dominantInstrument: string; // Most dominant instrument
  readonly dominantExchange: string; // Most dominant exchange
  
  // Trend indicators
  readonly overallTrend: TrendDirection;
  readonly volatilityLevel: VolatilityLevel;
  readonly liquidityLevel: LiquidityLevel;
  
  // Confidence metrics
  readonly dataQuality: DataQuality;
  readonly calculationConfidence: Decimal; // Confidence level (0-1)
}

type TrendDirection = 'UP' | 'DOWN' | 'SIDEWAYS';
type VolatilityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type LiquidityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type DataQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
```

## Analytics Operations Interfaces

### Market Analytics Calculator

```typescript
/**
 * Main interface for computing market analytics
 */
interface MarketAnalyticsCalculator {
  /**
   * Compute comprehensive market analytics for specified period
   */
  calculateMarketAnalytics(
    market: Market,
    period: DateRange
  ): Promise<Result<MarketAnalytics>>;
  
  /**
   * Compute market dominance and concentration metrics
   */
  calculateDominanceMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<DominanceMetrics>>;
  
  /**
   * Compute period-over-period change statistics
   */
  calculateChangeMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<ChangeMetrics>>;
  
  /**
   * Compute market volatility and risk metrics
   */
  calculateVolatilityMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<VolatilityMetrics>>;
  
  /**
   * Compute market liquidity and depth metrics
   */
  calculateLiquidityMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<LiquidityMetrics>>;
}
```

### Analytics Aggregation

```typescript
/**
 * Interface for aggregating analytics across dimensions
 */
interface AnalyticsAggregator {
  /**
   * Group and aggregate analytics by exchange
   */
  aggregateByExchange(
    analytics: MarketAnalytics[]
  ): Promise<Result<Map<Exchange, MarketAnalytics>>>;
  
  /**
   * Group and aggregate analytics by asset class
   */
  aggregateByAssetClass(
    analytics: MarketAnalytics[]
  ): Promise<Result<Map<AssetClass, MarketAnalytics>>>;
  
  /**
   * Aggregate analytics data into specified timeframes
   */
  aggregateByTimeframe(
    analytics: MarketAnalytics[],
    timeframe: Timeframe
  ): Promise<Result<MarketAnalytics[]>>;
  
  /**
   * Create high-level market summary from detailed analytics
   */
  createMarketSummary(
    analytics: MarketAnalytics[]
  ): Promise<Result<MarketSummary>>;
}
```

## Validation Functions

```typescript
/**
 * Validation functions for analytics types
 */

const isValidMarketAnalytics = (obj: any): obj is MarketAnalytics => {
  return obj != null &&
         typeof obj.timestamp === 'string' &&
         isValidISO8601(obj.timestamp) &&
         isValidMarket(obj.market) &&
         isValidDateRange(obj.calculationPeriod) &&
         obj.totalMarketCap instanceof Decimal &&
         obj.totalMarketCap.isPositive() && obj.totalMarketCap.isFinite() && !obj.totalMarketCap.isNaN() &&
         obj.totalVolume instanceof Decimal &&
         obj.totalVolume.isPositive() && obj.totalVolume.isFinite() && !obj.totalVolume.isNaN() &&
         typeof obj.instrumentCount === 'number' &&
         Number.isInteger(obj.instrumentCount) && obj.instrumentCount > 0 &&
         typeof obj.activeExchangeCount === 'number' &&
         Number.isInteger(obj.activeExchangeCount) && obj.activeExchangeCount > 0 &&
         isValidDominanceMetrics(obj.dominanceMetrics) &&
         isValidChangeMetrics(obj.changeMetrics) &&
         isValidVolatilityMetrics(obj.volatilityMetrics) &&
         isValidLiquidityMetrics(obj.liquidityMetrics);
};

const isValidDominanceMetrics = (obj: any): obj is DominanceMetrics => {
  return obj != null &&
         obj.topInstrumentShare instanceof Decimal &&
         obj.topInstrumentShare.greaterThanOrEqual(0) && obj.topInstrumentShare.lessThanOrEqual(100) &&
         obj.topInstrumentShare.isFinite() && !obj.topInstrumentShare.isNaN() &&
         obj.top5InstrumentShare instanceof Decimal &&
         obj.top5InstrumentShare.greaterThanOrEqual(0) && obj.top5InstrumentShare.lessThanOrEqual(100) &&
         obj.top5InstrumentShare.isFinite() && !obj.top5InstrumentShare.isNaN() &&
         obj.top10InstrumentShare instanceof Decimal &&
         obj.top10InstrumentShare.greaterThanOrEqual(0) && obj.top10InstrumentShare.lessThanOrEqual(100) &&
         obj.top10InstrumentShare.isFinite() && !obj.top10InstrumentShare.isNaN() &&
         obj.exchangeConcentration instanceof Decimal &&
         obj.exchangeConcentration.greaterThanOrEqual(0) && obj.exchangeConcentration.lessThanOrEqual(1) &&
         obj.exchangeConcentration.isFinite() && !obj.exchangeConcentration.isNaN() &&
         // Ordering constraint: top1 <= top5 <= top10
         obj.topInstrumentShare.lessThanOrEqual(obj.top5InstrumentShare) &&
         obj.top5InstrumentShare.lessThanOrEqual(obj.top10InstrumentShare);
};

const isValidChangeMetrics = (obj: any): obj is ChangeMetrics => {
  return obj != null &&
         obj.change1h instanceof Decimal &&
         obj.change1h.isFinite() && !obj.change1h.isNaN() &&
         obj.change24h instanceof Decimal &&
         obj.change24h.isFinite() && !obj.change24h.isNaN() &&
         obj.change7d instanceof Decimal &&
         obj.change7d.isFinite() && !obj.change7d.isNaN() &&
         obj.change30d instanceof Decimal &&
         obj.change30d.isFinite() && !obj.change30d.isNaN() &&
         obj.changeYTD instanceof Decimal &&
         obj.changeYTD.isFinite() && !obj.changeYTD.isNaN();
};

const isValidVolatilityMetrics = (obj: any): obj is VolatilityMetrics => {
  return obj != null &&
         obj.volatility24h instanceof Decimal &&
         obj.volatility24h.isFinite() && !obj.volatility24h.isNaN() &&
         obj.volatility24h.greaterThanOrEqual(0) &&
         obj.volatility7d instanceof Decimal &&
         obj.volatility7d.isFinite() && !obj.volatility7d.isNaN() &&
         obj.volatility7d.greaterThanOrEqual(0) &&
         obj.volatility30d instanceof Decimal &&
         obj.volatility30d.isFinite() && !obj.volatility30d.isNaN() &&
         obj.volatility30d.greaterThanOrEqual(0) &&
         obj.averageTrueRange instanceof Decimal &&
         obj.averageTrueRange.isFinite() && !obj.averageTrueRange.isNaN() &&
         obj.averageTrueRange.greaterThanOrEqual(0) &&
         obj.betaToMarket instanceof Decimal &&
         obj.betaToMarket.isFinite() && !obj.betaToMarket.isNaN();
};

const isValidLiquidityMetrics = (obj: any): obj is LiquidityMetrics => {
  return obj != null &&
         obj.averageSpread instanceof Decimal &&
         obj.averageSpread.greaterThanOrEqual(0) && obj.averageSpread.lessThanOrEqual(100) &&
         obj.averageSpread.isFinite() && !obj.averageSpread.isNaN() &&
         obj.medianSpread instanceof Decimal &&
         obj.medianSpread.greaterThanOrEqual(0) && obj.medianSpread.lessThanOrEqual(100) &&
         obj.medianSpread.isFinite() && !obj.medianSpread.isNaN() &&
         obj.averageDepth instanceof Decimal &&
         obj.averageDepth.isPositive() && obj.averageDepth.isFinite() && !obj.averageDepth.isNaN() &&
         obj.turnoverRatio instanceof Decimal &&
         obj.turnoverRatio.greaterThanOrEqual(0) && obj.turnoverRatio.isFinite() && !obj.turnoverRatio.isNaN() &&
         obj.amihudRatio instanceof Decimal &&
         obj.amihudRatio.greaterThanOrEqual(0) && obj.amihudRatio.isFinite() && !obj.amihudRatio.isNaN();
};

const isValidMarketSummary = (obj: any): obj is MarketSummary => {
  return obj != null &&
         typeof obj.timestamp === 'string' &&
         isValidISO8601(obj.timestamp) &&
         isValidMarket(obj.market) &&
         isValidDateRange(obj.period) &&
         obj.totalValue instanceof Decimal &&
         obj.totalValue.isPositive() && obj.totalValue.isFinite() && !obj.totalValue.isNaN() &&
         obj.totalActivity instanceof Decimal &&
         obj.totalActivity.isPositive() && obj.totalActivity.isFinite() && !obj.totalActivity.isNaN() &&
         typeof obj.dominantInstrument === 'string' && obj.dominantInstrument.length > 0 &&
         typeof obj.dominantExchange === 'string' && obj.dominantExchange.length > 0 &&
         ['UP', 'DOWN', 'SIDEWAYS'].includes(obj.overallTrend) &&
         ['LOW', 'MEDIUM', 'HIGH'].includes(obj.volatilityLevel) &&
         ['LOW', 'MEDIUM', 'HIGH'].includes(obj.liquidityLevel) &&
         ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].includes(obj.dataQuality) &&
         obj.calculationConfidence instanceof Decimal &&
         obj.calculationConfidence.greaterThanOrEqual(0) && obj.calculationConfidence.lessThanOrEqual(1) &&
         obj.calculationConfidence.isFinite() && !obj.calculationConfidence.isNaN();
};
```

## Factory Functions

```typescript
/**
 * Factory functions for safe analytics type creation
 */

const createMarketAnalytics = (
  timestamp: string,
  market: Market,
  calculationPeriod: DateRange,
  totalMarketCap: Decimal,
  totalVolume: Decimal,
  instrumentCount: number,
  activeExchangeCount: number,
  dominanceMetrics: DominanceMetrics,
  changeMetrics: ChangeMetrics,
  volatilityMetrics: VolatilityMetrics,
  liquidityMetrics: LiquidityMetrics
): Result<MarketAnalytics> => {
  const analytics: MarketAnalytics = {
    timestamp,
    market,
    calculationPeriod,
    totalMarketCap,
    totalVolume,
    instrumentCount,
    activeExchangeCount,
    dominanceMetrics,
    changeMetrics,
    volatilityMetrics,
    liquidityMetrics
  };
  
  if (!isValidMarketAnalytics(analytics)) {
    return failure(create(
      'INVALID_MARKET_ANALYTICS',
      'Invalid market analytics data',
      'VALIDATION',
      { analytics }
    ));
  }
  
  return success(analytics);
};

const createDominanceMetrics = (
  topInstrumentShare: Decimal,
  top5InstrumentShare: Decimal,
  top10InstrumentShare: Decimal,
  exchangeConcentration: Decimal
): Result<DominanceMetrics> => {
  const metrics: DominanceMetrics = {
    topInstrumentShare,
    top5InstrumentShare,
    top10InstrumentShare,
    exchangeConcentration
  };
  
  if (!isValidDominanceMetrics(metrics)) {
    return failure(create(
      'INVALID_DOMINANCE_METRICS',
      'Invalid dominance metrics data',
      'VALIDATION',
      { metrics }
    ));
  }
  
  return success(metrics);
};

const createMarketSummary = (
  timestamp: string,
  market: Market,
  period: DateRange,
  totalValue: Decimal,
  totalActivity: Decimal,
  dominantInstrument: string,
  dominantExchange: string,
  overallTrend: TrendDirection,
  volatilityLevel: VolatilityLevel,
  liquidityLevel: LiquidityLevel,
  dataQuality: DataQuality,
  calculationConfidence: Decimal
): Result<MarketSummary> => {
  const summary: MarketSummary = {
    timestamp,
    market,
    period,
    totalValue,
    totalActivity,
    dominantInstrument,
    dominantExchange,
    overallTrend,
    volatilityLevel,
    liquidityLevel,
    dataQuality,
    calculationConfidence
  };
  
  if (!isValidMarketSummary(summary)) {
    return failure(create(
      'INVALID_MARKET_SUMMARY',
      'Invalid market summary data',
      'VALIDATION',
      { summary }
    ));
  }
  
  return success(summary);
};
```

## Usage Examples

### Basic Analytics Calculation

```typescript
import { Decimal } from 'decimal.js';
import { Market, DateRange } from '@qi/dp/dsl';

// Configure analytics service
const config: AnalyticsConfig = {
  calculationEngine: 'STANDARD',
  precisionMode: 'BALANCED',
  defaultTimeframes: ['1h', '24h', '7d'],
  minDataPoints: 100,
  maxHistoryWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
  volatilityThresholds: {
    lowThreshold: new Decimal('5.0'),
    highThreshold: new Decimal('25.0')
  },
  liquidityThresholds: {
    tightSpreadThreshold: new Decimal('0.1'),
    deepMarketThreshold: new Decimal('1000000')
  },
  dominanceThresholds: {
    significantShareThreshold: new Decimal('5.0'),
    concentrationThreshold: new Decimal('50.0')
  },
  cacheConfig: {
    enabled: true,
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxEntries: 1000,
    keyPrefix: 'analytics:'
  },
  refreshInterval: 60 * 1000 // 1 minute
};

const calculator: MarketAnalyticsCalculator = createMarketAnalyticsCalculator(config);

// Define market and period
const cryptoMarket: Market = {
  type: 'CRYPTO',
  region: 'GLOBAL',
  segment: 'CASH'
};

const period: DateRange = {
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z'
};

// Calculate comprehensive analytics
const analyticsResult = await calculator.calculateMarketAnalytics(cryptoMarket, period);

match(
  (analytics) => {
    // Process successful analytics
    console.log(`Market Cap: ${analytics.totalMarketCap.toString()}`);
    console.log(`24h Volatility: ${analytics.volatilityMetrics.volatility24h.toString()}%`);
    
    // Business logic based on analytics
    if (analytics.volatilityMetrics.volatility24h.greaterThan(config.volatilityThresholds.highThreshold)) {
      handleHighVolatility(analytics);
    }
    
    if (analytics.dominanceMetrics.topInstrumentShare.greaterThan(config.dominanceThresholds.concentrationThreshold)) {
      handleMarketConcentration(analytics);
    }
  },
  (error) => {
    console.error(`Analytics calculation failed: ${error.message}`);
    handleAnalyticsError(error);
  },
  analyticsResult
);
```

### Integration with DSL Data

```typescript
import { MarketDataReader, getCurrentPrices, getOHLCVHistory } from '@qi/dp/dsl';

// Step 1: Retrieve market data using DSL
const contexts = await getMarketContexts(cryptoMarket);
const priceDataResult = await getCurrentPrices(contexts, marketDataReader);
const ohlcvDataResult = await getOHLCVHistory(contexts[0], '1h', period, marketDataReader);

if (priceDataResult.tag === 'success' && ohlcvDataResult.tag === 'success') {
  const priceData = priceDataResult.value;
  const ohlcvData = ohlcvDataResult.value;
  
  // Step 2: Calculate analytics from market data
  const volatilityResult = await calculator.calculateVolatilityMetrics(cryptoMarket, period);
  const dominanceResult = await calculator.calculateDominanceMetrics(cryptoMarket, period);
  
  if (volatilityResult.tag === 'success' && dominanceResult.tag === 'success') {
    // Step 3: Create comprehensive analytics
    const analyticsResult = await createMarketAnalytics(
      new Date().toISOString(),
      cryptoMarket,
      period,
      calculateTotalMarketCap(priceData),
      calculateTotalVolume(priceData),
      priceData.length,
      new Set(priceData.map(d => d.context.exchange.id)).size,
      dominanceResult.value,
      await calculateChangeMetrics(ohlcvData),
      volatilityResult.value,
      await calculateLiquidityMetrics(priceData)
    );
    
    match(
      (analytics) => processAnalytics(analytics),
      (error) => handleAnalyticsError(error),
      analyticsResult
    );
  }
}
```

## Module Exports

```typescript
// Export all analytics types
export {
  MarketAnalytics,
  DominanceMetrics,
  ChangeMetrics,
  VolatilityMetrics,
  LiquidityMetrics,
  MarketSummary,
  TrendDirection,
  VolatilityLevel,
  LiquidityLevel,
  DataQuality,
  
  // Configuration types
  AnalyticsConfig,
  CalculationEngine,
  PrecisionMode,
  VolatilityThresholds,
  LiquidityThresholds,
  DominanceThresholds,
  AnalyticsCacheConfig,
  
  // Context types
  AnalyticsLogContext,
  AnalyticsCacheKey,
  
  // Operation interfaces
  MarketAnalyticsCalculator,
  AnalyticsAggregator,
};

// Export validation functions
export {
  isValidMarketAnalytics,
  isValidDominanceMetrics,
  isValidChangeMetrics,
  isValidVolatilityMetrics,
  isValidLiquidityMetrics,
  isValidMarketSummary,
};

// Export factory functions
export {
  createMarketAnalytics,
  createDominanceMetrics,
  createMarketSummary,
};

// Export error categories
export {
  ANALYTICS_ERROR_CATEGORIES,
};
```

## Contract Compliance Notes

This TypeScript Analytics specification:

1. **Architectural Separation**: Analytics are cleanly separated from DSL core data types
2. **DSL Integration**: Properly consumes DSL market data types without circular dependencies
3. **Foundation Integration**: Uses `@qi/base` Result<T> and `@qi/core` infrastructure modules
4. **Type Safety**: Comprehensive runtime validation with TypeScript type guards
5. **Decimal Precision**: 8-decimal precision using Decimal.js for all financial calculations
6. **Error Handling**: Functional error handling with detailed error context
7. **Business Intelligence**: Provides derived insights and business intelligence from raw market data

**Separation from DSL**: Analytics contracts are completely separate from DSL contracts. DSL provides the vocabulary for market data; Analytics provides the intelligence derived from that data.