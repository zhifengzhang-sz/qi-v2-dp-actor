# Market Data Precision

**Location**: `lib/src/utils/precision/`  
**Purpose**: Financial arithmetic with decimal.js for precise monetary calculations  
**Dependencies**: `@qi/base`, `decimal.js`

## Overview

The Market Data Precision module provides safe decimal arithmetic for financial calculations. This module provides pure utilities with no dependencies on market data types.

### Architectural Position

```
dsl/* (interfaces) → md/* (implementations) → utils/precision (pure utilities)

The precision module provides pure financial arithmetic utilities used by the MD layer smart constructors and analytics calculations. This module has no dependencies on market data types.
```

## Module Structure

The precision module uses file-scoped exports:

```typescript
// utils/precision/financial-decimal.ts
export class FinancialDecimal {
  static create(value: string | number): Result<FinancialDecimal>;
  static createPrice(value: string | number): Result<FinancialDecimal>;
  static createSize(value: string | number): Result<FinancialDecimal>;
  
  add(other: FinancialDecimal): FinancialDecimal;
  subtract(other: FinancialDecimal): FinancialDecimal;
  multiply(other: FinancialDecimal): FinancialDecimal;
  divide(other: FinancialDecimal): Result<FinancialDecimal>;
  
  toString(): string;
  toFixed(decimals: number): string;
  toNumber(): number;
}

// utils/precision/utilities.ts
export function parsePrice(value: string): Result<FinancialDecimal>;
export function parseSize(value: string): Result<FinancialDecimal>;
export function formatPrice(price: FinancialDecimal, decimals: number): string;
export function formatPercentage(percentage: FinancialDecimal, decimals: number): string;
```

JavaScript's IEEE 754 floating-point arithmetic is unsuitable for financial calculations due to precision loss. This module uses decimal.js to provide exact decimal arithmetic with guaranteed precision.

### The Floating-Point Problem

```javascript
// JavaScript floating-point precision issues
0.1 + 0.2 === 0.3; // false
0.1 + 0.2; // 0.30000000000000004

// Financial calculation errors
const price1 = 123.45;
const price2 = 67.89;
price1 + price2; // 191.33999999999997 (incorrect)

// Rounding errors compound
let total = 0;
for (let i = 0; i < 100; i++) {
  total += 0.01;
}
total; // 0.9999999999999999 (not 1.00)
```

### Decimal.js Solution

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

// Exact decimal arithmetic
const price1 = FinancialDecimal.create("123.45");
const price2 = FinancialDecimal.create("67.89");
if (price1.tag === 'success' && price2.tag === 'success') {
  const total = price1.value.add(price2.value); // Exactly 191.34
}
```

## Configuration

The module configures decimal.js for financial precision requirements:

```typescript
Decimal.set({
  precision: 34,                    // IEEE 754-2008 decimal128 precision
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding (ties to even)
  toExpNeg: -7,                     // Exponential notation for < 1e-7
  toExpPos: 21,                     // Exponential notation for >= 1e21
  maxE: 9e15,                       // Maximum exponent
  minE: -9e15,                      // Minimum exponent
  modulo: Decimal.ROUND_HALF_EVEN   // Modulo rounding mode
});
```

**Key Settings**:
- **34 digits precision**: Matches IEEE 754-2008 decimal128 standard
- **Banker's rounding**: Eliminates bias in repeated rounding operations
- **Large range**: Supports values from 1e-9000000000000000 to 1e+9000000000000000

## FinancialDecimal Class

### Core Factory Methods

#### Generic Creation

```typescript
static create(value: string | number | Decimal): Result<FinancialDecimal, any>
```

**Purpose**: Create FinancialDecimal from various input types with validation.

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

// From string (recommended for exact values)
const priceResult = FinancialDecimal.create("123.45");
match(
  price => console.log("Price:", price.toString()),
  error => console.error("Creation failed:", error),
  priceResult
);

// From number (be aware of floating-point input issues)
const numResult = FinancialDecimal.create(123.45);

// From existing Decimal
const decResult = FinancialDecimal.create(new Decimal("123.45"));
```

**Validation**:
- Rejects NaN values
- Rejects infinite values
- Validates decimal creation success

#### Price Creation

```typescript
static createPrice(value: string | number | Decimal): Result<FinancialDecimal, any>
```

**Purpose**: Create FinancialDecimal for price values (must be positive).

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const priceResult = FinancialDecimal.createPrice("65000.50");
match(
  price => console.log("Valid price:", price.toString()),
  error => console.error("Invalid price:", error),
  priceResult
);

// Error cases
FinancialDecimal.createPrice("0");      // INVALID_PRICE (not positive)
FinancialDecimal.createPrice("-100");   // INVALID_PRICE (negative)
```

#### Size Creation

```typescript
static createSize(value: string | number | Decimal): Result<FinancialDecimal, any>
```

**Purpose**: Create FinancialDecimal for size/volume values (must be non-negative).

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const sizeResult = FinancialDecimal.createSize("1.5");
match(
  size => console.log("Valid size:", size.toString()),
  error => console.error("Invalid size:", error),
  sizeResult
);

// Valid edge case
FinancialDecimal.createSize("0"); // Valid (zero size allowed)

// Error case
FinancialDecimal.createSize("-1"); // INVALID_SIZE (negative)
```

### Mathematical Operations

#### Basic Arithmetic

```typescript
// Addition
add(other: FinancialDecimal): FinancialDecimal

// Subtraction  
subtract(other: FinancialDecimal): FinancialDecimal

// Multiplication
multiply(other: FinancialDecimal): FinancialDecimal

// Division (returns Result due to division by zero possibility)
divide(other: FinancialDecimal): Result<FinancialDecimal, any>
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { flatMap, match } from '@qi/base';

const price1 = FinancialDecimal.create("65000.50").value; // Assume success
const price2 = FinancialDecimal.create("1000.25").value;

// Safe arithmetic operations
const sum = price1.add(price2);          // 66000.75
const difference = price1.subtract(price2); // 64000.25
const product = price1.multiply(price2);    // 65,016,331.25

// Division with error handling
const divisionResult = price1.divide(price2);
match(
  quotient => console.log("Quotient:", quotient.toString()),
  error => console.error("Division failed:", error),
  divisionResult
);

// Division by zero protection
const zero = FinancialDecimal.create("0").value;
const divByZeroResult = price1.divide(zero);
// Returns DIVISION_BY_ZERO error
```

#### Comparison Operations

```typescript
equals(other: FinancialDecimal): boolean
lessThan(other: FinancialDecimal): boolean
lessThanOrEqual(other: FinancialDecimal): boolean
greaterThan(other: FinancialDecimal): boolean
greaterThanOrEqual(other: FinancialDecimal): boolean
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const price1 = FinancialDecimal.create("65000.50").value;
const price2 = FinancialDecimal.create("65000.50").value;
const price3 = FinancialDecimal.create("65001.00").value;

// Exact equality (no floating-point precision issues)
price1.equals(price2); // true
price1.equals(price3); // false

// Comparisons
price1.lessThan(price3);        // true
price3.greaterThan(price1);     // true
price1.lessThanOrEqual(price2); // true

// Safe ordering for market data
const bids = [price3, price1, price2].sort((a, b) => 
  a.greaterThan(b) ? -1 : a.lessThan(b) ? 1 : 0
); // Descending order
```

#### Utility Methods

```typescript
isZero(): boolean
isPositive(): boolean
isNegative(): boolean
abs(): FinancialDecimal
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const value = FinancialDecimal.create("-123.45").value;

value.isNegative(); // true
value.isPositive(); // false
value.isZero();     // false

const absolute = value.abs(); // 123.45
absolute.isPositive(); // true
```

### Financial Calculations

#### Percentage Change

```typescript
percentageChange(newValue: FinancialDecimal): Result<FinancialDecimal, any>
```

**Formula**: `((new - old) / old) * 100`

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const oldPrice = FinancialDecimal.create("65000.00").value;
const newPrice = FinancialDecimal.create("66300.00").value;

const changeResult = oldPrice.percentageChange(newPrice);
match(
  change => console.log(`Price change: ${change.toString()}%`), // 2.00%
  error => console.error("Change calculation failed:", error),
  changeResult
);

// Error case: Division by zero
const zero = FinancialDecimal.create("0").value;
const invalidChange = zero.percentageChange(newPrice);
// Returns PERCENTAGE_CHANGE_ZERO_BASE error
```

#### Basis Points Change

```typescript
basisPointsChange(newValue: FinancialDecimal): Result<FinancialDecimal, any>
```

**Formula**: `((new - old) / old) * 10000`

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const oldPrice = FinancialDecimal.create("65000.00").value;
const newPrice = FinancialDecimal.create("65013.00").value;

const bpsResult = oldPrice.basisPointsChange(newPrice);
match(
  bps => console.log(`Change: ${bps.toString()} basis points`), // 2.00 bps
  error => console.error("Basis points calculation failed:", error),
  bpsResult
);
```

#### Spread Calculation

```typescript
static calculateSpread(
  bid: FinancialDecimal, 
  ask: FinancialDecimal
): Result<FinancialDecimal, any>
```

**Formula**: `ask - bid`

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const bid = FinancialDecimal.create("64999.50").value;
const ask = FinancialDecimal.create("65000.50").value;

const spreadResult = FinancialDecimal.calculateSpread(bid, ask);
match(
  spread => console.log(`Spread: ${spread.toString()}`), // 1.00
  error => console.error("Spread calculation failed:", error),
  spreadResult
);

// Crossed market protection
const crossedResult = FinancialDecimal.calculateSpread(ask, bid);
// Returns CROSSED_MARKET error
```

#### Spread Percentage

```typescript
static calculateSpreadPercentage(
  bid: FinancialDecimal,
  ask: FinancialDecimal  
): Result<FinancialDecimal, any>
```

**Formula**: `spread / ((bid + ask) / 2) * 100`

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const bid = FinancialDecimal.create("64999.50").value;
const ask = FinancialDecimal.create("65000.50").value;

const spreadPctResult = FinancialDecimal.calculateSpreadPercentage(bid, ask);
match(
  pct => console.log(`Spread: ${pct.toString()}%`), // ~0.0015%
  error => console.error("Spread percentage calculation failed:", error),
  spreadPctResult
);
```

#### Weighted Average

```typescript
static calculateWeightedAverage(
  prices: FinancialDecimal[],
  weights: FinancialDecimal[]
): Result<FinancialDecimal, any>
```

**Formula**: `Σ(price[i] * weight[i]) / Σ(weight[i])`

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

const prices = [
  FinancialDecimal.create("65000").value,
  FinancialDecimal.create("65100").value,
  FinancialDecimal.create("65200").value
];

const weights = [
  FinancialDecimal.create("2.0").value,  // 2.0 BTC
  FinancialDecimal.create("1.5").value,  // 1.5 BTC  
  FinancialDecimal.create("0.5").value   // 0.5 BTC
];

const avgResult = FinancialDecimal.calculateWeightedAverage(prices, weights);
match(
  avg => console.log(`VWAP: ${avg.toString()}`),
  error => console.error("VWAP calculation failed:", error),
  avgResult
);
```

### Formatting and Conversion

#### String Conversion

```typescript
toString(): string                           // Default decimal representation
toFixed(decimalPlaces: number): string      // Fixed decimal places
toPrecision(significantDigits: number): string // Significant digits
toJSON(): string                            // JSON serialization
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const price = FinancialDecimal.create("65000.123456789").value;

price.toString();        // "65000.123456789"
price.toFixed(2);        // "65000.12"
price.toFixed(8);        // "65000.12345679"
price.toPrecision(6);    // "65000.1"
price.toJSON();          // "65000.123456789"
```

#### Number Conversion

```typescript
toNumber(): number
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const price = FinancialDecimal.create("65000.50").value;
const jsNumber = price.toNumber(); // 65000.5

// Warning: Precision may be lost for very large or very precise numbers
const preciseValue = FinancialDecimal.create("123456789.123456789123456789").value;
const lossyNumber = preciseValue.toNumber(); // May lose precision
```

## Utility Functions

### String Parsing

```typescript
export function parsePrice(priceStr: string): Result<FinancialDecimal, any>
export function parseSize(sizeStr: string): Result<FinancialDecimal, any>
```

**Example Usage**:
```typescript
import { parsePrice, parseSize } from '@qi/dp/utils';
import { match } from '@qi/base';

// Parse price from string input
const priceResult = parsePrice("  65000.50  "); // Trims whitespace
match(
  price => console.log("Parsed price:", price.toString()),
  error => console.error("Price parsing failed:", error),
  priceResult
);

// Parse size with validation
const sizeResult = parseSize("1.5");
match(
  size => console.log("Parsed size:", size.toString()),
  error => console.error("Size parsing failed:", error),
  sizeResult
);

// Error cases
parsePrice("");        // INVALID_PRICE_STRING
parsePrice("abc");     // INVALID_PRICE
parseSize("-1");       // INVALID_SIZE
```

### Formatting Functions

```typescript
export function formatPrice(price: FinancialDecimal, decimalPlaces = 8): string
export function formatPercentage(percentage: FinancialDecimal, decimalPlaces = 2): string  
export function formatBasisPoints(basisPoints: FinancialDecimal, decimalPlaces = 0): string
```

**Example Usage**:
```typescript
import { 
  FinancialDecimal, 
  formatPrice, 
  formatPercentage, 
  formatBasisPoints 
} from '@qi/dp/utils';

const price = FinancialDecimal.create("65000.123456789").value;
const percentage = FinancialDecimal.create("2.5678").value;
const bps = FinancialDecimal.create("25.678").value;

formatPrice(price);         // "65000.12345679" (8 decimal places)
formatPrice(price, 2);      // "65000.12" (2 decimal places)
formatPercentage(percentage); // "2.57%" (2 decimal places)
formatBasisPoints(bps);     // "26 bps" (0 decimal places)
```

### Constant Creation

```typescript
export function zero(): Result<FinancialDecimal, any>
export function one(): Result<FinancialDecimal, any>
```

**Example Usage**:
```typescript
import { zero, one } from '@qi/dp/utils';
import { match } from '@qi/base';

const zeroResult = zero();
const oneResult = one();

match(
  z => match(
    o => {
      console.log("Zero:", z.toString()); // "0"
      console.log("One:", o.toString());  // "1" 
      console.log("Sum:", z.add(o).toString()); // "1"
    },
    error => console.error("One creation failed:", error),
    oneResult
  ),
  error => console.error("Zero creation failed:", error),
  zeroResult
);
```

### Type Guard

```typescript
export function isFinancialDecimal(value: unknown): value is FinancialDecimal
```

**Example Usage**:
```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const price = FinancialDecimal.create("123.45").value;
const notPrice = "123.45";

isFinancialDecimal(price);    // true
isFinancialDecimal(notPrice); // false

// Type guard usage
function processValue(value: unknown) {
  if (isFinancialDecimal(value)) {
    // TypeScript knows value is FinancialDecimal
    console.log("Value:", value.toString());
  } else {
    console.log("Not a FinancialDecimal");
  }
}
```

## Integration with @qi/base

### Result Pattern Usage

All fallible operations return `Result<T, any>`:

```typescript
import { flatMap, map, match } from '@qi/base';
import { FinancialDecimal } from '@qi/dp/utils';

// Chain decimal operations with error handling
const calculateTotalValue = (price: string, quantity: string) => {
  return flatMap(
    p => flatMap(
      q => p.multiply(q),
      FinancialDecimal.createSize(quantity)
    ),
    FinancialDecimal.createPrice(price)
  );
};

const result = calculateTotalValue("65000.50", "1.5");
match(
  total => console.log(`Total value: ${total.toString()}`),
  error => console.error("Calculation failed:", error),
  result
);
```

### Error Integration

Uses `createMarketDataError` for consistent error handling:

```typescript
// Error codes used:
// - INVALID_DECIMAL: Invalid decimal value
// - DECIMAL_CREATION_ERROR: Decimal.js creation failed
// - INVALID_PRICE: Price validation failed
// - INVALID_SIZE: Size validation failed
// - DIVISION_BY_ZERO: Division by zero attempted
// - PERCENTAGE_CHANGE_ZERO_BASE: Percentage change from zero
// - BASIS_POINTS_ZERO_BASE: Basis points from zero
// - CROSSED_MARKET: Ask < bid in spread calculation
// - MISMATCHED_ARRAYS: Array length mismatch
// - EMPTY_ARRAYS: Empty array provided
// - ZERO_TOTAL_WEIGHT: Zero total weight in weighted average
```

## Common Usage Patterns

### Price Aggregation

```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { flatMap } from '@qi/base';

const aggregatePrices = (prices: string[]) => {
  return flatMap(total => {
    return prices.reduce((acc, priceStr) => {
      return flatMap(sum => 
        flatMap(price => 
          sum.add(price),
          FinancialDecimal.createPrice(priceStr)
        ),
        acc
      );
    }, zero());
  }, zero());
};

const totalResult = aggregatePrices(["100.50", "200.25", "150.75"]);
```

### Volume-Weighted Average Price (VWAP)

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

interface Trade {
  price: string;
  volume: string;
}

const calculateVWAP = (trades: Trade[]) => {
  const prices = trades.map(t => FinancialDecimal.createPrice(t.price));
  const volumes = trades.map(t => FinancialDecimal.createSize(t.volume));
  
  // Extract successful results
  const successfulPrices = prices.filter(r => r.tag === 'success').map(r => r.value);
  const successfulVolumes = volumes.filter(r => r.tag === 'success').map(r => r.value);
  
  if (successfulPrices.length !== successfulVolumes.length) {
    throw new Error("Price/volume count mismatch");
  }
  
  return FinancialDecimal.calculateWeightedAverage(successfulPrices, successfulVolumes);
};
```

### Spread Analysis

```typescript
import { FinancialDecimal } from '@qi/dp/utils';
import { match } from '@qi/base';

interface QuoteData {
  bid: string;
  ask: string;
}

const analyzeSpread = (quote: QuoteData) => {
  const bid = FinancialDecimal.createPrice(quote.bid);
  const ask = FinancialDecimal.createPrice(quote.ask);
  
  if (bid.tag === 'success' && ask.tag === 'success') {
    const spreadResult = FinancialDecimal.calculateSpread(bid.value, ask.value);
    const spreadPctResult = FinancialDecimal.calculateSpreadPercentage(bid.value, ask.value);
    
    match(
      spread => match(
        pct => console.log(`Spread: ${spread.toString()} (${pct.toFixed(4)}%)`),
        error => console.error("Spread percentage failed:", error),
        spreadPctResult
      ),
      error => console.error("Spread calculation failed:", error),
      spreadResult
    );
  }
};
```

### Market Data Validation

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

const validateMarketPrices = (data: any[]) => {
  return data.every(item => {
    if (!isFinancialDecimal(item.price)) {
      const priceResult = FinancialDecimal.createPrice(item.price);
      return priceResult.tag === 'success';
    }
    return item.price.isPositive();
  });
};
```

## Performance Considerations

### String Input Preference

Use string inputs for exact decimal values:

```typescript
// Preferred: Exact decimal representation
FinancialDecimal.create("123.45");

// Avoid: Floating-point input (may have precision issues)
FinancialDecimal.create(123.45); // May not be exactly 123.45
```

### Reuse Decimal Objects

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

// Reuse common values
const ZERO = FinancialDecimal.create("0").value;
const ONE = FinancialDecimal.create("1").value;
const HUNDRED = FinancialDecimal.create("100").value;

// Use in calculations
const percentage = difference.multiply(HUNDRED).divide(base);
```

### Batch Operations

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

// Efficient bulk processing
const processPriceBatch = (prices: string[]) => {
  const decimals = prices.map(p => FinancialDecimal.createPrice(p));
  
  // Separate successes and failures for bulk processing
  const valid = decimals.filter(r => r.tag === 'success').map(r => r.value);
  const errors = decimals.filter(r => r.tag === 'failure').map(r => r.error);
  
  return { valid, errors };
};
```

This module provides precise decimal arithmetic essential for accurate financial calculations while maintaining clean integration with the @qi/base Result pattern and DSL types.