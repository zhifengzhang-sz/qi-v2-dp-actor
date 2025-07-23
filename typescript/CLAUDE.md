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