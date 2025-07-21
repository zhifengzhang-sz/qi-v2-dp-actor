# Verify Utils Business Logic Implementation

Verify that the TypeScript utils business logic implementation in `lib/src/utils/` matches the updated specifications for the new architecture with analytics and precision modules.

## Usage

  - `/verify-utils-md` - Verify all utils business logic components
  - `/verify-utils-md analytics` - Verify analytics module only
  - `/verify-utils-md precision` - Verify precision module only

## Instructions

  1. **Read Specifications**: Extract all specified functions/interfaces from updated docs:
     - `docs/utils/md/analytics.md` (analytics business logic)
     - `docs/utils/md/precision.md` (precision utilities)
     - Architecture doc: `docs/architecture/modules.md`
  2. **Read Implementation**: Extract all exported functions/interfaces from new structure:
     - `lib/src/utils/analytics/` using `grep "^export"`
     - `lib/src/utils/precision/` using `grep "^export"`
  3. **Systematic Comparison** for each module:
     - Create comprehensive list of ALL specified items
     - Create comprehensive list of ALL implemented items  
     - Identify **Missing**: specified but not implemented (❌ Missing)
     - Identify **Extra**: implemented but not specified (➕ Extra) 
     - Identify **Matching**: both specified and implemented (✅ Implemented)
     - Check architectural compliance: utils depends on MD layer
     - Check Result<T> usage, error handling patterns
  4. **Table Structure**: Include ALL functions/interfaces in tables:
     - Missing functions with ❌ Missing status
     - Extra functions with ➕ Extra status  
     - Implemented functions with ✅ status
  5. Generate compliance report at `docs/reports/utils/md/implementation.md`

## Report Format

```markdown
# Utils Business Logic Implementation Compliance Report

## Summary
  - **Overall Compliance**: X/Y requirements (Z%)
  - **Missing**: List critical gaps
  - **Implemented**: List what matches specification
  - **Architecture**: Compliance with new namespace structure

## Module Compliance

### Analytics Module (`lib/src/utils/analytics/` vs `docs/utils/md/analytics.md`)
  | Function/Interface | Implementation Status | Signature Match | Result<T> Usage | MD Dependency | Notes |
  |-------------------|---------------------|-----------------|----------------|---------------|-------|
  | DominanceMetrics | ✅ Implemented | ✅ | N/A | N/A | Interface matches spec |
  | MarketAnalyticsCalculator | ⚠️ Interface Only | ✅ | ✅ | ✅ | No concrete implementation |
  | calculateMarketAnalytics | ❌ Missing | N/A | N/A | N/A | Concrete method not implemented |
  | isValidDominanceMetrics | ✅ Implemented | ✅ | N/A | N/A | Matches spec |
  | createAnalyticsMarketData | ✅ Implemented | ✅ | N/A | ✅ | Uses DSL types correctly |
  | extraAnalyticsFunction | ➕ Extra | N/A | N/A | N/A | Not specified in docs |

### Precision Module (`lib/src/utils/precision/` vs `docs/utils/md/precision.md`)
  | Function/Interface | Implementation Status | Signature Match | Result<T> Usage | Notes |
  |-------------------|---------------------|-----------------|----------------|-------|
  | FinancialDecimal.create | ✅ Implemented | ✅ | ✅ | Matches spec |
  | FinancialDecimal.createPrice | ✅ Implemented | ✅ | ✅ | Matches spec |
  | parsePrice | ✅ Implemented | ✅ | ✅ | Matches spec |
  | formatPrice | ✅ Implemented | ✅ | N/A | Matches spec |
  | calculateSpread | ✅ Implemented | ✅ | ✅ | Matches spec |
  | missingUtility | ❌ Missing | N/A | N/A | Specified but not implemented |
  | debugDecimal | ➕ Extra | N/A | N/A | Not in specification |


## Architecture Compliance
  | Requirement | Status | Notes |
  |-------------|---------|-------|
  | Depends on MD layer | ✅ | Analytics imports from ../md |
  | Uses @qi/base Result<T> | ✅ | All precision operations |
  | No circular dependencies | ✅ | Clean separation maintained |
  | Proper module structure | ✅ | analytics/, precision/, validation/ |
  | Error categories | ✅ | VALIDATION, SYSTEM, etc. |
  | Business logic separation | ✅ | Analytics separated from vocabulary |

## New Architecture Compliance
  | Requirement | Status | Notes |
  |-------------|---------|-------|
  | Analytics depends on MD smart constructors | ⚠️ | Some direct DSL usage found |
  | Precision utilities pure (no MD dependency) | ✅ | Clean utility functions |
  | No factory functions in utils | ✅ | Moved to MD smart constructors |
  | Namespace-aware imports | ⚠️ | Some legacy import patterns |

## Recommendations
  1. Complete analytics concrete implementations: [list missing calculators]
  2. Update analytics to use MD smart constructors: [list direct DSL usage]
  3. Implement missing validation utilities: [list specific functions]
  4. Update import patterns to new namespace structure: [list legacy imports]
  5. Add missing precision utilities: [list gaps]
  6. Verify MD dependency flow in analytics: [list violations]
```

Keep the report focused and actionable.

Remember to use sequential thinking for complex analysis and provide detailed, actionable recommendations for achieving full business logic compliance with the new architecture. Focus on:

1. **Dependency Flow**: Utils should depend on MD layer, not directly on DSL
2. **Module Separation**: Analytics and precision in separate directories
3. **Smart Constructor Usage**: Analytics should consume MD instances, not create raw DSL objects
4. **Namespace Compliance**: Import patterns should use new hierarchical structure
5. **Business Logic Separation**: No factory functions should remain in utils layer