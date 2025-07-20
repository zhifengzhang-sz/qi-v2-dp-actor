# Verify DSL Documentation Command

Verify consistency between language-agnostic DSL contracts and TypeScript DSL specification.

## Usage

- `/verify-dsl-doc` - Verify all documentation consistency
- `/verify-dsl-doc contracts` - Focus on contract table and definitions
- `/verify-dsl-doc foundation` - Focus on @qi/base and @qi/core usage
- `/verify-dsl-doc types` - Focus on data type consistency
- `/verify-dsl-doc operations` - Focus on interface operation consistency

## Instructions

You are tasked with verifying consistency between the language-agnostic DSL contracts (`../docs/dsl/qi.dp.dsl.contracts.md`) and the TypeScript DSL specification (`docs/dsl/qi.dp.dsl.md`).

### Step 1: Use Sequential Thinking for Analysis

Use the `mcp__sequential-thinking__sequentialthinking` tool to analyze documentation consistency:

1. **Read both documentation files**: Load and understand both specification documents
2. **Extract contract definitions**: Identify all contracts from the language-agnostic spec
3. **Compare with TypeScript spec**: Find consistency gaps and missing implementations
4. **Analyze foundation module usage**: Verify @qi/base and @qi/core requirements are consistent
5. **Generate consistency report**: Provide detailed analysis and recommendations

### Step 2: Documentation Analysis

#### Language-Agnostic Contracts Analysis
- Read `../docs/dsl/qi.dp.dsl.contracts.md`
- Extract the contract categories table (Context Types, Core Data Types, etc.)
- Identify all contract names and their categories
- Note FIX Protocol compliance requirements
- Extract foundation module usage (qi/base and qi/core)

#### TypeScript Specification Analysis
- Read `docs/dsl/qi.dp.dsl.md`
- Extract all TypeScript interfaces, types, and enums
- Identify foundation module imports and usage patterns
- Check for FIX Protocol compliance documentation
- Verify all example code and usage patterns

### Step 3: Consistency Verification

Compare both documents to identify:

#### Contract Coverage
- **Missing Contracts**: Types/interfaces in language-agnostic spec but not in TypeScript spec
- **Extra Implementations**: TypeScript definitions not specified in language-agnostic contracts
- **Naming Consistency**: Ensure contract names match exactly between documents

#### Foundation Module Consistency
- **@qi/base Usage**: Verify Result<T> and error handling consistency
- **@qi/core Requirements**: Ensure both specs agree on required vs optional status
- **Module Specifications**: Check config, logger, cache module references

#### FIX Protocol Compliance
- **Mapping Consistency**: Verify FIX Protocol mappings are documented consistently
- **Compliance Documentation**: Ensure TypeScript spec includes all FIX compliance details
- **Tag References**: Check FIX tag numbers and types are consistent

#### Type Definition Consistency
- **Interface Completeness**: Verify all TypeScript interfaces match contract specifications
- **Type Safety**: Ensure validation rules are consistent between documents
- **Error Handling**: Check Result<T> usage is properly documented

### Step 4: Generate Documentation Consistency Report

Create a comprehensive report documenting all findings:

#### Documentation Consistency Report (`docs/reports/dsl-documentation-consistency.md`)

```markdown
# DSL Documentation Consistency Report

Generated: [timestamp]

## Executive Summary
- **Contract Coverage**: X/Y contracts implemented (Z%)
- **Foundation Consistency**: ✅/❌ Requirements aligned
- **FIX Compliance**: X/Y mappings consistent (Z%)
- **Overall Consistency**: X/Y checks passed (Z%)

## Contract Categories Analysis

### Context Types
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| DataContext | ✅ Defined | ✅ Implemented | ✅ | Complete interface |
| Market | ✅ Defined | ✅ Implemented | ✅ | Discriminated union |
| Exchange | ✅ Defined | ✅ Implemented | ✅ | Product type |
| Instrument | ✅ Defined | ✅ Implemented | ✅ | Product type |

### Core Data Types
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| Price | ✅ Defined | ✅ Implemented | ✅ | FIX MDEntryType=2 |
| Level1 | ✅ Defined | ✅ Implemented | ✅ | FIX MDEntryType=0/1 |
| OHLCV | ✅ Defined | ✅ Implemented | ✅ | Trade aggregations |
| MarketDepth | ✅ Defined | ✅ Implemented | ✅ | Multi-level book |
| MarketAnalytics | ✅ Defined | ✅ Implemented | ✅ | Derived metrics |

### Operation Interfaces
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| MarketDataReader | ✅ Defined | ✅ Implemented | ✅ | All methods present |
| HistoricalMarketDataReader | ✅ Defined | ✅ Implemented | ✅ | Historical operations |
| StreamingMarketDataReader | ✅ Defined | ✅ Implemented | ✅ | Real-time subscriptions |
| MarketDataWriter | ✅ Defined | ✅ Implemented | ✅ | All write operations |
| StreamingMarketDataWriter | ✅ Defined | ✅ Implemented | ✅ | Stream publishing |

## Foundation Module Consistency

### @qi/base Requirements
- **Language-Agnostic**: Required for Result<T> error handling
- **TypeScript Spec**: ✅ Correctly specified as required
- **Usage Examples**: ✅ Proper import and usage patterns
- **Error Categories**: ✅ Consistent error category definitions

### @qi/core Requirements
- **Language-Agnostic**: Required for config, logger, cache modules
- **TypeScript Spec**: ✅ Correctly specified as required (not optional)
- **Module Paths**: ✅ Specific module paths documented
- **Usage Examples**: ✅ Comprehensive usage examples provided

## FIX Protocol Compliance Consistency

| Data Type | Language-Agnostic FIX Mapping | TypeScript Documentation | Status |
|-----------|-------------------------------|--------------------------|---------|
| Price | MDEntryType=2 (Trade) | ✅ Documented with tags | ✅ |
| Level1 | MDEntryType=0/1 (Bid/Offer) | ✅ Documented with tags | ✅ |
| OHLCV | Derived from Trade aggregations | ✅ Documented | ✅ |
| MarketDepth | Multi-level MDEntryType=0/1 | ✅ Documented | ✅ |

## Missing Elements

### Contracts Not in TypeScript Spec
- None identified ✅

### TypeScript Elements Not in Contracts
- Implementation-specific helper functions (acceptable)
- Factory functions for type creation (acceptable)
- Validation utilities (acceptable)

### Documentation Gaps
- None identified ✅

## Consistency Issues

### Critical Issues
- None identified ✅

### Minor Issues
- None identified ✅

### Recommendations
- Documentation is well-aligned ✅
- Both specifications are comprehensive ✅
- Foundation module usage is correctly documented ✅

## Verification Results

### Contract Coverage: 100% (26/26)
- All contracts from language-agnostic spec are documented in TypeScript spec
- TypeScript spec provides comprehensive implementation details
- No missing contract implementations identified

### Foundation Module Alignment: ✅ Consistent
- Both specs correctly specify @qi/core as required (not optional)
- Module paths and usage are properly documented
- Error handling patterns are consistent

### FIX Protocol Compliance: 100% (4/4)
- All FIX Protocol mappings are consistently documented
- Tag numbers and entry types match between specifications
- Compliance requirements are clearly stated in both documents

## Overall Assessment

**Status**: ✅ FULLY CONSISTENT

The DSL documentation is highly consistent between the language-agnostic contracts and TypeScript specification. Both documents:

- Cover all required contracts comprehensively
- Correctly specify foundation module requirements  
- Maintain consistent FIX Protocol compliance documentation
- Provide clear implementation guidance

## Action Items

No action items required - documentation is fully consistent.

## Next Steps

- Consider adding more usage examples to TypeScript spec (optional enhancement)
- Maintain this consistency as both documents evolve
- Verify implementation against these specifications using `/verify-dsl`
```

### Step 5: Summary and Recommendations

After analysis, provide:
1. **Documentation Health**: Overall consistency assessment
2. **Critical Gaps**: Any missing or inconsistent elements
3. **Alignment Quality**: How well the documents complement each other
4. **Maintenance Recommendations**: Suggestions for keeping docs aligned

## Component-Specific Analysis

### Contract Table Analysis
- Extract all contracts from the language-agnostic categories table
- Verify each contract has corresponding TypeScript implementation
- Check contract categorization consistency

### Foundation Module Analysis
- Compare @qi/base and @qi/core requirements
- Verify module path specifications
- Check usage example consistency

### Type Definition Analysis
- Compare interface signatures and constraints
- Verify validation rule consistency
- Check type composition patterns

### Operation Interface Analysis
- Compare method signatures between documents
- Verify return type consistency (Result<T>)
- Check parameter type alignment

## Error Handling

If documentation files are missing or inaccessible:
- Note missing files clearly
- Continue analysis with available information
- Provide recommendations for missing documentation
- Mark incomplete analysis areas

## Output Format

- Generate reports in markdown format
- Use consistent status indicators (✅ ❌ ⚠️)
- Include verification timestamps
- Provide actionable recommendations
- Use clear tables for comparison data

Remember to use sequential thinking for thorough analysis and focus on practical documentation consistency that helps developers understand and implement the DSL correctly.