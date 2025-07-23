# QiCore Data Processing Actor Implementation Guide

## Table of Contents
1. [Generic Actor Implementation](#generic-actor-implementation)
2. [MCP Actor Implementation](#mcp-actor-implementation)

## Generic Actor Implementation

### `BaseActor`

**Purpose**: Foundation for all actor implementations, providing core infrastructure

**Responsibilities**:
- Error handling with consistent Result<T> patterns
- Logging with structured context
- Configuration management
- Caching infrastructure
- Lifecycle management (initialization, operation, shutdown)

**Utility Methods Available**:
```typescript
// Error handling utilities (implemented by base class)
protected handleError(error: unknown, context: string): Result<never>
protected wrapAsync<T>(operation: () => Promise<T>): Promise<Result<T>>

// Logging with context
protected log(level: LogLevel, message: string, context?: any): void

// Configuration access
protected getConfig<T>(key: string): Result<T>

// Caching operations
protected cache<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<Result<T>>
```

### `GenericMarketDataReader`

**Extends**: `BaseActor`  
**Implements**: `MarketDataReader` interface from DSL

**DSL Contract to Implement**:
- `MarketDataReader`: Current data retrieval operations

**Required Operations**:
```typescript
import * as DSL from 'lib/src/dsl';

// Reader Contract (DSL Part II)
getCurrentPrice(context: DSL.DataContext): Result<DSL.MarketData<DSL.Price>>
getCurrentPrices(contexts: DSL.DataContext[]): Result<DSL.MarketData<DSL.Price>[]>
getLevel1(context: DSL.DataContext): Result<DSL.MarketData<DSL.Level1>>
getMarketDepth(context: DSL.DataContext, levels: DSL.Levels): Result<DSL.MarketData<DSL.MarketDepth>>
getOHLCV(context: DSL.DataContext, timeframe: DSL.Timeframe): Result<DSL.MarketData<DSL.OHLCV>>
getPriceHistory(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Price>[]>
getLevel1History(context: DSL.DataContext, range: DSL.DateRange): Result<DSL.MarketData<DSL.Level1>[]>
getOHLCVHistory(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Result<DSL.MarketData<DSL.OHLCV>[]>
```

**Abstract Handler Methods (to be implemented by concrete classes)**:
```typescript
// Handler methods - concrete classes must implement
protected abstract getCurrentPriceHandler(context: DSL.DataContext): Promise<DSL.MarketData<DSL.Price>>
protected abstract getCurrentPricesHandler(contexts: DSL.DataContext[]): Promise<DSL.MarketData<DSL.Price>[]>
protected abstract getLevel1Handler(context: DSL.DataContext): Promise<DSL.MarketData<DSL.Level1>>
protected abstract getMarketDepthHandler(context: DSL.DataContext, levels: DSL.Levels): Promise<DSL.MarketData<DSL.MarketDepth>>
protected abstract getOHLCVHandler(context: DSL.DataContext, timeframe: DSL.Timeframe): Promise<DSL.MarketData<DSL.OHLCV>>
protected abstract getPriceHistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Price>[]>
protected abstract getLevel1HistoryHandler(context: DSL.DataContext, range: DSL.DateRange): Promise<DSL.MarketData<DSL.Level1>[]>
protected abstract getOHLCVHistoryHandler(context: DSL.DataContext, timeframe: DSL.Timeframe, range: DSL.DateRange): Promise<DSL.MarketData<DSL.OHLCV>[]>
```

### `GenericMarketDataWriter`

**Extends**: `BaseActor`  
**Implements**: `MarketDataWriter` interface from DSL

**DSL Contract to Implement**:
- `MarketDataWriter`: Data persistence operations

**Required Operations**:
```typescript
// Writer Contract (DSL Part III)
publishPrice(data: DSL.MarketData<DSL.Price>): Result<void>
publishPrices(data: DSL.MarketData<DSL.Price>[]): Result<void>
publishLevel1(data: DSL.MarketData<DSL.Level1>): Result<void>
publishOHLCV(data: DSL.MarketData<DSL.OHLCV>): Result<void>
publishMarketDepth(data: DSL.MarketData<DSL.MarketDepth>): Result<void>
publishAnalytics(data: DSL.MarketData<DSL.MarketAnalytics>): Result<void>
publishOHLCVBatch(data: DSL.MarketData<DSL.OHLCV>[]): Result<void>
```

**Abstract Handler Methods**:
```typescript
protected abstract publishPriceHandler(data: DSL.MarketData<DSL.Price>): Promise<void>
protected abstract publishPricesHandler(data: DSL.MarketData<DSL.Price>[]): Promise<void>
protected abstract publishLevel1Handler(data: DSL.MarketData<DSL.Level1>): Promise<void>
protected abstract publishOHLCVHandler(data: DSL.MarketData<DSL.OHLCV>): Promise<void>
protected abstract publishMarketDepthHandler(data: DSL.MarketData<DSL.MarketDepth>): Promise<void>
protected abstract publishAnalyticsHandler(data: DSL.MarketData<DSL.MarketAnalytics>): Promise<void>
protected abstract publishOHLCVBatchHandler(data: DSL.MarketData<DSL.OHLCV>[]): Promise<void>
```

### `GenericStreamingReader`

**Extends**: `BaseActor`  
**Implements**: `StreamingMarketDataReader` interface from DSL

**DSL Contract to Implement**:
- `StreamingMarketDataReader`: Real-time data subscription operations

**Required Operations**:
```typescript
// Streaming Contract (DSL Part IV)
subscribePriceStream(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Price>) => void): Result<DSL.Subscription>
subscribeLevel1Stream(context: DSL.DataContext, callback: (data: DSL.MarketData<DSL.Level1>) => void): Result<DSL.Subscription>
subscribeMarketDepthStream(context: DSL.DataContext, levels: DSL.Levels, callback: (data: DSL.MarketData<DSL.MarketDepth>) => void): Result<DSL.Subscription>
subscribeOHLCVStream(context: DSL.DataContext, timeframe: DSL.Timeframe, callback: (data: DSL.MarketData<DSL.OHLCV>) => void): Result<DSL.Subscription>
unsubscribe(subscription: DSL.Subscription): Result<void>
```

**Abstract Handler Methods**:
```typescript
protected abstract subscribePriceStreamHandler(context: DSL.DataContext, callback: Function): Promise<DSL.Subscription>
protected abstract subscribeLevel1StreamHandler(context: DSL.DataContext, callback: Function): Promise<DSL.Subscription>
protected abstract subscribeMarketDepthStreamHandler(context: DSL.DataContext, levels: DSL.Levels, callback: Function): Promise<DSL.Subscription>
protected abstract subscribeOHLCVStreamHandler(context: DSL.DataContext, timeframe: DSL.Timeframe, callback: Function): Promise<DSL.Subscription>
protected abstract unsubscribeHandler(subscription: DSL.Subscription): Promise<void>
```

### `GenericStreamingWriter`

**Extends**: `BaseActor`  
**Implements**: `StreamingMarketDataWriter` interface from DSL

**DSL Contract to Implement**:
- `StreamingMarketDataWriter`: Real-time data publishing operations

**Required Operations**:
```typescript
// Streaming Writer Contract (DSL Part V)
startPriceStream(context: DSL.DataContext): Result<DSL.PriceStream>
startLevel1Stream(context: DSL.DataContext): Result<DSL.Level1Stream>
startMarketDepthStream(context: DSL.DataContext, levels: DSL.Levels): Result<DSL.MarketDepthStream>
startOHLCVStream(context: DSL.DataContext, timeframe: DSL.Timeframe): Result<DSL.OHLCVStream>
```

**Abstract Handler Methods**:
```typescript
protected abstract startPriceStreamHandler(context: DSL.DataContext): Promise<DSL.PriceStream>
protected abstract startLevel1StreamHandler(context: DSL.DataContext): Promise<DSL.Level1Stream>
protected abstract startMarketDepthStreamHandler(context: DSL.DataContext, levels: DSL.Levels): Promise<DSL.MarketDepthStream>
protected abstract startOHLCVStreamHandler(context: DSL.DataContext, timeframe: DSL.Timeframe): Promise<DSL.OHLCVStream>
```

## MCP Actor Implementation

### `BaseMCPActor`

**Purpose**: Base class that handles all MCP protocol concerns

**Responsibilities**:
- MCP server initialization and lifecycle management
- Protocol handshake (initialize → initialized → operate → shutdown)
- Transport handling (stdio, HTTP+SSE)
- JSON-RPC 2.0 message processing
- Capability registration and discovery
- Client connection management

**MCP Lifecycle Methods**:
```typescript
// MCP Protocol lifecycle - implemented by base class
protected abstract initializeServer(): Promise<void>
protected abstract registerCapabilities(): Promise<void>
protected abstract handleShutdown(): Promise<void>

// MCP capability registration - called during initialization
protected abstract registerTools(): MCPTool[]
protected abstract registerResources(): MCPResource[]
protected abstract registerPrompts(): MCPPrompt[]
```

### `MCPMarketDataReader`

**Extends**: `BaseMCPActor`, `GenericMarketDataReader`

**What you inherit**:
- From `GenericMarketDataReader`: All DSL reader operations fully implemented
- From `BaseMCPActor`: MCP server and protocol handling

**What you must implement**:
```typescript
// Tool registration - expose inherited operations as MCP tools
protected registerTools(): MCPTool[] {
  return [
    {
      name: "get_current_price",
      description: "Get current price for a trading pair",
      inputSchema: DataContextSchema,
      handler: (args) => this.getCurrentPrice(args.context) // calls inherited method
    },
    {
      name: "get_current_prices",
      description: "Get current prices for multiple trading pairs",
      inputSchema: DataContextArraySchema,
      handler: (args) => this.getCurrentPrices(args.contexts) // calls inherited method
    },
    // ... map all inherited operations to MCP tools
  ]
}
```

### `MCPMarketDataWriter`

**Extends**: `BaseMCPActor`, `GenericMarketDataWriter`

**What you inherit**:
- From `GenericMarketDataWriter`: All DSL writer operations fully implemented
- From `BaseMCPActor`: MCP server and protocol handling

**What you must implement**:
```typescript
// Tool registration - expose inherited operations as MCP tools
protected registerTools(): MCPTool[] {
  return [
    {
      name: "publish_price",
      description: "Publish price data to storage",
      inputSchema: MarketDataPriceSchema,
      handler: (args) => this.publishPrice(args.marketData) // calls inherited method
    },
    {
      name: "publish_prices",
      description: "Publish multiple price records",
      inputSchema: MarketDataPriceArraySchema,
      handler: (args) => this.publishPrices(args.marketDataArray) // calls inherited method
    },
    // ... map all inherited operations to MCP tools
  ]
}
```

### `MCPStreamingReader`

**Extends**: `BaseMCPActor`, `GenericStreamingReader`

**What you inherit**:
- From `GenericStreamingReader`: All DSL streaming reader operations
- From `BaseMCPActor`: MCP server and protocol handling

**Additional MCP-specific requirements**:
- Subscription management via MCP notifications
- Persistent connection handling for streaming data

**What you must implement**:
```typescript
// Subscription management
private subscriptions: Map<string, DSL.Subscription>

// Tool registration with subscription handling
protected registerTools(): MCPTool[] {
  return [
    {
      name: "subscribe_price_stream",
      description: "Subscribe to real-time price updates",
      inputSchema: SubscriptionSchema,
      handler: async (args) => {
        const subscription = await this.subscribePriceStream(
          args.context,
          (data) => this.sendNotification(args.clientId, data)
        );
        const id = generateSubscriptionId();
        this.subscriptions.set(id, subscription);
        return { subscriptionId: id };
      }
    },
    {
      name: "unsubscribe",
      description: "Cancel active subscription",
      inputSchema: UnsubscribeSchema,
      handler: async (args) => {
        const subscription = this.subscriptions.get(args.subscriptionId);
        if (subscription) {
          await this.unsubscribe(subscription);
          this.subscriptions.delete(args.subscriptionId);
        }
      }
    },
    // ... additional streaming tools
  ]
}
```

### `MCPStreamingWriter`

**Extends**: `BaseMCPActor`, `GenericStreamingWriter`

**What you inherit**:
- From `GenericStreamingWriter`: All DSL streaming writer operations
- From `BaseMCPActor`: MCP server and protocol handling

**What you must implement**:
```typescript
// Stream management
private activeStreams: Map<string, DSL.Stream>

// Tool registration for stream control
protected registerTools(): MCPTool[] {
  return [
    {
      name: "start_price_stream",
      description: "Start a price data stream",
      inputSchema: StreamContextSchema,
      handler: async (args) => {
        const stream = await this.startPriceStream(args.context);
        const streamId = generateStreamId();
        this.activeStreams.set(streamId, stream);
        return { streamId, status: "active" };
      }
    },
    {
      name: "write_to_stream",
      description: "Write data to active stream",
      inputSchema: StreamWriteSchema,
      handler: async (args) => {
        const stream = this.activeStreams.get(args.streamId);
        if (stream) {
          return stream.write(args.data);
        }
        throw new Error("Stream not found");
      }
    },
    {
      name: "stop_stream",
      description: "Stop an active stream",
      inputSchema: StopStreamSchema,
      handler: async (args) => {
        const stream = this.activeStreams.get(args.streamId);
        if (stream) {
          await stream.stop();
          this.activeStreams.delete(args.streamId);
        }
      }
    }
  ]
}
```

## Implementation Flow

### For Generic Actors
1. Extend `BaseActor` to inherit infrastructure
2. Implement DSL interface methods
3. Implement abstract handler methods
4. Add domain-specific logic

### For MCP Actors
1. Extend both `BaseMCPActor` and appropriate `Generic*` actor
2. Inherit all DSL operations from generic actor
3. Implement tool registration to expose operations
4. Map MCP requests to inherited methods
5. Handle MCP-specific concerns (lifecycle, notifications, etc.)

## Key Design Principles

1. **Separation of Concerns**: Generic actors handle business logic, MCP actors handle protocol
2. **No Duplication**: MCP actors inherit implementations, don't reimplement
3. **Clear Naming**: `Generic*` prefix for business logic, `MCP*` prefix for protocol actors
4. **DSL Compliance**: All actors strictly implement DSL contracts
5. **Error Propagation**: Consistent Result<T> pattern throughout
