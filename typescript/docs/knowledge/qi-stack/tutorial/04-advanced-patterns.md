# Advanced @qi Patterns and Best Practices

## Overview

This guide covers advanced patterns for the @qi stack that go beyond basic usage. These patterns are designed for production applications that require sophisticated error handling, performance optimization, and maintainability.

## Advanced Result<T> Composition Patterns

### 1. Result Array Operations

Working with collections of Results requires special handling:

```typescript
import { Ok, Err, flatMap, map } from '@qi/base'
import type { Result, QiError } from '@qi/base'

// ✅ Process all results, collecting successes and failures
function processResultArray<T, U>(
  results: Result<T, QiError>[],
  processor: (value: T) => Result<U, QiError>
): { successes: U[], failures: QiError[] } {
  const successes: U[] = []
  const failures: QiError[] = []

  for (const result of results) {
    if (result.tag === 'success') {
      const processed = processor(result.value)
      if (processed.tag === 'success') {
        successes.push(processed.value)
      } else {
        failures.push(processed.error)
      }
    } else {
      failures.push(result.error)
    }
  }

  return { successes, failures }
}

// ✅ Fail-fast: Stop on first error
function processResultArrayFailFast<T, U>(
  results: Result<T, QiError>[],
  processor: (value: T) => Result<U, QiError>
): Result<U[], QiError> {
  const processed: U[] = []

  for (const result of results) {
    if (result.tag === 'failure') {
      return result
    }

    const processedResult = processor(result.value)
    if (processedResult.tag === 'failure') {
      return processedResult
    }

    processed.push(processedResult.value)
  }

  return Ok(processed)
}

// Usage example
async function validateAndProcessUsers(
  userIds: string[]
): Promise<Result<ProcessedUser[], QiError>> {
  // Get all users (some might fail)
  const userResults = await Promise.all(
    userIds.map(id => getUserById(id))
  )

  // Decide how to handle partial failures
  const { successes, failures } = processResultArray(
    userResults,
    user => validateUserForProcessing(user)
  )

  if (failures.length > 0) {
    logger.warn('Some users failed validation', {
      successCount: successes.length,
      failureCount: failures.length,
      sampleFailures: failures.slice(0, 3).map(e => e.message)
    })
  }

  // Return successes even if some failed
  return Ok(successes)
}
```

### 2. Conditional Result Composition

Handle complex business logic with conditional flows:

```typescript
import { flatMap, Ok, Err, create } from '@qi/base'

interface PaymentContext {
  amount: number
  currency: string
  paymentMethod: 'card' | 'bank' | 'crypto'
  userTier: 'basic' | 'premium' | 'enterprise'
}

interface PaymentResult {
  transactionId: string
  amount: number
  fees: number
  processingTime: number
}

// ✅ Complex conditional business logic with Result composition
function processPayment(context: PaymentContext): Result<PaymentResult, QiError> {
  return flatMap(
    validatedContext => flatMap(
      feeCalculation => flatMap(
        routingDecision => executePayment(validatedContext, feeCalculation, routingDecision),
        determinePaymentRouting(validatedContext, feeCalculation)
      ),
      calculateFees(validatedContext)
    ),
    validatePaymentContext(context)
  )
}

function calculateFees(context: PaymentContext): Result<FeeCalculation, QiError> {
  // Different fee structures based on payment method and user tier
  const baseFee = context.amount * 0.029 // 2.9% base fee

  const methodMultiplier = (() => {
    switch (context.paymentMethod) {
      case 'card': return 1.0
      case 'bank': return 0.5
      case 'crypto': return 0.8
      default: return 1.0
    }
  })()

  const tierDiscount = (() => {
    switch (context.userTier) {
      case 'basic': return 1.0
      case 'premium': return 0.8
      case 'enterprise': return 0.6
      default: return 1.0
    }
  })()

  const finalFee = baseFee * methodMultiplier * tierDiscount

  return Ok({
    baseFee,
    methodMultiplier,
    tierDiscount,
    finalFee,
    breakdown: {
      baseRate: '2.9%',
      methodAdjustment: `${methodMultiplier}x`,
      tierDiscount: `${tierDiscount}x`
    }
  })
}

function determinePaymentRouting(
  context: PaymentContext,
  fees: FeeCalculation
): Result<PaymentRouting, QiError> {
  // Route to different processors based on amount and method
  if (context.amount > 10000 && context.paymentMethod === 'card') {
    return Ok({ processor: 'premium-gateway', priority: 'high' })
  }

  if (context.paymentMethod === 'crypto') {
    return Ok({ processor: 'crypto-gateway', priority: 'normal' })
  }

  if (context.userTier === 'enterprise') {
    return Ok({ processor: 'enterprise-gateway', priority: 'high' })
  }

  return Ok({ processor: 'standard-gateway', priority: 'normal' })
}
```

### 3. Result Retry Patterns

Implement sophisticated retry logic based on error categories:

```typescript
import { fromAsyncTryCatch, create } from '@qi/base'

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableCategories: string[]
}

// ✅ Intelligent retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<Result<T, QiError>>,
  config: RetryConfig,
  operationName: string,
  logger: Logger
): Promise<Result<T, QiError>> {
  let lastError: QiError | null = null
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const attemptLogger = logger.child({
      operation: operationName,
      attempt,
      maxAttempts: config.maxAttempts
    })

    attemptLogger.info('Starting operation attempt')

    const result = await operation()

    if (result.tag === 'success') {
      if (attempt > 1) {
        attemptLogger.info('Operation succeeded after retry', {
          attemptsRequired: attempt
        })
      }
      return result
    }

    lastError = result.error
    
    // Check if error is retryable
    if (!config.retryableCategories.includes(result.error.category)) {
      attemptLogger.info('Operation failed with non-retryable error', {
        errorCategory: result.error.category,
        errorMessage: result.error.message
      })
      return result
    }

    // Don't delay after the last attempt
    if (attempt < config.maxAttempts) {
      const delayMs = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      )

      attemptLogger.warn('Operation failed, retrying', {
        errorCategory: result.error.category,
        errorMessage: result.error.message,
        delayMs,
        remainingAttempts: config.maxAttempts - attempt
      })

      await new Promise(resolve => setTimeout(resolve, delayMs))
    } else {
      attemptLogger.error('Operation failed after all retry attempts', {
        errorCategory: result.error.category,
        errorMessage: result.error.message,
        totalAttempts: attempt
      })
    }
  }

  // This should never happen due to the loop logic, but TypeScript requires it
  return Err(lastError || create('UNKNOWN_ERROR', 'Unknown retry error', 'SYSTEM'))
}

// Usage example
async function reliableApiCall(endpoint: string): Promise<Result<ApiResponse, QiError>> {
  const retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableCategories: ['NETWORK', 'SYSTEM']
  }

  return withRetry(
    () => fromAsyncTryCatch(
      async () => {
        const response = await fetch(endpoint)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return await response.json()
      },
      error => create(
        'API_CALL_FAILED',
        `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK',
        { endpoint, error: String(error) }
      )
    ),
    retryConfig,
    'apiCall',
    logger
  )
}
```

## Advanced Logging Patterns

### 1. Performance Monitoring

Track operation performance with structured logging:

```typescript
import type { Logger } from '@qi/core'

// ✅ Performance measurement decorator pattern
function withPerformanceLogging<T extends any[], R>(
  fn: (...args: T) => Promise<Result<R, QiError>>,
  operationName: string,
  logger: Logger
) {
  return async (...args: T): Promise<Result<R, QiError>> => {
    const startTime = process.hrtime.bigint()
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const perfLogger = logger.child({
      operation: operationName,
      operationId,
      phase: 'execution'
    })

    perfLogger.info('Operation started')

    const result = await fn(...args)

    const endTime = process.hrtime.bigint()
    const durationMs = Number(endTime - startTime) / 1_000_000 // Convert to milliseconds

    const resultLogger = perfLogger.child({
      phase: 'completed',
      durationMs: Math.round(durationMs * 100) / 100,
      success: result.tag === 'success'
    })

    if (result.tag === 'success') {
      resultLogger.info('Operation completed successfully')
    } else {
      resultLogger.error('Operation failed', {
        errorCategory: result.error.category,
        errorCode: result.error.code
      })
    }

    // Alert on slow operations
    if (durationMs > 5000) { // 5 seconds
      resultLogger.warn('Slow operation detected', {
        performanceThreshold: '5000ms',
        actualDuration: `${Math.round(durationMs)}ms`
      })
    }

    return result
  }
}

// Usage
const performanceMonitoredUserService = {
  getUser: withPerformanceLogging(
    (id: string) => userService.getUser(id),
    'userService.getUser',
    logger
  ),
  
  createUser: withPerformanceLogging(
    (request: CreateUserRequest) => userService.createUser(request),
    'userService.createUser',
    logger
  )
}
```

### 2. Request Correlation

Trace requests across service boundaries:

```typescript
import { randomUUID } from 'crypto'

interface RequestContext {
  correlationId: string
  userId?: string
  sessionId?: string
  userAgent?: string
  ipAddress?: string
}

// ✅ Request correlation middleware
function withRequestCorrelation<T extends any[], R>(
  fn: (context: RequestContext, ...args: T) => Promise<Result<R, QiError>>,
  logger: Logger
) {
  return async (
    requestData: Partial<RequestContext>,
    ...args: T
  ): Promise<Result<R, QiError>> => {
    const context: RequestContext = {
      correlationId: requestData.correlationId || randomUUID(),
      userId: requestData.userId,
      sessionId: requestData.sessionId,
      userAgent: requestData.userAgent,
      ipAddress: requestData.ipAddress
    }

    const correlatedLogger = logger.child({
      correlationId: context.correlationId,
      ...(context.userId && { userId: context.userId }),
      ...(context.sessionId && { sessionId: context.sessionId })
    })

    correlatedLogger.info('Request started', {
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    })

    const result = await fn(context, ...args)

    correlatedLogger.info('Request completed', {
      success: result.tag === 'success',
      ...(result.tag === 'failure' && {
        errorCategory: result.error.category,
        errorCode: result.error.code
      })
    })

    return result
  }
}

// Enhanced service with correlation
class CorrelatedUserService extends UserService {
  async getUser(
    context: RequestContext,
    id: string
  ): Promise<Result<User, QiError>> {
    const contextLogger = this.serviceLogger.child({
      correlationId: context.correlationId,
      operation: 'getUser',
      userId: id
    })

    contextLogger.info('Getting user with correlation context')

    // Call parent method but with correlated logging
    return super.getUser(id)
  }

  async createUser(
    context: RequestContext,
    request: CreateUserRequest
  ): Promise<Result<User, QiError>> {
    const contextLogger = this.serviceLogger.child({
      correlationId: context.correlationId,
      operation: 'createUser',
      email: request.email
    })

    contextLogger.info('Creating user with correlation context')

    // Enhanced validation with correlation
    return flatMap(
      validatedRequest => {
        contextLogger.info('User request validated')
        return this.saveNewUser(validatedRequest, contextLogger)
      },
      this.validateCreateUserRequest(request)
    )
  }
}
```

### 3. Structured Error Analysis

Advanced error analysis and reporting:

```typescript
interface ErrorAnalysis {
  category: string
  frequency: number
  samples: QiError[]
  patterns: string[]
  recommendations: string[]
}

// ✅ Error analysis and reporting
class ErrorAnalyzer {
  private errors: QiError[] = []
  private readonly maxSamples = 1000

  constructor(private logger: Logger) {}

  recordError(error: QiError, context?: Record<string, any>): void {
    const enrichedError = {
      ...error,
      recordedAt: new Date(),
      context: { ...error.context, ...context }
    }

    this.errors.push(enrichedError as QiError)

    // Keep only recent errors
    if (this.errors.length > this.maxSamples) {
      this.errors = this.errors.slice(-this.maxSamples)
    }

    this.logger.error('Error recorded for analysis', {
      errorCategory: error.category,
      errorCode: error.code,
      errorMessage: error.message,
      totalErrorsRecorded: this.errors.length
    })
  }

  generateAnalysis(): ErrorAnalysis[] {
    const categoryGroups = this.groupErrorsByCategory()
    const analyses: ErrorAnalysis[] = []

    for (const [category, errors] of categoryGroups.entries()) {
      const patterns = this.identifyPatterns(errors)
      const recommendations = this.generateRecommendations(category, patterns)

      analyses.push({
        category,
        frequency: errors.length,
        samples: errors.slice(0, 5), // Include up to 5 samples
        patterns,
        recommendations
      })
    }

    return analyses.sort((a, b) => b.frequency - a.frequency)
  }

  private groupErrorsByCategory(): Map<string, QiError[]> {
    const groups = new Map<string, QiError[]>()

    for (const error of this.errors) {
      const category = error.category
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(error)
    }

    return groups
  }

  private identifyPatterns(errors: QiError[]): string[] {
    const patterns: string[] = []

    // Code frequency analysis
    const codeCounts = new Map<string, number>()
    for (const error of errors) {
      codeCounts.set(error.code, (codeCounts.get(error.code) || 0) + 1)
    }

    // Identify most common error codes
    const sortedCodes = Array.from(codeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    patterns.push(...sortedCodes.map(([code, count]) => 
      `${code}: ${count} occurrences`
    ))

    // Time-based patterns
    const recentErrors = errors.filter(e => {
      const recordedAt = (e as any).recordedAt
      return recordedAt && (Date.now() - recordedAt.getTime()) < 3600000 // Last hour
    })

    if (recentErrors.length > errors.length * 0.8) {
      patterns.push('High frequency in recent hour - possible ongoing issue')
    }

    return patterns
  }

  private generateRecommendations(category: string, patterns: string[]): string[] {
    const recommendations: string[] = []

    switch (category) {
      case 'VALIDATION':
        recommendations.push('Review input validation rules')
        recommendations.push('Improve error messages for users')
        recommendations.push('Add client-side validation')
        break

      case 'NETWORK':
        recommendations.push('Implement circuit breaker pattern')
        recommendations.push('Add retry logic with exponential backoff')
        recommendations.push('Monitor external service health')
        break

      case 'SYSTEM':
        recommendations.push('Check system resource utilization')
        recommendations.push('Review error handling in critical paths')
        recommendations.push('Consider implementing graceful degradation')
        break

      case 'BUSINESS':
        recommendations.push('Review business rule implementation')
        recommendations.push('Update documentation for business constraints')
        recommendations.push('Consider rule engine for complex logic')
        break
    }

    // Pattern-specific recommendations
    if (patterns.some(p => p.includes('High frequency'))) {
      recommendations.push('URGENT: Investigate ongoing issue causing error spike')
    }

    return recommendations
  }

  logAnalysis(): void {
    const analysis = this.generateAnalysis()

    this.logger.info('Error analysis report generated', {
      totalErrors: this.errors.length,
      categoriesAnalyzed: analysis.length,
      topCategory: analysis[0]?.category,
      topCategoryFrequency: analysis[0]?.frequency
    })

    for (const categoryAnalysis of analysis) {
      this.logger.info('Category analysis', {
        category: categoryAnalysis.category,
        frequency: categoryAnalysis.frequency,
        patterns: categoryAnalysis.patterns,
        recommendations: categoryAnalysis.recommendations,
        sampleErrorCodes: categoryAnalysis.samples.map(e => e.code)
      })
    }
  }
}

// Usage in application
const errorAnalyzer = new ErrorAnalyzer(logger)

// Record errors throughout the application
function handleError(error: QiError, context?: Record<string, any>): void {
  errorAnalyzer.recordError(error, context)
  
  // Regular error handling...
  logger.error('Operation failed', {
    errorCategory: error.category,
    errorCode: error.code,
    errorMessage: error.message
  })
}

// Generate periodic reports
setInterval(() => {
  errorAnalyzer.logAnalysis()
}, 3600000) // Every hour
```

## Advanced Cache Patterns

### 1. Multi-Level Caching

Implement sophisticated caching strategies:

```typescript
import type { ICache } from '@qi/core'

interface CacheLevel {
  name: string
  cache: ICache
  ttl: number
  priority: number
}

// ✅ Multi-level cache with intelligent fallback
class MultiLevelCache {
  private levels: CacheLevel[]

  constructor(levels: CacheLevel[], private logger: Logger) {
    this.levels = levels.sort((a, b) => a.priority - b.priority) // Lower priority = checked first
  }

  async get<T>(key: string): Promise<T | undefined> {
    const cacheLogger = this.logger.child({
      operation: 'multiLevelGet',
      cacheKey: key
    })

    for (const level of this.levels) {
      const levelLogger = cacheLogger.child({
        cacheLevel: level.name,
        cachePriority: level.priority
      })

      try {
        const value = await level.cache.get(key)
        
        if (value !== undefined) {
          levelLogger.info('Cache hit', {
            foundInLevel: level.name
          })

          // Populate higher-priority caches with this value
          await this.populateHigherLevels(key, value, level)

          return value as T
        }

        levelLogger.debug('Cache miss', {
          missedLevel: level.name
        })
      } catch (error) {
        levelLogger.warn('Cache level error', {
          level: level.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    cacheLogger.info('Complete cache miss across all levels')
    return undefined
  }

  async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
    const cacheLogger = this.logger.child({
      operation: 'multiLevelSet',
      cacheKey: key
    })

    const setPromises = this.levels.map(async level => {
      const levelLogger = cacheLogger.child({
        cacheLevel: level.name
      })

      try {
        const ttl = customTtl || level.ttl
        await level.cache.set(key, value, ttl)
        
        levelLogger.debug('Cache set successful', {
          level: level.name,
          ttl
        })
      } catch (error) {
        levelLogger.warn('Cache set failed', {
          level: level.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(setPromises)
    cacheLogger.info('Multi-level cache set completed')
  }

  private async populateHigherLevels<T>(
    key: string,
    value: T,
    sourceLevel: CacheLevel
  ): Promise<void> {
    const higherLevels = this.levels.filter(
      level => level.priority < sourceLevel.priority
    )

    if (higherLevels.length === 0) return

    const populatePromises = higherLevels.map(async level => {
      try {
        await level.cache.set(key, value, level.ttl)
        
        this.logger.debug('Cache level populated', {
          sourceLevel: sourceLevel.name,
          targetLevel: level.name,
          cacheKey: key
        })
      } catch (error) {
        this.logger.warn('Failed to populate cache level', {
          sourceLevel: sourceLevel.name,
          targetLevel: level.name,
          cacheKey: key,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(populatePromises)
  }

  async invalidate(key: string): Promise<void> {
    const invalidatePromises = this.levels.map(async level => {
      try {
        await level.cache.delete(key)
      } catch (error) {
        this.logger.warn('Cache invalidation failed', {
          level: level.name,
          cacheKey: key,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(invalidatePromises)
    
    this.logger.info('Cache invalidated across all levels', {
      cacheKey: key
    })
  }
}

// Setup example
function createMultiLevelCache(logger: Logger): MultiLevelCache {
  const levels: CacheLevel[] = [
    {
      name: 'L1-Memory',
      cache: createMemoryCache({ maxSize: 1000, defaultTtl: 60 }),
      ttl: 60,
      priority: 1
    },
    {
      name: 'L2-Redis',
      cache: createRedisCache({ host: 'localhost', port: 6379, defaultTtl: 300 }),
      ttl: 300,
      priority: 2
    },
    {
      name: 'L3-Persistent',
      cache: createPersistentCache({ path: './cache', defaultTtl: 3600 }),
      ttl: 3600,
      priority: 3
    }
  ]

  return new MultiLevelCache(levels, logger)
}
```

### 2. Cache Warming and Preloading

Proactive cache management:

```typescript
// ✅ Intelligent cache warming
class CacheWarmer {
  constructor(
    private cache: MultiLevelCache,
    private logger: Logger
  ) {}

  async warmCriticalData(): Promise<Result<void, QiError>> {
    const warmingLogger = this.logger.child({
      operation: 'cacheWarming',
      phase: 'critical_data'
    })

    warmingLogger.info('Starting critical data cache warming')

    return fromAsyncTryCatch(
      async () => {
        // Warm user preferences for active users
        await this.warmUserPreferences()
        
        // Warm frequently accessed configuration
        await this.warmApplicationConfig()
        
        // Warm popular content
        await this.warmPopularContent()

        warmingLogger.info('Cache warming completed successfully')
      },
      error => {
        warmingLogger.error('Cache warming failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        return create(
          'CACHE_WARMING_FAILED',
          `Cache warming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { operation: 'warmCriticalData' }
        )
      }
    )
  }

  private async warmUserPreferences(): Promise<void> {
    const activeUsers = await this.getActiveUserIds()
    
    const warmingPromises = activeUsers.map(async userId => {
      try {
        const preferences = await this.fetchUserPreferences(userId)
        await this.cache.set(`user_prefs:${userId}`, preferences, 3600)
        
        this.logger.debug('User preferences warmed', { userId })
      } catch (error) {
        this.logger.warn('Failed to warm user preferences', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(warmingPromises)
  }

  private async warmApplicationConfig(): Promise<void> {
    const configs = [
      'feature_flags',
      'rate_limits',
      'service_endpoints',
      'ui_config'
    ]

    for (const configKey of configs) {
      try {
        const config = await this.fetchConfiguration(configKey)
        await this.cache.set(`config:${configKey}`, config, 7200) // 2 hours
        
        this.logger.debug('Configuration warmed', { configKey })
      } catch (error) {
        this.logger.warn('Failed to warm configuration', {
          configKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  private async warmPopularContent(): Promise<void> {
    const popularContentIds = await this.getPopularContentIds()
    
    const warmingPromises = popularContentIds.map(async contentId => {
      try {
        const content = await this.fetchContent(contentId)
        await this.cache.set(`content:${contentId}`, content, 1800) // 30 minutes
        
        this.logger.debug('Popular content warmed', { contentId })
      } catch (error) {
        this.logger.warn('Failed to warm popular content', {
          contentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(warmingPromises)
  }

  // Placeholder methods - implement based on your data sources
  private async getActiveUserIds(): Promise<string[]> {
    // Return list of recently active user IDs
    return ['user1', 'user2', 'user3']
  }

  private async fetchUserPreferences(userId: string): Promise<any> {
    // Fetch user preferences from database
    return { theme: 'dark', language: 'en' }
  }

  private async fetchConfiguration(configKey: string): Promise<any> {
    // Fetch configuration from database or service
    return { enabled: true, value: 'config_value' }
  }

  private async getPopularContentIds(): Promise<string[]> {
    // Return list of popular content IDs
    return ['content1', 'content2', 'content3']
  }

  private async fetchContent(contentId: string): Promise<any> {
    // Fetch content from database
    return { id: contentId, title: 'Popular Content' }
  }
}
```

## Summary

These advanced patterns enable building production-ready applications with:

1. **Sophisticated Result<T> Composition**
   - Array processing with partial failure handling
   - Complex conditional business logic
   - Intelligent retry mechanisms

2. **Advanced Logging Strategies**
   - Performance monitoring and alerting
   - Request correlation across services
   - Error analysis and pattern detection

3. **Multi-Level Caching**
   - Hierarchical cache strategies
   - Proactive cache warming
   - Intelligent cache population

4. **Production Concerns**
   - Observability and monitoring
   - Error analysis and debugging
   - Performance optimization

These patterns maintain the core @qi principles while providing the sophistication needed for real-world applications.