## CRITICAL UPDATE: QiCore's New Export Mechanism

### Current Issue:

The project is using the old import pattern directly from @qi/base, but QiCore now provides a new, cleaner export mechanism through @qi/core that combines both base and core functionality.

### Proposed Changes:

1. Update Package Dependencies
    ```json
    // CURRENT (old pattern)
    "dependencies": {
        "@qi/base": "workspace:../../qi-v2-qicore/typescript/lib/base"
    }

    // PROPOSED (new pattern - using workspace references)
    "dependencies": {
        "@qi/base": "workspace:*",
        "@qi/core": "workspace:*"
    }
    ```

2. Update All Import Statements

   According to the QiCore setup tutorial, the new pattern is:
    ```typescript
    // OLD PATTERN (current in qi-v2-dp-actor)
    import { Err, Ok, type Result } from "@qi/base";

    // NEW PATTERN (from QiCore tutorial)
    // Import from @qi/base for Result<T> and error handling
    import { success, failure, Result, QiError } from '@qi/base'
    import { map, flatMap, match } from '@qi/base'

    // Import from @qi/core for infrastructure services
    import { ConfigBuilder, fromEnv } from '@qi/core'
    import { createLogger } from '@qi/core'
    import { createCache } from '@qi/core'
    ```

3. Leverage QiCore's Infrastructure Services

   The project should also use QiCore's built-in services:
    ```typescript
    // Add configuration management
    import { ConfigBuilder } from '@qi/core'

    // In MCPBaseActor.ts
    export class MCPBaseActor {
        private config: Config;
        private logger: Logger;

        async initialize(): Promise<Result<void, QiError>> {
        // Use QiCore's ConfigBuilder
        const configResult = await ConfigBuilder
            .fromYamlFile('./config/mcp.yaml')
            .merge(ConfigBuilder.fromEnv('MCP_'))
            .build();

        // Use QiCore's Logger
        const loggerResult = createLogger({
            level: 'info',
            context: { component: 'MCP' }
        });

        return match(
            (config) => {
            this.config = config;
            return match(
                (logger) => {
                this.logger = logger;
                return success(undefined);
                },
                (error) => failure(error),
                loggerResult
            );
            },
            (error) => failure(error),
            configResult
        );
        }
    }
    ```

4. File-by-File Import Updates

   All files need to be updated to use the new pattern:
```typescript
  // lib/src/actor/mcp/MCPBaseActor.ts
  // OLD
  import { Err, Ok } from "@qi/base";

  // NEW
  import { success, failure, match } from '@qi/base'
  import { createLogger } from '@qi/core'

  // lib/src/actor/redpanda/RepandaWriter.ts
  // OLD
  import { Err, Ok, type Result, create, flatMap } from "@qi/base";

  // NEW
  import { success, failure, flatMap, type Result } from '@qi/base'
  import { networkError, systemError } from '@qi/base'
```

5. Add QiCore's Config Files

   Create configuration files that work with QiCore's ConfigBuilder:

   `config/default.yaml`:
```yaml
  mcp:
    transport: stdio
    timeout: 30000
    retries: 3

  logging:
    level: info
    pretty: true

  cache:
    ttl: 60000
    max: 1000
```
  
6. Update Testing to Use QiCore Patterns
```typescript
  // Tests should also use the new patterns
  import { success, failure, match, isSuccess } from '@qi/base'
  import { createLogger } from '@qi/core'

  describe('MCPMarketDataReader', () => {
    const logger = createLogger({ level: 'debug' });

    it('should return Result<T> using new pattern', async () => {
      const result = await reader.getData();

      match(
        (data) => expect(data).toBeDefined(),
        (error) => fail(`Unexpected error: ${error.message}`),
        result
      );
    });
  });
```

### Summary of QiCore Export Mechanism Updates:

1. Two-package system: @qi/base for Result patterns, @qi/core for infrastructure
2. Standardized imports: Use success/failure not Ok/Err
3. Infrastructure services: Leverage ConfigBuilder, Logger, and Cache from @qi/core
4. Configuration management: Use QiCore's config system instead of custom solutions
5. Consistent patterns: Apply QiCore patterns throughout the codebase

This is a fundamental change that should be the first priority in the refactoring, as it affects every file in the project and establishes the foundation for all other improvements.

---

## Comprehensive Refactoring Proposal for qi-v2-dp-actor/typescript

Based on my analysis of QiCore's new patterns, the services project, and current implementation issues, here's the complete refactoring proposal:

### 1. QiCore Import Pattern Updates

Current Issues:

- Using Ok/Err aliases instead of recommended success/failure
- Inconsistent import patterns across files
- Not following QiCore's new workspace package structure

Proposed Changes:
A. Update all imports to follow QiCore's recommended patterns:    
```typescript
        // CURRENT (incorrect pattern)
        import { Err, Ok, type Result, create, flatMap } from "@qi/base";
        import type { QiError } from "@qi/base";

        // PROPOSED (following QiCore tutorial)
        import {
            success, failure, match, map, flatMap,
            type Result, type QiError,
            networkError, validationError, systemError
        } from '@qi/base';
```
B. Update package.json dependencies:
```typescript
        // CURRENT
        "dependencies": {
            "@qi/base": "workspace:../../qi-v2-qicore/typescript/lib/base"
        }

        // PROPOSED (proper workspace reference)
        "dependencies": {
            "@qi/base": "workspace:*",
            "@qi/core": "workspace:*"
        }
```

### 2. Services Directory Integration

Current State:
- No services directory exists in qi-v2-dp-actor
- Services are in separate repository (qi-v2-services)

Proposed Changes:
A. Add reference to external services:
   Create `config/services.yaml`:

   ```yaml
        services:
            external:
            path: "../../../qi-v2-services"
            components:
                - redpanda
                - timescaledb
                - clickhouse
   ```

B. Update docker-compose integration:
  
   Create `docker/docker-compose.override.yml`:

   ```yaml
        version: '3.8'
        services:
            mcp-server:
            build: .
            environment:
                - REDPANDA_BROKERS=redpanda:9092
                - TIMESCALE_URL=postgres://user:pass@timescaledb:5432
            external_links:
                - qi-v2-services_redpanda_1:redpanda
                - qi-v2-services_timescaledb_1:timescaledb
   ```

### 3. MCP Implementation Refactoring

#### Major Problems:

1. Testing incompatibility: Using vi.mock with Bun
2. Poor abstraction: Complex inheritance without benefits
3. Inconsistent error handling: Mix of patterns
4. No MCP server: Only client implementation

#### Proposed Architecture:
```
  lib/src/actor/mcp/
  ├── core/
  │   ├── types.ts                 # Unified MCP types
  │   ├── errors.ts                # QiError factories for MCP
  │   └── protocols.ts             # MCP protocol definitions
  ├── transport/
  │   ├── Transport.interface.ts   # Base transport interface
  │   ├── StdioTransport.ts       # Process-based transport
  │   ├── WebSocketTransport.ts   # WebSocket transport
  │   └── SSETransport.ts         # Server-sent events
  ├── client/
  │   ├── MCPClient.ts            # Core client with Result<T>
  │   ├── MarketDataClient.ts     # Market data operations
  │   └── StreamingClient.ts      # Real-time streaming
  ├── server/
  │   ├── MCPServer.ts            # Base server implementation
  │   ├── MarketDataServer.ts     # Market data MCP server
  │   └── ToolRegistry.ts         # Tool registration system
  └── actors/
      ├── ReaderActor.ts          # Simplified reader
      └── WriterActor.ts          # Simplified writer
```

### 4. Specific Code Refactoring

A. Fix Result Usage Pattern:
```typescript
  // CURRENT (MCPBaseActor.ts)
  async connect(): Promise<Result<void, Error>> {
    try {
      await this.client.connect(this.transport);
      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  // PROPOSED
  async connect(): Promise<Result<void, QiError>> {
    try {
      await this.client.connect(this.transport);
      return success(undefined);
    } catch (error) {
      return failure(
        networkError(`MCP connection failed: ${error.message}`, {
          cause: error,
          context: { transport: this.config.type }
        })
      );
    }
  }
```

B. Implement Dependency Injection for Testing:
```typescript
  // PROPOSED: Testable architecture
  export interface MCPDependencies {
    transport: MCPTransport;
    logger?: Logger;
    config?: Config;
  }

  export class MCPMarketDataReader {
    constructor(
      private deps: MCPDependencies,
      private context: DataContext
    ) {}

    // Easy to test with mock dependencies
  }
```

C. Create MCP Server Implementation:
```typescript
  // NEW: MCP Server
  export class MarketDataMCPServer {
    private toolRegistry = new Map<string, MCPTool>();

    constructor(private config: ServerConfig) {
      this.registerTools();
    }

    private registerTools(): void {
      this.toolRegistry.set('get_price', {
        description: 'Get current market price',
        handler: this.handleGetPrice.bind(this)
      });
    }

    async handleToolCall(name: string, args: any): Promise<Result<any, QiError>> {
      const tool = this.toolRegistry.get(name);
      if (!tool) {
        return failure(validationError(`Unknown tool: ${name}`));
      }

      return tool.handler(args);
    }
  }
```

### 5. Testing Strategy Refactoring

Current Issue:
```typescript
  // DOESN'T WORK WITH BUN
  vi.mock("../../../src/actor/mcp/MCPBaseActor.js");
```
  
Proposed Solution:
```typescript
  // Use dependency injection
  describe('MCPMarketDataReader', () => {
    let mockTransport: MCPTransport;

    beforeEach(() => {
      mockTransport = {
        connect: () => success(undefined),
        send: (msg) => success(undefined),
        receive: () => success({ data: 'test' })
      };
    });

    it('should connect successfully', async () => {
      const reader = new MCPMarketDataReader({
        transport: mockTransport,
        context: testContext
      });

      const result = await reader.connect();
      expect(isSuccess(result)).toBe(true);
    });
  });
```

### 6. Migration Timeline

#### Phase 1: QiCore Pattern Updates (Week 1)

- Update all imports to use success/failure pattern
- Fix Result return types
- Add proper error categorization

#### Phase 2: Architecture Simplification (Week 2)

- Extract transport interfaces
- Reduce inheritance hierarchy
- Implement dependency injection

#### Phase 3: Testing Framework Fix (Week 3)

- Replace vi.mock with DI pattern
- Create mock implementations
- Fix all 24 failing tests

#### Phase 4: MCP Server Implementation (Week 4)

- Build base MCP server
- Implement tool registry
- Add WebSocket support

#### Phase 5: Services Integration (Week 5)

- Configure external services references
- Update Docker integration
- End-to-end testing

### 7. File-by-File Changes

#### Priority 1 Files (Must Update):

1. lib/src/actor/mcp/MCPBaseActor.ts - Fix Result patterns
2. lib/src/actor/mcp/MCPMarketDataReader.ts - Add DI
3. lib/src/actor/mcp/MCPMarketDataWriter.ts - Fix imports
4. package.json - Update dependencies

#### Priority 2 Files (Should Update):

1. lib/src/actor/redpanda/*.ts - Standardize imports
2. lib/tests/actor/mcp/*.test.ts - Fix testing

New Files to Create:

1. lib/src/actor/mcp/server/MCPServer.ts
2. lib/src/actor/mcp/transport/Transport.interface.ts
3. config/services.yaml
4. docker/docker-compose.override.yml

### 8. Expected Outcomes

- ✅ All tests passing (fix 24 failures)
- ✅ Consistent QiCore Result patterns
- ✅ Working MCP server implementation
- ✅ Clean dependency injection
- ✅ Integration with qi-v2-services
- ✅ Simplified, maintainable architecture

This refactoring will transform qi-v2-dp-actor into a clean, testable, and production-ready system that properly follows QiCore patterns and integrates seamlessly with the services infrastructure.
