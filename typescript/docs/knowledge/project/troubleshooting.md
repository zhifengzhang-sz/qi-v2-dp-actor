# @qi/dp-actor Troubleshooting Guide

Common issues and solutions based on real problems encountered during development.

## 🚨 Critical Issues Patterns

### Pattern: Type Safety Elimination
**Symptoms**: 
- `Result<T, any>` instead of `Result<T, QiError>`
- TypeScript not catching error type mismatches
- Runtime surprises with unexpected error shapes

**Detection**:
```bash
grep -r "Result<.*,.*any" lib/src/
```

**Solution**:
```typescript
// ❌ Before:
export function parsePrice(priceStr: string): Result<FinancialDecimal, any>

// ✅ After:  
import type { Result, QiError } from "@qi/base";
export function parsePrice(priceStr: string): Result<FinancialDecimal, QiError>
```

**Verification**: All Result<T> types should specify QiError as error type for composition.

---

### Pattern: Logger API Misuse
**Symptoms**:
- Logger context properties not appearing in logs
- Runtime logger errors or warnings
- Inconsistent log structure

**Detection**:
```bash
grep -r "opLogger.error" lib/src/ | grep -E "(code|category|error):"
```

**Solution**:
```typescript
// ❌ Before:
opLogger.error("Failed", undefined, {
  code: qiError.code,           // Wrong property
  category: qiError.category,   // Wrong property  
  error: qiError.message        // Wrong property
});

// ✅ After:
opLogger.error("Failed", undefined, {
  errorCode: qiError.code,      // Correct property
  errorCategory: qiError.category, // Correct property
  errorMessage: qiError.message    // Correct property
});
```

**Root Cause**: @qi/core Logger expects specific LoggerContext property names.

---

### Pattern: DSL Interface Inconsistency
**Symptoms**:
- Type errors when chaining operations
- Generic `Result<T>` in interface signatures
- Mismatch between interface and implementation

**Detection**:
```bash
grep -r "Result<.*>" lib/src/dsl/ | grep -v "QiError"
```

**Solution**:
```typescript
// ❌ Before:
getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;

// ✅ After:
import type { Result, QiError } from "@qi/base";
getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>, QiError>>;
```

**Principle**: All DSL interfaces must specify error types for proper composition.

---

### Pattern: Architecture Type Leakage
**Symptoms**:
- Generic `any` types without justification
- ESLint warnings about unsuppressed `any`
- Type safety violations in utils layer

**Detection**:
```bash
grep -rn "\\bany\\b" lib/src/ | grep -v "eslint-disable"
```

**Solution Categories**:

**1. Inappropriate `any` (Fix with proper types)**:
```typescript
// ❌ Before:
validatedTopics.map((t: any) => t.topic)

// ✅ After:
validatedTopics.map((t: TopicConfig) => t.topic)
```

**2. Legitimate `any` (Document with ESLint suppression)**:
```typescript
// ✅ Correct for type guards:
export function isValidDominanceMetrics(obj: unknown): obj is DominanceMetrics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;
  return typeof metrics.topInstrumentShare === "number";
}
```

---

### Pattern: Logger Context Duplication  
**Symptoms**:
- Duplicate fields in log output: `"operation":"connect","operation":"connect"`
- Log pollution making debugging harder

**Root Cause**: Double context merging in @qi/core Logger.log() method:
1. `pino.child(context)` merges at pino level
2. `Logger.log()` merges again before calling pino

**Current Status**: External dependency issue - requires fix in @qi/core project.
**Documentation**: Complete fix provided in `docs/reports/fix-logger-context-duplication-2025-07-22.md`

**Workaround**: None needed - doesn't affect functionality, only log readability.

## 🔧 General Debugging Process

### 1. Quality Check First
```bash
bun run check
```
Always start here. This runs typecheck + format + lint + test (135 tests).

### 2. Systematic Issue Discovery
```bash
# Find Result<T, any> patterns
grep -r "Result<.*,.*any" lib/src/

# Find Logger API issues  
grep -r "opLogger\.error" lib/src/ | grep -E "(code|category|error):"

# Find DSL interface inconsistencies
grep -r "Result<.*>" lib/src/dsl/ | grep -v "QiError"

# Find inappropriate any usage
grep -rn "\\bany\\b" lib/src/ | grep -v "eslint-disable"
```

### 3. Architecture Verification
- **DSL layer**: Zero dependencies, pure vocabulary only
- **Utils layer**: Can import DSL, proper Result<T, QiError> everywhere  
- **No circular dependencies**: utils → dsl (never dsl → utils)
- **Test coverage**: All 135 tests pass

### 4. Fix Application Pattern
1. **Identify all instances** (use grep patterns above)
2. **Fix systematically** (all at once, don't leave partial fixes)
3. **Verify continuously** (`bun run check` after each fix)
4. **Document decisions** (especially for legitimate `any` usage)

## 🎯 Success Metrics

### Code Quality
- ✅ 135/135 tests passing consistently
- ✅ Clean TypeScript compilation (0 errors)
- ✅ ESLint clean with justified suppressions only
- ✅ All public APIs use Result<T, QiError> patterns

### Architecture Compliance
- ✅ DSL layer has zero dependencies
- ✅ Utils layer properly separates concerns
- ✅ No inappropriate `any` usage
- ✅ Consistent error handling patterns

### Knowledge Transfer
- ✅ All decisions documented with reasoning
- ✅ Problem-solving methodology captured
- ✅ Future maintainers have complete context

## 📚 References

- **Progress Tracking**: `docs/reports/critical-issues-fix-progress-2025-07-22.md`
- **Detailed Fixes**: Individual fix documents in `docs/reports/`
- **@qi Learning**: `docs/knowledge/qi-stack/tutorial/`
- **Implementation Patterns**: `docs/knowledge/qi-stack/usage/`
- **Problem Solving**: `docs/knowledge/qi-stack/tutorial/REAL-WORLD-PROBLEM-SOLVING.md`

Remember: When in doubt, follow the principle of **systematic analysis** → **complete fixes** → **thorough verification** → **comprehensive documentation**.