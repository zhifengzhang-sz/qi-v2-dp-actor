# @qi Integration Examples

## Overview

This document provides complete, working examples that demonstrate how to integrate `@qi/base` and `@qi/core` together in real applications. All examples maintain proper Result<T> composition and show production-ready patterns.

## Example 1: Simple Web API Server

A complete example showing how to build a web API with proper error handling and infrastructure setup.

### Project Structure
```
src/
├── infrastructure/
│   ├── logger.ts
│   ├── config.ts
│   └── cache.ts
├── services/
│   └── user-service.ts
├── handlers/
│   └── user-handlers.ts
└── app.ts
```

### Infrastructure Setup

**src/infrastructure/logger.ts**
```typescript
import { createLogger } from '@qi/core'
import { Result } from '@qi/base'
import type { Logger } from '@qi/core'
import type { QiError } from '@qi/base'

export function initializeLogger(): Result<Logger, QiError> {
  return createLogger({
    level: process.env.LOG_LEVEL as any || 'info',
    name: 'user-api',
    pretty: process.env.NODE_ENV === 'development'
  })
}
```

**src/infrastructure/config.ts**
```typescript
import { Ok, Err, flatMap, validationError } from '@qi/base'
import type { Result, QiError } from '@qi/base'

export interface AppConfig {
  server: {
    port: number
    host: string
  }
  database: {
    url: string
    maxConnections: number
  }
  cache: {
    maxSize: number
    defaultTtl: number
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    pretty: boolean
  }
}

export function loadConfig(): Result<AppConfig, QiError> {
  return flatMap(
    port => flatMap(
      maxConnections => flatMap(
        cacheMaxSize => flatMap(
          cacheTtl => flatMap(
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
                cache: {
                  maxSize: cacheMaxSize,
                  defaultTtl: cacheTtl
                },
                logging: {
                  level: logLevel,
                  pretty: process.env.LOG_PRETTY === 'true'
                }
              }

              return Ok(config)
            },
            validateLogLevel(process.env.LOG_LEVEL || 'info')
          ),
          validatePositiveInteger(process.env.CACHE_TTL || '300', 'CACHE_TTL')
        ),
        validatePositiveInteger(process.env.CACHE_MAX_SIZE || '1000', 'CACHE_MAX_SIZE')
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

**src/infrastructure/cache.ts**
```typescript
import { createMemoryCache } from '@qi/core'
import type { ICache } from '@qi/core'
import type { AppConfig } from './config'

export function initializeCache(config: AppConfig): ICache {
  return createMemoryCache({
    maxSize: config.cache.maxSize,
    defaultTtl: config.cache.defaultTtl
  })
}
```

### Service Layer

**src/services/user-service.ts**
```typescript
import { Ok, Err, flatMap, map, fromAsyncTryCatch, create, validationError } from '@qi/base'
import type { Result, QiError } from '@qi/base'
import type { Logger, ICache } from '@qi/core'

export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserRequest {
  name: string
  email: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
}

export class UserService {
  private readonly serviceLogger: Logger

  constructor(
    private cache: ICache,
    logger: Logger
  ) {
    this.serviceLogger = logger.child({
      service: 'UserService',
      version: '1.0.0'
    })
  }

  async getUser(id: string): Promise<Result<User, QiError>> {
    const opLogger = this.serviceLogger.child({
      operation: 'getUser',
      userId: id
    })

    opLogger.info('Getting user')

    return flatMap(
      validId => this.fetchUserWithCache(validId, opLogger),
      this.validateUserId(id)
    )
  }

  async createUser(request: CreateUserRequest): Promise<Result<User, QiError>> {
    const opLogger = this.serviceLogger.child({
      operation: 'createUser',
      email: request.email
    })

    opLogger.info('Creating user')

    return flatMap(
      validatedRequest => this.saveNewUser(validatedRequest, opLogger),
      this.validateCreateUserRequest(request)
    )
  }

  async updateUser(id: string, request: UpdateUserRequest): Promise<Result<User, QiError>> {
    const opLogger = this.serviceLogger.child({
      operation: 'updateUser',
      userId: id
    })

    opLogger.info('Updating user')

    return flatMap(
      existingUser => flatMap(
        validatedRequest => this.saveUpdatedUser(existingUser, validatedRequest, opLogger),
        this.validateUpdateUserRequest(request)
      ),
      this.getUser(id)
    )
  }

  async deleteUser(id: string): Promise<Result<void, QiError>> {
    const opLogger = this.serviceLogger.child({
      operation: 'deleteUser',
      userId: id
    })

    opLogger.info('Deleting user')

    return flatMap(
      validId => this.removeUser(validId, opLogger),
      this.validateUserId(id)
    )
  }

  private validateUserId(id: string): Result<string, QiError> {
    if (!id || id.trim().length === 0) {
      return Err(validationError('User ID cannot be empty'))
    }

    if (id.length < 3) {
      return Err(validationError('User ID must be at least 3 characters'))
    }

    return Ok(id.trim())
  }

  private validateCreateUserRequest(request: CreateUserRequest): Result<CreateUserRequest, QiError> {
    return flatMap(
      validName => flatMap(
        validEmail => Ok({ name: validName, email: validEmail }),
        this.validateEmail(request.email)
      ),
      this.validateName(request.name)
    )
  }

  private validateUpdateUserRequest(request: UpdateUserRequest): Result<UpdateUserRequest, QiError> {
    // Validate provided fields only
    const validatedRequest: UpdateUserRequest = {}

    if (request.name !== undefined) {
      const nameResult = this.validateName(request.name)
      if (nameResult.tag === 'failure') {
        return nameResult
      }
      validatedRequest.name = nameResult.value
    }

    if (request.email !== undefined) {
      const emailResult = this.validateEmail(request.email)
      if (emailResult.tag === 'failure') {
        return emailResult
      }
      validatedRequest.email = emailResult.value
    }

    return Ok(validatedRequest)
  }

  private validateName(name: string): Result<string, QiError> {
    if (!name || name.trim().length === 0) {
      return Err(validationError('Name cannot be empty'))
    }

    if (name.trim().length > 100) {
      return Err(validationError('Name cannot exceed 100 characters'))
    }

    return Ok(name.trim())
  }

  private validateEmail(email: string): Result<string, QiError> {
    if (!email || email.trim().length === 0) {
      return Err(validationError('Email cannot be empty'))
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Err(validationError('Invalid email format'))
    }

    return Ok(email.trim().toLowerCase())
  }

  private async fetchUserWithCache(id: string, logger: Logger): Promise<Result<User, QiError>> {
    const cacheKey = `user:${id}`

    // Try cache first
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      logger.info('User found in cache')
      return Ok(cached as User)
    }

    // Cache miss - fetch from database
    logger.info('User not in cache, fetching from database')

    return fromAsyncTryCatch(
      async () => {
        const user = await this.fetchUserFromDatabase(id)

        // Cache the result
        await this.cache.set(cacheKey, user, 300)

        logger.info('User fetched and cached')
        return user
      },
      error => {
        logger.error('Failed to fetch user', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        return create(
          'USER_FETCH_FAILED',
          `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { userId: id }
        )
      }
    )
  }

  private async saveNewUser(request: CreateUserRequest, logger: Logger): Promise<Result<User, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        logger.info('Saving new user to database')

        const user = await this.saveUserToDatabase({
          id: this.generateUserId(),
          name: request.name,
          email: request.email,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        // Cache the new user
        await this.cache.set(`user:${user.id}`, user, 300)

        logger.info('User created and cached successfully', {
          userId: user.id
        })

        return user
      },
      error => {
        logger.error('Failed to create user', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        return create(
          'USER_CREATE_FAILED',
          `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { request }
        )
      }
    )
  }

  private async saveUpdatedUser(
    existingUser: User,
    request: UpdateUserRequest,
    logger: Logger
  ): Promise<Result<User, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        logger.info('Updating user in database')

        const updatedUser: User = {
          ...existingUser,
          ...(request.name && { name: request.name }),
          ...(request.email && { email: request.email }),
          updatedAt: new Date()
        }

        const savedUser = await this.saveUserToDatabase(updatedUser)

        // Update cache
        await this.cache.set(`user:${savedUser.id}`, savedUser, 300)

        logger.info('User updated and cached successfully')

        return savedUser
      },
      error => {
        logger.error('Failed to update user', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        return create(
          'USER_UPDATE_FAILED',
          `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { userId: existingUser.id, request }
        )
      }
    )
  }

  private async removeUser(id: string, logger: Logger): Promise<Result<void, QiError>> {
    return fromAsyncTryCatch(
      async () => {
        logger.info('Deleting user from database')

        await this.deleteUserFromDatabase(id)

        // Remove from cache
        await this.cache.delete(`user:${id}`)

        logger.info('User deleted successfully')
      },
      error => {
        logger.error('Failed to delete user', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        return create(
          'USER_DELETE_FAILED',
          `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYSTEM',
          { userId: id }
        )
      }
    )
  }

  // Simulated database operations
  private async fetchUserFromDatabase(id: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 100))

    if (id === 'not-found') {
      throw new Error('User not found')
    }

    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private async saveUserToDatabase(user: User): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 150))

    if (user.email === 'duplicate@example.com') {
      throw new Error('Email already exists')
    }

    return user
  }

  private async deleteUserFromDatabase(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50))

    if (id === 'cannot-delete') {
      throw new Error('User cannot be deleted')
    }
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

### HTTP Handlers

**src/handlers/user-handlers.ts**
```typescript
import { match } from '@qi/base'
import type { Result, QiError } from '@qi/base'
import type { Logger } from '@qi/core'
import { UserService, type User, type CreateUserRequest, type UpdateUserRequest } from '../services/user-service'

export interface HttpRequest {
  params: Record<string, string>
  body?: any
  method: string
  url: string
}

export interface HttpResponse {
  status: number
  body: any
  headers?: Record<string, string>
}

export class UserHandlers {
  private readonly handlerLogger: Logger

  constructor(
    private userService: UserService,
    logger: Logger
  ) {
    this.handlerLogger = logger.child({
      component: 'UserHandlers'
    })
  }

  async getUser(req: HttpRequest): Promise<HttpResponse> {
    const requestLogger = this.handlerLogger.child({
      operation: 'getUser',
      method: req.method,
      url: req.url,
      userId: req.params.id
    })

    requestLogger.info('Handling get user request')

    const result = await this.userService.getUser(req.params.id)

    return match(
      (user: User) => {
        requestLogger.info('User retrieved successfully')
        return {
          status: 200,
          body: { success: true, data: user }
        }
      },
      (error: QiError) => {
        requestLogger.error('Failed to retrieve user', {
          errorCategory: error.category,
          errorMessage: error.message
        })

        return this.mapErrorToHttpResponse(error)
      },
      result
    )
  }

  async createUser(req: HttpRequest): Promise<HttpResponse> {
    const requestLogger = this.handlerLogger.child({
      operation: 'createUser',
      method: req.method,
      url: req.url
    })

    requestLogger.info('Handling create user request')

    const createRequest: CreateUserRequest = req.body

    const result = await this.userService.createUser(createRequest)

    return match(
      (user: User) => {
        requestLogger.info('User created successfully', {
          userId: user.id
        })
        return {
          status: 201,
          body: { success: true, data: user }
        }
      },
      (error: QiError) => {
        requestLogger.error('Failed to create user', {
          errorCategory: error.category,
          errorMessage: error.message
        })

        return this.mapErrorToHttpResponse(error)
      },
      result
    )
  }

  async updateUser(req: HttpRequest): Promise<HttpResponse> {
    const requestLogger = this.handlerLogger.child({
      operation: 'updateUser',
      method: req.method,
      url: req.url,
      userId: req.params.id
    })

    requestLogger.info('Handling update user request')

    const updateRequest: UpdateUserRequest = req.body

    const result = await this.userService.updateUser(req.params.id, updateRequest)

    return match(
      (user: User) => {
        requestLogger.info('User updated successfully')
        return {
          status: 200,
          body: { success: true, data: user }
        }
      },
      (error: QiError) => {
        requestLogger.error('Failed to update user', {
          errorCategory: error.category,
          errorMessage: error.message
        })

        return this.mapErrorToHttpResponse(error)
      },
      result
    )
  }

  async deleteUser(req: HttpRequest): Promise<HttpResponse> {
    const requestLogger = this.handlerLogger.child({
      operation: 'deleteUser',
      method: req.method,
      url: req.url,
      userId: req.params.id
    })

    requestLogger.info('Handling delete user request')

    const result = await this.userService.deleteUser(req.params.id)

    return match(
      () => {
        requestLogger.info('User deleted successfully')
        return {
          status: 204,
          body: null
        }
      },
      (error: QiError) => {
        requestLogger.error('Failed to delete user', {
          errorCategory: error.category,
          errorMessage: error.message
        })

        return this.mapErrorToHttpResponse(error)
      },
      result
    )
  }

  private mapErrorToHttpResponse(error: QiError): HttpResponse {
    switch (error.category) {
      case 'VALIDATION':
        return {
          status: 400,
          body: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
              details: error.context
            }
          }
        }

      case 'SYSTEM':
        if (error.code === 'USER_FETCH_FAILED') {
          return {
            status: 404,
            body: {
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'User not found'
              }
            }
          }
        }

        return {
          status: 500,
          body: {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An internal error occurred'
            }
          }
        }

      default:
        return {
          status: 500,
          body: {
            success: false,
            error: {
              code: 'UNKNOWN_ERROR',
              message: 'An unknown error occurred'
            }
          }
        }
    }
  }
}
```

### Application Assembly

**src/app.ts**
```typescript
import { flatMap, match, Ok } from '@qi/base'
import type { Result, QiError } from '@qi/base'
import type { Logger, ICache } from '@qi/core'
import { initializeLogger } from './infrastructure/logger'
import { loadConfig, type AppConfig } from './infrastructure/config'
import { initializeCache } from './infrastructure/cache'
import { UserService } from './services/user-service'
import { UserHandlers } from './handlers/user-handlers'

interface AppInfrastructure {
  logger: Logger
  config: AppConfig
  cache: ICache
}

interface AppServices {
  userService: UserService
}

interface AppHandlers {
  userHandlers: UserHandlers
}

class Application {
  constructor(
    private infrastructure: AppInfrastructure,
    private services: AppServices,
    private handlers: AppHandlers
  ) {}

  async start(): Promise<void> {
    const { logger, config } = this.infrastructure

    logger.info('Starting application', {
      port: config.server.port,
      host: config.server.host,
      environment: process.env.NODE_ENV || 'development'
    })

    // Start HTTP server (simulated)
    this.startHttpServer()

    logger.info('Application started successfully')
  }

  private startHttpServer(): void {
    const { logger } = this.infrastructure

    // Simulate HTTP server setup
    logger.info('HTTP server listening', {
      port: this.infrastructure.config.server.port
    })

    // In a real application, you would set up routes here:
    // app.get('/users/:id', (req, res) => this.handlers.userHandlers.getUser(req))
    // app.post('/users', (req, res) => this.handlers.userHandlers.createUser(req))
    // etc.
  }

  async stop(): Promise<void> {
    this.infrastructure.logger.info('Stopping application')
    // Cleanup logic here
  }
}

async function initializeInfrastructure(): Promise<Result<AppInfrastructure, QiError>> {
  return flatMap(
    logger => flatMap(
      config => {
        const cache = initializeCache(config)
        
        logger.info('Infrastructure initialized successfully', {
          logLevel: config.logging.level,
          cacheMaxSize: config.cache.maxSize,
          serverPort: config.server.port
        })

        return Ok({ logger, config, cache })
      },
      loadConfig()
    ),
    initializeLogger()
  )
}

function initializeServices(infrastructure: AppInfrastructure): AppServices {
  const { logger, cache } = infrastructure

  const userService = new UserService(cache, logger)

  return { userService }
}

function initializeHandlers(
  infrastructure: AppInfrastructure,
  services: AppServices
): AppHandlers {
  const { logger } = infrastructure
  const { userService } = services

  const userHandlers = new UserHandlers(userService, logger)

  return { userHandlers }
}

async function createApplication(): Promise<Result<Application, QiError>> {
  const infrastructureResult = await initializeInfrastructure()

  return match(
    infrastructure => {
      const services = initializeServices(infrastructure)
      const handlers = initializeHandlers(infrastructure, services)
      
      return Ok(new Application(infrastructure, services, handlers))
    },
    error => Err(error),
    infrastructureResult
  )
}

async function main(): Promise<void> {
  const appResult = await createApplication()

  match(
    async app => {
      try {
        await app.start()
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\nReceived SIGINT, shutting down gracefully...')
          await app.stop()
          process.exit(0)
        })
        
        process.on('SIGTERM', async () => {
          console.log('\nReceived SIGTERM, shutting down gracefully...')
          await app.stop()
          process.exit(0)
        })
      } catch (error) {
        console.error('Application runtime error:', error)
        process.exit(1)
      }
    },
    error => {
      console.error('Failed to initialize application:', error.message)
      console.error('Error details:', error.context)
      
      // Implement fallback strategy here if needed
      console.log('Attempting to start with fallback configuration...')
      startApplicationWithFallbacks()
    },
    appResult
  )
}

function startApplicationWithFallbacks(): void {
  console.log('Starting application with minimal fallback configuration')
  console.log('- Using console logging instead of structured logging')
  console.log('- Using default configuration values')
  console.log('- Skipping cache functionality')
  
  // Implement minimal application startup here
  // This might include:
  // - Console-based logging
  // - Default configuration
  // - No caching
  // - Basic HTTP server
}

// Start the application
main().catch(error => {
  console.error('Unhandled application error:', error)
  process.exit(1)
})
```

## Key Patterns Demonstrated

### 1. **Consistent Result<T> Composition**
- All operations maintain Result<T> throughout
- No breaking with throws or process.exit()
- Proper error propagation and handling

### 2. **Infrastructure Setup**
- Logger, Config, Cache initialization with Result<T>
- Graceful degradation when infrastructure fails
- Fallback strategies for system resilience

### 3. **Service Layer Design**
- Validation chains with flatMap composition
- Async operations with fromAsyncTryCatch
- Proper error context and logging

### 4. **Contextual Logging**
- Child loggers for operation scoping
- Rich context accumulation
- Structured logging for observability

### 5. **Cache Integration**
- Direct value operations (no Result wrapper)
- Cache-aside pattern implementation
- TTL management for different data types

### 6. **Error Handling Strategy**
- Meaningful error categories
- Rich error context for debugging
- Appropriate HTTP status mapping

These examples demonstrate how to build production-ready applications using @qi/base and @qi/core while maintaining functional composition principles throughout.