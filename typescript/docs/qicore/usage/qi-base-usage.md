# DSL Implementation with @qi/base

## Overview

This guide documents the correct usage of @qi/base in the QiCore Data Processing Actors DSL implementation, based on the **actual working implementation** in qi-v2-qicore/typescript/app/ examples.

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

### 2. Result Creation - Use Ok/Err (Primary API)

**✅ CORRECT:** Use `Ok()` and `Err()` as shown in all working examples:

```typescript
import { Ok, Err, validationError } from '@qi/base';

function divide(a: number, b: number): Result<number, QiError> {
  if (b === 0) {
    return Err(validationError('Division by zero'));
  }
  return Ok(a / b);
}
```

**Alternative:** `success()` and `failure()` are available but not used in examples:

```typescript
import { success, failure, create } from '@qi/base';

function divide(a: number, b: number): Result<number, QiError> {
  if (b === 0) {
    return failure(create('DIVISION_BY_ZERO', 'Division by zero', 'VALIDATION'));
  }
  return success(a / b);
}
```

### 3. Functional Composition Patterns

Use standalone functions for Result transformation:

```typescript
import { map, flatMap, Ok, Err, validationError } from '@qi/base';

// Transform success values
const priceInCents = map(
  marketData => marketData.coreData.price * 100,
  priceResult
);

// Chain operations that might fail
const validatedPrice = flatMap(
  price => price > 0 
    ? Ok(price) 
    : Err(validationError('Price must be positive')),
  priceResult
);
```

### 4. Error Creation Patterns

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

#### For Standard Generic Codes (Recommended)

Use convenience functions for standard scenarios:

```typescript
import { validationError, networkError } from '@qi/base';

const validationErr = validationError('Invalid email format');
const networkErr = networkError('Connection timeout');
```

### 5. Pattern Matching Examples

```typescript
import { Ok, Err, match, validationError } from '@qi/base';

// Multiple results handling
const results = [
  Ok(42),
  Err(validationError('Something went wrong')),
  Ok('hello'),
  Err(validationError('Another error')),
];

for (const [index, result] of results.entries()) {
  const message = match(
    (value: unknown) => `Success: ${value}`,
    (error: QiError) => `Error: ${error.message}`,
    result
  );

  console.log(`Result ${index + 1}: ${message}`);
}
```

### 6. Safe Value Extraction

```typescript
import { Ok, Err, unwrapOr, validationError } from '@qi/base';

const success = Ok(42);
const failure = Err(validationError('Failed'));

// Safe extraction with defaults
console.log('Success with default:', unwrapOr(0, success));
console.log('Failure with default:', unwrapOr(0, failure));

// Type guards
if (success.tag === 'success') {
  console.log('Success value:', success.value);
}

if (failure.tag === 'failure') {
  console.log('Failure error:', failure.error.message);
}
```

## Advanced Patterns for DSL Implementation

### 1. Result Chain Composition

```typescript
import { flatMap, Ok, validationError } from '@qi/base';

function validateAndCreatePrice(
  value: number,
  symbol: string
): Result<MarketData<Price>, QiError> {
  return flatMap(
    decimal => flatMap(
      validatedDecimal => Ok({
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

### 2. Real-World Chaining Example

```typescript
import { flatMap, Ok, Err, validationError } from '@qi/base';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Profile {
  userId: number;
  bio: string;
  avatar: string;
}

function fetchUser(id: number): Result<User, QiError> {
  if (id <= 0) {
    return Err(validationError('Invalid user ID'));
  }

  return Ok({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  });
}

function fetchProfile(userId: number): Result<Profile, QiError> {
  if (userId === 999) {
    return Err(validationError('Profile not found'));
  }

  return Ok({
    userId,
    bio: `Bio for user ${userId}`,
    avatar: `avatar-${userId}.jpg`,
  });
}

function getUserWithProfile(id: number): Result<{ user: User; profile: Profile }, QiError> {
  return flatMap(
    (user: User) => flatMap((profile: Profile) => Ok({ user, profile }), fetchProfile(user.id)),
    fetchUser(id)
  );
}
```

### 3. Async Operations with fromAsyncTryCatch

**✅ VERIFIED PATTERN:** For async operations that might throw:

```typescript
import { fromAsyncTryCatch, create } from '@qi/base';

async function connectToDatabase(): Promise<Result<void, QiError>> {
  return fromAsyncTryCatch(
    async () => {
      // Pure async operation - no Result handling here
      await database.connect();
      return undefined; // Return success value
    },
    (error) => {
      // Transform error to QiError
      return create(
        'CONNECTION_FAILED',
        `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK',
        { error: String(error) }
      );
    }
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

## Import Patterns

### Complete Import for DSL Implementation

```typescript
import {
  // Result creation (primary API)
  Ok, Err,
  
  // Result creation (alternative API)
  success, failure,
  
  // Result handling
  match, map, flatMap,
  
  // Safe extraction
  unwrapOr,
  
  // Error creation
  create, validationError, networkError,
  
  // Async handling
  fromAsyncTryCatch,
  
  // Types
  type Result, type QiError
} from '@qi/base';
```

## Best Practices Summary

### 1. Result Creation
- **Use `Ok(value)` and `Err(error)`** (follows working examples)
- Use `validationError()`, `networkError()` for standard errors
- Use `create()` for custom domain-specific error codes

### 2. Result Handling
- **Prefer `match()` for complex logic**
- Use direct `.tag === 'success'` for simple cases
- Use `unwrapOr()` for safe value extraction with defaults

### 3. Functional Composition
- Use `map()` for transforming success values
- Use `flatMap()` for chaining operations that might fail
- Use `fromAsyncTryCatch()` for async operations that might throw

### 4. Error Patterns
- Include relevant context in error objects
- Use appropriate error categories (VALIDATION, NETWORK, SYSTEM, etc.)
- Transform exceptions to proper QiError types

## Implementation Status

✅ **Current DSL @qi/base Integration:**
- All patterns verified against working qi-v2-qicore examples
- API documentation matches actual implementation
- Functional composition patterns follow proven examples
- Error handling uses proper Result<T> patterns throughout
- Async patterns use verified fromAsyncTryCatch approach

The DSL implementation now uses **only verified @qi/base patterns** that match the working examples exactly.