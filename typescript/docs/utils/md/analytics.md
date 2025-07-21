# Market Data Analytics

**Location**: `lib/src/utils/analytics/`  
**Purpose**: Analytics types and business intelligence functionality for market data  
**Dependencies**: `@qi/base`, MD smart constructors, precision utilities

## Overview

The Market Data Analytics module provides comprehensive analytics types and interfaces for computing derived metrics and business intelligence from raw market data. This module represents the business logic layer that depends on the MD smart constructor layer for validated market data instances.

### Architectural Position

```
dsl/* (interfaces) → md/* (implementations) → utils/analytics (business logic)
```

Analytics provide business intelligence derived FROM market data but are not part of the core vocabulary. They depend on the MD layer for validated market data instances.

## Module Structure

The analytics module uses file-scoped exports:

```typescript
// utils/analytics/types.ts
export interface DominanceMetrics { /* dominance metrics */ }
export interface ChangeMetrics { /* change metrics */ }
export interface VolatilityMetrics { /* volatility metrics */ }
export interface LiquidityMetrics { /* liquidity metrics */ }

// Analytics wrapper
export interface MarketAnalytics {
  dominance: DominanceMetrics;
  change: ChangeMetrics;
  volatility: VolatilityMetrics;
  liquidity?: LiquidityMetrics;
}

// Container for analytics with context
export interface AnalyticsMarketData {
  context: DataContext;
  coreData: MarketAnalytics;
}
```

## Core Analytics Types

### DominanceMetrics

Market dominance and concentration metrics for understanding market structure:

```typescript
interface DominanceMetrics {
  readonly topInstrumentShare: number;     // Largest instrument market share (%)
  readonly top5InstrumentShare: number;    // Top 5 instruments market share (%)
  readonly top10InstrumentShare: number;   // Top 10 instruments market share (%)
  readonly exchangeConcentration: number;  // Herfindahl index (0-1)
}
```

**Validation Constraints**:
- All shares: 0-100%
- Concentration: 0-1 (Herfindahl index)
- Ordering: top1 ≤ top5 ≤ top10

**Example Usage**:
```typescript
import { DominanceMetrics, isValidDominanceMetrics } from '@qi/dp/utils';

const metrics: DominanceMetrics = {
  topInstrumentShare: 25.5,
  top5InstrumentShare: 67.3,
  top10InstrumentShare: 84.2,
  exchangeConcentration: 0.32
};

if (isValidDominanceMetrics(metrics)) {
  console.log(`Market concentration: ${metrics.exchangeConcentration}`);
}
```

### ChangeMetrics

Period-over-period percentage changes for trend analysis:

```typescript
interface ChangeMetrics {
  readonly change1h: number;    // 1-hour percentage change
  readonly change24h: number;   // 24-hour percentage change
  readonly change7d: number;    // 7-day percentage change
  readonly change30d: number;   // 30-day percentage change
  readonly changeYTD?: number;  // Year-to-date percentage change
}
```

**Validation**: All values must be finite numbers (can be positive or negative)

**Example Usage**:
```typescript
import { ChangeMetrics, isValidChangeMetrics } from '@qi/dp/utils';

const changes: ChangeMetrics = {
  change1h: 0.25,
  change24h: -2.15,
  change7d: 12.8,
  change30d: -5.2,
  changeYTD: 145.6
};

if (isValidChangeMetrics(changes)) {
  console.log(`24h change: ${changes.change24h}%`);
}
```

### VolatilityMetrics

Price volatility and risk measures for risk assessment:

```typescript
interface VolatilityMetrics {
  readonly volatility24h: number;        // 24-hour price volatility
  readonly volatility7d: number;         // 7-day price volatility
  readonly volatility30d: number;        // 30-day price volatility
  readonly averageTrueRange?: number;    // Average True Range (ATR)
  readonly betaToMarket?: number;        // Beta coefficient relative to market
}
```

**Validation**: All values must be non-negative finite numbers

**Example Usage**:
```typescript
import { VolatilityMetrics, isValidVolatilityMetrics } from '@qi/dp/utils';

const volatility: VolatilityMetrics = {
  volatility24h: 0.045,  // 4.5% daily volatility
  volatility7d: 0.032,   // 3.2% weekly volatility
  volatility30d: 0.028,  // 2.8% monthly volatility
  averageTrueRange: 125.50,
  betaToMarket: 1.15
};

if (isValidVolatilityMetrics(volatility)) {
  console.log(`Daily volatility: ${(volatility.volatility24h * 100).toFixed(2)}%`);
}
```

### LiquidityMetrics

Market liquidity indicators for understanding market depth:

```typescript
interface LiquidityMetrics {
  readonly averageSpread: number;    // Average bid-ask spread percentage
  readonly medianSpread: number;     // Median bid-ask spread percentage
  readonly averageDepth: number;     // Average order book depth
  readonly turnoverRatio: number;    // Volume/Market Cap ratio
  readonly amihudRatio?: number;     // Amihud illiquidity ratio
}
```

**Validation Constraints**:
- Spreads: 0-100% (percentage values)
- Depth: Must be positive
- Turnover: Must be non-negative
- All values must be finite

**Example Usage**:
```typescript
import { LiquidityMetrics, isValidLiquidityMetrics } from '@qi/dp/utils';

const liquidity: LiquidityMetrics = {
  averageSpread: 0.05,      // 5 basis points
  medianSpread: 0.03,       // 3 basis points
  averageDepth: 1250000,    // $1.25M average depth
  turnoverRatio: 0.15,      // 15% daily turnover
  amihudRatio: 0.000025
};

if (isValidLiquidityMetrics(liquidity)) {
  console.log(`Average spread: ${liquidity.averageSpread}%`);
}
```

## Comprehensive Analytics

### MarketAnalytics

Complete market analytics combining all derived metrics:

```typescript
interface MarketAnalytics {
  readonly timestamp: string;              // ISO 8601 calculation time
  readonly market: Market;                 // Market scope
  readonly calculationPeriod: DateRange;   // Analysis period
  
  // Market aggregates
  readonly totalMarketCap: number;
  readonly totalVolume: number;
  readonly instrumentCount: number;
  readonly activeExchangeCount: number;
  
  // Derived metrics
  readonly dominanceMetrics: DominanceMetrics;
  readonly changeMetrics: ChangeMetrics;
  readonly volatilityMetrics: VolatilityMetrics;
  readonly liquidityMetrics: LiquidityMetrics;
}
```

**Example Usage**:
```typescript
import { isValidMarketAnalytics, createAnalyticsMarketData } from '@qi/dp/utils';
import type { DataContext } from '@qi/dp/dsl';

// Create analytics with DSL context wrapper
const context: DataContext = { /* market context */ };
const analytics: MarketAnalytics = {
  timestamp: new Date().toISOString(),
  market: context.market,
  calculationPeriod: {
    startDate: "2025-07-20T00:00:00.000Z",
    endDate: "2025-07-20T23:59:59.999Z"
  },
  totalMarketCap: 2.5e12,
  totalVolume: 85e9,
  instrumentCount: 15000,
  activeExchangeCount: 125,
  dominanceMetrics: { /* metrics */ },
  changeMetrics: { /* metrics */ },
  volatilityMetrics: { /* metrics */ },
  liquidityMetrics: { /* metrics */ }
};

if (isValidMarketAnalytics(analytics)) {
  const wrapped = createAnalyticsMarketData(context, analytics);
  console.log(`Market cap: $${(analytics.totalMarketCap / 1e12).toFixed(2)}T`);
}
```

### MarketSummary

High-level executive reporting summary:

```typescript
interface MarketSummary {
  readonly timestamp: string;
  readonly market: Market;
  readonly period: DateRange;
  
  // Key metrics
  readonly totalValue: number;
  readonly totalActivity: number;
  readonly dominantInstrument: string;
  readonly dominantExchange: string;
  
  // Trend indicators
  readonly overallTrend: TrendDirection;        // "UP" | "DOWN" | "SIDEWAYS"
  readonly volatilityLevel: VolatilityLevel;    // "LOW" | "MEDIUM" | "HIGH"
  readonly liquidityLevel: LiquidityLevel;      // "LOW" | "MEDIUM" | "HIGH"
  
  // Quality metrics
  readonly dataQuality: DataQuality;            // "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
  readonly calculationConfidence: number;       // 0-1 confidence level
}
```

**Example Usage**:
```typescript
import { MarketSummary, isValidMarketSummary } from '@qi/dp/utils';

const summary: MarketSummary = {
  timestamp: new Date().toISOString(),
  market: { type: "CRYPTO", region: "GLOBAL", segment: "CASH" },
  period: { startDate: "2025-07-20T00:00:00.000Z", endDate: "2025-07-20T23:59:59.999Z" },
  totalValue: 2.5e12,
  totalActivity: 85e9,
  dominantInstrument: "BTC-USD",
  dominantExchange: "Binance",
  overallTrend: "UP",
  volatilityLevel: "MEDIUM",
  liquidityLevel: "HIGH",
  dataQuality: "EXCELLENT",
  calculationConfidence: 0.95
};

if (isValidMarketSummary(summary)) {
  console.log(`Market trend: ${summary.overallTrend}, Confidence: ${summary.calculationConfidence * 100}%`);
}
```

## Operation Interfaces

### MarketAnalyticsCalculator

Interface for computing analytics from DSL data:

```typescript
interface MarketAnalyticsCalculator {
  calculateMarketAnalytics(market: Market, period: DateRange): Promise<Result<MarketAnalytics>>;
  calculateDominanceMetrics(market: Market, period: DateRange): Promise<Result<DominanceMetrics>>;
  calculateChangeMetrics(market: Market, period: DateRange): Promise<Result<ChangeMetrics>>;
  calculateVolatilityMetrics(market: Market, period: DateRange): Promise<Result<VolatilityMetrics>>;
  calculateLiquidityMetrics(market: Market, period: DateRange): Promise<Result<LiquidityMetrics>>;
}
```

### AnalyticsAggregator

Interface for aggregating analytics across dimensions:

```typescript
interface AnalyticsAggregator {
  aggregateByExchange(analytics: MarketAnalytics[]): Promise<Result<Map<string, MarketAnalytics>>>;
  aggregateByAssetClass(analytics: MarketAnalytics[]): Promise<Result<Map<string, MarketAnalytics>>>;
  aggregateByTimeframe(analytics: MarketAnalytics[], timeframe: string): Promise<Result<MarketAnalytics[]>>;
  createMarketSummary(analytics: MarketAnalytics[]): Promise<Result<MarketSummary>>;
}
```

## Integration with @qi/base

All analytics validation uses standard Result<T> patterns:

```typescript
import { match } from '@qi/base';
import { isValidMarketAnalytics } from '@qi/dp/utils';

const validateAnalytics = (data: unknown) => {
  if (isValidMarketAnalytics(data)) {
    return success(data);
  }
  return failure(createMarketDataError("INVALID_ANALYTICS", "Analytics validation failed", "VALIDATION"));
};

match(
  analytics => console.log("Valid analytics:", analytics.totalMarketCap),
  error => console.error("Analytics error:", error),
  validateAnalytics(analyticsData)
);
```

## Analytics Configuration

### AnalyticsConfig

Configuration for analytics calculation engines:

```typescript
interface AnalyticsConfig {
  readonly calculationEngine: "STANDARD" | "ENHANCED" | "CUSTOM";
  readonly precisionMode: "FAST" | "BALANCED" | "PRECISE";
  readonly defaultTimeframes: string[];
  readonly maxHistoryWindow: number;    // milliseconds
  readonly minDataPoints: number;
  readonly volatilityThresholds: {
    readonly lowThreshold: number;
    readonly highThreshold: number;
  };
  readonly liquidityThresholds: {
    readonly tightSpreadThreshold: number;
    readonly deepMarketThreshold: number;
  };
  readonly dominanceThresholds: {
    readonly significantShareThreshold: number;
    readonly concentrationThreshold: number;
  };
}
```

## Analytics Input Data

### AnalyticsInputData

Type union for consuming DSL market data:

```typescript
type AnalyticsInputData = 
  | MarketData<Price>[]
  | MarketData<Level1>[]
  | MarketData<OHLCV>[]
  | MarketData<MarketDepth>[];
```

**Usage Example**:
```typescript
// Analytics consume DSL market data types
const priceData: MarketData<Price>[] = [/* price data */];
const level1Data: MarketData<Level1>[] = [/* level1 data */];

// Analytics calculator processes DSL data
const calculator: MarketAnalyticsCalculator = new MyAnalyticsCalculator();
const analyticsResult = await calculator.calculateMarketAnalytics(market, period);
```

## Wrapper Pattern

### AnalyticsMarketData

Since analytics are no longer part of CoreMarketData, a separate wrapper maintains DSL structure consistency:

```typescript
interface AnalyticsMarketData {
  readonly context: DataContext;
  readonly coreData: MarketAnalytics;
}

// Create wrapper
const wrapped = createAnalyticsMarketData(context, analytics);

// Type guard
if (isAnalyticsMarketData(someData)) {
  console.log("Analytics context:", someData.context.instrument.symbol);
  console.log("Market cap:", someData.coreData.totalMarketCap);
}
```

## Best Practices

### Validation First
Always validate analytics data before usage:
```typescript
if (!isValidMarketAnalytics(analytics)) {
  throw new Error("Invalid analytics data");
}
```

### Result Pattern Integration
Use @qi/base Result patterns for error handling:
```typescript
import { flatMap } from '@qi/base';

const processAnalytics = (analytics: MarketAnalytics) =>
  flatMap(
    summary => /* process summary */,
    aggregator.createMarketSummary([analytics])
  );
```

### Type Safety
Leverage TypeScript's type system for compile-time validation:
```typescript
// Type-safe analytics processing
const processValidatedAnalytics = (analytics: MarketAnalytics): void => {
  // TypeScript guarantees analytics is valid
  console.log(analytics.totalMarketCap); // Safe access
};
```

### Performance Considerations
- Analytics calculations can be expensive; consider caching
- Use appropriate precision mode based on performance requirements
- Batch analytics operations when possible
- Consider async/await patterns for large datasets

## Common Patterns

### Validation Chain
```typescript
const validateAndProcess = (data: unknown) => {
  if (!isValidMarketAnalytics(data)) return failure(/* error */);
  if (!isValidDominanceMetrics(data.dominanceMetrics)) return failure(/* error */);
  if (!isValidChangeMetrics(data.changeMetrics)) return failure(/* error */);
  return success(data);
};
```

### Analytics Pipeline
```typescript
const analyticsPipeline = async (inputData: AnalyticsInputData) => {
  const analytics = await calculator.calculateMarketAnalytics(market, period);
  return flatMap(
    summary => aggregator.createMarketSummary([summary]),
    analytics
  );
};
```

## Integration with New Architecture

### Dependencies on MD Layer

Analytics depend on the MD layer for validated market data instances:

```typescript
// lib/src/utils/analytics/calculator.ts
import * as MD from '../../md';
import { FinancialDecimal } from '../precision';

export class StandardAnalyticsCalculator implements MarketAnalyticsCalculator {
  async calculateMarketCap(
    prices: MD.MarketData.Price[],
    supplies: number[]
  ): Promise<Result<number, any>> {
    // Use validated price instances from MD layer
    const totalCap = prices.reduce((sum, priceInstance, index) => {
      const price = FinancialDecimal.create(priceInstance.price.toString());
      const supply = FinancialDecimal.create(supplies[index].toString());
      
      if (price.tag === 'success' && supply.tag === 'success') {
        return sum.add(price.value.multiply(supply.value));
      }
      return sum;
    }, FinancialDecimal.create("0").value);
    
    return success(totalCap.toNumber());
  }
}
```

### Usage with Smart Constructors

Analytics consume validated data from smart constructors:

```typescript
// Create validated market data using smart constructors
const priceResult = MD.Price.create(
  "2025-07-20T12:00:00.000Z",
  "65000.50",
  "1.5",
  "trade-123",
  "BUY"
);

if (priceResult.tag === 'success') {
  // Pass validated instance to analytics
  const analytics = await calculator.calculateMarketAnalytics(
    [priceResult.value],
    dateRange
  );
}
```

### Namespace Integration

Analytics work with the hierarchical namespace structure:

```typescript
import type { Market, Price } from '@qi/dp/dsl';
import * as MD from '@qi/dp/md';
import { 
  MarketAnalytics, 
  calculateDominanceMetrics 
} from '@qi/dp/utils';

// Type references use DSL imports
const market: Market = { /* market definition */ };
const priceType: Price = { /* price interface */ };

// Implementation instances use MD smart constructors
const priceImpl = MD.Price.create(...);

// Analytics provide business intelligence
const analytics: MarketAnalytics = await calculateMarketAnalytics(market, period);
```

This module provides comprehensive business intelligence capabilities while maintaining clean architectural separation and proper dependency flow through the new namespace structure.