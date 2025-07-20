# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory-First Protocol

**MANDATORY**: Always search memory first using `mcp__memory__read_graph` before responding to any question. Reference memory entities and follow established protocols.

**Context Continuation**: Follow `docs/impl/context-continuation-protocol.md` workflow: memory check → docs review → task status.

## Architecture Overview

**Project**: QiCore Data Processing Actors TypeScript project (@qi/dp-actor v0.1.0) implementing market data DSL with FIX Protocol 4.4 compliance. Uses lib/src/ structure, depends on @qi workspace from qi-v2-qicore, has comprehensive usage guides in docs/impl/, and context-continuation-protocol.md active.

### Project Structure

```
typescript/
├── lib/src/           # Source code
│   └── dsl/           # DSL implementation
├── lib/tests/         # Test suite
│   └── dsl/           # DSL tests
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── vitest.config.ts   # Test configuration
```

### Core DSL Components

1. **Foundation** (`lib/src/dsl/foundation.ts`): QiCore integration and error handling
2. **Types** (`lib/src/dsl/types.ts`): Core data types and support interfaces
3. **Market Data** (`lib/src/dsl/market-data.ts`): FIX Protocol compliant market data types
4. **Operations** (`lib/src/dsl/operations.ts`): Reader/Writer interface definitions
5. **Validation** (`lib/src/dsl/validation.ts`): Runtime type guards and validation
6. **Index** (`lib/src/dsl/index.ts`): Main export module

## Development Commands

### Essential Commands
```bash
# Install dependencies
bun install

# Build
bun run build

# Type checking
bun run typecheck

# Format and lint (uses Biome)
bun run format
bun run format:check
bun run lint

# Run all quality checks
bun run check

# Testing
bun run test               # Run all tests
bun run test:watch         # Watch mode
bun run test:coverage      # With coverage

# Run single test file
vitest run lib/tests/dsl/types.test.ts
```

### Key Dependencies

- **@qi**: Workspace dependency to `../../qi-v2-qicore/typescript` (ts-1.0.0) for Result<T> and error handling
- **Vitest**: Test runner with TypeScript support  
- **Biome**: Fast linting and formatting (replaces ESLint + Prettier)
- **Bun**: Package manager and runtime
- **tsup**: Build tool for library compilation

### Implementation Guides

- **@qi/base patterns**: `docs/impl/qi-base-usage.md` - Comprehensive @qi/base usage patterns
- **@qi/core patterns**: `docs/impl/qi-core-usage.md` - @qi/core integration patterns

## Architecture Patterns

### Result Type Error Handling

All operations use `Result<T>` from `@qi/base` for functional error handling:

```typescript
// Result is a discriminated union: { tag: 'success', value: T } | { tag: 'failure', error: E }
type Result<T> = Success<T> | Failure<QiError>

// Usage patterns
const result = success(42);
if (result.tag === 'success') {
  console.log(result.value); // TypeScript knows this is T
}
```

### Pure Data Types

The DSL uses **pure data types and interfaces** - no classes or factories:

```typescript
// Market data wrapper
interface MarketData<T extends CoreMarketData> {
  context: DataContext;  // WHO/WHERE/WHAT identification
  coreData: T;          // PURE FIX Protocol data
}

// Type guards for runtime validation
const isValidPrice = (obj: unknown): obj is Price => { /* validation logic */ }
```

### FIX Protocol Compliance

All market data types follow FIX Protocol 4.4 specifications:

- `Price`: MDEntryType=2 (Trade) with Tags 273, 270, 271
- `Level1`: MDEntryType=0/1 (Bid/Offer) with spread validation
- `OHLCV`: Trade aggregations with OHLC constraints
- `MarketDepth`: Multi-level order book with proper ordering

## Critical Technical Details

### @qi Dependency Resolution

The `@qi` workspace dependency must be built first:
```bash
# Build qi-v2-qicore dependency (run from qi-v2-qicore/typescript)
cd ../../qi-v2-qicore/typescript && bun run build
```

The vitest.config.ts includes explicit path aliases for @qi modules to resolve imports during testing.

### Test Configuration

- Tests are in `lib/tests/` directory
- Vitest is configured to look in `lib/tests/**/*.{test,spec}.ts`
- Coverage includes `lib/src/**/*.ts`
- Uses Node environment with globals enabled

### Result API Usage

**CRITICAL**: Use `match()` for primary result handling, never `result.tag === 'success'`:

```typescript
// Correct pattern - use match()
import { match, success, failure, create } from '@qi/base';

match(
  value => console.log(value),
  error => console.log(error),
  result
);

// For custom DSL error codes, use create()
const error = create('INVALID_PRICE', 'Price must be positive', 'VALIDATION', { symbol });
```

### Error Categories

DSL uses specific QiCore error categories:
- `VALIDATION`: Data validation errors
- `NETWORK`: Network and API errors  
- `SYSTEM`: System and internal errors
- `TIMEOUT`: Operation timeout errors

## DSL Contract Requirements

### Two-Part Structure (Mandatory)
```typescript
MarketData = DataContext + CoreMarketData
```

### Universal Laws (Mandatory)
- All operations return `Result<T>` for error handling
- All numeric fields must be finite (no NaN/Infinity)
- All timestamps must be valid Date objects
- Type guards provide runtime validation

### Validation Patterns
```typescript
// Type guard pattern
export const isValidPrice = (obj: unknown): obj is Price => {
  return obj != null &&
    typeof obj === 'object' &&
    'timestamp' in obj &&
    'price' in obj &&
    'size' in obj &&
    obj.timestamp instanceof Date &&
    typeof obj.price === 'number' &&
    obj.price > 0 &&
    Number.isFinite(obj.price) &&
    typeof obj.size === 'number' &&
    obj.size > 0 &&
    Number.isFinite(obj.size);
};
```