# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory-First Protocol

**MANDATORY**: Always search memory first using `mcp__memory__read_graph` before responding to any question. Reference memory entities and follow established protocols.

**Context Continuation**: Follow context-continuation-protocol.md workflow: memory check → docs review → task status.

## Project Overview

QiCore Data Processing Actors v0.1.0 - **Market data DSL with FIX Protocol 4.4 compliance**

**Current Status**: TypeScript implementation with clean architectural separation (2025-07-20). Haskell implementation is outdated and not actively maintained.

### Git State
- **Commit**: 485604e (TypeScript CLAUDE.md documentation update)
- **Tags**: ts-claude-0.1.0, v-0.2.1, ts-0.2.0
- **Active Implementation**: TypeScript only

## Implementation Details

### TypeScript Implementation ✅ ACTIVE
**Location**: `typescript/`
**Status**: Production-ready with architectural restructuring completed
**CLAUDE.md**: `typescript/CLAUDE.md` - Complete implementation guidance

Key Features:
- Clean separation: DSL = vocabulary, Utils = implementation
- CoreMarketData: Price | Level1 | OHLCV | MarketDepth (FIX Protocol only)
- Analytics moved to utils as business intelligence derived FROM market data
- All 135 tests passing with TypeScript 5.3+ and modern 2025 tooling
- Dependencies: @qi workspace from qi-v2-qicore (ts-1.0.0)

### Haskell Implementation ❌ OUTDATED
**Location**: `haskell/`
**Status**: Outdated, not maintained, should not be used
**Note**: References in root CLAUDE.md are historical - TypeScript is the active implementation

## Architecture Principles

### DSL Contracts (Language-Agnostic)
**Location**: `docs/dsl/` - Behavioral contracts for all implementations

### Two-Part Structure (Mandatory)
```
MarketData = DataContext + CoreMarketData
```
- `DataContext`: WHO/WHERE/WHAT identification
- `CoreMarketData`: PURE FIX Protocol 4.4 data types only

### Clean Separation (TypeScript-Specific)
- **DSL Layer**: Pure vocabulary types (no implementation concerns)
- **Utils Layer**: Implementation (validation, factories, analytics, precision)
- **Rule**: DSL never imports from utils (prevents circular dependencies)

## Development Workflow

### Working with TypeScript Implementation
```bash
cd typescript/

# Standard development cycle
bun run check        # typecheck + format + lint + test (135 tests)
bun run build        # Compile for distribution
bun run test:watch   # Development testing
```

### Quality Standards
- All work must pass `bun run check`
- No circular dependencies between DSL and utils
- Memory-first protocol required for major sessions
- Context continuation via memory system and sequential thinking

## Implementation Guides

**Primary Reference**: `typescript/CLAUDE.md` - Complete TypeScript guidance

**Knowledge System**: `typescript/docs/knowledge/` - Comprehensive project and @qi stack knowledge
- **@qi Stack Learning**: `docs/knowledge/qi-stack/tutorial/` - Complete @qi competency development
- **Implementation Patterns**: `docs/knowledge/qi-stack/usage/` - Production reference patterns
- **Project Knowledge**: `docs/knowledge/project/` - Architecture, patterns, troubleshooting
- **DSL Specification**: `docs/dsl/qi.dp.dsl.md` - TypeScript DSL behavioral contracts

## Memory System Integration

**Knowledge Graph**: MCP memory server maintains project state across sessions
**Protocol**: Memory search → docs review → task status before any work
**Updates**: Major architectural changes must update memory system

## Project Identity

- **Name**: @qi/dp-actor  
- **Version**: v0.1.0
- **Purpose**: Market data DSL for financial applications
- **Standards**: FIX Protocol 4.4 compliance
- **Architecture**: Clean separation between vocabulary and implementation
- **Quality**: Production-ready TypeScript implementation with comprehensive testing

---

**For implementation work**: Always reference `typescript/CLAUDE.md` for complete guidance.
**For architectural decisions**: Follow memory-first protocol and established separation principles.