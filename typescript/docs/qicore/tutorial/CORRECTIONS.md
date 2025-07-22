# Tutorial Corrections: Eliminating try/catch Anti-Patterns

## Overview

This document tracks the corrections made to eliminate imperative try/catch patterns that break Result<T> composition throughout the @qi tutorial.

## Fixed Anti-Patterns

### ❌ **Configuration Loading (FIXED)**

**Before**: Imperative try/catch wrapping simple validation
```typescript
function loadSimpleConfig(): Result<AppConfig, QiError> {
  try {
    const config: AppConfig = {
      server: {
        port: parseInt(process.env.PORT || '3000'),
        // ...
      }
    }
    
    if (!config.database.url) {
      return Err(validationError('DATABASE_URL is required'))
    }
    
    return Ok(config)
  } catch (error) {
    return Err(create('CONFIG_LOAD_FAILED', ...))
  }
}
```

**After**: Proper Result<T> composition with validation chains
```typescript
function loadSimpleConfig(): Result<AppConfig, QiError> {
  return flatMap(
    port => flatMap(
      maxConnections => flatMap(
        logLevel => {
          const config: AppConfig = {
            server: { port, host: process.env.HOST || 'localhost' },
            database: { url: process.env.DATABASE_URL || 'sqlite://./app.db', maxConnections },
            logging: { level: logLevel, pretty: process.env.LOG_PRETTY === 'true' }
          }

          if (!config.database.url || config.database.url === 'sqlite://./app.db') {
            return Err(validationError('DATABASE_URL environment variable is required'))
          }

          return Ok(config)
        },
        validateLogLevel(process.env.LOG_LEVEL || 'info')
      ),
      validatePositiveInteger(process.env.DB_MAX_CONNECTIONS || '10', 'DB_MAX_CONNECTIONS')
    ),
    validatePort(process.env.PORT || '3000')
  )
}
```

### ❌ **Advanced Config with fromAsyncTryCatch Misuse (FIXED)**

**Before**: Using fromAsyncTryCatch but manually throwing inside
```typescript
async function loadAdvancedConfig(): Promise<Result<ValidatedConfig, QiError>> {
  return fromAsyncTryCatch(
    async () => {
      const configResult = await ConfigBuilder.fromYamlFile(`configs/${environment}.yaml`)
      
      if (configResult.tag === 'failure') {
        throw new Error(`Failed to load config: ${configResult.error.message}`)
      }
      
      // More manual throwing...
    },
    (error) => create('CONFIG_BUILD_FAILED', ...)
  )
}
```

**After**: Direct Result<T> composition
```typescript
async function loadAdvancedConfig(): Promise<Result<ValidatedConfig, QiError>> {
  const environment = process.env.NODE_ENV || 'development'
  
  const configResult = await ConfigBuilder.fromYamlFile(`configs/${environment}.yaml`)
  
  if (configResult.tag === 'failure') {
    return configResult
  }
  
  const validatedResult = await configResult.value
    .merge(ConfigBuilder.fromEnv('APP'))
    .validateWithSchemaFile('configs/config.schema.json')
    .buildValidated()
    
  return validatedResult
}
```

## Acceptable try/catch Patterns

### ✅ **Infrastructure Resilience**
```typescript
// Cache level fallback - legitimate use of try/catch
for (const level of this.levels) {
  try {
    const value = await level.cache.get(key)
    if (value !== undefined) return value as T
  } catch (error) {
    // Log and continue to next cache level
    logger.warn('Cache level error', { level: level.name, error: error.message })
  }
}
```

**Why acceptable**: You want to try multiple cache levels and continue on failure rather than propagate.

### ✅ **Process Lifecycle Management**
```typescript
// Application lifecycle - legitimate use of try/catch
match(
  async app => {
    try {
      await app.start()
      
      process.on('SIGINT', async () => {
        await app.stop()
        process.exit(0)
      })
    } catch (error) {
      console.error('Application runtime error:', error)
      process.exit(1)
    }
  },
  error => runApplicationWithFallbacks(error),
  appResult
)
```

**Why acceptable**: Process signal handling is outside the Result<T> domain.

### ✅ **External Library Integration** 
```typescript
// When wrapping external libraries that throw
return fromAsyncTryCatch(
  async () => {
    // Pure async operation that might throw
    const response = await fetch(url)
    return await response.json()
  },
  error => create('FETCH_FAILED', error.message, 'NETWORK')
)
```

**Why acceptable**: `fromAsyncTryCatch` is specifically designed for this pattern.

## Key Principles

### ✅ **Use Result<T> Composition For**
- Configuration validation
- Business logic validation  
- Data transformation pipelines
- Service layer operations
- API request/response handling

### ✅ **Use try/catch For**
- Infrastructure resilience (continuing on partial failures)
- Process lifecycle management
- Wrapping external libraries in `fromAsyncTryCatch`
- Performance monitoring decorators

### ❌ **Never Use try/catch For**
- Simple validation that can be expressed with Result<T>
- Configuration loading (use validation chains instead)
- Business logic (use flatMap composition)
- Error context creation (use proper error types)

## Benefits of These Corrections

1. **Consistent Composition**: All validation follows the same pattern
2. **Better Error Messages**: Specific validation errors for each field
3. **Type Safety**: Validation functions ensure correct types
4. **Testability**: Easy to test individual validation functions
5. **Maintainability**: Clear separation between validation steps

## Migration Guide

If you have existing code with these anti-patterns:

1. **Identify try/catch blocks** that only wrap validation logic
2. **Break down validation** into individual Result<T> returning functions
3. **Compose validations** with flatMap chains
4. **Test each validation** function individually
5. **Ensure proper error context** for debugging

The corrected patterns maintain functional composition while providing clear, specific error messages for each validation failure.