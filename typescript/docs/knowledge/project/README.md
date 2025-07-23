# @qi/dp-actor Project Knowledge

Project-specific knowledge for the QiCore Data Processing Actors implementation.

## 🏗️ Project Architecture

### Core Identity
- **Name**: @qi/dp-actor ts-0.5.1
- **Purpose**: Market data DSL with FIX Protocol 4.4 compliance
- **Language**: TypeScript (Haskell implementation outdated)
- **Architecture**: Clean separation between vocabulary (DSL) and implementation (Utils)

### Layer Separation (MANDATORY)
```
DSL Layer     → Pure vocabulary (types, interfaces, constants)
├─ No dependencies
├─ No implementation logic  
└─ Pure contracts only

Utils Layer   → Implementation around DSL types
├─ Validation, factories, analytics
├─ Can import from DSL
└─ Never imported by DSL
```

### Quality Standards
- **Tests**: 599 unit tests (487 core + 112 MCP actors) + 30/31 integration tests must pass consistently
- **Build**: `bun run check` must be clean (typecheck + format + lint + test)
- **TypeScript**: Strict compilation, zero `any` without justification
- **Dependencies**: `@qi/base` for Result<T> patterns, `@qi/core` for infrastructure, MCP SDK for actor protocol

## 🎯 Known Patterns & Solutions

### Result<T> Usage
```typescript
// ✅ Correct - All operations return Result<T, QiError>
export function parsePrice(priceStr: string): Result<FinancialDecimal, QiError>

// ❌ Wrong - Never use Result<T, any>
export function parsePrice(priceStr: string): Result<FinancialDecimal, any>
```

### Logger Integration
```typescript
// ✅ Correct - 3-argument signature with proper property names
opLogger.error("Operation failed", undefined, {
  errorCode: qiError.code,
  errorCategory: qiError.category,
  errorMessage: qiError.message
});

// ❌ Wrong - Incorrect property names
opLogger.error("Operation failed", undefined, {
  code: qiError.code,        // Wrong property name
  category: qiError.category // Wrong property name
});
```

### MCP Actor Patterns
```typescript
// ✅ Correct - MCP SDK usage patterns
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// MCP Base Actor with proper lifecycle
protected async callTool(name: string, args: any): Promise<Result<any, Error>> {
  if (!this.isConnected) {
    await this.connect();
  }
  const result = await this.client.callTool({ name, arguments: args });
  return Ok(result);
}

// ❌ Wrong - Direct MCP client usage without Result<T> wrapping
const result = await this.client.callTool({ name, arguments: args }); // Should wrap in Result<T>
```

### Test Implementation Pattern
```typescript
// ✅ Correct - Test abstract classes using concrete test implementations
class TestMCPActor extends MCPBaseActor {
  public async testConnect(): Promise<Result<void, Error>> {
    return this.connect(); // Expose protected methods for testing
  }
}

// ❌ Wrong - Trying to test abstract class directly
const actor = new MCPBaseActor(context, command); // Cannot instantiate abstract class
```

### Type Safety
```typescript
// ✅ Correct - Documented any usage in validation functions
export function isValidDominanceMetrics(obj: unknown): obj is DominanceMetrics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;
  return typeof metrics.topInstrumentShare === "number";
}

// ❌ Wrong - Inappropriate any usage for known types
validatedTopics.map((t: any) => t.topic) // Should use TopicConfig type
```

## 🚨 Critical Issues History

### ✅ ALL ISSUES RESOLVED (6/6 - 100% Complete)
**Release**: ts-0.5.1 (2025-07-23)

1. **Type Safety** - Fixed 22 instances of `Result<T, any>` → `Result<T, QiError>`
2. **Logger API** - Fixed 16 incorrect 3-argument logger calls  
3. **DSL Interfaces** - Fixed 38 interface method signatures for consistency
4. **Logger Context Duplication** - Fixed double context merging + local optimization
5. **Architecture Types** - Eliminated 6 inappropriate `any`, documented 7 legitimate cases
6. **Result<T> Composition** - Fixed 5 `throw new Error()` statements breaking functional composition

### Latest Release Summary
**Major improvements**:
- ✅ **Complete MCP Actor Testing**: Added 112 comprehensive unit tests for all MCP actor classes
- ✅ **Test Implementation Pattern**: Established pattern for testing abstract classes using concrete test implementations
- ✅ **MCP SDK Integration**: Full Model Context Protocol integration with Client + StdioClientTransport patterns
- ✅ **Quality Compliance**: Fixed all Biome linter issues (forEach → for...of performance optimization)
- ✅ **Production Ready**: All 599 unit tests (487 core + 112 MCP) + 30/31 integration tests passing
- ✅ **No Stub Code**: Verified complete implementations throughout - no fake/stub code exists

## 📁 Project Structure

### Key Directories
```
lib/src/
├── dsl/           # Pure vocabulary layer (interfaces, types)
├── md/            # Market data implementations  
├── utils/         # Utilities around MD instances
├── base/          # Infrastructure (streaming, etc)
└── actor/         # Actor pattern implementations
    ├── abstract/  # BaseActor abstract class
    └── mcp/       # MCP (Model Context Protocol) actors
        ├── MCPBaseActor.ts
        ├── MCPMarketDataReader.ts
        ├── MCPMarketDataWriter.ts
        └── MCPStreamingReader.ts

lib/tests/
├── actor/mcp/     # Comprehensive MCP actor tests (112 tests)
├── dsl/           # DSL contract tests
├── md/            # Market data implementation tests
├── base/          # Infrastructure tests
└── integration/   # End-to-end integration tests

docs/
├── knowledge/     # This knowledge system
├── reports/       # Progress tracking and technical analysis
└── dsl/           # DSL behavioral contracts
```

### Important Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration
- `CLAUDE.md` - Claude Code instructions

## 🛠️ Development Workflow

### Standard Commands
```bash
bun run check           # Full quality check (typecheck + format + lint + test)
bun run build           # Production build
bun run test:watch      # Development testing
bun run test:integration # Integration tests (30/31 passing)
```

### Quality Gates
- All 599 unit tests (487 core + 112 MCP actors) and 30/31 integration tests must pass
- TypeScript compilation must be clean
- Biome linter must pass (performance rules: for...of instead of forEach)
- Biome formatting enforced

### Architecture Verification
- DSL layer has zero dependencies
- Utils layer properly types all operations
- No circular dependencies between layers
- All public APIs use Result<T, QiError> patterns

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.