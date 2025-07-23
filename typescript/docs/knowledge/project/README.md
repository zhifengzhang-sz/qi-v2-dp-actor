# @qi/dp-actor Project Knowledge

Project-specific knowledge for the QiCore Data Processing Actors implementation.

## 🏗️ Project Architecture

### Core Identity
- **Name**: @qi/dp-actor v0.1.0
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
- **Tests**: 135/135 must pass consistently
- **Build**: `bun run check` must be clean (typecheck + format + lint + test)
- **TypeScript**: Strict compilation, zero `any` without justification
- **Dependencies**: `@qi/base` for Result<T> patterns, `@qi/core` for infrastructure

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

### Resolved Issues (4/5 - 80% Complete)
1. **Type Safety** - Fixed 22 instances of `Result<T, any>` → `Result<T, QiError>`
2. **Logger API** - Fixed 16 incorrect 3-argument logger calls  
3. **DSL Interfaces** - Fixed 38 interface method signatures for consistency
4. **Architecture Types** - Eliminated 6 inappropriate `any`, documented 7 legitimate cases

### External Dependency Issue (1/5)
5. **Logger Context Duplication** - Root cause in @qi/core Logger.log() double merging
   - **Status**: Complete fix documentation provided for @qi/core project
   - **Impact**: Duplicate fields in log output (`"operation":"connect","operation":"connect"`)
   - **Workaround**: Not needed - issue doesn't affect functionality

## 📁 Project Structure

### Key Directories
```
lib/src/
├── dsl/           # Pure vocabulary layer
├── md/            # Market data implementations  
├── utils/         # Utilities around MD instances
├── base/          # Infrastructure (streaming, etc)
└── actor/         # Actor pattern implementations

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
bun run check      # Full quality check (typecheck + format + lint + test)
bun run build      # Production build
bun run test:watch # Development testing
```

### Quality Gates
- All 135 tests must pass
- TypeScript compilation must be clean
- ESLint must pass with minimal suppressions
- Prettier formatting enforced

### Architecture Verification
- DSL layer has zero dependencies
- Utils layer properly types all operations
- No circular dependencies between layers
- All public APIs use Result<T, QiError> patterns

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.