# @qi/base Fundamentals

## Overview

This tutorial teaches the fundamental patterns for working with `@qi/base`, focusing on **correct Result<T> composition** throughout your application. All patterns shown here maintain functional composition and never break the Result<T> philosophy.

## Core Concepts

### 1. The Result<T> Type

`Result<T, E>` represents operations that can succeed with value `T` or fail with error `E`:

```typescript
import type { Result, QiError } from '@qi/base'

// Success: { tag: 'success', value: T }
// Failure: { tag: 'failure', error: E }
```

### 2. Result Creation

Use `Ok()` and `Err()` as the primary Result creation API:

```typescript
import { Ok, Err, validationError } from '@qi/base'

function divide(a: number, b: number): Result<number, QiError> {
  if (b === 0) {
    return Err(validationError('Division by zero'))
  }
  return Ok(a / b)
}
```

**Key Insight**: `Ok()` and `Err()` are the primary API. `success()` and `failure()` exist but are less commonly used.

## Functional Composition Patterns

### 1. Transform Success Values with map()

Use `map()` when your operation **cannot fail**:

```typescript
import { map } from '@qi/base'

// Convert price to cents (cannot fail)
const priceInCents = map(
  price => price * 100,
  priceResult // Result<number, QiError>
)
// Result: Result<number, QiError>
```

**When to use map()**:
- Simple data transformations
- Operations that cannot fail
- Converting between types

### 2. Chain Fallible Operations with flatMap()

Use `flatMap()` when your operation **returns Result<T>**:

```typescript
import { flatMap, Ok, Err, validationError } from '@qi/base'

function validatePositive(value: number): Result<number, QiError> {
  if (value <= 0) {
    return Err(validationError('Value must be positive'))
  }
  return Ok(value)
}

// Chain operations that can fail
const validatedPrice = flatMap(
  price => validatePositive(price),
  priceResult
)
```

**When to use flatMap()**:
- Operations that return `Result<T>`
- Validation chains
- Dependent operations

### 3. Complex Validation Chains

Real-world example: Validate user data with multiple steps:

```typescript
import { flatMap, Ok, Err, validationError } from '@qi/base'

interface User {
  id: string
  name: string
  email: string
  age: number
}

function validateUserId(id: string): Result<string, QiError> {
  if (!id || id.length < 3) {
    return Err(validationError('User ID must be at least 3 characters'))
  }
  return Ok(id)
}

function validateName(name: string): Result<string, QiError> {
  if (!name || name.trim().length === 0) {
    return Err(validationError('Name cannot be empty'))
  }
  return Ok(name.trim())
}

function validateEmail(email: string): Result<string, QiError> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return Err(validationError('Invalid email format'))
  }
  return Ok(email)
}

function validateAge(age: number): Result<number, QiError> {
  if (age < 0 || age > 150) {
    return Err(validationError('Age must be between 0 and 150'))
  }
  return Ok(age)
}

function createUser(
  id: string,
  name: string,
  email: string,
  age: number
): Result<User, QiError> {
  return flatMap(
    validId => flatMap(
      validName => flatMap(
        validEmail => flatMap(
          validAge => Ok({
            id: validId,
            name: validName,
            email: validEmail,
            age: validAge
          }),
          validateAge(age)
        ),
        validateEmail(email)
      ),
      validateName(name)
    ),
    validateUserId(id)
  )
}
```

**Reading the chain**: Work from inside-out:
- Core: `Ok({ ... })` - what we're building
- Layer 1: needs valid age
- Layer 2: needs valid email  
- Layer 3: needs valid name
- Layer 4: needs valid id

## Error Handling Patterns

### 1. Pattern Matching with match()

Use `match()` for complex Result handling:

```typescript
import { match } from '@qi/base'

const userResult = createUser('123', 'John', 'john@example.com', 25)

const message = match(
  (user: User) => `Created user: ${user.name} (${user.email})`,
  (error: QiError) => `Failed to create user: ${error.message}`,
  userResult
)

console.log(message)
```

### 2. Direct Tag Checking (Simple Cases)

For simple cases, direct tag checking is fine:

```typescript
if (userResult.tag === 'success') {
  console.log('User created:', userResult.value.name)
} else {
  console.error('Creation failed:', userResult.error.message)
}
```

### 3. Safe Value Extraction

Use `unwrapOr()` for safe defaults:

```typescript
import { unwrapOr } from '@qi/base'

const userName = unwrapOr('Anonymous', map(user => user.name, userResult))
```

## Error Creation Patterns

### 1. Standard Error Types

Use convenience functions for common errors:

```typescript
import { validationError, networkError } from '@qi/base'

const validationErr = validationError('Invalid email format')
const networkErr = networkError('Connection timeout')
```

### 2. Custom Domain Errors

Use `create()` for domain-specific errors with context:

```typescript
import { create } from '@qi/base'

const customError = create(
  'USER_CREATION_FAILED',
  'Failed to create user account',
  'VALIDATION',
  {
    userId: '123',
    email: 'john@example.com',
    validationStep: 'email_format'
  }
)
```

## Async Operations

### 1. Using fromAsyncTryCatch

For async operations that might throw:

```typescript
import { fromAsyncTryCatch, create } from '@qi/base'

async function fetchUserFromAPI(id: string): Promise<Result<User, QiError>> {
  return fromAsyncTryCatch(
    async () => {
      // Pure async operation - no Result handling here
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const userData = await response.json()
      return userData as User
    },
    (error) => {
      // Transform error to QiError
      return create(
        'FETCH_USER_FAILED',
        `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK',
        { userId: id, error: String(error) }
      )
    }
  )
}
```

### 2. Composing Async Operations

Chain async operations properly:

```typescript
async function getUserWithProfile(id: string): Promise<Result<{ user: User; profile: Profile }, QiError>> {
  const userResult = await fetchUserFromAPI(id)
  
  if (userResult.tag === 'failure') {
    return userResult
  }
  
  const profileResult = await fetchProfileFromAPI(userResult.value.id)
  
  return map(
    profile => ({ user: userResult.value, profile }),
    profileResult
  )
}
```

## Best Practices

### 1. Composition Over Imperative Checks

**❌ Avoid**: Breaking composition with imperative checks
```typescript
// Don't do this
const step1 = validateUserId(id)
if (step1.tag === 'failure') return step1

const step2 = validateName(name)
if (step2.tag === 'failure') return step2
// ... repetitive and error-prone
```

**✅ Prefer**: Functional composition
```typescript
// Do this
return flatMap(
  validId => flatMap(
    validName => Ok({ id: validId, name: validName }),
    validateName(name)
  ),
  validateUserId(id)
)
```

### 2. Meaningful Error Context

Include context that helps debugging:

```typescript
// ❌ Poor error context
return Err(validationError('Invalid input'))

// ✅ Rich error context
return Err(create(
  'USER_VALIDATION_FAILED',
  'User email format is invalid',
  'VALIDATION',
  {
    field: 'email',
    value: email,
    pattern: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
    userId: id
  }
))
```

### 3. Consistent Error Categories

Use consistent error categories for operational behavior:

- `VALIDATION`: Input data problems (never retry)
- `NETWORK`: Network/external service issues (retry with backoff)
- `BUSINESS`: Business rule violations (never retry)
- `SYSTEM`: Internal system errors (limited retry)
- `AUTHENTICATION`: Auth failures (never retry)
- `AUTHORIZATION`: Permission failures (never retry)

## Common Pitfalls

### 1. Wrong Composition Function

**❌ Wrong**: Using `map()` when operation returns Result<T>
```typescript
// This creates nested Results!
const result = map(
  value => {
    if (condition) return Err(error) // Returns Result inside map!
    return value
  },
  someResult
)
```

**✅ Correct**: Using `flatMap()` for operations that return Result<T>
```typescript
const result = flatMap(
  value => {
    if (condition) return Err(error)
    return Ok(value)
  },
  someResult
)
```

### 2. Breaking Result Composition

**❌ Wrong**: Mixing imperative and functional patterns
```typescript
// Don't mix patterns
if (condition) {
  throw new Error('Something went wrong') // Breaks composition!
}
return flatMap(...)
```

**✅ Correct**: Maintain Result composition throughout
```typescript
// Keep everything in Result composition
const conditionResult = condition ? Err(error) : Ok(value)
return flatMap(
  validValue => flatMap(...),
  conditionResult
)
```

## Summary

**Key Principles**:
1. Use `Ok()` and `Err()` for Result creation
2. Use `map()` for transformations that cannot fail
3. Use `flatMap()` for operations that return Result<T>
4. Use `match()` for complex Result handling
5. Use `fromAsyncTryCatch()` for async operations
6. Maintain Result composition throughout your application
7. Include meaningful error context for debugging
8. Use consistent error categories for operational behavior

**Remember**: Every operation should compose cleanly with others. If you find yourself breaking out of Result composition with throws or imperative checks, reconsider your approach.