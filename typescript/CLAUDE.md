# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory-First Protocol (MANDATORY)

**CRITICAL**: Always execute `mcp__memory__read_graph` as your FIRST action before responding to any question or request.

**Execute the protocol**:
1. Follow rules from memory exactly
2. Understand the project and project structure from documentation files memory directs you to read

**Follow Memory Rules**: Memory contains navigation rules that tell you which documentation files to read. Follow these rules exactly.

**Trust Memory Over CLAUDE.md**: If memory and this file conflict, follow memory rules.

## Workflow

1. **Always start with**: `mcp__memory__read_graph`
2. **Follow navigation rules**: Read the documentation files memory tells you to read
3. **Trust memory principles**: Architectural decisions are stored in memory
4. **Update memory**: When making architectural changes, update memory entities

## Essential Commands

```bash
bun run check        # Quality check (run before any commit)
bun run build        # Build for distribution  
bun run test:watch   # Development testing
```

---

**REMEMBER**: Memory contains the rules, principles, and current architecture. Documentation files contain the detailed patterns. This file only provides the protocol.