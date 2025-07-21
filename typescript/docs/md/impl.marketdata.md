# Market Data Implementation Guide (MD)

## Overview

This guide covers the smart constructor implementation layer for DSL market data types. The MD layer provides validated implementations of DSL interfaces using functional programming smart constructor patterns.

## Architecture Position

```
dsl/* (interfaces) → md/* (implementations) → utils/* (business logic)
```

## Smart Constructor Pattern

### Design Principles

1. **Private Constructor**: Prevents invalid object creation
2. **Static Factory Method**: Single creation point with validation
3. **Result<T> Return**: Functional error handling with `@qi/base`
4. **Interface Implementation**: Can be used anywhere DSL type is expected
5. **Validation Encapsulation**: All validation logic contained in class

### Implementation Template

```typescript
import type { Result } from '@qi/base';
import { success, failure, create } from '@qi/base';
import * as DSL from '../dsl';

export class Price implements DSL.Price {
  private constructor(
    public readonly timestamp: string,
    public readonly price: DSL.decimal,
    public readonly size: DSL.decimal,
    public readonly tradeId?: string,
    public readonly aggressor?: DSL.Side
  ) {}

  static create(
    timestamp: string,
    price: DSL.decimal,
    size: DSL.decimal,
    tradeId?: string,
    aggressor?: DSL.Side
  ): Result<Price> {
    // Validation logic - delegate to validation functions
    // Return success(new Price(...)) or failure(create(...))
  }

  static fromDSL(obj: DSL.Price): Result<Price> {
    // Direct mapping from DSL interface to validated implementation
    return Price.create(obj.timestamp, obj.price, obj.size, obj.tradeId, obj.aggressor);
  }
}
```

### @qi/base Integration

All operations use `Result<T>` pattern:

```typescript
import { match, success, failure, create } from '@qi/base';

// Creating instances
const priceResult = Price.create(timestamp, price, size);

// Handling results with match() - preferred pattern
match(
  price => console.log("Valid price:", price),
  error => console.log("Invalid price:", error),
  priceResult
);

// Creating from DSL interface
const dslPrice: DSL.Price = { timestamp, price, size };
const priceFromDSL = Price.fromDSL(dslPrice);

// Error creation with custom codes
const error = create(
  'INVALID_PRICE',
  'Price must be positive',
  'VALIDATION',
  { value: price }
);
```

## Core Data Type Implementations

### Price Implementation
- **File**: `lib/src/md/price.ts`
- **Pattern**: Smart constructor with `create()` and `fromDSL()` methods
- **Input**: Typed parameters or `DSL.Price` interface
- **Business Rules**: Price > 0, Size > 0, valid ISO 8601 timestamp
- **FIX Compliance**: MDEntryType=2 with Tags 273, 270, 271

### Level1 Implementation  
- **File**: `lib/src/md/level1.ts`
- **Pattern**: Smart constructor with bid/ask validation
- **Business Rules**: askPrice >= bidPrice (no crossed market)
- **FIX Compliance**: MDEntryType=0/1 with bid/ask entries

### OHLCV Implementation
- **File**: `lib/src/md/ohlcv.ts`
- **Pattern**: Smart constructor with OHLC relationship validation
- **Business Rules**: high >= max(open, close), low <= min(open, close)
- **FIX Compliance**: Derived from MDEntryType=2 aggregations

### MarketDepth Implementation
- **File**: `lib/src/md/market-depth.ts`
- **Pattern**: Smart constructor with array validation and ordering
- **Business Rules**: Bids descending, asks ascending, no crossed market
- **FIX Compliance**: Multi-level MDEntryType=0/1 with Tag 1023

## Data Context Implementations

### Market Implementation
- **File**: `lib/src/md/market.ts`
- **Validation**: MarketType enum, ISO region codes, Segment enum
- **Standards**: ISO 3166-1 alpha-2 country codes

### Exchange Implementation
- **File**: `lib/src/md/exchange.ts`
- **Validation**: Non-empty ID/name, optional MIC (ISO 10383), IANA timezone
- **Standards**: 4-letter MIC codes, IANA timezone identifiers

### Instrument Implementation
- **File**: `lib/src/md/instrument.ts`
- **Validation**: Symbol, optional ISIN (ISO 6166), AssetClass, Currency (ISO 4217)
- **Standards**: 12-character ISIN, 3-letter currency codes

### DataContext Implementation
- **File**: `lib/src/md/data-context.ts`
- **Pattern**: Composition validation with cross-checks
- **Business Rules**: Market-instrument compatibility validation

## Supporting Type Implementations

### decimal Type Handling
- **Purpose**: String-based financial precision
- **Pattern**: Helper functions for parsing, formatting, validation
- **Location**: `lib/src/md/decimal-utils.ts`

### MarketData<T> Generic Wrapper
- **Purpose**: Combine DataContext + CoreMarketData
- **Pattern**: Generic smart constructor with type safety
- **Validation**: Both context and core data required

### Supporting Types
- **Side**: BUY/SELL enum validation
- **DateRange**: Chronological order validation  
- **Timeframe**: Standard interval validation
- **Levels**: Order book depth validation

## Validation Strategy

### Shared Validation Functions
- **File**: `lib/src/md/validation.ts`
- **Purpose**: Common validators used across smart constructors
- **Examples**: `isValidTimestamp`, `isPositiveFiniteNumber`, `isNonNegativeFiniteNumber`

### Error Handling Strategy
All validation errors use `@qi/base` error creation:

```typescript
import { create } from '@qi/base';

// Use create() for custom error codes
const error = create(
  'INVALID_PRICE',
  'Price must be positive number',
  'VALIDATION',
  { value: price, field: 'price' }
);
```

### Error Categories
- `VALIDATION`: Data validation failures
- `NETWORK`: Network and API errors
- `SYSTEM`: System and internal errors
- `TIMEOUT`: Operation timeout errors

## Universal Data Laws Enforcement

### Law 1: Two-Part Structure
- **Rule**: MarketData = DataContext + CoreMarketData
- **Implementation**: `MarketData<T>` generic wrapper validation

### Law 2: Numeric Precision
- **Rule**: All financial values use `decimal` type
- **Implementation**: Smart constructors accept decimal strings, validate as numbers

### Law 3: Timestamp Format
- **Rule**: ISO 8601 strings only
- **Implementation**: `isValidTimestamp` validation in all constructors

### Law 4: Non-Null Constraints
- **Rule**: Required fields cannot be null
- **Implementation**: TypeScript types + runtime validation

### Law 5: Range Validation
- **Rule**: Finite numbers only (no NaN/Infinity)
- **Implementation**: `isPositiveFiniteNumber`/`isNonNegativeFiniteNumber` validators

### Law 6: Temporal Ordering
- **Rule**: Timestamps in chronological order
- **Implementation**: Cross-timestamp validation where applicable

## FIX Protocol 4.4 Compliance

### Price Data (MDEntryType=2)
- **Required Tags**: 273 (MDEntryTime), 270 (MDEntryPrice), 271 (MDEntrySize)
- **Optional Tags**: 1003 (TradeID), 54 (Side)
- **Validation**: Timestamp format, positive price/size

### Level1 Data (MDEntryType=0/1)
- **Structure**: Two entries (bid=0, ask=1) with same tags
- **Validation**: No crossed market, all positive values

### OHLCV Data (Trade Aggregations)
- **Derivation**: Computed from Trade (MDEntryType=2) data
- **Validation**: OHLC mathematical relationships

### MarketDepth Data (Multi-level)
- **Structure**: Arrays of price levels with Tag 1023
- **Validation**: Proper ordering, no crossed market

## File Structure

```
lib/src/md/
├── index.ts                 # Named exports
├── price.ts                 # Price smart constructor
├── level1.ts                # Level1 smart constructor
├── ohlcv.ts                 # OHLCV smart constructor
├── market-depth.ts          # MarketDepth smart constructor
├── market.ts                # Market smart constructor
├── exchange.ts              # Exchange smart constructor
├── instrument.ts            # Instrument smart constructor
├── data-context.ts          # DataContext smart constructor
├── market-data.ts           # MarketData<T> generic wrapper
├── validation.ts            # Shared validation utilities
└── decimal-utils.ts         # Decimal type utilities
```

## Dependencies

### Import Dependencies
- `@qi/base`: Result<T>, success, failure, match, create
- `../dsl`: All DSL interface types

### Export Dependencies
- Used by: utils/analytics, utils/precision, application code

## Usage Patterns

### Creating Market Data
```typescript
import * as DSL from '../dsl';
import { Price, DataContext, MarketData } from '../md';
import { match } from '@qi/base';

// Create validated price
const priceResult = Price.create(
  "2025-07-20T12:00:00.000Z",
  "100.50", 
  "1000"
);

// Handle result
match(
  price => console.log("Valid price:", price),
  error => console.error("Invalid price:", error),
  priceResult
);
```

### Type Compatibility
```typescript
import * as DSL from '../dsl';
import { Price } from '../md';

// Smart constructor instances implement DSL interfaces
const price: DSL.Price = Price.create(...).value; // Assumes success

// Can be used in functions expecting DSL types
function processPrice(price: DSL.Price): void {
  // Works with both DSL interfaces and MD implementations
}
```

## Quality Standards

### Validation Coverage
- All required fields validated
- All business rules enforced  
- All optional fields handled correctly
- Comprehensive error messages with context

### Testing Requirements
- Unit tests for each smart constructor
- Validation edge cases covered
- Business rule enforcement tested
- Error message accuracy verified
- Result<T> pattern compliance verified

### Performance Considerations
- Validation should be O(1) for basic types
- Order book validation O(n) where n is depth levels
- No unnecessary object creation during validation
- Efficient error message construction using @qi/base

This implementation guide provides the architectural foundation for creating robust, type-safe, and functionally-oriented market data smart constructors while maintaining clean separation of concerns and strict compliance with industry standards.