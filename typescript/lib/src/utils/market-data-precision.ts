/**
 * Financial precision arithmetic using decimal.js
 * Provides safe decimal arithmetic for market data calculations
 */

import type { Result } from "@qi/base";
import { failure, flatMap, map, match, success } from "@qi/base";
import { Decimal } from "decimal.js";
import { createMarketDataError } from "../dsl/errors.js";

// Configure Decimal.js for financial precision
// 34 significant digits (matches IEEE 754-2008 decimal128)
// Round to nearest, ties to even (banker's rounding)
Decimal.set({
  precision: 34,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -7, // Use exponential notation for numbers < 1e-7
  toExpPos: 21, // Use exponential notation for numbers >= 1e21
  maxE: 9e15, // Maximum exponent
  minE: -9e15, // Minimum exponent
  modulo: Decimal.ROUND_HALF_EVEN,
});

/**
 * Financial decimal number with guaranteed precision
 * Wraps Decimal.js with additional validation for financial data
 */
export class FinancialDecimal {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  /**
   * Create a FinancialDecimal from various input types
   */
  static create(value: string | number | Decimal): Result<FinancialDecimal, any> {
    try {
      const decimal = new Decimal(value);

      // Validate financial constraints
      if (!decimal.isFinite()) {
        return failure(
          createMarketDataError("INVALID_DECIMAL", "Value must be finite", "VALIDATION", {
            value: value.toString(),
            isFinite: false,
          })
        );
      }

      if (decimal.isNaN()) {
        return failure(
          createMarketDataError("INVALID_DECIMAL", "Value cannot be NaN", "VALIDATION", {
            value: value.toString(),
            isNaN: true,
          })
        );
      }

      return success(new FinancialDecimal(decimal));
    } catch (error) {
      return failure(
        createMarketDataError("DECIMAL_CREATION_ERROR", "Failed to create decimal", "VALIDATION", {
          value: value.toString(),
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }

  /**
   * Create a FinancialDecimal for price values (must be positive)
   */
  static createPrice(value: string | number | Decimal): Result<FinancialDecimal, any> {
    return flatMap(
      (decimal) =>
        decimal.value.lte(0)
          ? failure(
              createMarketDataError("INVALID_PRICE", "Price must be positive", "VALIDATION", {
                value: value.toString(),
                actualValue: decimal.toString(),
              })
            )
          : success(decimal),
      FinancialDecimal.create(value)
    );
  }

  /**
   * Create a FinancialDecimal for size/volume values (must be non-negative)
   */
  static createSize(value: string | number | Decimal): Result<FinancialDecimal, any> {
    return flatMap(
      (decimal) =>
        decimal.value.lt(0)
          ? failure(
              createMarketDataError("INVALID_SIZE", "Size must be non-negative", "VALIDATION", {
                value: value.toString(),
                actualValue: decimal.toString(),
              })
            )
          : success(decimal),
      FinancialDecimal.create(value)
    );
  }

  /**
   * Mathematical operations with precision guarantees
   */
  add(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.value.add(other.value));
  }

  subtract(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.value.sub(other.value));
  }

  multiply(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.value.mul(other.value));
  }

  divide(other: FinancialDecimal): Result<FinancialDecimal, any> {
    if (other.value.isZero()) {
      return failure(
        createMarketDataError("DIVISION_BY_ZERO", "Cannot divide by zero", "VALIDATION", {
          value: `${this.toString()} / ${other.toString()}`,
          field: "division",
        })
      );
    }
    return success(new FinancialDecimal(this.value.div(other.value)));
  }

  /**
   * Comparison operations
   */
  equals(other: FinancialDecimal): boolean {
    return this.value.eq(other.value);
  }

  lessThan(other: FinancialDecimal): boolean {
    return this.value.lt(other.value);
  }

  lessThanOrEqual(other: FinancialDecimal): boolean {
    return this.value.lte(other.value);
  }

  greaterThan(other: FinancialDecimal): boolean {
    return this.value.gt(other.value);
  }

  greaterThanOrEqual(other: FinancialDecimal): boolean {
    return this.value.gte(other.value);
  }

  /**
   * Utility methods
   */
  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.gt(0);
  }

  isNegative(): boolean {
    return this.value.lt(0);
  }

  abs(): FinancialDecimal {
    return new FinancialDecimal(this.value.abs());
  }

  /**
   * Rounding operations for market data
   */
  toFixed(decimalPlaces: number): string {
    return this.value.toFixed(decimalPlaces);
  }

  toPrecision(significantDigits: number): string {
    return this.value.toPrecision(significantDigits);
  }

  /**
   * Convert to various formats
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toString();
  }

  toJSON(): string {
    return this.value.toString();
  }

  /**
   * Financial calculations specific to market data
   */

  /**
   * Calculate percentage change: ((new - old) / old) * 100
   */
  percentageChange(newValue: FinancialDecimal): Result<FinancialDecimal, any> {
    if (this.value.isZero()) {
      return failure(
        createMarketDataError(
          "PERCENTAGE_CHANGE_ZERO_BASE",
          "Cannot calculate percentage change from zero",
          "VALIDATION",
          {
            oldValue: this.toString(),
            newValue: newValue.toString(),
          }
        )
      );
    }

    const difference = newValue.subtract(this);
    return flatMap((hundred) => {
      const percentage = difference.multiply(hundred);
      return percentage.divide(this);
    }, FinancialDecimal.create(100));
  }

  /**
   * Calculate basis points change: ((new - old) / old) * 10000
   */
  basisPointsChange(newValue: FinancialDecimal): Result<FinancialDecimal, any> {
    if (this.value.isZero()) {
      return failure(
        createMarketDataError(
          "BASIS_POINTS_ZERO_BASE",
          "Cannot calculate basis points from zero",
          "VALIDATION",
          {
            oldValue: this.toString(),
            newValue: newValue.toString(),
          }
        )
      );
    }

    const difference = newValue.subtract(this);
    return flatMap((tenThousand) => {
      const basisPoints = difference.multiply(tenThousand);
      return basisPoints.divide(this);
    }, FinancialDecimal.create(10000));
  }

  /**
   * Calculate bid-ask spread: ask - bid
   */
  static calculateSpread(
    bid: FinancialDecimal,
    ask: FinancialDecimal
  ): Result<FinancialDecimal, any> {
    if (ask.lessThan(bid)) {
      return failure(
        createMarketDataError(
          "CROSSED_MARKET",
          "Ask price cannot be less than bid price",
          "VALIDATION",
          {
            value: `bid: ${bid.toString()}, ask: ${ask.toString()}`,
            field: "spread",
          }
        )
      );
    }
    return success(ask.subtract(bid));
  }

  /**
   * Calculate spread as percentage of mid price: spread / ((bid + ask) / 2) * 100
   */
  static calculateSpreadPercentage(
    bid: FinancialDecimal,
    ask: FinancialDecimal
  ): Result<FinancialDecimal, any> {
    return flatMap(
      (spread) =>
        flatMap(
          (two) =>
            flatMap((midPrice) => spread.percentageChange(midPrice), bid.add(ask).divide(two)),
          FinancialDecimal.create(2)
        ),
      FinancialDecimal.calculateSpread(bid, ask)
    );
  }

  /**
   * Calculate weighted average price
   */
  static calculateWeightedAverage(
    prices: FinancialDecimal[],
    weights: FinancialDecimal[]
  ): Result<FinancialDecimal, any> {
    if (prices.length !== weights.length) {
      return failure(
        createMarketDataError(
          "MISMATCHED_ARRAYS",
          "Prices and weights arrays must have same length",
          "VALIDATION",
          {
            pricesLength: prices.length,
            weightsLength: weights.length,
          }
        )
      );
    }

    if (prices.length === 0) {
      return failure(
        createMarketDataError(
          "EMPTY_ARRAYS",
          "Cannot calculate weighted average of empty arrays",
          "VALIDATION"
        )
      );
    }

    return flatMap((zero) => {
      let weightedSum = zero;
      let totalWeight = zero;

      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const weight = weights[i];

        if (!price || !weight) {
          return failure(
            createMarketDataError(
              "UNDEFINED_VALUE",
              `Undefined price or weight at index ${i}`,
              "VALIDATION",
              {
                value: `index: ${i}, price: ${price?.toString()}, weight: ${weight?.toString()}`,
                field: "weighted_calculation",
              }
            )
          );
        }

        weightedSum = weightedSum.add(price.multiply(weight));
        totalWeight = totalWeight.add(weight);
      }

      if (totalWeight.isZero()) {
        return failure(
          createMarketDataError("ZERO_TOTAL_WEIGHT", "Total weight cannot be zero", "VALIDATION", {
            value: totalWeight.toString(),
            field: "total_weight",
          })
        );
      }

      return weightedSum.divide(totalWeight);
    }, FinancialDecimal.create(0));
  }
}

/**
 * Utility functions for common financial calculations
 */

/**
 * Parse a price string with validation
 */
export function parsePrice(priceStr: string): Result<FinancialDecimal, any> {
  if (typeof priceStr !== "string" || priceStr.trim() === "") {
    return failure(
      createMarketDataError(
        "INVALID_PRICE_STRING",
        "Price must be a non-empty string",
        "VALIDATION",
        {
          value: priceStr,
        }
      )
    );
  }

  return FinancialDecimal.createPrice(priceStr.trim());
}

/**
 * Parse a size/volume string with validation
 */
export function parseSize(sizeStr: string): Result<FinancialDecimal, any> {
  if (typeof sizeStr !== "string" || sizeStr.trim() === "") {
    return failure(
      createMarketDataError(
        "INVALID_SIZE_STRING",
        "Size must be a non-empty string",
        "VALIDATION",
        {
          value: sizeStr,
        }
      )
    );
  }

  return FinancialDecimal.createSize(sizeStr.trim());
}

/**
 * Format a decimal for display with appropriate precision
 */
export function formatPrice(price: FinancialDecimal, decimalPlaces = 8): string {
  return price.toFixed(decimalPlaces);
}

/**
 * Format a percentage with appropriate precision
 */
export function formatPercentage(percentage: FinancialDecimal, decimalPlaces = 2): string {
  return `${percentage.toFixed(decimalPlaces)}%`;
}

/**
 * Format basis points
 */
export function formatBasisPoints(basisPoints: FinancialDecimal, decimalPlaces = 0): string {
  return `${basisPoints.toFixed(decimalPlaces)} bps`;
}

/**
 * Create a zero decimal
 */
export function zero(): Result<FinancialDecimal, any> {
  return FinancialDecimal.create(0);
}

/**
 * Create a one decimal
 */
export function one(): Result<FinancialDecimal, any> {
  return FinancialDecimal.create(1);
}

/**
 * Type guard to check if a value is a FinancialDecimal
 */
export function isFinancialDecimal(value: unknown): value is FinancialDecimal {
  return value instanceof FinancialDecimal;
}
