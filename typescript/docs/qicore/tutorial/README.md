# @qi Stack Tutorial

## Overview

This tutorial provides comprehensive guidance for working with the @qi stack (`@qi/base` and `@qi/core`) using **correct patterns** that maintain Result<T> composition throughout your application.

**Important**: This tutorial was created to replace patterns from the qi-v2-qicore tutorial that contained misleading anti-patterns, particularly around infrastructure error handling and Result<T> composition.

## Tutorial Structure

### [01 - @qi/base Fundamentals](./01-qi-base-fundamentals.md)
Learn the core patterns for working with Result<T> types:
- Result creation with `Ok()` and `Err()`
- Functional composition with `map()` and `flatMap()`
- Error handling with `match()` and pattern matching
- Async operations with `fromAsyncTryCatch()`
- Validation chains and error context

### [02 - @qi/core Fundamentals](./02-qi-core-fundamentals.md)
Master the infrastructure tools while maintaining Result<T> composition:
- Logger creation and usage with proper Result handling
- Configuration management with graceful degradation
- Cache operations and integration patterns
- Infrastructure setup without breaking composition
- Structured logging and context accumulation

### [03 - Integration Examples](./03-integration-examples.md)
Complete working examples showing real applications:
- Web API server with proper infrastructure setup
- Data processing pipeline with batch operations
- Service layer design with Result composition
- HTTP handlers with error mapping
- Application assembly and graceful degradation

### [04 - Advanced Patterns](./04-advanced-patterns.md)
Production-ready patterns for sophisticated applications:
- Advanced Result<T> composition patterns
- Performance monitoring and request correlation
- Multi-level caching strategies
- Error analysis and pattern detection
- Retry logic and circuit breaker patterns

## Key Principles

### ✅ Always Maintain Result<T> Composition
```typescript
// ✅ Correct: Maintain composition throughout
const infrastructureResult = await initializeInfrastructure()
match(
  infrastructure => runApplication(infrastructure),
  error => runApplicationWithFallbacks(error),
  infrastructureResult
)
```

### ❌ Never Break Composition with Throws/Exits
```typescript
// ❌ Wrong: Breaking Result composition
const loggerResult = createLogger(config)
if (loggerResult.tag === 'failure') throw new Error('Logger failed')

const configResult = loadConfig()
if (configResult.tag === 'failure') process.exit(1)
```

### ✅ Use Proper Error Categories
```typescript
// Error categories drive operational behavior:
// 'VALIDATION' → never retry (fix input)
// 'NETWORK' → retry with exponential backoff  
// 'BUSINESS' → never retry (business rule violation)
// 'SYSTEM' → limited retry (infrastructure issue)
```

### ✅ Implement Graceful Degradation
```typescript
// Handle infrastructure failures gracefully
match(
  infrastructure => runNormalApplication(infrastructure),
  error => runWithFallbacks(error), // Console logging, default config, etc.
  infrastructureResult
)
```

## Corrected Anti-Patterns

This tutorial specifically corrects these anti-patterns from the original qi-v2-qicore tutorial:

### Infrastructure Error Handling
**❌ Original Anti-Pattern**:
```typescript
// Breaking Result composition for "infrastructure"
if (loggerResult.tag === 'failure') throw new Error('Logger failed')
if (configResult.tag === 'failure') process.exit(1)
```

**✅ Corrected Pattern**:
```typescript
// Maintain Result composition with graceful degradation
const infrastructureResult = await initializeInfrastructure()
match(
  infrastructure => runApplication(infrastructure),
  error => runApplicationWithFallbacks(error),
  infrastructureResult
)
```

### Logger API Usage
**❌ Original Anti-Pattern**:
```typescript
// Documentation showed 3-argument patterns that don't exist
logger.error('message', error, context) // This doesn't work!
```

**✅ Corrected Pattern**:
```typescript
// Logger always uses 2-argument API
logger.error('Operation failed', {
  error: error.message,
  context: additionalData
})
```

### Cache Operation Assumptions
**❌ Original Confusion**:
```typescript
// Expecting Result<T> from cache operations
const cacheResult = await cache.get(key) // Thought this was Result<T>
```

**✅ Corrected Understanding**:
```typescript
// Cache operations return values directly
const cachedValue = await cache.get(key) // Returns T | undefined, not Result<T>
```

## Usage Notes

1. **Start with Fundamentals**: Read the fundamentals tutorials first to understand core patterns
2. **Study Integration Examples**: See how patterns work together in complete applications
3. **Apply Advanced Patterns**: Use advanced patterns for production sophistication
4. **Maintain Composition**: Always prioritize Result<T> composition over convenience shortcuts
5. **Implement Fallbacks**: Plan for graceful degradation when infrastructure fails

## Benefits of These Patterns

- **Composable**: All operations work together naturally
- **Testable**: Easy to test error scenarios without complex mocking
- **Maintainable**: Clear error handling and functional composition
- **Observable**: Structured logging provides excellent debugging information
- **Resilient**: Graceful degradation keeps applications running
- **Type-Safe**: TypeScript catches errors at compile time

## Migration from Anti-Patterns

If you have existing code using the anti-patterns:

1. **Replace Infrastructure Throws**: Convert `throw` and `process.exit()` to Result<T> patterns
2. **Fix Logger API**: Change to 2-argument format consistently
3. **Update Cache Assumptions**: Remove Result<T> wrappers from cache operations
4. **Add Graceful Degradation**: Implement fallback strategies for infrastructure failures
5. **Test Error Paths**: Verify that error scenarios work correctly

The patterns in this tutorial represent the correct way to use the @qi stack for production applications.