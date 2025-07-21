# QiCore DP Actor Architecture - Module Dependencies

## Overview

This document defines the module architecture for the QiCore Data Processing Actor TypeScript implementation, specifying the hierarchical namespace structure, dependency flow, and architectural principles.

## Architectural Principles

### File-Scoped Module Organization
- **dsl/** - Pure vocabulary interfaces (FIX Protocol 4.4 types only)
- **md/** - Smart constructor implementations 
- **utils/** - Business logic utilities

### Dependency Flow
```
dsl/* (vocabulary) → md/* (implementations) → utils/* (business logic)
```

### Clean Separation
- **No Circular Dependencies**: Each layer only imports from layers above it
- **Single Responsibility**: Each module has one focused concern
- **Interface Implementation**: Smart constructors implement DSL interfaces for type compatibility

## Module Structure

### DSL Layer (`lib/src/dsl/`)

**Purpose**: Pure FIX Protocol 4.4 vocabulary definition
**Exports**: Hierarchical namespaces with interface definitions
**Dependencies**: Only `@qi/base` and `@qi/core`

#### market-data.ts exports
```typescript
// Core FIX Protocol 4.4 market data types
export interface Price { /* FIX Protocol MDEntryType=2 */ }
export interface Level1 { /* FIX Protocol MDEntryType=0/1 */ }
export interface OHLCV { /* Trade aggregations */ }
export interface MarketDepth { /* Multi-level order book */ }

export type CoreMarketData = Price | Level1 | OHLCV | MarketDepth;

export interface MarketData<T extends CoreMarketData> {
  context: DataContext;
  coreData: T;
}
```

#### types.ts exports
```typescript
// Context and supporting types
export interface DataContext { /* WHO/WHERE/WHAT identification */ }
export interface Market { /* Market classification */ }
export interface Exchange { /* Exchange identification */ }
export interface Instrument { /* Financial instrument details */ }

export interface DateRange { /* Time period specification */ }
export type Timeframe = string; /* Time interval specification */
export type Levels = number; /* Order book depth specification */
export type Side = 'BUY' | 'SELL'; /* Trade aggressor side */
```

#### operations.ts exports
```typescript
// Operation interface definitions
export interface MarketDataReader { /* Data retrieval operations */ }
export interface MarketDataWriter { /* Data writing operations */ }
export interface MarketDataContextManager { /* Context management */ }
// ... streaming and historical interfaces
```

**Files**:
- `index.ts` - Main namespace exports
- `market-data.ts` - Core data type interfaces
- `types.ts` - Context and support type interfaces
- `operations.ts` - Operation interface definitions
- `constants.ts` - Standard constants and enumerations
- `errors.ts` - DSL-specific error creation functions

**Import Dependencies**: None (except @qi foundation)
**Export Dependencies**: Used by MD layer and application code

### MD Layer (`lib/src/md/`)

**Purpose**: Smart constructor implementations of DSL interfaces
**Exports**: DP.MarketData namespace with implementation classes
**Dependencies**: DSL layer, `@qi/base`, shared validation utilities

#### Smart Constructor Implementations
```typescript
// price.ts
export class Price implements DSL.Price {
  private constructor(/* validated fields */);
  static create(...): Result<Price, any> { /* smart constructor */ }
}

// level1.ts
export class Level1 implements DSL.Level1 {
  private constructor(/* validated fields */);
  static create(...): Result<Level1, any> { /* smart constructor */ }
}

// ohlcv.ts
export class OHLCV implements DSL.OHLCV {
  private constructor(/* validated fields */);
  static create(...): Result<OHLCV, any> { /* smart constructor */ }
}

// market-depth.ts
export class MarketDepth implements DSL.MarketDepth {
  private constructor(/* validated fields */);
  static create(...): Result<MarketDepth, any> { /* smart constructor */ }
}

// data-context.ts
export class DataContext implements DSL.DataContext {
  private constructor(/* validated fields */);
  static create(...): Result<DataContext, any> { /* smart constructor */ }
}
```

**Design Pattern**: Functional Programming Smart Constructors
- Private constructor prevents invalid object creation
- Static factory method provides single creation point with validation
- Result<T> return type for functional error handling
- Interface implementation enables usage anywhere DSL type is expected

**Files**:
- `index.ts` - Namespace exports
- `price.ts` - Price smart constructor
- `level1.ts` - Level1 smart constructor
- `ohlcv.ts` - OHLCV smart constructor
- `market-depth.ts` - MarketDepth smart constructor
- `market-data.ts` - MarketData<T> generic wrapper
- `data-context.ts` - DataContext smart constructor
- `validation.ts` - Shared validation utilities

**Import Dependencies**: DSL layer interfaces, utils/validation
**Export Dependencies**: Used by utils layer and application code

### Utils Layer (`lib/src/utils/`)

**Purpose**: Business logic utilities and specialized concerns
**Exports**: Utility functions and business intelligence types
**Dependencies**: MD layer, DSL layer, `@qi/base`, external libraries

#### Analytics Module (`utils/analytics/`)
```typescript
// Business intelligence derived FROM market data
interface MarketAnalytics { /* comprehensive analytics */ }
interface DominanceMetrics { /* market concentration */ }
interface ChangeMetrics { /* period-over-period changes */ }
interface VolatilityMetrics { /* risk measures */ }
interface LiquidityMetrics { /* market depth indicators */ }

// Analytics operations (interfaces only - concrete implementations separate)
interface MarketAnalyticsCalculator { /* calculation operations */ }
interface AnalyticsAggregator { /* aggregation operations */ }
```

**Files**:
- `index.ts` - Analytics exports
- `types.ts` - Analytics data types and interfaces
- `calculator.ts` - Analytics calculation interfaces
- `aggregator.ts` - Analytics aggregation interfaces
- `validation.ts` - Analytics validation functions

**Dependencies**: MD layer for validated market data instances

#### Precision Module (`utils/precision/`)
```typescript
// Financial arithmetic with guaranteed precision
class FinancialDecimal {
  static create(value: string | number): Result<FinancialDecimal, any>;
  static createPrice(value: string | number): Result<FinancialDecimal, any>;
  static createSize(value: string | number): Result<FinancialDecimal, any>;
  
  // Mathematical operations
  add(other: FinancialDecimal): FinancialDecimal;
  subtract(other: FinancialDecimal): FinancialDecimal;
  multiply(other: FinancialDecimal): FinancialDecimal;
  divide(other: FinancialDecimal): Result<FinancialDecimal, any>;
  
  // Financial calculations
  percentageChange(newValue: FinancialDecimal): Result<FinancialDecimal, any>;
  static calculateSpread(bid: FinancialDecimal, ask: FinancialDecimal): Result<FinancialDecimal, any>;
  static calculateWeightedAverage(prices: FinancialDecimal[], weights: FinancialDecimal[]): Result<FinancialDecimal, any>;
}
```

**Files**:
- `index.ts` - Precision exports
- `financial-decimal.ts` - FinancialDecimal class implementation
- `utilities.ts` - Parsing and formatting utilities
- `constants.ts` - Common decimal constants

**Dependencies**: `decimal.js` library, `@qi/base` Result types

#### Validation Module (`utils/validation/`)
```typescript
// Shared validation utilities used by MD layer
export const isValidTimestamp = (timestamp: string): boolean => { /* ISO 8601 validation */ };
export const isPositiveFiniteNumber = (value: unknown): value is number => { /* positive validation */ };
export const isNonNegativeFiniteNumber = (value: unknown): value is number => { /* non-negative validation */ };
```

**Files**:
- `index.ts` - Validation exports
- `primitives.ts` - Basic type validators
- `financial.ts` - Financial constraint validators
- `temporal.ts` - Date/time validators

**Dependencies**: None (pure utility functions)

## Dependency Graph

```mermaid
graph TD
    A[DSL Layer] --> B[MD Layer]
    B --> C[Utils/Analytics]
    B --> D[Utils/Precision]
    B --> E[Utils/Validation]
    C --> D
    C --> E
    
    A --> F[@qi/base]
    A --> G[@qi/core]
    B --> F
    C --> F
    D --> F
    D --> H[decimal.js]
    
    I[Application Code] --> A
    I --> B
    I --> C
    I --> D
```

### External Dependencies
- **@qi/base**: Result<T> error handling, functional utilities
- **@qi/core**: Configuration, logging, caching infrastructure
- **decimal.js**: Precise decimal arithmetic for financial calculations

### Internal Dependencies
- **DSL → MD**: MD implements DSL interfaces
- **MD → Utils/Validation**: MD uses shared validation utilities
- **Utils/Analytics → MD**: Analytics consume validated MD instances
- **Utils/Analytics → Utils/Precision**: Analytics use precision utilities for calculations

## Import Patterns

### DSL Interface Usage
```typescript
// Import DSL interfaces with file-scoped namespacing
import * as DSL from '@qi/dp/actor/dsl';
type Price = DSL.Price;
type DataContext = DSL.DataContext;

// Or import specific interfaces
import type { Price, DataContext } from '@qi/dp/actor/dsl';
```

### Smart Constructor Usage
```typescript
// Import MD implementations for object creation
import * as MD from '@qi/dp/actor/md';
const priceResult = MD.Price.create(
  "2025-07-20T12:00:00.000Z",
  65000.50,
  1.5
);

// Or import specific constructors
import { Price } from '@qi/dp/actor/md';
const priceResult = Price.create(...);
```

### Utility Function Usage
```typescript
// Import specific utilities as needed
import { FinancialDecimal } from '@qi/dp/actor/utils/precision';
import { MarketAnalytics } from '@qi/dp/actor/utils/analytics';
```

## Error Handling Strategy

### Result<T> Pattern
All fallible operations return `Result<T, any>` from `@qi/base`:

```typescript
// Creation operations with file-scoped imports
import { Price } from '@qi/dp/actor/md';
const priceResult: Result<Price, any> = 
  Price.create("timestamp", 100.50, 1.0);

// Chaining operations
const totalResult = flatMap(
  price => flatMap(
    quantity => success(price * quantity),
    FinancialDecimal.createSize("1.5")
  ),
  FinancialDecimal.createPrice("65000.50")
);

// Error handling
match(
  value => console.log("Success:", value),
  error => console.error("Error:", error),
  totalResult
);
```

### Error Categories
- **VALIDATION**: Data validation failures
- **NETWORK**: Network and API errors
- **SYSTEM**: System and internal errors
- **TIMEOUT**: Operation timeout errors

## Performance Considerations

### Smart Constructor Efficiency
- Validation logic encapsulated in classes (O(1) for basic types)
- Order book validation O(n) where n is depth levels
- No unnecessary object creation during validation

### Memory Management
- Immutable objects prevent accidental mutations
- Result<T> pattern avoids exceptions and stack unwinding
- Decimal.js provides precise arithmetic without accumulating floating-point errors

### Caching Strategy
- Analytics results can be cached using `@qi/core/cache`
- Validated objects can be reused across calculations
- Common decimal constants pre-created for efficiency

## Quality Standards

### Type Safety
- Complete TypeScript type coverage
- Interface-implementation pattern ensures compatibility
- Generic types for wrapper patterns (`MarketData<T>`)

### Validation Coverage
- All required fields validated in smart constructors
- All business rules enforced (e.g., no crossed markets)
- Comprehensive error messages with context

### Testing Requirements
- Unit tests for each smart constructor
- Validation edge cases covered
- Business rule enforcement tested
- Error message accuracy verified
- Integration tests across layers

## Migration Benefits

### From Factory Pattern to Smart Constructors
1. **Eliminates Duplication**: No separate factory + validation functions
2. **Better API Design**: `Price.create()` vs `createPrice()`
3. **Encapsulation**: Validation logic inside the class
4. **Type Safety**: Classes implement DSL interfaces directly
5. **FP Compliance**: Follows functional programming smart constructor pattern

### Architectural Improvements
1. **Clear Hierarchy**: File-scoped module organization reflects dependency flow
2. **No Circular Dependencies**: Clean separation prevents import cycles
3. **Focused Concerns**: Each module has single responsibility
4. **Scalable Design**: New utilities can be added without affecting core layers
5. **Modern ES6**: Uses file scope for namespacing with named exports (Google TypeScript Style Guide 2025)

This architecture provides a robust, maintainable, and scalable foundation for market data processing while following functional programming principles and maintaining clean separation of concerns.