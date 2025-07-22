# @qi Stack Documentation

## Overview

This documentation provides comprehensive guidance for working with the @qi stack (`@qi/base` and `@qi/core`) in production applications.

## Documentation Structure

### 📚 [Tutorial](./tutorial/) - Learning the @qi API
**Start here if you're new to the @qi stack**

Complete step-by-step guides that teach you the fundamentals from scratch:

- **[01 - @qi/base Fundamentals](./tutorial/01-qi-base-fundamentals.md)** - Learn Result<T> composition patterns
- **[02 - @qi/core Fundamentals](./tutorial/02-qi-core-fundamentals.md)** - Master Logger, Config, and Cache tools  
- **[03 - Integration Examples](./tutorial/03-integration-examples.md)** - Complete working applications
- **[04 - Advanced Patterns](./tutorial/04-advanced-patterns.md)** - Production-ready advanced techniques

### 🔧 [Usage](./usage/) - Implementation Patterns
**Reference this for production implementation**

Verified patterns and architectural guidance for real-world usage:

- **[qi-base-usage.md](./usage/qi-base-usage.md)** - Verified Result<T> patterns from working examples
- **[qi-core-usage.md](./usage/qi-core-usage.md)** - Logger/Cache integration with correct APIs
- **[qi-base-logical-patterns.md](./usage/qi-base-logical-patterns.md)** - ⭐ **Essential**: How to think functionally
- **[qi-advanced-patterns.md](./usage/qi-advanced-patterns.md)** - Production insights and architectural decisions
- **[context-continuation-protocol.md](./usage/context-continuation-protocol.md)** - Session continuity and workflow

## Quick Start Guide

### 1. New to @qi? Start with Tutorial
```
📚 tutorial/README.md → Learn the fundamentals step-by-step
```

### 2. Ready to implement? Use Usage patterns
```  
🔧 usage/qi-base-logical-patterns.md → Essential thinking patterns
🔧 usage/qi-base-usage.md → Verified Result<T> patterns
🔧 usage/qi-core-usage.md → Infrastructure tool patterns
```

### 3. Building production apps? Advanced patterns
```
📚 tutorial/04-advanced-patterns.md → Sophisticated techniques
🔧 usage/qi-advanced-patterns.md → Architectural insights
```

## Key Principles

### ✅ Always Maintain Result<T> Composition
```typescript
// ✅ Correct: Functional composition throughout
const result = flatMap(
  validated => processData(validated),
  validateInput(input)
)
```

### ✅ Use Proper Error Categories
- `VALIDATION`: Input problems (never retry)
- `NETWORK`: External service issues (retry with backoff)
- `BUSINESS`: Business rule violations (never retry)  
- `SYSTEM`: Infrastructure issues (limited retry)

### ✅ Infrastructure with Graceful Degradation
```typescript
// ✅ Handle infrastructure failures gracefully
match(
  infrastructure => runApplication(infrastructure),
  error => runApplicationWithFallbacks(error),
  infrastructureResult
)
```

## Documentation Philosophy

### Tutorial vs Usage
- **Tutorial**: "How do I learn this?" - Step-by-step learning with explanations
- **Usage**: "How do I implement this?" - Reference patterns for production code

### Key Difference
- **Tutorial** teaches you **why** and **how** to think about the patterns
- **Usage** gives you **specific patterns** to copy into production code

## Essential Reading

🌟 **[qi-base-logical-patterns.md](./usage/qi-base-logical-patterns.md)** - The most important document for understanding functional composition thinking

This document teaches the **mental models** needed to use @qi/base correctly, including:
- How to think about flatMap vs map decisions
- Real refactoring mistakes and how to avoid them  
- The logical reasoning process behind Result<T> composition

## Contributing

When adding new patterns:
- **Tutorial**: Add learning-focused content with explanations
- **Usage**: Add reference patterns with minimal explanation
- **Always**: Maintain Result<T> composition throughout
- **Test**: Verify patterns against working qi-v2-qicore examples

The @qi stack emphasizes functional composition and proper error handling. All patterns should maintain these principles while providing clear, production-ready guidance.