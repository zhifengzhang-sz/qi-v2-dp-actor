# Context Continuation Protocol

## Purpose

Prevent context loss and ensure all work builds incrementally on established patterns and documentation.

## Mandatory Workflow

### Every Conversation Start

1. **Memory Check**: `mcp__memory__read_graph` to understand current project state
2. **Documentation Review**: Read relevant `docs/impl/` files for the question topic
3. **Task Status**: Check TodoWrite for active tasks and context

### Before Any @qi/base or @qi/core Response

1. **Check Implementation Guides First**:
   - `docs/impl/qi-base-usage.md` for all @qi/base questions
   - `docs/impl/qi-core-usage.md` for all @qi/core questions
2. **Reference Established Patterns**: Don't recreate, build on existing work
3. **Validate Against Tutorials**: Ensure alignment with qi-v2-qicore patterns

### After Any Significant Work

1. **Update Memory**: `mcp__memory__add_observations` with accomplishments
2. **Update Tasks**: TodoWrite progress and new tasks identified
3. **Document New Patterns**: Add to implementation guides if needed

## Quality Gates

### Before Claiming Difficulty
- ✅ Have I read the actual tutorials?
- ✅ Have I referenced my own documentation?
- ✅ Am I building on established patterns?

### Before Making Assumptions
- ✅ Does memory confirm this understanding?
- ✅ Do the implementation guides support this?
- ✅ Have I verified against working examples?

### Before Completing Work
- ✅ Is memory updated with current state?
- ✅ Are TodoWrite tasks marked complete?
- ✅ Can the next session continue from here?

## Anti-Patterns to Avoid

❌ **Context Loss Indicators**:
- Rediscovering information I already documented
- Contradicting previous analysis without new information
- Starting over instead of building incrementally
- Claiming tools are "hard" without referencing usage guides

❌ **Memory Neglect**:
- Not checking memory at conversation start
- Not updating memory after significant work
- Treating each response as isolated
- Forgetting todo task context

❌ **Documentation Ignore**:
- Not referencing docs/impl/ files for @qi questions
- Creating new explanations instead of using established guides
- Not building on verification command patterns

## Success Metrics

✅ **Effective Context Continuation**:
- All responses reference existing work
- Incremental building on established patterns
- User doesn't repeat guidance
- Memory reflects current accurate state

✅ **Quality Indicators**:
- Consistent @qi usage patterns (match(), not result.tag)
- Reference to implementation guides in responses
- Sequential thinking for complex analysis
- TodoWrite tracking for multi-step work

## Implementation Status

This protocol is now active and mandatory for all development work on the QiCore Data Processing Actors project.