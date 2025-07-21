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

Create a brief report with effective tables matching qi.dp.dsl.md structure:

#### Documentation Consistency Report (`docs/reports/dsl-documentation-consistency.md`)

```markdown
# DSL Documentation Consistency Report

Generated: [timestamp]

## Executive Summary
- **Contract Coverage**: X/Y contracts implemented (Z%)
- **Foundation Consistency**: Status 
- **FIX Compliance**: Status
- **Overall Consistency**: Rating

## Part I: Data Analysis

### Data Context Types
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| DataContext | ✅ Defined | ✅ Implemented | ✅ | Complete interface |
| Market | ✅ Defined | ✅ Implemented | ✅ | Interface with type/region/segment |

### Data Content Types
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| Price | ✅ Defined | ✅ Implemented | ✅ | FIX compliance documented |
| Level1 | ✅ Defined | ✅ Implemented | ✅ | Bid/ask with decimal types |

## Part II: Contracts Analysis

### Data Context Contracts
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| MarketDataContextManager | ✅ Defined | ✅ Implemented | ✅ | Context lifecycle management |

### Data Content Contracts
| Contract | Language-Agnostic | TypeScript Spec | Status | Notes |
|----------|------------------|-----------------|---------|-------|
| MarketDataReader | ✅ Defined | ✅ Implemented | ✅ | All methods present |
| HistoricalMarketDataReader | ✅ Defined | ✅ Implemented | ✅ | Historical operations |

## Foundation Module Consistency

### @qi/base Requirements
- **Language-Agnostic**: Required for Result<T> error handling
- **TypeScript Spec**: ✅ Correctly specified
- **Status**: ✅ FULLY CONSISTENT

### @qi/core Requirements
- **Language-Agnostic**: Required for infrastructure
- **TypeScript Spec**: ✅ Correctly specified  
- **Status**: ✅ CONSISTENT

## Overall Assessment

**Status**: ✅ EXCELLENT (X% coverage)

[Brief summary of strengths and any gaps]

## Action Items

### Immediate (Critical)
- [ ] Item 1

### Short Term (Enhancement)
- [ ] Item 2
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