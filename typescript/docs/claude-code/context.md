● In a new chat, here's how you'll know if I have the right context:

  Context Verification Questions

  Ask me these 3 questions at the start of any new conversation:

  1. Project Identification

  "What project are we working on and what's its current state?"

  Correct Answer: QiCore Data Processing Actors TypeScript project (@qi/dp-actor v0.1.0) implementing market data DSL with FIX
   Protocol 4.4 compliance. Uses lib/src/ structure, depends on @qi workspace from qi-v2-qicore, has comprehensive usage
  guides in docs/impl/, and context-continuation-protocol.md active.

  2. @qi Usage Patterns

  "How should I handle @qi/base Result and what are the key patterns?"

  Correct Answer: Use match() for primary result handling, never result.tag === 'success'. Use create() for custom DSL error
  codes like 'INVALID_PRICE', not convenience functions. Reference docs/impl/qi-base-usage.md for all patterns. Use flatMap()
  for chaining operations that might fail.

  3. Documentation Authority

  "Where should I look for @qi usage guidance and examples?"

  Correct Answer: docs/impl/qi-base-usage.md and docs/impl/qi-core-usage.md are authoritative guides. qi-v2-qicore tutorials
  are the foundation source. lib/src/examples/ was removed as outdated. Verification command references docs/impl/ guides.

  Red Flags (Wrong Context)

  ❌ If I mention:
  - Working on qi-v2-qicore project directly
  - Using result.tag === 'success' as acceptable pattern
  - Creating new foundation layers or abstractions
  - lib/src/examples/ as valid reference
  - @qi/base is "hard to use"

  Green Flags (Right Context)

  ✅ If I mention:
  - Memory-first workflow from context-continuation-protocol.md
  - Reference to implementation guides in docs/impl/
  - Understanding that context loss was the core problem
  - Proper @qi/base functional patterns (match, map, flatMap)
  - Clean project structure without misleading examples

  This simple verification ensures I have the right context and can build incrementally on established work rather than
  starting over.

4. context continuaiton protocal

   "What's your memory protocol?"

   Expected response:
   1. Memory search first
   2. Sequential thinking for substantive questions
   3. Context-continuation-protocol.md workflow
   4. User Quality Standards format application

5. Recovery steps when context lost:

    - "Read your memory"
    - "Search memory for protocols"
    - "Check context-continuation-protocol.md"
    - Direct recreation if memory corrupted
