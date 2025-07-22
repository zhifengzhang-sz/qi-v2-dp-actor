# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory-First Protocol (MANDATORY)

**CRITICAL**: Always execute `mcp__memory__read_graph` as your FIRST action before responding to any question or request.

Memory contains updated navigation rules for the new documentation structure.

## Documentation Structure

### NEW ORGANIZATION (2025-01-XX)

```
docs/qicore/
├── README.md          # Main navigation
├── tutorial/          # 📚 Learning the @qi API  
│   ├── 01-qi-base-fundamentals.md
│   ├── 02-qi-core-fundamentals.md
│   ├── 03-integration-examples.md  
│   └── 04-advanced-patterns.md
└── usage/             # 🔧 Implementation Patterns
    ├── qi-base-logical-patterns.md  # ⭐ ESSENTIAL thinking patterns
    ├── qi-base-usage.md
    ├── qi-core-usage.md
    └── qi-advanced-patterns.md
```

### Navigation Rules

1. **New to @qi?** → Start with `docs/qicore/tutorial/`
2. **Need implementation patterns?** → Use `docs/qicore/usage/`
3. **Essential reading:** `docs/qicore/usage/qi-base-logical-patterns.md`

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

**REMEMBER**: Memory contains the current file structure and navigation rules. Always check memory first, then follow the file reading rules to the new docs/qicore/ structure.