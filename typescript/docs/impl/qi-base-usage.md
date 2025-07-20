# DSL Implementation with @qi/base

## Overview

This guide documents the correct usage of @qi/base in the QiCore Data Processing Actors DSL implementation, based on the official qi-v2-qicore tutorial and lessons learned during implementation.

## Key Principles

### 1. Use `match()` for Primary Result Handling

The preferred pattern for handling Result<T> is the functional `match()` approach:

```typescript
import { match } from '@qi/base';

const result = getCurrentPrice(context);

match(
  value => {
    // Success case - TypeScript knows this is the success value
    console.log(`Price: ${value.coreData.price}`);
    return value;
  },
  error => {
    // Failure case - TypeScript knows this is QiError
    console.log(`Error: ${error.message}`);
    return null;
  },
  result
);
```

### 2. Functional Composition Patterns

Use standalone functions for Result transformation:

```typescript
import { map, flatMap } from '@qi/base';

// Transform success values
const priceInCents = map(
  marketData => marketData.coreData.price * 100,
  priceResult
);

// Chain operations that might fail
const validatedPrice = flatMap(
  price => price > 0 
    ? success(price) 
    : failure(createMarketDataError('INVALID_PRICE', 'Price must be positive', 'VALIDATION')),
  priceResult
);
```

### 3. Error Creation Patterns

#### For Custom Domain-Specific Codes (DSL Use Case)

Use `create()` function for custom error codes:

```typescript
import { create } from '@qi/base';

// Custom market data error codes
const error = create(
  'INVALID_PRICE',                    // Custom code
  'Price must be positive and finite', // Message
  'VALIDATION',                       // Category
  { symbol: 'BTC/USD', price: -100 }  // Context
);
```

#### For Standard Generic Codes

Use convenience functions for standard scenarios:

```typescript
import { validationError, networkError, businessError } from '@qi/base';

const validationErr = validationError('Invalid email format');
const networkErr = networkError('Connection timeout');
const businessErr = businessError('Account suspended');
```

### 4. Result Creation

```typescript
import { success, failure } from '@qi/base';

function calculateSpread(bid: number, ask: number): Result<number, QiError> {
  if (ask < bid) {
    return failure(create(
      'CROSSED_MARKET', 
      'Ask price cannot be less than bid price', 
      'VALIDATION',
      { bid, ask }
    ));
  }
  return success(ask - bid);
}
```

## DSL-Specific Implementation Patterns

### 1. Market Data Error Factory

```typescript
export function createMarketDataError(
  code: string,
  message: string,
  category: MarketDataError["category"],
  context: MarketDataError["context"] = {}
): MarketDataError {
  return create(code, message, category, context) as MarketDataError;
}
```

**Why `create()` not convenience functions:**
- DSL needs custom codes like 'INVALID_PRICE', 'SPREAD_TOO_WIDE'
- Convenience functions have fixed generic codes like 'VALIDATION_ERROR'

### 2. Financial Precision with Results

```typescript
export class FinancialDecimal {
  static create(value: string | number | Decimal): Result<FinancialDecimal, any> {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return failure(createMarketDataError(
        'INVALID_NUMBER',
        'Value must be finite (no NaN or Infinity)',
        'VALIDATION',
        { value, isFinite: Number.isFinite(value) }
      ));
    }
    
    try {
      const decimal = new Decimal(value);
      return success(new FinancialDecimal(decimal));
    } catch (error) {
      return failure(createMarketDataError(
        'DECIMAL_CONVERSION_ERROR',
        'Failed to convert value to decimal',
        'VALIDATION',
        { value, error: String(error) }
      ));
    }
  }

  divide(other: FinancialDecimal): Result<FinancialDecimal, any> {
    if (other.value.isZero()) {
      return failure(createMarketDataError(
        'DIVISION_BY_ZERO', 
        'Cannot divide by zero', 
        'VALIDATION',
        { value: `${this.toString()} / ${other.toString()}`, field: 'division' }
      ));
    }
    return success(new FinancialDecimal(this.value.div(other.value)));
  }
}
```

### 3. Result Chain Composition

```typescript
function validateAndCreatePrice(
  value: number,
  symbol: string
): Result<MarketData<Price>, QiError> {
  return flatMap(
    decimal => flatMap(
      validatedDecimal => success({
        context: { symbol, exchange: 'binance', market: 'spot' },
        coreData: {
          timestamp: new Date(),
          price: validatedDecimal.toNumber(),
          size: 1.0
        }
      }),
      validatePriceRange(decimal, symbol)
    ),
    FinancialDecimal.create(value)
  );
}
```

## Alternative Patterns (When Appropriate)

### Direct Discriminated Union (For Simple Cases)

```typescript
if (result.tag === 'success') {
  // TypeScript knows result.value is available
  processData(result.value);
} else {
  // TypeScript knows result.error is available
  handleError(result.error);
}
```

### Helper Functions (For Query Operations)

```typescript
import { isSuccess, isFailure, getValue, getError } from '@qi/base';

const value = getValue(result);  // T | null
const error = getError(result);  // QiError | null

if (isSuccess(result)) {
  // Type guard - TypeScript knows result.value is available
  processSuccessValue(result.value);
}
```

## Error Categories and Retry Semantics

### DSL Error Categories

- `VALIDATION` - Input validation failures (never retry)
  - Examples: INVALID_PRICE, INVALID_SIZE, INVALID_TIMESTAMP
- `BUSINESS` - Business rule violations (never retry)  
  - Examples: SPREAD_TOO_WIDE, MARKET_CLOSED, INSUFFICIENT_DEPTH
- `NETWORK` - Network issues (retry with exponential backoff)
  - Examples: RATE_LIMIT_EXCEEDED, CONNECTION_TIMEOUT
- `TIMEOUT` - Operation timeouts (retry with exponential backoff)
  - Examples: API_TIMEOUT, STREAM_TIMEOUT
- `SYSTEM` - Infrastructure failures (retry with linear backoff)
  - Examples: DATABASE_ERROR, STREAM_BUFFER_OVERFLOW

## Import Patterns

### Complete Import for DSL Implementation

```typescript
import { 
  // Core types
  type Result, 
  type QiError,
  type ErrorCategory,
  
  // Result creation
  success, 
  failure,
  
  // Error creation
  create,  // For custom codes
  validationError,  // For standard validation
  networkError,     // For standard network
  businessError,    // For standard business
  
  // Result handling
  match,
  map,
  flatMap,
  
  // Query functions (when needed)
  isSuccess,
  isFailure,
  getValue,
  getError
} from '@qi/base';
```

## Best Practices Summary

1. **Prefer `match()` for result handling** - most functional and expressive
2. **Use `create()` for DSL custom codes** - domain-specific error codes
3. **Use convenience functions for standard scenarios** - when generic codes suffice
4. **Compose with `map()` and `flatMap()`** - functional transformation chains
5. **Always return `Result<T>`** - make errors explicit in function signatures
6. **Include context in errors** - symbol, exchange, price data for debugging
7. **Use proper error categories** - determines retry behavior and error handling

## Common Mistakes to Avoid

1. ❌ Using convenience functions when you need custom codes
2. ❌ Throwing exceptions instead of returning `Result<T>`
3. ❌ Ignoring error context - always include relevant debugging information
4. ❌ Using method chaining patterns from other libraries
5. ❌ Forgetting to handle both success and failure cases

## Implementation Status

✅ **Current DSL Implementation:**
- Custom error codes with `create()` function
- Domain-specific error types extending QiError
- Financial precision with decimal.js
- Comprehensive error context for market data
- All tests passing (135/135)
- TypeScript compilation clean
- Proper @qi/base API usage patterns