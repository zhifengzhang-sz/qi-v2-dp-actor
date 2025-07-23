# MCP Actors Implementation Plan

## Overview

This plan implements MCP (Model Context Protocol) actors alongside the existing actor implementation without modifying the current working code.

## Current State

**What we have (working):**
- `BaseActor` - implements `MarketDataContextManager` with workflow abstraction
- Abstract classes: `Reader`, `Writer`, `HistoricalReader`, `HistoricalWriter`, `StreamingReader`, `StreamingWriter`
- All classes follow DSL contracts with handler delegation pattern
- @qi/base Result<T> composition throughout
- @modelcontextprotocol/sdk dependency installed
- All 487 tests passing

**What we need to add:**
- MCP protocol actors that duplicate current implementation patterns
- MCP server infrastructure and protocol handling
- Tool registration to expose DSL operations via MCP

## Implementation Strategy

### Accept Intentional Redundancy

**Philosophy**: Duplicate the proven patterns rather than complex inheritance
- **Current actors**: Pure business logic implementation
- **MCP actors**: Business logic duplication + MCP protocol handling
- **No changes** to existing working code

## Phase 1: MCP Infrastructure

### 1.1. Create MCPBaseActor

**File**: `lib/src/actor/mcp/MCPBaseActor.ts`

**Purpose**: Handle all MCP protocol concerns

**Implementation**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server'
import type { Result } from '@qi/base'

export interface MCPTool {
  name: string
  description: string
  inputSchema: object
  handler: (args: any) => Promise<any>
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description: string
  arguments?: object
}

export abstract class MCPBaseActor {
  protected server: Server
  protected isInitialized = false

  constructor() {
    this.server = new Server({
      name: "qi-dp-actor",
      version: "ts-0.5.1"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    })
  }

  // MCP Lifecycle
  async initialize(): Promise<void> {
    await this.initializeServer()
    await this.registerCapabilities()
    this.isInitialized = true
  }

  async shutdown(): Promise<void> {
    await this.handleShutdown()
    this.isInitialized = false
  }

  // Abstract methods - concrete classes must implement
  protected abstract initializeServer(): Promise<void>
  protected abstract registerCapabilities(): Promise<void>
  protected abstract handleShutdown(): Promise<void>
  protected abstract registerTools(): MCPTool[]
  protected abstract registerResources(): MCPResource[]
  protected abstract registerPrompts(): MCPPrompt[]

  // Protocol handling
  protected async handleToolCall(name: string, args: any): Promise<any> {
    const tools = this.registerTools()
    const tool = tools.find(t => t.name === name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }
    return await tool.handler(args)
  }
}
```

### 1.2. Create MCP Types and Schemas

**File**: `lib/src/actor/mcp/types.ts`

**Purpose**: JSON schemas for DSL types and MCP interfaces

**Implementation**:
```typescript
// JSON schemas for DSL types
export const DataContextSchema = {
  type: "object",
  properties: {
    market: { type: "object" },
    exchange: { type: "object" }, 
    instrument: { type: "object" }
  },
  required: ["market", "exchange", "instrument"]
}

export const MarketDataPriceSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    data: { type: "object" }
  },
  required: ["context", "data"]
}

// Additional schemas...
```

## Phase 2: MCP Reader Implementation

### 2.1. Create MCPMarketDataReader

**File**: `lib/src/actor/mcp/MCPMarketDataReader.ts`

**Strategy**: Copy current `Reader` implementation + add MCP tool registration

**Implementation**:
```typescript
import type { Result } from '@qi/base'
import type * as DSL from '../../dsl'
import { MCPBaseActor, type MCPTool } from './MCPBaseActor'
import { DataContextSchema } from './types'

export abstract class MCPMarketDataReader extends MCPBaseActor implements DSL.MarketDataReader {
  constructor(protected context: DSL.DataContext) {
    super()
  }

  // DUPLICATE: Copy all DSL methods from current Reader class
  async getCurrentPrice(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Price>>> {
    return this.workflow(this.getCurrentPriceHandler(context), "PRICE_FETCH_ERROR", {
      operation: "getCurrentPrice",
      context,
    })
  }

  async getCurrentPrices(contexts: DSL.DataContext[]): Promise<Result<DSL.MarketData<DSL.Price>[]>> {
    return this.workflow(this.getCurrentPricesHandler(contexts), "PRICES_FETCH_ERROR", {
      operation: "getCurrentPrices", 
      contextCount: contexts.length,
    })
  }

  // ... Copy all other DSL methods from Reader

  // DUPLICATE: Copy workflow method from BaseActor  
  protected async workflow<T>(
    handlerPromise: Promise<Result<T>>,
    errorType: string,
    operationContext: Record<string, unknown> = {}
  ): Promise<Result<T>> {
    // Copy implementation from BaseActor
  }

  // DUPLICATE: Copy all abstract handlers from Reader
  protected abstract getCurrentPriceHandler(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Price>>>
  protected abstract getCurrentPricesHandler(contexts: DSL.DataContext[]): Promise<Result<DSL.MarketData<DSL.Price>[]>>
  // ... All other handlers

  // NEW: MCP tool registration
  protected registerTools(): MCPTool[] {
    return [
      {
        name: "get_current_price",
        description: "Get current price for a trading pair",
        inputSchema: DataContextSchema,
        handler: (args) => this.getCurrentPrice(args.context)
      },
      {
        name: "get_current_prices", 
        description: "Get current prices for multiple trading pairs",
        inputSchema: { type: "object", properties: { contexts: { type: "array", items: DataContextSchema }}},
        handler: (args) => this.getCurrentPrices(args.contexts)
      },
      // ... Map all DSL methods to tools
    ]
  }

  protected registerResources(): MCPResource[] { return [] }
  protected registerPrompts(): MCPPrompt[] { return [] }
}
```

### 2.2. Handle Context Manager Duplication

**Issue**: Both `BaseActor` and `MCPBaseActor` need context manager functionality

**Solution**: Duplicate `MarketDataContextManager` implementation in `MCPMarketDataReader`

## Phase 3: MCP Writer Implementation  

### 3.1. Create MCPMarketDataWriter

**File**: `lib/src/actor/mcp/MCPMarketDataWriter.ts`

**Strategy**: Same pattern as MCPMarketDataReader

**Implementation**: Copy current `Writer` + add MCP tools for publishing operations

## Phase 4: MCP Streaming Implementation

### 4.1. Create MCPStreamingReader

**File**: `lib/src/actor/mcp/MCPStreamingReader.ts`

**Additional complexity**: Subscription management for MCP notifications

**Implementation**:
```typescript
export abstract class MCPStreamingReader extends MCPBaseActor implements DSL.StreamingMarketDataReader {
  private subscriptions: Map<string, DSL.Subscription> = new Map()

  // DUPLICATE: Copy all DSL methods from StreamingReader
  // NEW: Add subscription management for MCP notifications
  
  protected registerTools(): MCPTool[] {
    return [
      {
        name: "subscribe_price_stream",
        description: "Subscribe to real-time price updates", 
        inputSchema: SubscriptionSchema,
        handler: async (args) => {
          const subscription = await this.subscribePriceStream(
            args.context,
            (data) => this.sendNotification("price_update", data)
          )
          const id = generateSubscriptionId()
          this.subscriptions.set(id, subscription)
          return { subscriptionId: id }
        }
      }
      // ... other streaming tools
    ]
  }

  private sendNotification(type: string, data: any): void {
    // Send MCP notification to client
  }
}
```

### 4.2. Create MCPStreamingWriter

**File**: `lib/src/actor/mcp/MCPStreamingWriter.ts`

**Additional complexity**: Stream management and control via MCP tools

## Phase 5: Integration

### 5.1. File Structure

```
lib/src/actor/
├── abstract/                 # Current implementation (unchanged)
│   ├── BaseActor.ts
│   ├── Reader.ts
│   ├── Writer.ts
│   ├── HistoricalReader.ts
│   ├── HistoricalWriter.ts
│   ├── StreamingReader.ts
│   ├── StreamingWriter.ts
│   └── index.ts
├── mcp/                      # New MCP implementation
│   ├── MCPBaseActor.ts
│   ├── MCPMarketDataReader.ts
│   ├── MCPMarketDataWriter.ts
│   ├── MCPStreamingReader.ts
│   ├── MCPStreamingWriter.ts
│   ├── types.ts
│   └── index.ts
└── index.ts                  # Export both hierarchies
```

### 5.2. Update Exports

**File**: `lib/src/actor/index.ts`

```typescript
// Current implementation (unchanged)
export * from "./abstract"

// New MCP implementation  
export * from "./mcp"
```

### 5.3. Update Package Exports

**File**: `package.json` - MCP export already exists

```json
{
  "exports": {
    "./mcp": {
      "types": "./dist/mcp/index.d.ts",
      "import": "./dist/mcp/index.mjs", 
      "require": "./dist/mcp/index.js"
    }
  }
}
```

### 5.4. Update MCP Server Entry Point

**File**: `lib/src/bin/mcp-server.ts` (already exists)

**Update**: Use new MCP actors instead of current ones

## Phase 6: Testing

### 6.1. Ensure No Regressions

- All existing 487 tests must continue passing
- `bun run check` must pass clean
- No changes to current implementation behavior

### 6.2. Add MCP-Specific Tests

- MCP protocol lifecycle tests
- Tool registration tests  
- JSON schema validation tests
- Integration tests with MCP client

## Implementation Priorities

### Priority 1: Core MCP Infrastructure
- MCPBaseActor with protocol handling
- Basic tool registration framework
- MCP types and schemas

### Priority 2: Reader Implementation
- MCPMarketDataReader with current Reader duplication
- Tool registration for all read operations
- Basic MCP server functionality

### Priority 3: Writer Implementation  
- MCPMarketDataWriter with current Writer duplication
- Tool registration for all write operations

### Priority 4: Streaming Implementation
- MCPStreamingReader with subscription management
- MCPStreamingWriter with stream control
- MCP notification handling

### Priority 5: Integration & Testing
- Complete file structure setup
- Entry point updates
- Comprehensive testing

## Success Criteria

- [ ] All existing 487 tests pass
- [ ] `bun run check` passes clean  
- [ ] MCP actors implement all DSL contracts
- [ ] MCP server starts and handles protocol correctly
- [ ] Tool registration exposes all DSL operations
- [ ] No breaking changes to existing code
- [ ] Clean separation between current and MCP actors

## Estimated Effort

- **Phase 1**: 4-6 hours (MCP infrastructure)
- **Phase 2**: 3-4 hours (Reader implementation)  
- **Phase 3**: 2-3 hours (Writer implementation)
- **Phase 4**: 4-5 hours (Streaming implementation)
- **Phase 5**: 2-3 hours (Integration)
- **Phase 6**: 3-4 hours (Testing)

**Total**: ~18-25 hours for complete implementation

## Notes

- **Redundancy is acceptable** - clean architecture over DRY
- **Use @qi/base and @qi/core directly** - no utility wrappers
- **Current implementation stays unchanged** - proven and working
- **MCP actors are additive** - new functionality alongside existing