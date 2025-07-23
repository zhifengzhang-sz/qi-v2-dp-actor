# @qi/core Fundamentals

## Overview

This tutorial teaches the fundamental patterns for working with `@qi/core` tools (Logger, Config, Cache) while maintaining **proper Result<T> composition** throughout your application. Unlike some examples that break Result composition with throws or process.exit(), this guide shows how to handle all operations functionally.

## Core Tools Overview

`@qi/core` provides three main tools:
- **Logger**: Structured logging with Result<Logger> creation
- **Config**: Configuration management with Result<Config> patterns  
- **Cache**: In-memory caching with direct value operations

## Logger Fundamentals

### 1. Logger Creation (Proper Result<T> Pattern)

**✅ Correct**: Maintain Result composition
```typescript
import { createLogger } from '@qi/core'
import { match } from '@qi/base'
import type { Logger } from '@qi/core'

function initializeLogger(): Result<Logger, QiError> {
  return createLogger({
    level: 'info',
    name: 'my-app',
    pretty: process.env.NODE_ENV === 'development'
  })
}

// Use with proper composition
const loggerResult = initializeLogger()

match(
  logger => {
    // Application can proceed with logger
    runApplicationWithLogger(logger)
  },
  error => {
    // Graceful degradation - use console logging
    console.error('Logger creation failed:', error.message)
    runApplicationWithConsoleLogging()
  },
  loggerResult
)
```

**❌ Incorrect**: Breaking Result composition
```typescript
// Don't do this - breaks functional composition
const loggerResult = createLogger(config)
if (loggerResult.tag === 'failure') throw new Error('Logger failed')
```

### 2. Logger API - Always 2 Arguments

The Logger API uses a consistent 2-argument pattern:

```typescript
// ✅ Correct: 2-argument API
logger.info('User operation completed', { 
  userId: '123', 
  operation: 'update',
  duration: 45 
})

logger.error('Operation failed', { 
  error: error.message,
  userId: '123',
  retryable: error.category === 'NETWORK'
})

// ❌ Wrong: 3-argument pattern doesn't exist
// logger.error('message', error, context) // This doesn't work
```

### 3. Child Loggers for Context

Use child loggers to build contextual logging:

```typescript
function processUserRequest(userId: string, logger: Logger): Result<ProcessResult, QiError> {
  // Create request-scoped logger
  const requestLogger = logger.child({
    userId,
    operation: 'processUserRequest',
    requestId: generateRequestId()
  })

  requestLogger.info('Starting user request processing')

  return flatMap(
    validatedUser => {
      // Create operation-specific logger
      const validationLogger = requestLogger.child({
        stage: 'validation'
      })
      
      validationLogger.info('User validation completed', {
        email: validatedUser.email,
        accountType: validatedUser.type
      })

      return processValidatedUser(validatedUser, requestLogger)
    },
    validateUser(userId, requestLogger)
  )
}
```

**Key Benefits**:
- Context accumulates automatically
- Each child includes parent context
- Clear operation scoping

## Configuration Management

### 1. Simple Configuration (Environment Variables)

For simple applications, use Result<T> composition for validation:

```typescript
interface AppConfig {
  server: {
    port: number
    host: string
  }
  database: {
    url: string
    maxConnections: number
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    pretty: boolean
  }
}

function loadSimpleConfig(): Result<AppConfig, QiError> {
  return flatMap(
    port => flatMap(
      maxConnections => flatMap(
        logLevel => {
          const config: AppConfig = {
            server: {
              port,
              host: process.env.HOST || 'localhost'
            },
            database: {
              url: process.env.DATABASE_URL || 'sqlite://./app.db',
              maxConnections
            },
            logging: {
              level: logLevel,
              pretty: process.env.LOG_PRETTY === 'true'
            }
          }

          // Validate required database URL
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

function validatePort(portStr: string): Result<number, QiError> {
  const port = parseInt(portStr)
  
  if (isNaN(port)) {
    return Err(validationError(`Invalid PORT value: ${portStr}`))
  }
  
  if (port < 1 || port > 65535) {
    return Err(validationError(`PORT must be between 1 and 65535, got: ${port}`))
  }
  
  return Ok(port)
}

function validatePositiveInteger(valueStr: string, fieldName: string): Result<number, QiError> {
  const value = parseInt(valueStr)
  
  if (isNaN(value)) {
    return Err(validationError(`Invalid ${fieldName} value: ${valueStr}`))
  }
  
  if (value < 1) {
    return Err(validationError(`${fieldName} must be positive, got: ${value}`))
  }
  
  return Ok(value)
}

function validateLogLevel(levelStr: string): Result<'debug' | 'info' | 'warn' | 'error', QiError> {
  const validLevels = ['debug', 'info', 'warn', 'error'] as const
  
  if (!validLevels.includes(levelStr as any)) {
    return Err(validationError(
      `Invalid LOG_LEVEL: ${levelStr}. Valid levels: ${validLevels.join(', ')}`
    ))
  }
  
  return Ok(levelStr as 'debug' | 'info' | 'warn' | 'error')
}
```

### 2. Advanced Configuration (ConfigBuilder)

For complex applications with YAML files and validation:

```typescript
import { ConfigBuilder } from '@qi/core'

async function loadAdvancedConfig(): Promise<Result<ValidatedConfig, QiError>> {
  const environment = process.env.NODE_ENV || 'development'
  
  // Load configuration file
  const configResult = await ConfigBuilder.fromYamlFile(`configs/${environment}.yaml`)
  
  if (configResult.tag === 'failure') {
    return configResult
  }
  
  // Build and validate configuration
  const validatedResult = await configResult.value
    .merge(ConfigBuilder.fromEnv('APP'))
    .validateWithSchemaFile('configs/config.schema.json')
    .buildValidated()
    
  return validatedResult
}

// Usage with ValidatedConfig API
async function useConfig(): Promise<Result<void, QiError>> {
  const configResult = await loadAdvancedConfig()
  
  return match(
    config => {
      // Direct access to validated config values
      const appName = config.get('app.name')  // Throws if missing
      const debug = config.getOr('app.debug', false)  // Safe fallback
      const timeout = config.get('server.timeout')
      
      console.log(`Starting ${appName} with timeout ${timeout}ms`)
      return Ok(undefined)
    },
    error => Err(error),
    configResult
  )
}
```

## Cache Operations

### 1. Cache Creation and Basic Usage

Cache operations return values directly (no Result wrapper):

```typescript
import { createMemoryCache } from '@qi/core'
import type { ICache } from '@qi/core'

function createAppCache(): ICache {
  return createMemoryCache({
    maxSize: 1000,
    defaultTtl: 300  // 5 minutes
  })
}

// Cache operations return values directly
async function cacheExample(cache: ICache): Promise<void> {
  // Set value (returns void)
  await cache.set('user:123', { name: 'John', email: 'john@example.com' }, 60)
  
  // Get value (returns T | undefined, not Result<T>)
  const cachedUser = await cache.get('user:123')
  
  if (cachedUser) {
    console.log('Cache hit:', cachedUser.name)
  } else {
    console.log('Cache miss')
  }
  
  // Delete value
  await cache.delete('user:123')
  
  // Clear cache
  await cache.clear()
}
```

### 2. Cache-Aside Pattern with Result Composition

Integrate caching with Result<T> operations:

```typescript
interface User {
  id: string
  name: string
  email: string
}

class UserService {
  constructor(
    private cache: ICache,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<Result<User, QiError>> {
    const cacheKey = `user:${id}`
    const opLogger = this.logger.child({
      operation: 'getUser',
      userId: id,
      cacheKey
    })

    // Try cache first
    const cached = await this.cache.get(cacheKey)
    
    if (cached) {
      opLogger.info('Cache hit', {
        source: 'cache',
        cacheAge: Date.now() - (cached as any).cachedAt
      })
      return Ok(cached as User)
    }

    // Cache miss - fetch from database
    opLogger.info('Cache miss, fetching from database')
    
    return fromAsyncTryCatch(
      async () => {
        const user = await this.fetchUserFromDatabase(id)
        
        // Cache successful result
        await this.cache.set(cacheKey, {
          ...user,
          cachedAt: Date.now()
        }, 300)
        
        opLogger.info('User fetched and cached', {
          source: 'database',
          email: user.email
        })
        
        return user
      },
      (error) => {
        opLogger.error('User fetch failed', {
          source: 'database',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        return create(
          'USER_FETCH_FAILED',
          `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { userId: id, operation: 'getUser' }
        )
      }
    )
  }

  private async fetchUserFromDatabase(id: string): Promise<User> {
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (id === 'not-found') {
      throw new Error('User not found')
    }
    
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`
    }
  }
}
```

## Infrastructure Composition

### 1. Proper Infrastructure Setup

Set up all infrastructure components with Result composition:

```typescript
interface AppInfrastructure {
  logger: Logger
  config: AppConfig
  cache: ICache
}

async function initializeInfrastructure(): Promise<Result<AppInfrastructure, QiError>> {
  // Initialize logger
  const loggerResult = createLogger({
    level: 'info',
    name: 'my-app',
    pretty: process.env.NODE_ENV === 'development'
  })
  
  if (loggerResult.tag === 'failure') {
    return loggerResult
  }
  
  const logger = loggerResult.value
  
  // Initialize config
  const configResult = loadSimpleConfig()
  
  if (configResult.tag === 'failure') {
    return configResult
  }
  
  const config = configResult.value
  
  // Initialize cache (always succeeds)
  const cache = createMemoryCache({
    maxSize: 1000,
    defaultTtl: 300
  })
  
  logger.info('Infrastructure initialized successfully', {
    logLevel: config.logging.level,
    cacheMaxSize: 1000,
    serverPort: config.server.port
  })
  
  return Ok({
    logger,
    config,
    cache
  })
}
```

### 2. Application Startup with Graceful Degradation

Handle infrastructure failures gracefully:

```typescript
async function startApplication(): Promise<void> {
  const infrastructureResult = await initializeInfrastructure()
  
  match(
    infrastructure => {
      // Normal application startup
      runApplication(infrastructure)
    },
    error => {
      // Graceful degradation
      console.error('Infrastructure setup failed:', error.message)
      console.error('Error context:', error.context)
      
      // Could implement fallback strategies here:
      // - Use console logging instead of structured logging
      // - Use default configuration
      // - Skip caching functionality
      
      runApplicationWithFallbacks()
    },
    infrastructureResult
  )
}

function runApplication(infrastructure: AppInfrastructure): void {
  const { logger, config, cache } = infrastructure
  
  logger.info('Application starting', {
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    port: config.server.port
  })
  
  // Start your application services here
  const userService = new UserService(cache, logger)
  // ... other services
}

function runApplicationWithFallbacks(): void {
  console.log('Starting application with fallback configuration')
  
  // Implement fallback startup logic
  // This might use console.log instead of structured logging
  // Use default configuration values
  // Skip caching features
}
```

## Integration Patterns

### 1. Service Layer with Complete Infrastructure

Example service that uses all @qi/core tools properly:

```typescript
class OrderService {
  private readonly operationLogger: Logger
  
  constructor(
    private config: AppConfig,
    private cache: ICache,
    logger: Logger
  ) {
    this.operationLogger = logger.child({
      service: 'OrderService',
      version: '1.0.0'
    })
  }
  
  async processOrder(orderId: string): Promise<Result<ProcessedOrder, QiError>> {
    const opLogger = this.operationLogger.child({
      operation: 'processOrder',
      orderId
    })
    
    opLogger.info('Starting order processing')
    
    return flatMap(
      order => flatMap(
        validatedOrder => this.saveProcessedOrder(validatedOrder, opLogger),
        this.validateOrder(order, opLogger)
      ),
      this.getOrder(orderId, opLogger)
    )
  }
  
  private async getOrder(orderId: string, logger: Logger): Promise<Result<Order, QiError>> {
    const cacheKey = `order:${orderId}`
    
    // Try cache first
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      logger.info('Order found in cache')
      return Ok(cached as Order)
    }
    
    // Fetch from database
    logger.info('Order not in cache, fetching from database')
    
    return fromAsyncTryCatch(
      async () => {
        const order = await this.fetchOrderFromDB(orderId)
        
        // Cache the result
        await this.cache.set(cacheKey, order, this.config.cache?.ttl || 300)
        
        logger.info('Order fetched and cached')
        return order
      },
      error => {
        logger.error('Failed to fetch order', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        return create(
          'ORDER_FETCH_FAILED',
          `Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { orderId }
        )
      }
    )
  }
  
  private validateOrder(order: Order, logger: Logger): Result<ValidatedOrder, QiError> {
    logger.info('Validating order', {
      orderType: order.type,
      itemCount: order.items.length
    })
    
    // Validation logic with Result composition
    if (order.items.length === 0) {
      return Err(create(
        'ORDER_VALIDATION_FAILED',
        'Order must contain at least one item',
        'VALIDATION',
        { orderId: order.id, itemCount: 0 }
      ))
    }
    
    logger.info('Order validation successful')
    return Ok(order as ValidatedOrder)
  }
  
  private async saveProcessedOrder(
    order: ValidatedOrder, 
    logger: Logger
  ): Promise<Result<ProcessedOrder, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        logger.info('Saving processed order')
        
        const processedOrder = await this.saveOrderToDB(order)
        
        // Update cache
        await this.cache.set(`order:${order.id}`, processedOrder, 300)
        
        logger.info('Order processing completed successfully', {
          orderId: processedOrder.id,
          status: processedOrder.status
        })
        
        return processedOrder
      },
      error => {
        logger.error('Failed to save processed order', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        return create(
          'ORDER_SAVE_FAILED',
          `Failed to save order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { orderId: order.id }
        )
      }
    )
  }
  
  private async fetchOrderFromDB(orderId: string): Promise<Order> {
    // Simulate database call
    await new Promise(resolve => setTimeout(resolve, 50))
    return { id: orderId, items: [{ name: 'Item 1' }], type: 'standard' }
  }
  
  private async saveOrderToDB(order: ValidatedOrder): Promise<ProcessedOrder> {
    // Simulate database save
    await new Promise(resolve => setTimeout(resolve, 100))
    return { ...order, status: 'processed', processedAt: new Date() }
  }
}
```

## Best Practices

### 1. Never Break Result Composition

**❌ Wrong**: Throwing or exiting breaks composition
```typescript
// Don't do this
const loggerResult = createLogger(config)
if (loggerResult.tag === 'failure') throw new Error('Logger failed')

const configResult = loadConfig()
if (configResult.tag === 'failure') process.exit(1)
```

**✅ Correct**: Maintain Result composition with graceful handling
```typescript
// Do this
const infrastructureResult = await initializeInfrastructure()

match(
  infrastructure => runApplication(infrastructure),
  error => runApplicationWithFallbacks(error),
  infrastructureResult
)
```

### 2. Use Child Loggers for Context

Create contextual loggers through composition:

```typescript
// ✅ Good: Context builds up through child loggers
const serviceLogger = logger.child({ service: 'UserService' })
const operationLogger = serviceLogger.child({ operation: 'createUser' })
const stepLogger = operationLogger.child({ step: 'validation' })
```

### 3. Cache Operations Are Direct

Remember that cache operations don't use Result<T>:

```typescript
// ✅ Correct: Direct value operations
const cached = await cache.get(key)  // T | undefined
await cache.set(key, value, ttl)     // void

// ❌ Wrong: Don't expect Result<T> from cache
// const cachedResult = await cache.get(key)  // Not Result<T>!
```

### 4. Structured Logging Context

Always include relevant context in log messages:

```typescript
// ✅ Good: Rich context for debugging
logger.error('Database query failed', {
  query: 'SELECT * FROM users WHERE id = ?',
  parameters: [userId],
  error: error.message,
  duration: queryDuration,
  retryable: error.code === 'ECONNRESET'
})
```

## Summary

**Key Principles**:
1. **Maintain Result<T> composition** throughout infrastructure setup
2. **Use 2-argument Logger API** consistently
3. **Build context with child loggers** for better observability
4. **Handle cache operations directly** (no Result wrapper)
5. **Implement graceful degradation** for infrastructure failures
6. **Include rich context** in all log messages
7. **Compose all tools together** in service layers

**Remember**: Infrastructure failures don't require throwing or process.exit(). Handle them gracefully with Result<T> composition and implement appropriate fallback strategies.