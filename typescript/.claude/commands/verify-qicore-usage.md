# Verify QiCore Usage Command

Verify proper usage of @qi/base and @qi/core patterns throughout the implementation.

## Usage

- `/verify-qicore-usage` - Verify entire lib/src implementation
- `/verify-qicore-usage dsl` - Verify lib/src/dsl directory only
- `/verify-qicore-usage examples` - Verify lib/src/examples directory only
- `/verify-qicore-usage market` - Verify lib/src/market directory only
- `/verify-qicore-usage --tutorial` - Include tutorial pattern references in analysis

## Instructions

You are tasked with verifying proper usage of @qi/base and @qi/core patterns based on the official qi-v2-qicore tutorials. Use systematic analysis to ensure implementation follows best practices.

### Step 1: Use Sequential Thinking for Systematic Analysis

Use the `mcp__sequential-thinking__sequentialthinking` tool to break down the verification:

1. **Identify target directories**: Determine which directories to analyze (all or specific from user input)
2. **Scan TypeScript files**: Find all .ts files in target directories
3. **Analyze @qi/base usage patterns**: Check Result<T>, functional composition, error handling
4. **Analyze @qi/core usage patterns**: Check logger integration, configuration management
5. **Generate verification report**: Provide detailed findings with recommendations

### Step 2: @qi/base Pattern Analysis

For each TypeScript file, verify the following patterns based on qi-v2-qicore tutorials and `docs/impl/qi-base-usage.md`:

#### Result<T> Usage Verification
- **Functions return Result<T>**: All operations that can fail should return Result<T>
- **No exceptions thrown**: Functions should use failure() instead of throw
- **Proper constructors**: Uses success() and failure() from @qi/base
- **Type annotations**: Result<T> types properly declared in function signatures

#### Functional Composition Verification (Critical Pattern)
- **Primary pattern: match()**: Uses match() for result handling instead of raw discriminated union checking
  ```typescript
  // ✅ Correct pattern
  match(
    value => processSuccess(value),
    error => handleError(error),
    result
  )
  
  // ❌ Anti-pattern
  if (result.tag === 'success') { ... }
  ```
- **Transformation: map()**: Uses map() for transforming success values
- **Chaining: flatMap()**: Uses flatMap() for operations that might fail
- **Function-first parameter order**: map(fn, result) not result.map(fn)

#### Error Creation Verification (DSL-Specific)
- **Custom codes**: Uses create() function for domain-specific error codes like 'INVALID_PRICE', 'SPREAD_TOO_WIDE'
  ```typescript
  // ✅ DSL uses custom codes
  create('INVALID_PRICE', 'Price must be positive', 'VALIDATION', { symbol, price })
  
  // ❌ Generic codes when custom needed
  validationError('Price must be positive')
  ```
- **Standard codes**: Uses convenience functions (validationError, networkError) only for generic scenarios
- **Error categories**: VALIDATION (never retry), NETWORK (retry with backoff), BUSINESS (never retry), SYSTEM (limited retry)
- **Rich context**: Includes market data context (symbol, exchange, price, operation) for debugging

#### Import Pattern Verification
- **Complete imports**: Imports include match, map, flatMap, success, failure, create, validationError
- **No unused imports**: All imported functions are actually used
- **Type vs value imports**: Proper separation with type imports for Result<T>, QiError

### Step 3: @qi/core Pattern Analysis

Verify @qi/core integration patterns based on tutorials and `docs/impl/qi-core-usage.md`:

#### Configuration Management Verification (Foundation Tool)
- **Multi-source loading**: Uses ConfigBuilder with clear precedence (base → environment → validation)
  ```typescript
  // ✅ Proper configuration loading
  ConfigBuilder
    .fromYamlFile('./config.yaml')
    .merge(ConfigBuilder.fromEnv('DSL_'))
    .validateWith(dslSchema)
    .build()
  ```
- **Schema validation**: Uses Zod schemas for type safety and validation
- **Environment nesting**: Proper env var mapping (DSL_LOGGING_LEVEL → logging.level)
- **Result<T> usage**: Config creation returns Result<Config, ConfigError>

#### Logger Integration Verification (Structured Observability)
- **No console.log**: All logging should use @qi/core logger with structured data
- **Logger creation**: Proper use of createLogger() returning Result<Logger, LoggerError>
- **Context accumulation**: Uses withContext() and child() for operation tracking
  ```typescript
  // ✅ Proper context management
  const operationLogger = logger.child({
    operation: 'fetchPrice',
    exchange: 'binance',
    symbol: 'BTC/USD'
  });
  ```
- **Result<T> integration**: Uses match() with logger for consistent success/error logging
- **Market data context**: Includes exchange, symbol, operation in log context

#### Cache Integration Verification (Performance Tool)
- **Cache creation**: Proper use of createCache() returning Result<ICache, CacheError>
- **Cache-aside pattern**: Implements try cache → load source → cache result pattern
- **Batch operations**: Uses mset/mget for efficiency with multiple keys
- **Performance monitoring**: Uses getStats() for cache hit rate tracking
- **TTL management**: Appropriate cache expiration for different data types

#### Tool Composition Verification
- **Initialization order**: Config → Logger → Cache with proper error handling
- **Error propagation**: Uses flatMap() for tool composition chains
- **Graceful fallback**: Cache failures don't break application (e.g., Redis → memory fallback)

### Step 4: Code Quality Analysis

#### Architectural Patterns
- **Separation of concerns**: Proper module organization
- **Functional composition**: Preferred over imperative patterns
- **Error propagation**: Errors properly bubbled through Result<T> chains
- **Type safety**: Strong typing throughout, minimal any usage

#### Integration Patterns
- **Library integration**: External libraries (like decimal.js) properly wrapped with Result<T>
- **Domain modeling**: Business logic properly modeled with types and validation
- **Workflow composition**: Complex operations properly composed using functional patterns

### Step 5: Generate Verification Report

Create a comprehensive report:

#### QiCore Usage Verification Report (`docs/reports/qicore-usage-verification.md`)

```markdown
# QiCore Usage Verification Report

Generated: [timestamp]

## Executive Summary
- **@qi/base Compliance**: X/Y patterns correct (Z%)
- **@qi/core Integration**: X/Y patterns correct (Z%)
- **Code Quality**: X/Y checks passed (Z%)
- **Overall Score**: X/Y (Z%) - [EXCELLENT|GOOD|NEEDS_IMPROVEMENT|POOR]

## File Analysis Summary

| File | @qi/base Score | @qi/core Score | Issues | Status |
|------|---------------|---------------|---------|---------|
| lib/src/dsl/precision.ts | 95% | N/A | 1 minor | ✅ |
| lib/src/examples/qicore-usage.ts | 85% | 60% | API mismatches | ⚠️ |

## @qi/base Pattern Analysis

### ✅ Excellent Patterns Found
- **Functional Composition**: Uses proper flatMap chains for error propagation
- **Match Usage**: Consistently uses match() instead of discriminated union checking
- **Custom Error Codes**: Proper use of create() for DSL-specific codes like 'INVALID_PRICE'
- **Structured Logging**: Rich context with exchange, symbol, operation data
- **Configuration Schema**: Comprehensive Zod validation with environment mapping
- **Cache Strategy**: Proper cache-aside pattern with performance monitoring

### ⚠️ Issues Found
- **Anti-patterns**: Uses result.tag === checking instead of match() (should reference qi-base-usage.md)
- **Missing Result<T>**: Functions throw exceptions instead of returning Result<T>
- **Console.log usage**: Uses console.log instead of structured logging
- **Generic error codes**: Uses convenience functions when custom codes needed
- **Missing context**: Logger calls missing market data context (exchange, symbol)
- **No tool composition**: Tools initialized separately instead of composed with flatMap

### ❌ Critical Problems
- **Exception throwing**: Functions throw exceptions breaking Result<T> pattern
- **Missing @qi/core tools**: No logger, config, or cache integration
- **API misuse**: Wrong function signatures or parameter order
- **No error propagation**: Errors not properly propagated through Result chains

## @qi/core Pattern Analysis

### ✅ Good Integration
- **Logger usage**: Proper structured logging in file X
- **Configuration**: Safe config access patterns in file Y

### ⚠️ Warnings
- **Console.log usage**: Found 3 instances of console.log (files: A:line B, C:line D)
- **Missing context**: Logger missing context in file E

### ❌ Missing Integration
- **No logger**: File X should use @qi/core logger for validation failures
- **No config**: File Y should use @qi/core config for validation thresholds

## Specific Recommendations

### High Priority Fixes
1. **Replace console.log with structured logging**: Implement createLogger() with market data context
2. **Fix @qi/base anti-patterns**: Replace result.tag === checking with match() (reference qi-base-usage.md)
3. **Add Result<T> error handling**: Convert exception-throwing functions to return Result<T>
4. **Use custom error codes**: Replace generic validationError() with create() for DSL-specific codes

### Medium Priority Improvements
1. **Add @qi/core tool integration**: Implement ConfigBuilder with schema validation
2. **Implement cache strategy**: Add cache-aside pattern for market data performance
3. **Add tool composition**: Use flatMap() for Config → Logger → Cache initialization
4. **Enhance error context**: Include exchange, symbol, operation in all error contexts

### Low Priority Enhancements
1. **Add performance monitoring**: Implement cache hit rate and logger performance tracking
2. **Environment configuration**: Add development/production config with proper precedence
3. **Batch operations**: Use mset/mget for efficient multi-symbol caching
4. **Add comprehensive examples**: Reference qi-core-usage.md patterns in implementation

## Tutorial Compliance

Based on qi-v2-qicore tutorials and DSL usage guides:
- **qi-base.md patterns**: Check against `docs/impl/qi-base-usage.md` for DSL-specific implementations
- **qi-core-logger.md patterns**: Check against `docs/impl/qi-core-usage.md` structured logging section
- **qi-core-config.md patterns**: Check against `docs/impl/qi-core-usage.md` configuration management section
- **qi-core-cache.md patterns**: Check against `docs/impl/qi-core-usage.md` cache integration section

### Critical Compliance Areas
1. **match() over discriminated union**: Primary @qi/base pattern (qi-base-usage.md)
2. **create() for custom codes**: DSL needs domain-specific error codes, not generic ones
3. **Tool composition with flatMap**: Config → Logger → Cache initialization pattern
4. **Context accumulation**: Market data context (exchange, symbol, operation) in all logs
5. **Cache-aside pattern**: For market data performance optimization
6. **Environment-based config**: Development/production configuration strategies

## Files by Compliance Score

### Excellent (90-100%)
- lib/src/dsl/precision.ts: 95% - Minor anti-pattern in utility functions
- lib/src/dsl/errors.ts: 100% - Perfect @qi/base usage

### Good (75-89%)
- lib/src/examples/simple-usage.ts: 85% - Good patterns, needs logger

### Needs Improvement (50-74%)
- lib/src/examples/qicore-usage.ts: 60% - API mismatches, needs fixing

### Poor (<50%)
- [None found]

## Action Items

### Immediate (Critical)
- [ ] Fix API mismatches in qicore-usage.ts
- [ ] Replace exception throwing with Result<T> patterns
- [ ] Remove console.log usage

### Short Term (High Priority)  
- [ ] Add @qi/core logger integration
- [ ] Fix anti-pattern usage of result.tag checking
- [ ] Add missing Result<T> return types

### Long Term (Enhancement)
- [ ] Add configuration management
- [ ] Enhance error context information
- [ ] Add comprehensive structured logging

## Verification Methodology

1. **Pattern Recognition**: Scanned for specific @qi patterns using regex and AST analysis
2. **Tutorial Alignment**: Compared patterns against official tutorial examples
3. **Best Practice Validation**: Checked architectural and functional patterns
4. **Integration Testing**: Verified @qi/base and @qi/core work together properly

## Overall Assessment

[Provide overall assessment based on scores and issues found]
```

### Step 6: Analysis Scope

#### Full Implementation Analysis (default)
- Scan all .ts files in lib/src/
- Analyze all patterns comprehensively
- Generate complete compliance report

#### Directory-Specific Analysis
- **DSL Analysis**: Focus on lib/src/dsl/ - verify DSL patterns and data types
- **Examples Analysis**: Focus on lib/src/examples/ - verify tutorial compliance
- **Market Analysis**: Focus on lib/src/market/ - verify actor implementations

#### Tutorial Reference Mode (--tutorial flag)
- Include specific tutorial pattern references
- Add links to relevant tutorial sections
- Provide tutorial-based recommendations

### Step 7: Error Handling

If files are missing or inaccessible:
- Note missing files in report
- Continue analysis with available files
- Provide recommendations for missing components
- Mark incomplete analysis areas clearly

### Step 8: Success Criteria

The verification should identify:
- **Pattern Compliance**: How well code follows @qi patterns
- **Tutorial Alignment**: Consistency with official tutorial examples
- **Integration Quality**: How well @qi/base and @qi/core work together
- **Architectural Soundness**: Overall code quality and organization

## Expected Outcomes

1. **Compliance Score**: Overall percentage of pattern compliance
2. **Issue Classification**: Critical, high, medium, low priority issues
3. **Actionable Recommendations**: Specific steps to improve compliance
4. **Best Practice Examples**: Highlight excellent pattern usage
5. **Tutorial Alignment**: How well implementation matches tutorials

Remember to use sequential thinking for systematic analysis and provide specific, actionable recommendations based on the official qi-v2-qicore tutorial patterns.