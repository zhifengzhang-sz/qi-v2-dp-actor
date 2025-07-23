# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Knowledge System Structure

### NEW ORGANIZATION (2025-07-22)

```
docs/knowledge/
├── README.md          # Knowledge navigation hub
├── qi-stack/          # @qi/base and @qi/core learning system
│   ├── tutorial/      # 📚 Complete @qi competency development
│   │   ├── 01-qi-base-fundamentals.md
│   │   ├── 02-qi-core-fundamentals.md
│   │   ├── 03-integration-examples.md
│   │   ├── 04-advanced-patterns.md
│   │   ├── COMPETENCY-PROTOCOL.md      # Knowledge transfer protocol
│   │   └── REAL-WORLD-PROBLEM-SOLVING.md # Actual problem examples
│   └── usage/         # 🔧 Production implementation patterns
│       ├── qi-base-logical-patterns.md  # ⭐ ESSENTIAL thinking patterns
│       ├── qi-base-usage.md
│       ├── qi-core-usage.md
│       └── qi-advanced-patterns.md
└── project/           # @qi/dp-actor specific knowledge
    ├── README.md      # Project architecture and patterns
    └── troubleshooting.md # Real issues and solutions
```

### Navigation Rules

1. **New to @qi?** → Start with `docs/knowledge/qi-stack/tutorial/`
2. **Project questions?** → Check `docs/knowledge/project/`
3. **Implementation patterns?** → Use `docs/knowledge/qi-stack/usage/`
4. **Troubleshooting?** → See `docs/knowledge/project/troubleshooting.md`

## Workflow

1. **Always start with**: `mcp__memory__read_graph`
2. **Follow memory rules**: Read the documentation files memory directs you to read
3. **Trust memory navigation**: Memory contains updated file paths
4. **Update memory**: When making architectural changes, update memory entities

## Quality Standards

```bash
bun run check        # Quality check (run before any commit)
bun run build        # Build for distribution  
bun run test:watch   # Development testing
```

## Key Principles

- **Result<T> composition** throughout all operations
- **Never break composition** with throws or process.exit()
- **Graceful degradation** for infrastructure failures
- **Functional thinking patterns** from qi-base-logical-patterns.md

---

**REMEMBER**: Memory contains navigation rules pointing to the knowledge system. Always check memory first, then follow navigation to read the comprehensive documentation in `docs/knowledge/`.

## Workflow Context (Instead of Quick Memory)
Since quick memory isn't working, manually update this section before /clear:

**Current Session Context:**
- Project: @qi/dp/actor - a low level modules system for data platform govened by dsl
- Status: ✅ COMPLETED comprehensive unit testing for lib/src/actor with 112 new tests
- Last worked on: Complete unit testing for MCP actor classes - ALL TESTS PASSING (599/599)

**Tool Patterns That Work:**
- retain `@qi/base` and `@qi/core` usage patterns  
- retain knowledge on typescript mcp/sdk (StdioClientTransport, Client from @modelcontextprotocol/sdk)
- Always TodoWrite for multi-step tasks
- Use Task tool for extensive file searching
- Run git status + git diff + git log in parallel when committing
- /check-compliance for systematic architecture verification
- Sequential thinking for complex analysis tasks
- Test implementation pattern for abstract class testing (concrete test classes extending abstract)
- MultiEdit for batch linter fixes (forEach → for...of conversions)

**Key Discoveries This Session:**
1. Successfully implemented comprehensive unit testing for all MCP actor classes using "test implementation pattern"
2. Created 4 new test files: MCPBaseActor.test.ts (26), MCPMarketDataReader.test.ts (23), MCPMarketDataWriter.test.ts (30), MCPStreamingReader.test.ts (33)
3. Fixed 4 Biome linter issues (forEach → for...of performance optimization)
4. All 599 tests passing: 487 existing + 112 new MCP actor tests
5. Verified NO fake/stub code exists in production codebase - all implementations are complete
6. Integration tests: 30/31 passing (1 fails due to missing Kafka infrastructure, not code issues)
7. Codebase is production-ready with proper Result<T> composition throughout