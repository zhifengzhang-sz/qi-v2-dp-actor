# @qi/base Logical Thinking Patterns

## Introduction

This tutorial focuses on **how to think** when using `@qi/base`, using real examples from the QiCore market data DSL implementation. It's not just about syntax - it's about developing the **logical reasoning patterns** that lead to correct functional composition.

## Mental Model: The Three Questions

When encountering any validation or error-prone operation, ask:

1. **What can fail here?** (Error identification)
2. **How should failures propagate?** (Composition strategy)  
3. **What data flows through on success?** (Type transformation)

## Pattern 1: Sequential Validation Chain

### Real Example: Price Creation (price.ts:58-76)

**The Problem**: Create a Price with 4 validations: timestamp, price, size, tradeId

**Wrong Think**: "I need to validate 4 things"
```typescript
// ❌ Imperative mindset - thinking about steps
const timestampResult = isValidTimestamp(timestamp);
if (timestampResult.tag === "failure") return timestampResult;
const priceResult = isPositiveDecimal(price, "price");
if (priceResult.tag === "failure") return priceResult;
// ...
```

**Right Think**: "I need to compose 4 operations that each might fail"
```typescript
// ✅ Functional mindset - thinking about data flow
return flatMap(
  validTimestamp => flatMap(
    validPrice => flatMap(
      validSize => flatMap(
        validTradeId => success(new Price(validTimestamp, validPrice, validSize, validTradeId, aggressor)),
        isOptionalNonEmptyString(tradeId, "tradeId")
      ),
      isPositiveDecimal(size, "size")
    ),
    isPositiveDecimal(price, "price")
  ),
  isValidTimestamp(timestamp)
);
```

### Logical Decision Process:

1. **Dependency Analysis**: "Does validating `price` depend on `timestamp`?" → No
2. **Failure Propagation**: "If timestamp fails, should we even try price?" → No  
3. **Success Path**: "What data flows to the constructor?" → All validated values
4. **Composition Choice**: "Each step might fail" → `flatMap` chain

### Key Insight: **Inside-Out Construction**

Read the chain **from innermost to outermost**:
- Core: `success(new Price(...))` - what we're building
- Layer 1: `flatMap(validTradeId => ...)` - needs tradeId  
- Layer 2: `flatMap(validSize => ...)` - needs size
- Layer 3: `flatMap(validPrice => ...)` - needs price
- Layer 4: `flatMap(validTimestamp => ...)` - needs timestamp

## Pattern 2: Value Refinement  

### Real Example: Positive Decimal Validation (validation.ts:198-213)

**The Problem**: A decimal string must be valid format AND positive

**Wrong Think**: "Two separate checks"
```typescript
// ❌ Missing composition
const decimalResult = isValidDecimal(value, fieldName);
if (decimalResult.tag === "failure") return decimalResult;
// Now check if positive...
```

**Right Think**: "Refine a valid decimal to be positive"
```typescript
// ✅ Composition of refinements  
return flatMap(
  validDecimal => {
    const numValue = Number(validDecimal);
    if (numValue <= 0) {
      return failure(create("INVALID_DECIMAL_POSITIVE", ...));
    }
    return success(validDecimal);
  },
  isValidDecimal(value, fieldName)
);
```

### Logical Decision Process:

1. **Dependency Check**: "Can I check positivity without valid decimal?" → No
2. **Error Specificity**: "Should error mention 'invalid format' or 'not positive'?" → Depends on which fails
3. **Data Flow**: "What type flows through?" → Always `string` (the valid decimal)
4. **Composition**: "Second check depends on first" → `flatMap`

### Key Insight: **Refinement Pattern**

Think: `BaseValidation → RefinedValidation` where refined validation only makes sense if base passes.

## Pattern 3: Complex Business Logic

### Real Example: Spread Percentage (financial-decimal.ts:380-425)

**The Problem**: Calculate `(spread / midpoint) * 100` where each step can fail

**Wrong Think**: "Calculate spread, then calculate percentage"
```typescript
// ❌ Missing error handling in business logic
const spreadResult = FinancialDecimal.calculateSpread(bid, ask);
if (spreadResult.tag === "failure") return spreadResult;
// Now do math...
```

**Right Think**: "Transform valid spread into percentage, handling math errors"
```typescript
// ✅ Business logic wrapped in error handling
return flatMap(
  spread => {
    try {
      const sum = bid.add(ask);
      const midpoint = sum.decimal.div(2);
      
      if (midpoint.isZero()) {
        return failure(createMarketDataError("SPREAD_PERCENTAGE_ZERO_MID", ...));
      }
      
      const percentage = spread.decimal.div(midpoint).mul(100);
      return success(new FinancialDecimal(percentage));
    } catch (error) {
      return failure(createMarketDataError("SPREAD_PERCENTAGE_ERROR", ...));
    }
  },
  FinancialDecimal.calculateSpread(bid, ask)
);
```

### Logical Decision Process:

1. **Prerequisites**: "What must be true before calculation?" → Valid spread exists
2. **Math Failures**: "What can go wrong in calculation?" → Division by zero, overflow
3. **Error Context**: "What info helps debugging?" → Input values, operation that failed  
4. **Composition**: "Business logic depends on prerequisite" → `flatMap`

### Key Insight: **Business Logic Wrapping**

Don't just propagate errors - **anticipate and handle domain-specific failures** within business logic.

## Decision Tree: Which Pattern To Use?

### Start Here: What Are You Doing?

```
🤔 What am I trying to accomplish?

├─ 📝 Validating multiple independent things
│  └─ Use: Sequential Chain (Pattern 1)
│     └─ Think: "Each validation might fail, chain them"
│
├─ 🔍 Adding constraints to valid data  
│  └─ Use: Value Refinement (Pattern 2)
│     └─ Think: "Base validation + additional constraint"
│
├─ 🧮 Performing calculations that might fail
│  └─ Use: Business Logic Wrapping (Pattern 3) 
│     └─ Think: "Valid inputs + error-prone operations"
│
└─ 📤 Simple transformation that can't fail
   └─ Use: map() instead of flatMap()
      └─ Think: "Transform success value, preserve errors"
```

## Common Mistakes & Corrections

### Mistake 1: Wrong Composition Function

```typescript
// ❌ Using map() when operation can fail
return map(
  validDecimal => {
    if (Number(validDecimal) <= 0) {
      return failure(...); // ❌ Returns Result inside map!
    }
    return validDecimal;
  },
  isValidDecimal(value, fieldName)
);

// ✅ Using flatMap() for operations that return Result
return flatMap(
  validDecimal => {
    if (Number(validDecimal) <= 0) {
      return failure(...); // ✅ Correct - flatMap expects Result
    }
    return success(validDecimal);
  },
  isValidDecimal(value, fieldName)
);
```

### Deep Dive: Why flatMap() vs map() - The Model Choice Matters

**The Core Issue**: Most developers can write the inner logic correctly, but choose the wrong composition model.

**Inner Logic (Everyone gets this right)**:
```typescript
// ✅ Everyone can write this business logic
if (Number(validDecimal) <= 0) {
  return failure(createError("INVALID_DECIMAL_POSITIVE", ...));
}
return success(validDecimal);
```

**Model Choice (This is where mistakes happen)**:

**Wrong Model: Using map()**
```typescript
// ❌ WRONG: map() expects callback to return T, not Result<T>
return map(
  validDecimal => {
    if (Number(validDecimal) <= 0) {
      return failure(...); // ❌ Returns Result<T> inside map!
    }
    return validDecimal;   // ❌ Inconsistent return types
  },
  isValidDecimal(value, fieldName)
);
// Result: Result<Result<string> | string> - nested Results!
```

**Right Model: Using flatMap()**  
```typescript
// ✅ CORRECT: flatMap() expects callback to return Result<T>
return flatMap(
  validDecimal => {
    if (Number(validDecimal) <= 0) {
      return failure(...); // ✅ Returns Result<string>
    }
    return success(validDecimal); // ✅ Returns Result<string>
  },
  isValidDecimal(value, fieldName)
);
// Result: Result<string> - clean, flat structure
```

### How flatMap() Works vs map()

**map() Mental Model**: "Transform success values, leave failures alone"
```typescript
Result<A> --map(A => B)--> Result<B>

// Example: Convert price to cents
map(price => price * 100, priceResult)
// If success: Result<number> (cents)
// If failure: passes through unchanged
```

**flatMap() Mental Model**: "Chain operations that each might fail"  
```typescript
Result<A> --flatMap(A => Result<B>)--> Result<B>

// Example: Validate then refine
flatMap(validDecimal => {
  if (condition) return failure(...);
  return success(refinedDecimal);
}, isValidDecimal(value))
// If first fails: failure propagates
// If second fails: second failure returned
// If both succeed: final success
```

### The Power Difference

**Without flatMap (imperative)**:
```typescript
// ❌ Manual error propagation - easy to forget checks
const step1 = isValidDecimal(value, fieldName);
if (step1.tag === "failure") return step1;

const step2 = checkPositive(step1.value);
if (step2.tag === "failure") return step2;

const step3 = checkRange(step2.value);
if (step3.tag === "failure") return step3;

return success(step3.value);
```
**Problems**: 
- Repetitive error checking
- Easy to forget a check
- Verbose and error-prone
- No compiler guarantee you handled all cases

**With flatMap (functional)**:
```typescript
// ✅ Automatic error propagation - impossible to forget
return flatMap(
  validDecimal => flatMap(
    positiveDecimal => flatMap(
      rangeDecimal => success(rangeDecimal),
      checkRange(positiveDecimal)
    ),
    checkPositive(validDecimal)
  ),
  isValidDecimal(value, fieldName)
);
```
**Benefits**:
- Error propagation is automatic
- Impossible to forget error handling
- Type system enforces correctness
- Clear data flow from outer to inner

### Logical Decision Framework

**Step 1: Analyze your callback function**
```typescript
// What does my function return?
validDecimal => {
  if (condition) return failure(...); // ← Result<T>
  return success(validDecimal);        // ← Result<T>  
}
// Answer: Result<T>
```

**Step 2: Choose composition function**
```typescript
// Callback returns Result<T> → Use flatMap()
// Callback returns T → Use map()
```

**Step 3: Verify the types flow correctly**
```typescript
// flatMap signature: (A => Result<B>) => Result<A> => Result<B>
flatMap(
  (validDecimal: string) => Result<string>, // ✅ A => Result<B>
  isValidDecimal(value, fieldName)          // ✅ Result<A>  
)
// Result: Result<B> ✅
```

### Why This Choice Is Critical

**Choosing map() when you need flatMap()**:
- Creates nested Results: `Result<Result<T>>`  
- Breaks type safety
- Makes error handling inconsistent
- Forces manual unwrapping later

**Choosing flatMap() correctly**:
- Maintains flat Result structure: `Result<T>`
- Preserves type safety throughout chain  
- Automatic error propagation
- Composable with other operations

**Logical Fix Process**:
1. **"What does my callback return?"** → `T` or `Result<T>`?
2. **"If Result<T>, use flatMap()"** → Automatic flattening  
3. **"If T, use map()"** → Simple transformation

### Mistake 2: Breaking the Chain

```typescript  
// ❌ Interrupting composition with imperative checks
if (aggressor !== undefined && aggressor !== "BUY" && aggressor !== "SELL") {
  return failure(...);
}
return flatMap(validTimestamp => ..., isValidTimestamp(timestamp));

// ✅ Keep simple checks outside, complex composition inside
if (aggressor !== undefined && aggressor !== "BUY" && aggressor !== "SELL") {
  return failure(...); // ✅ Fine - this doesn't need composition
}
// Now do composition for the complex part
```

**Logical Fix**: Ask "Does this check depend on other validations?" → If no, do it first

### Mistake 3: Wrong Error Creation

```typescript
// ❌ Using generic errors for domain-specific problems  
return failure(validationError("Price must be positive"));

// ✅ Using domain-specific errors with context
return failure(create(
  "INVALID_PRICE_POSITIVE", 
  "Price must be positive", 
  "VALIDATION",
  { value, field: "price" }
));
```

**Logical Fix**: Ask "Will debugging this error need domain context?" → If yes, use `create()`

## Practice Exercise: Logical Reasoning

Given this requirement: *"Validate OHLCV data where Open ≤ High, Low ≤ Close, and Volume > 0"*

### Step 1: Apply The Three Questions

1. **What can fail?** 
   - Invalid numbers, business rule violations, missing data

2. **How should failures propagate?**
   - If basic validation fails, don't check business rules
   - If business rules fail, provide specific error

3. **What data flows through?**
   - Valid numeric values that satisfy business rules

### Step 2: Choose Pattern

- Multiple dependent validations → Sequential Chain
- Business constraints → Refinement of valid numbers
- Mixed → Compose both patterns

### Step 3: Logical Structure

```typescript
return flatMap(
  ({open, high, low, close, volume}) => {
    // Business rule validation
    if (open > high) return failure(create("INVALID_OHLC_OPEN_HIGH", ...));
    if (low > close) return failure(create("INVALID_OHLC_LOW_CLOSE", ...)); 
    if (volume <= 0) return failure(create("INVALID_VOLUME_POSITIVE", ...));
    return success(new OHLCV(open, high, low, close, volume));
  },
  validateBasicNumbers(rawData) // This would be its own composition
);
```

## Summary: The @qi/base Mindset

**Traditional thinking**: "Check things, handle errors"
**@qi/base thinking**: "Compose transformations, let errors flow"

### Mental Shift Checklist:

- ✅ Think in **data transformations**, not procedural steps
- ✅ Ask **"what depends on what?"** for composition order
- ✅ Design **error context** for debugging scenarios  
- ✅ Use **types to guide** composition decisions
- ✅ **Anticipate failures** in business logic, don't just propagate

The key insight: `@qi/base` works best when you **think functionally first**, then translate to the syntax. The logical patterns matter more than memorizing the API.

## Real Refactoring Mistakes: A Case Study

This section documents **actual mistakes** I made during the refactoring process, providing insight into common pitfalls and how to avoid them.

## Mistake 1: Incomplete flatMap Chain Structure

### What I Did Wrong

**Original broken code in `financial-decimal.ts`**:
```typescript
static createSize(value: string | number | Decimal): Result<FinancialDecimal, any> {
  return flatMap(
    result => {
      if (result.isNegative()) {
        return failure(createMarketDataError("INVALID_SIZE", ...));
      }
      return success(result);
    },
    FinancialDecimal.create(value)
  );

  return result; // ❌ MISTAKE: Unreachable code, forgot to remove old pattern
}
```

### Why This Is A Mistake

1. **Mental switching**: I was **half-thinking** in old pattern, half in new pattern
2. **Incomplete removal**: Removed the discriminated union check but left the return statement
3. **No compiler help**: TypeScript couldn't catch this logical error until runtime

### How To Fix It

**Apply systematic refactoring**:
```typescript
// ✅ Step 1: Identify the old pattern completely
const result = FinancialDecimal.create(value);
if (result.tag === "failure") {
  return result;
}
// ... business logic ...
return result; // ← This line needs to be removed too!

// ✅ Step 2: Replace entire block, not just the check
return flatMap(
  result => {
    // ... business logic ...
    return success(result);
  },
  FinancialDecimal.create(value)
);
```

### Alternative Approaches Considered

**Option A: Keep discriminated union pattern**
```typescript
// Simple but inconsistent with project standards
const result = FinancialDecimal.create(value);
if (result.tag === "failure") return result;
// ... continue with result.value
```

**Option B: Use match() for explicit handling**
```typescript
// More explicit but verbose for simple cases
return match(
  result => {
    if (result.isNegative()) return failure(...);
    return success(result);
  },
  error => failure(error),
  FinancialDecimal.create(value)
);
```

**Option C: flatMap composition (chosen)**
```typescript
// ✅ Most consistent with functional composition patterns
return flatMap(
  result => {
    if (result.isNegative()) return failure(...);
    return success(result);
  },
  FinancialDecimal.create(value)
);
```

### Logical Thinking Process To Prevent This

**Before refactoring, ask**:
1. "What is the **complete old pattern**?" → Identify ALL lines that need changing
2. "What does the **new pattern** replace?" → Map old structure to new structure
3. "Are there any **leftover references**?" → Check for variables/returns that became invalid

## Mistake 2: Missing Import After Refactoring

### What I Did Wrong

**After adding flatMap usage**:
```typescript
// ✅ Added flatMap to code
return flatMap(validDecimal => ..., isValidDecimal(value, fieldName));

// ❌ MISTAKE: Forgot to update imports  
import { create, failure, success } from "@qi/base";
//           ^^^^^^^ Missing flatMap!
```

**Result**: `error TS2304: Cannot find name 'flatMap'`

### Why This Is A Mistake

1. **Focus tunnel vision**: Concentrated on logic, ignored dependencies
2. **Import blindness**: Didn't verify imports match usage  
3. **Incremental changes**: Added function usage without checking prerequisites

### How To Fix It

**Systematic import management**:
```typescript
// ✅ Step 1: Before adding new patterns, check what functions you'll need
// I need: flatMap, success, failure, create for validation functions

// ✅ Step 2: Update imports proactively  
import { create, failure, flatMap, success } from "@qi/base";

// ✅ Step 3: Write the implementation
return flatMap(validDecimal => ..., isValidDecimal(value, fieldName));
```

### Alternative Approaches Considered

**Option A: Import everything from @qi/base**
```typescript
import * as QiBase from "@qi/base";
return QiBase.flatMap(...);
```
- Pro: Never miss imports
- Con: Verbose, unclear what's actually used

**Option B: Import as needed during development**  
```typescript
// Start with minimal imports, add as TypeScript complains
import { create, failure, success } from "@qi/base";
// Later: import { create, failure, success, flatMap } from "@qi/base";
```
- Pro: Only import what's needed
- Con: Requires iteration, breaks flow

**Option C: Preemptive complete imports (chosen)**
```typescript
// ✅ Analyze the pattern, import everything needed upfront
import { create, failure, flatMap, success } from "@qi/base";
```
- Pro: Single change, clear intention
- Con: Might import unused functions

### Logical Thinking Process To Prevent This

**Import checklist before refactoring**:
1. "What @qi/base functions will my **new pattern** use?" → List them
2. "What functions does my **current import** have?" → Compare lists  
3. "What's the **delta**?" → Add missing imports first

## Mistake 3: Wrong Result Type Flow in Nested Functions

### What I Did Wrong

**In `calculateSpreadPercentage` refactoring**:
```typescript
return flatMap(
  spread => {
    // ... calculation logic ...
    const percentage = spreadResult.value.decimal.div(midpoint).mul(100);
    //                 ^^^^^^^^^^^^^ ❌ MISTAKE: Used old variable name!
    return success(new FinancialDecimal(percentage));
  },
  FinancialDecimal.calculateSpread(bid, ask)
);
```

**Problem**: Inside the flatMap, `spread` is the unwrapped value, but I was still referencing `spreadResult.value`.

### Why This Is A Mistake

1. **Variable name confusion**: Mixed old imperative variable names with new functional parameters
2. **Context switching**: Lost track of what data is available in each scope
3. **Type system trust**: Didn't let TypeScript guide me to the right variable

### How To Fix It

**Systematic variable tracking**:
```typescript
// ✅ Step 1: Understand what flatMap provides
flatMap(
  spread => { // ← 'spread' is FinancialDecimal (unwrapped!)
    // ✅ Step 2: Use the parameter, not old variables
    const percentage = spread.decimal.div(midpoint).mul(100);
    return success(new FinancialDecimal(percentage));
  },
  FinancialDecimal.calculateSpread(bid, ask) // ← This returns Result<FinancialDecimal>
);
```

### Alternative Approaches Considered

**Option A: Keep original imperative style**
```typescript
const spreadResult = FinancialDecimal.calculateSpread(bid, ask);
if (spreadResult.tag === "failure") return spreadResult;
const spread = spreadResult.value;
// ... use spread
```
- Pro: Clear variable names, explicit unwrapping
- Con: Verbose, inconsistent with project style

**Option B: Use match() for clearer type flow**
```typescript  
return match(
  spread => {
    // ... calculation logic with spread
    return success(new FinancialDecimal(percentage));
  },
  error => failure(error),
  FinancialDecimal.calculateSpread(bid, ask)
);
```
- Pro: Explicit success/error handling
- Con: More verbose than flatMap for this use case

**Option C: flatMap with careful parameter naming (chosen)**
```typescript
return flatMap(
  validSpread => { // ✅ Clear name indicates it's unwrapped
    const percentage = validSpread.decimal.div(midpoint).mul(100);
    return success(new FinancialDecimal(percentage));
  },
  FinancialDecimal.calculateSpread(bid, ask)
);
```
- Pro: Functional composition, clear intent
- Con: Requires careful attention to parameter types

### Logical Thinking Process To Prevent This

**Variable flow checklist**:
1. "What **type** does the outer operation return?" → `Result<T>`
2. "What **type** does flatMap give me in the callback?" → `T` (unwrapped)
3. "What **variable names** make the unwrapping obvious?" → Use descriptive names
4. "Can I **trust TypeScript** to catch type mismatches?" → Yes, but pay attention!

## Mistake 4: Forgetting Error Context Propagation

### What I Did Wrong

**During validation refactoring**:
```typescript
return flatMap(
  validDecimal => {
    const numValue = Number(validDecimal);
    if (numValue <= 0) {
      return failure(
        create("INVALID_DECIMAL_POSITIVE", `${fieldName} must be positive`, "VALIDATION", {
          field: fieldName,
          value, // ❌ MISTAKE: Used original value, not validDecimal
        })
      );
    }
    return success(validDecimal);
  },
  isValidDecimal(value, fieldName)
);
```

**Problem**: Error context showed original invalid input, not the processed valid decimal.

### Why This Is A Mistake

1. **Context confusion**: Mixed original input with processed values in error context
2. **Debugging difficulty**: Error context doesn't match the actual failure point
3. **Information loss**: Lost track of what validation stage failed

### How To Fix It

**Consistent error context**:
```typescript
return flatMap(
  validDecimal => {
    const numValue = Number(validDecimal);
    if (numValue <= 0) {
      return failure(
        create("INVALID_DECIMAL_POSITIVE", `${fieldName} must be positive`, "VALIDATION", {
          field: fieldName,
          value: validDecimal, // ✅ Use the value that actually failed this check
          originalInput: value, // ✅ Optionally preserve original for debugging
        })
      );
    }
    return success(validDecimal);
  },
  isValidDecimal(value, fieldName)
);
```

### Alternative Approaches Considered  

**Option A: Always use original input in errors**
```typescript
// Simple but potentially misleading
value, // Original input
```
- Pro: Consistent, shows user input
- Con: May not match actual failure point

**Option B: Always use processed value in errors**
```typescript
// Accurate to validation stage  
value: validDecimal,
```
- Pro: Matches exact failure point
- Con: May lose original context

**Option C: Include both original and processed (chosen)**
```typescript
// ✅ Complete context
{
  field: fieldName,
  value: validDecimal,      // What failed this specific check
  originalInput: value,     // What user originally provided
}
```
- Pro: Complete debugging information
- Con: Slightly more verbose

### Logical Thinking Process To Prevent This

**Error context checklist**:
1. "What **value** actually caused this specific validation to fail?" → Use that in error
2. "What **original input** would help debugging?" → Include as additional context
3. "What **stage of validation** are we at?" → Make error message match stage
4. "Will future developers understand **where this error came from**?" → Test error clarity

## Meta-Learning: Pattern Recognition for Mistake Prevention

### The Common Thread

All these mistakes share a pattern: **Mental model misalignment**

- **Mistake 1**: Old imperative model conflicted with new functional model  
- **Mistake 2**: Local focus ignored global dependencies
- **Mistake 3**: Variable naming didn't match functional context
- **Mistake 4**: Error context didn't match validation stage

### Prevention Strategy: The "Model Check"

Before and after each refactoring step:
1. **"What is my current mental model?"** → Be explicit about your assumptions
2. **"Does this code match my model?"** → Verify implementation matches intent
3. **"What would break if my model is wrong?"** → Think about edge cases
4. **"Can someone else follow my reasoning?"** → Test code clarity

The key insight: **Mistakes happen when you're partially thinking in multiple paradigms**. The solution is to be more deliberate about which mental model you're using at each step.