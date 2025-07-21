# Actor Implementation Guide

## Objective and Boundary

This document provides implementation guidance for **Part II of the DSL specification** (`docs/dsl/`). We implement the actor patterns and behavioral contracts defined in DSL Part II, staying strictly within the boundaries and interfaces specified by the corresponding modules.

**Scope**: Actor classes that implement DSL Part II modules (context managers, readers, historical readers, streaming readers, etc.)

**Boundary**: We adhere to the contracts defined in `docs/dsl/` Part II and do not extend beyond these specifications.

## Actor Concept

An **Actor** is a class that implements a particular module from DSL Part II. Actors provide concrete implementations of the behavioral contracts while maintaining clean separation from the data types defined in DSL Part I.

### Actor Types

**1. Generic Actor**
- Implements DSL Part II contracts directly
- Uses base layer modules for infrastructure
- Pure implementation without external dependencies

**2. MCP Actor** 
- Generic Actor enhanced with MCP client capabilities
- Implements contracts using:
  - MCP server tools (external capabilities)
  - Base layer modules (infrastructure support)

## Abstract Base Classes

All abstract classes in both reader and writer hierarchies inherit from a common base that provides:

1. **Constructor Input**: Takes market data context as the input type
2. **Context Manager Implementation**: Base class implements `MarketDataContextManager` contract from DSL Part II
3. **Workflow Abstraction**: Each DSL contract method uses workflow abstraction with the handler pattern

### Base Abstract Class

The base abstract class provides shared functionality:

```typescript
import * as DSL from 'lib/src/dsl';

abstract class BaseActor {
  constructor(protected context: DSL.DataContext) {}

  // Context Manager Contract (implemented in base class)
  createContext(market: DSL.Market, exchange: DSL.Exchange, instrument: DSL.Instrument): Result<DSL.DataContext>
  getContext(query: DSL.ContextQuery): Result<DSL.DataContext[]>  
  updateMarket(context: DSL.DataContext, market: DSL.Market): Result<DSL.DataContext>
  updateExchange(context: DSL.DataContext, exchange: DSL.Exchange): Result<DSL.DataContext>
  updateInstrument(context: DSL.DataContext, instrument: DSL.Instrument): Result<DSL.DataContext>
  validateContext(context: DSL.DataContext): Result<void>

  // Workflow abstraction (implemented in base class)
  protected workflow<T>(handler: () => Promise<T>, errorType: string): Promise<Result<T>>
}
```

## Reader Abstract Classes

Each reader abstract class extends the base class and focuses only on reader-specific contracts:

### Abstract Class Pattern

Abstract classes implement DSL contracts using workflow abstraction and delegate concrete implementation to handlers:

```typescript
// DSL method implemented in BaseReader
async getCurrentPrice(coinId: string, vsCurrency = "usd"): Promise<Result<number>> {
  return this.workflow(
    () => this.getCurrentPriceHandler(coinId, vsCurrency),
    "PRICE_FETCH_ERROR"
  );
}

// Concrete classes implement only the handler
protected abstract getCurrentPriceHandler(coinId: string, vsCurrency: string): Promise<number>;
```

**Pattern Benefits**:
- **Separation of Concerns**: Abstract class handles workflow, concrete class handles implementation
- **Error Handling**: Centralized error management through workflow abstraction
- **Consistency**: All DSL methods follow the same pattern across different readers

### Reader

Extends `BaseActor` and implements: **`MarketDataReader`** interface from DSL Part II

**DSL Contract to Implement**:
- `MarketDataReader`: Current data retrieval operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Reader Contract (DSL Part II)
getCurrentPrice(context: DSL.DataContext): Result<DSL.MarketData<DSL.Price>>
getCurrentPrices(contexts: DSL.DataContext[]): Result<DSL.MarketData<DSL.Price>[]>
getLevel1(context: DSL.DataContext): Result<DSL.MarketData<DSL.Level1>>
getMarketDepth(context: DSL.DataContext, levels: DSL.Levels): Result<DSL.MarketData<DSL.MarketDepth>>
getOHLCV(context: DSL.DataContext, timeframe: DSL.Timeframe): Result<DSL.MarketData<DSL.OHLCV>>
getPriceHistory(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Price>[]>
getLevel1History(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Level1>[]>
getOHLCVHistory(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Result<DSL.MarketData<DSL.OHLCV>[]>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract getCurrentPriceHandler(context: DSL.DataContext): Promise<DSL.MarketData<DSL.Price>>
protected abstract getCurrentPricesHandler(contexts: DSL.DataContext[]): Promise<DSL.MarketData<DSL.Price>[]>
protected abstract getLevel1Handler(context: DSL.DataContext): Promise<DSL.MarketData<DSL.Level1>>
protected abstract getMarketDepthHandler(context: DSL.DataContext, levels: DSL.Levels): Promise<DSL.MarketData<DSL.MarketDepth>>
protected abstract getOHLCVHandler(context: DSL.DataContext, timeframe: DSL.Timeframe): Promise<DSL.MarketData<DSL.OHLCV>>
protected abstract getPriceHistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Price>[]>
protected abstract getLevel1HistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Level1>[]>
protected abstract getOHLCVHistoryHandler(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Promise<DSL.MarketData<DSL.OHLCV>[]>
```

**Handler Pattern Implementation**:
Each abstract class provides workflow abstraction with concrete handlers for implementation details.

### Historical Reader

Extends `BaseActor` and implements: **`HistoricalMarketDataReader`** interface from DSL Part II

**DSL Contract to Implement**:
- `HistoricalMarketDataReader`: Historical data retrieval operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Historical Reader Contract (DSL Part II)  
getPriceHistory(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Price>[]>
getLevel1History(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Level1>[]>
getOHLCVHistory(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Result<DSL.MarketData<DSL.OHLCV>[]>
getMarketDepthHistory(context: DSL.DataContext, levels: DSL.Levels, range: DSL.DateRange): Result<DSL.MarketData<DSL.MarketDepth>[]>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract getPriceHistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Price>[]>
protected abstract getLevel1HistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Level1>[]>
protected abstract getOHLCVHistoryHandler(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Promise<DSL.MarketData<DSL.OHLCV>[]>
protected abstract getMarketDepthHistoryHandler(context: DSL.DataContext, levels: DSL.Levels, range: DSL.DateRange): Promise<DSL.MarketData<DSL.MarketDepth>[]>
```

**Specialization**:
- **Chronological Ordering**: All historical operations maintain temporal ordering
- **Batch Operations**: Atomic success/failure semantics for batch writes
- **Date Range Validation**: Ensures `startDate <= endDate` with appropriate error handling

### Streaming Reader

Extends `BaseActor` and implements: **`StreamingMarketDataReader`** interface from DSL Part II

**DSL Contract to Implement**:
- `StreamingMarketDataReader`: Real-time streaming operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Streaming Reader Contract (DSL Part II)
subscribePriceStream(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Price>) => void): Result<DSL.Subscription>
subscribeLevel1Stream(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Level1>) => void): Result<DSL.Subscription>
subscribeMarketDepthStream(context: DSL.DataContext, levels: DSL.Levels, callback: (data: DSL.MarketData<DSL.MarketDepth>) => void): Result<DSL.Subscription>
subscribeOHLCVStream(context: DSL.DataContext, timeframe: DSL.Timeframe, callback: (data: DSL.MarketData<DSL.OHLCV>) => void): Result<DSL.Subscription>
unsubscribe(subscription: DSL.Subscription): Result<void>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract subscribePriceStreamHandler(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Price>) => void): Promise<DSL.Subscription>
protected abstract subscribeLevel1StreamHandler(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Level1>) => void): Promise<DSL.Subscription>
protected abstract subscribeMarketDepthStreamHandler(context: DSL.DataContext, levels: DSL.Levels, callback: (data: DSL.MarketData<DSL.MarketDepth>) => void): Promise<DSL.Subscription>
protected abstract subscribeOHLCVStreamHandler(context: DSL.DataContext, timeframe: DSL.Timeframe, callback: (data: DSL.MarketData<DSL.OHLCV>) => void): Promise<DSL.Subscription>
protected abstract unsubscribeHandler(subscription: DSL.Subscription): Promise<void>
```

**Specialization**:
- **Subscription Management**: Handle active subscription lifecycle with cleanup
- **Non-blocking Callbacks**: Ensure callback execution doesn't block stream processing
- **Stream Reliability**: Implement reconnection and error recovery for continuous data flow

## Writer Abstract Classes

Each writer abstract class extends the same `BaseActor` and focuses only on writer-specific contracts.

### Writer

Extends `BaseActor` and implements: **`MarketDataWriter`** interface from DSL Part II

**DSL Contract to Implement**:
- `MarketDataWriter`: Data storage and publishing operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Writer Contract (DSL Part II)
publishPrice(data: DSL.MarketData<DSL.Price>): Result<void>
publishPrices(data: DSL.MarketData<DSL.Price>[]): Result<void>
publishLevel1(data: DSL.MarketData<DSL.Level1>): Result<void>
publishMarketDepth(data: DSL.MarketData<DSL.MarketDepth>): Result<void>
publishOHLCV(data: DSL.MarketData<DSL.OHLCV>): Result<void>
publishOHLCVBatch(data: DSL.MarketData<DSL.OHLCV>[]): Result<void>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract publishPriceHandler(data: DSL.MarketData<DSL.Price>): Promise<void>
protected abstract publishPricesHandler(data: DSL.MarketData<DSL.Price>[]): Promise<void>
protected abstract publishLevel1Handler(data: DSL.MarketData<DSL.Level1>): Promise<void>
protected abstract publishMarketDepthHandler(data: DSL.MarketData<DSL.MarketDepth>): Promise<void>
protected abstract publishOHLCVHandler(data: DSL.MarketData<DSL.OHLCV>): Promise<void>
protected abstract publishOHLCVBatchHandler(data: DSL.MarketData<DSL.OHLCV>[]): Promise<void>
```

**Handler Pattern Implementation**:
Each abstract class provides workflow abstraction with concrete handlers for implementation details.

### Historical Writer

Extends `BaseActor` and implements: **`HistoricalMarketDataWriter`** interface from DSL Part II

**DSL Contract to Implement**:
- `HistoricalMarketDataWriter`: Historical data storage operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Historical Writer Contract (DSL Part II)
storePriceHistory(data: DSL.MarketData<DSL.Price>[]): Result<void>
storeLevel1History(data: DSL.MarketData<DSL.Level1>[]): Result<void>
storeOHLCVHistory(data: DSL.MarketData<DSL.OHLCV>[]): Result<void>
storeMarketDepthHistory(data: DSL.MarketData<DSL.MarketDepth>[]): Result<void>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract storePriceHistoryHandler(data: DSL.MarketData<DSL.Price>[]): Promise<void>
protected abstract storeLevel1HistoryHandler(data: DSL.MarketData<DSL.Level1>[]): Promise<void>
protected abstract storeOHLCVHistoryHandler(data: DSL.MarketData<DSL.OHLCV>[]): Promise<void>
protected abstract storeMarketDepthHistoryHandler(data: DSL.MarketData<DSL.MarketDepth>[]): Promise<void>
```

**Specialization**:
- **Batch Operations**: Atomic success/failure semantics for batch writes
- **Chronological Ordering**: Maintain temporal ordering during storage
- **Data Deduplication**: Handle duplicate timestamps within batch operations

### Streaming Writer

Extends `BaseActor` and implements: **`StreamingMarketDataWriter`** interface from DSL Part II

**DSL Contract to Implement**:
- `StreamingMarketDataWriter`: Real-time streaming output operations (context manager inherited from base)

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Streaming Writer Contract (DSL Part II)
streamPrice(data: DSL.MarketData<DSL.Price>): Result<void>
streamLevel1(data: DSL.MarketData<DSL.Level1>): Result<void>
streamMarketDepth(data: DSL.MarketData<DSL.MarketDepth>): Result<void>
streamOHLCV(data: DSL.MarketData<DSL.OHLCV>): Result<void>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract streamPriceHandler(data: DSL.MarketData<DSL.Price>): Promise<void>
protected abstract streamLevel1Handler(data: DSL.MarketData<DSL.Level1>): Promise<void>
protected abstract streamMarketDepthHandler(data: DSL.MarketData<DSL.MarketDepth>): Promise<void>
protected abstract streamOHLCVHandler(data: DSL.MarketData<DSL.OHLCV>): Promise<void>
```

**Specialization**:
- **Non-blocking Operations**: Ensure stream writes don't block data processing
- **Buffer Management**: Handle backpressure and message queuing
- **Stream Health**: Monitor connection status and implement retry logic