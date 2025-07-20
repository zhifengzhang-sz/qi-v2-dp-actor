# Financial Precision Utilities

This document covers financial precision utilities and advanced decimal arithmetic for market data applications that require more than basic DSL operations.

## Overview

While the DSL uses `Decimal` type for guaranteed 8-decimal precision, some applications need advanced financial calculations, custom validation, and presentation formatting. These utilities are available in `lib/src/utils/financial-decimal.ts`.

## FinancialDecimal Class

Enhanced wrapper around `decimal.js` with financial-specific validation and operations:

```typescript
import { FinancialDecimal } from '@qi/dp/utils';

// Create from various input types
const price = FinancialDecimal.createPrice("45678.12345678");  // Must be positive
const size = FinancialDecimal.createSize("1000.50000000");    // Must be non-negative
const decimal = FinancialDecimal.create("123.456789");        // General decimal

// All creation methods return Result<FinancialDecimal> for error handling
match(
  value => console.log(`Created: ${value.toString()}`),
  error => console.log(`Error: ${error.message}`),
  price
);
```

## Configuration

Configured for financial precision with 34-digit accuracy:

```typescript
// Decimal.js configuration (automatically applied)
{
  precision: 34,                    // 34 significant digits (IEEE 754-2008 decimal128)
  rounding: ROUND_HALF_EVEN,       // Banker's rounding for financial accuracy
  toExpNeg: -7,                    // Exponential notation for numbers < 1e-7
  toExpPos: 21,                    // Exponential notation for numbers >= 1e21
  maxE: 9e15,                      // Maximum exponent
  minE: -9e15,                     // Minimum exponent
}
```

## Financial Calculations

### Basic Arithmetic
```typescript
const price1 = FinancialDecimal.createPrice("100.12345678");
const price2 = FinancialDecimal.createPrice("50.87654321");

// All operations preserve precision
const sum = price1.add(price2);           // 151.00000000
const difference = price1.subtract(price2); // 49.24691358
const product = price1.multiply(price2);    // 5100.84399985

// Division returns Result<FinancialDecimal> (handles division by zero)
const quotient = price1.divide(price2);
match(
  result => console.log(`Result: ${result.toString()}`),
  error => console.log(`Division error: ${error.message}`),
  quotient
);
```

### Financial Metrics
```typescript
// Percentage change calculation
const oldPrice = FinancialDecimal.createPrice("100.00000000");
const newPrice = FinancialDecimal.createPrice("105.25000000");

const percentChange = oldPrice.percentageChange(newPrice);
// Returns: Result<FinancialDecimal> representing 5.25%

// Basis points change (1 basis point = 0.01%)
const basisPoints = oldPrice.basisPointsChange(newPrice);
// Returns: Result<FinancialDecimal> representing 525 basis points

// Bid-ask spread calculation
const bid = FinancialDecimal.createPrice("100.12345678");
const ask = FinancialDecimal.createPrice("100.15678901");

const spread = FinancialDecimal.calculateSpread(bid, ask);
// Returns: Result<FinancialDecimal> representing 0.03333223

const spreadPercentage = FinancialDecimal.calculateSpreadPercentage(bid, ask);
// Returns: Result<FinancialDecimal> representing spread as percentage of mid-price
```

### Advanced Calculations
```typescript
// Volume Weighted Average Price (VWAP)
const prices = [
  FinancialDecimal.createPrice("100.12345678"),
  FinancialDecimal.createPrice("100.25000000"),
  FinancialDecimal.createPrice("100.18750000")
];

const volumes = [
  FinancialDecimal.createSize("1000.00000000"),
  FinancialDecimal.createSize("1500.00000000"),
  FinancialDecimal.createSize("750.00000000")
];

const vwap = FinancialDecimal.calculateWeightedAverage(prices, volumes);
// Returns: Result<FinancialDecimal> representing the VWAP
```

## Utility Functions

### Parsing and Validation
```typescript
// Parse string values with validation
const priceResult = parsePrice("45678.12345678");
const sizeResult = parseSize("1000.50000000");

// Type guard for runtime checking
if (isFinancialDecimal(someValue)) {
  // TypeScript knows someValue is FinancialDecimal
  console.log(someValue.toString());
}
```

### Comparison Operations
```typescript
const price1 = FinancialDecimal.createPrice("100.12345678");
const price2 = FinancialDecimal.createPrice("100.12345679");

// Precise comparison operations
price1.equals(price2);              // false
price1.lessThan(price2);            // true
price1.greaterThan(price2);         // false
price1.lessThanOrEqual(price2);     // true
price1.greaterThanOrEqual(price2);  // false

// Utility checks
price1.isZero();                    // false
price1.isPositive();                // true
price1.isNegative();                // false
```

### Conversion and Output
```typescript
const price = FinancialDecimal.createPrice("45678.12345678");

// Convert to various formats
price.toNumber();                   // 45678.12345678 (JavaScript number)
price.toString();                   // "45678.12345678"
price.toFixed(4);                   // "45678.1235"
price.toPrecision(8);               // "45678.123"
price.toJSON();                     // "45678.12345678" (for JSON serialization)

// Absolute value
const negative = FinancialDecimal.create("-123.456");
negative.abs().toString();          // "123.456"
```

## Error Handling

All operations use `Result<T>` pattern for functional error handling:

```typescript
// Creation errors
const invalidPrice = FinancialDecimal.createPrice("-100.00"); // Prices must be positive
match(
  price => console.log(`Valid price: ${price.toString()}`),
  error => console.log(`Invalid: ${error.message}`), // "Price must be positive"
  invalidPrice
);

// Division by zero
const divisionResult = price.divide(FinancialDecimal.create("0"));
match(
  result => console.log(`Result: ${result.toString()}`),
  error => console.log(`Error: ${error.message}`), // "Cannot divide by zero"
  divisionResult
);

// Percentage change from zero base
const zeroBase = FinancialDecimal.create("0");
const changeResult = zeroBase.percentageChange(FinancialDecimal.create("100"));
match(
  change => console.log(`Change: ${change.toString()}%`),
  error => console.log(`Error: ${error.message}`), // "Cannot calculate percentage change from zero"
  changeResult
);
```

## Integration with DSL

The DSL uses pure `Decimal` types, while utilities provide enhanced functionality:

```typescript
// DSL interface uses Decimal
interface Price {
  readonly price: Decimal;    // Pure decimal.js type
  readonly size: Decimal;
}

// Convert to FinancialDecimal for advanced operations
const priceData: Price = { price: new Decimal("100.12345678"), size: new Decimal("1000") };

const enhancedPrice = FinancialDecimal.create(priceData.price.toString());
const calculations = enhancedPrice.percentageChange(otherPrice);
```

## Performance Considerations

- **Use for critical calculations**: Spread calculations, VWAP, risk metrics
- **Not needed for simple operations**: Basic DSL data handling
- **Memory overhead**: FinancialDecimal objects use more memory than primitive Decimals
- **Computational cost**: Complex validations and Result wrapping add overhead

## Best Practices

1. **Use DSL Decimal types** for data contracts and simple operations
2. **Use FinancialDecimal utilities** for complex financial calculations
3. **Handle Result types** properly with `match()` or explicit checking
4. **Validate inputs** at API boundaries using creation methods
5. **Convert once** - avoid repeated conversions between types

## Summary

- **DSL**: Pure `Decimal` types for guaranteed 8-decimal precision
- **Utilities**: `FinancialDecimal` class for advanced financial operations
- **Error handling**: Result<T> pattern for all operations
- **Performance**: Use utilities only when advanced features are needed
- **Integration**: Convert between types only when necessary

This separation keeps the DSL clean and focused while providing powerful financial tools for applications that need them.