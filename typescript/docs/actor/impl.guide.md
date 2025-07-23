# QiCore Data Processing Actor Implementation Guide

## Table of Contents
1. [Current Actor Implementation](#current-actor-implementation)
2. [MCP Actor Implementation](#mcp-actor-implementation)

## Current Actor Implementation

### `BaseActor`

**Purpose**: Foundation for all actor implementations

**Current Implementation**: Already exists and works well - implements `MarketDataContextManager` from DSL with workflow abstraction

**Responsibilities**:
- Context management (create, get, update, validate)
- Workflow abstraction with Result<T> patterns
- Uses @qi/base and @qi/core directly (no utility wrappers needed)

### `Reader` (MarketDataReader)

**Current Implementation**: Already exists as abstract `Reader` class
**Extends**: `BaseActor`  
**Implements**: `MarketDataReader` interface from DSL

**Pattern**: DSL methods implemented with workflow abstraction, delegate to abstract handlers

### `Writer` (MarketDataWriter)

**Current Implementation**: Already exists as abstract `Writer` class

**Extends**: `BaseActor`  
**Implements**: `MarketDataWriter` interface from DSL

**Pattern**: Same as Reader - workflow abstraction with abstract handlers

### Additional Current Classes

**Historical Classes**: `HistoricalReader`, `HistoricalWriter`
**Streaming Classes**: `StreamingReader`, `StreamingWriter`

**Status**: All current implementations work well and should remain unchanged

## Key Point: No Changes to Current Implementation

The current actor implementation is solid:
- Clean DSL contract implementation
- Proper Result<T> patterns with @qi/base
- Workflow abstraction with handler delegation
- Well-tested and working

**We only need to ADD MCP actors alongside the existing ones.**

---

# MCP Actor Requirements

## Correct Architecture: MCP Actors are Clients

MCP actors are **clients** that hide MCP client functionality behind clean DSL interfaces.

### `MCPBaseActor`

**Purpose**: MCP **client** infrastructure

**Extends**: `BaseActor` (inherits DSL.MarketDataContextManager)

**Responsibilities**:
- MCP client connection management (connect/disconnect)
- Transport handling (stdio by default)
- Tool calling on remote MCP servers
- Hide MCP protocol complexity from concrete actors

**Implementation**:
```typescript
abstract class MCPBaseActor extends BaseActor {
  protected client: Client;
  protected transport: StdioClientTransport;
  protected isConnected: boolean;

  constructor(context: DSL.DataContext, serverCommand: string[]) {
    super(context); // Inherits DSL.MarketDataContextManager
    this.client = new Client({...});
    this.transport = new StdioClientTransport({ command: serverCommand[0], args: serverCommand.slice(1) });
  }

  // MCP client helper methods
  protected async callTool(name: string, args: any): Promise<Result<any, Error>>
  protected async listTools(): Promise<Result<any[], Error>>
}
```

### `MCPMarketDataReader`

**Extends**: `MCPBaseActor` 
**Implements**: `DSL.MarketDataReader` **only**

**Key Point**: **Interface is pure DSL.MarketDataReader - nothing more, nothing less**

**Implementation**:
```typescript
class MCPMarketDataReader extends MCPBaseActor implements DSL.MarketDataReader {
  constructor(context: DSL.DataContext, serverCommand: string[]) {
    super(context, serverCommand);
  }

  // DSL.MarketDataReader implementation - calls MCP tools
  async getCurrentPrice(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Price>, QiError>> {
    return this.workflow(
      this.callMCPTool("get_current_price", { context }),
      "PRICE_FETCH_ERROR"
    );
  }

  // ... other DSL methods call corresponding MCP tools

  private async callMCPTool(name: string, args: any): Promise<Result<any, QiError>> {
    const result = await this.callTool(name, args);
    // Convert Error to QiError for DSL compatibility
    return mapErrorToQiError(result);
  }
}
```

**Usage**:
```typescript
// User configures which MCP server to connect to
const reader = new SomeConcreteMCPReader(context, ["python", "market_data_server.py"]);

// Clean DSL interface - MCP details completely hidden
const price = await reader.getCurrentPrice(context);
```

### `MCPMarketDataWriter`

**Same pattern**: 
- Extends `MCPBaseActor` 
- Implements `DSL.MarketDataWriter` only
- Calls MCP tools for write operations

### Design Benefits

1. **Clean separation**: MCP protocol hidden behind DSL interfaces
2. **No duplication**: Inherits context management from BaseActor
3. **Simple hierarchy**: BaseActor → MCPBaseActor → MCPMarketDataReader
4. **Pure interfaces**: Only DSL contracts exposed to users

### Key Design Principles

1. **MCP actors are clients** - not servers
2. **Hide MCP complexity** - expose only DSL interfaces  
3. **Inherit from BaseActor** - get context management for free
4. **Interface purity** - DSL.MarketDataReader, nothing more, nothing less
5. **Configuration driven** - user specifies which MCP server to connect to
