# Verify DSL Implementation

Verify that the TypeScript DSL implementation in `lib/src/dsl/` matches the specification in `docs/dsl/qi.dp.dsl.md`.

## Usage

  - `/verify-dsl-impl` - Verify all DSL components
  - `/verify-dsl-impl types` - Verify types only
  - `/verify-dsl-impl interfaces` - Verify interfaces only

## Instructions

  1. Read the TypeScript DSL specification from `docs/dsl/qi.dp.dsl.md`
  2. Read the actual implementation from `lib/src/dsl/` directory
  3. Compare specification vs implementation for:
     - Data types and interfaces
     - Function signatures
     - @qi/base and @qi/core usage
     - Export structure
  4. Generate compliance report at `docs/reports/dsl/implementation.md`

## Report Format

```markdown
# DSL Implementation Compliance Report

## Summary
  - **Overall Compliance**: X/Y requirements (Z%)
  - **Missing**: List critical gaps
  - **Implemented**: List what matches spec

## Type Compliance
  | Specified Type | Implementation Status | File | Notes |
  |----------------|---------------------|------|-------|
  | DataContext | ✅ Implemented | types.ts | Matches spec |

  ## Interface Compliance
  | Specified Interface | Implementation Status | File | Notes |
  |-------------------|---------------------|------|-------|
  | MarketDataReader | ⚠️ Partial | operations.ts | Missing 2 methods |

## Recommendations
  1. Implement missing types: ...
  2. Complete partial interfaces: ...
```

Keep the report focused and actionable.


Remember to use sequential thinking for complex analysis and provide detailed, actionable recommendations for achieving full DSL contract compliance.