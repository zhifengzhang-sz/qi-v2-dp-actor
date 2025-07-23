# @qi Competency Transfer Protocol

This document establishes the mandatory workflow for achieving `@qi/base` and `@qi/core` competency in future sessions.

## Mandatory Reading Sequence

### STEP 1: Memory-First Protocol
```bash
# ALWAYS execute first - no exceptions
mcp__memory__read_graph
```
**Rationale**: Memory contains navigation rules and architectural principles that guide proper file reading.

### STEP 2: Complete Tutorial Progression  
**Required reading order** (cannot be skipped):

1. `docs/qicore/tutorial/README.md` - Navigation and learning path
2. `docs/qicore/tutorial/01-qi-base-fundamentals.md` - Result<T> composition patterns
3. `docs/qicore/tutorial/02-qi-core-fundamentals.md` - Config and Logger integration  
4. `docs/qicore/tutorial/03-integration-examples.md` - Real-world usage patterns
5. `docs/qicore/tutorial/04-advanced-patterns.md` - Pro-level implementation
6. `docs/qicore/tutorial/CORRECTIONS.md` - Anti-patterns and common mistakes

### STEP 3: Implementation Reference Files
**After tutorial completion**, read:

- `docs/qicore/usage/qi-base-logical-patterns.md` - **CRITICAL** for functional thinking
- `docs/qicore/usage/qi-base-usage.md` - Production patterns
- `docs/qicore/usage/qi-core-usage.md` - Config/Logger reference
- `docs/qicore/usage/context-continuation-protocol.md` - Session management

### STEP 4: Hands-On Verification
- Examine existing codebase patterns in `lib/src/` 
- Compare against tutorial patterns
- Identify any deviations or improvements needed

## Competency Gate

**Cannot claim @qi expertise without completing ALL tutorial files.** The progression builds conceptual understanding that memory summaries cannot replace.

## Critical Success Factors from This Session

### 1. Architectural Understanding
- **DSL = vocabulary only** (no dependencies)
- **Utils = implementation around DSL types** 
- **Never break Result<T> composition** with throws/exits

### 2. Functional Thinking Patterns
- Use `flatMap` for operations that can fail
- Use `match` for Result<T> consumption
- Use `fromAsyncTryCatch` for async operations
- Never use imperative error handling in functional contexts

### 3. Logger Integration
- Always use 3-argument signature: `error(message, error?, context?)`
- Use child loggers for hierarchical context
- Understand LoggerContext property names

### 4. Real-World Problem Solving
This session solved 76 instances across 5 critical issues:
- Type safety restoration (22 instances)
- Logger API corrections (16 instances)  
- Interface consistency (38 instances)
- Architecture boundary enforcement (13 instances)
- Root cause analysis (1 @qi/core issue)

## Knowledge Verification Checklist

Before claiming competency:
- [ ] Read all tutorial files in sequence
- [ ] Understand Result<T> composition vs imperative patterns
- [ ] Can identify flatMap vs map usage scenarios  
- [ ] Know when to use fromAsyncTryCatch vs manual error handling
- [ ] Understand Logger context hierarchy and property naming
- [ ] Can distinguish legitimate `any` usage from architecture violations
- [ ] Recognize DSL/utils boundary principles

## Anti-Pattern Recognition

Must be able to identify:
- ❌ `Result<T, any>` instead of `Result<T, QiError>`
- ❌ Breaking composition with imperative error handling
- ❌ Incorrect Logger API usage patterns
- ❌ Architecture boundary violations
- ❌ Generic `any` usage without justification

---

**Success Metric**: Ability to systematically identify, analyze, and fix architectural issues while maintaining 100% test success rate and clean compilation.