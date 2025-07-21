/**
 * FinancialDecimal - Safe decimal arithmetic for financial calculations
 * Implements: docs/utils/md/precision.md FinancialDecimal Class
 *
 * JavaScript's IEEE 754 floating-point arithmetic is unsuitable for financial calculations
 * due to precision loss. This class uses decimal.js to provide exact decimal arithmetic
 * with guaranteed precision.
 */

import { failure, success } from "@qi/base";
import type { Result } from "@qi/base";
import Decimal from "decimal.js";
import { createMarketDataError } from "../errors.js";

// Configure decimal.js for financial precision requirements
Decimal.set({
  precision: 34, // IEEE 754-2008 decimal128 precision
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding (ties to even)
  toExpNeg: -7, // Exponential notation for < 1e-7
  toExpPos: 21, // Exponential notation for >= 1e21
  maxE: 9e15, // Maximum exponent
  minE: -9e15, // Minimum exponent
  modulo: Decimal.ROUND_HALF_EVEN, // Modulo rounding mode
});

/**
 * FinancialDecimal provides safe decimal arithmetic for financial calculations
 */
export class FinancialDecimal {
  private readonly decimal: Decimal;

  private constructor(decimal: Decimal) {
    this.decimal = decimal;
  }

  // Core Factory Methods

  /**
   * Create FinancialDecimal from various input types with validation
   * @param value String, number, or Decimal input
   * @returns Result<FinancialDecimal> with validation
   */
  static create(value: string | number | Decimal): Result<FinancialDecimal, any> {
    try {
      // Check for invalid inputs first
      if (typeof value === "number") {
        if (Number.isNaN(value)) {
          return failure(
            createMarketDataError("INVALID_DECIMAL", "Value cannot be NaN", "VALIDATION", {
              value: value,
            })
          );
        }
        if (!Number.isFinite(value)) {
          return failure(
            createMarketDataError("INVALID_DECIMAL", "Value must be finite", "VALIDATION", {
              value: value,
            })
          );
        }
      }

      const decimal = new Decimal(value);
      return success(new FinancialDecimal(decimal));
    } catch (error) {
      return failure(
        createMarketDataError("DECIMAL_CREATION_ERROR", "Failed to create decimal", "VALIDATION", {
          value: value,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Create FinancialDecimal for price values (must be positive)
   * @param value String, number, or Decimal input
   * @returns Result<FinancialDecimal> with price validation
   */
  static createPrice(value: string | number | Decimal): Result<FinancialDecimal, any> {
    const result = FinancialDecimal.create(value);
    if (result.tag === "failure") {
      return result;
    }

    if (!result.value.isPositive() || result.value.isZero()) {
      return failure(
        createMarketDataError("INVALID_PRICE", "Price must be positive", "VALIDATION", {
          value: value,
        })
      );
    }

    return result;
  }

  /**
   * Create FinancialDecimal for size/volume values (must be non-negative)
   * @param value String, number, or Decimal input
   * @returns Result<FinancialDecimal> with size validation
   */
  static createSize(value: string | number | Decimal): Result<FinancialDecimal, any> {
    const result = FinancialDecimal.create(value);
    if (result.tag === "failure") {
      return result;
    }

    if (result.value.isNegative()) {
      return failure(
        createMarketDataError("INVALID_SIZE", "Size must be non-negative", "VALIDATION", {
          value: value,
        })
      );
    }

    return result;
  }

  // Mathematical Operations

  /**
   * Add another FinancialDecimal
   * @param other FinancialDecimal to add
   * @returns New FinancialDecimal with sum
   */
  add(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.decimal.add(other.decimal));
  }

  /**
   * Subtract another FinancialDecimal
   * @param other FinancialDecimal to subtract
   * @returns New FinancialDecimal with difference
   */
  subtract(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.decimal.sub(other.decimal));
  }

  /**
   * Multiply by another FinancialDecimal
   * @param other FinancialDecimal to multiply by
   * @returns New FinancialDecimal with product
   */
  multiply(other: FinancialDecimal): FinancialDecimal {
    return new FinancialDecimal(this.decimal.mul(other.decimal));
  }

  /**
   * Divide by another FinancialDecimal
   * @param other FinancialDecimal to divide by
   * @returns Result<FinancialDecimal> with quotient (handles division by zero)
   */
  divide(other: FinancialDecimal): Result<FinancialDecimal, any> {
    if (other.isZero()) {
      return failure(
        createMarketDataError("DIVISION_BY_ZERO", "Cannot divide by zero", "VALIDATION", {
          oldValue: this.toString(),
          newValue: other.toString(),
        })
      );
    }

    try {
      return success(new FinancialDecimal(this.decimal.div(other.decimal)));
    } catch (error) {
      return failure(
        createMarketDataError("DIVISION_ERROR", "Division operation failed", "VALIDATION", {
          oldValue: this.toString(),
          newValue: other.toString(),
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  // Comparison Operations

  /**
   * Check if equal to another FinancialDecimal
   * @param other FinancialDecimal to compare
   * @returns True if equal
   */
  equals(other: FinancialDecimal): boolean {
    return this.decimal.eq(other.decimal);
  }

  /**
   * Check if less than another FinancialDecimal
   * @param other FinancialDecimal to compare
   * @returns True if less than
   */
  lessThan(other: FinancialDecimal): boolean {
    return this.decimal.lt(other.decimal);
  }

  /**
   * Check if less than or equal to another FinancialDecimal
   * @param other FinancialDecimal to compare
   * @returns True if less than or equal
   */
  lessThanOrEqual(other: FinancialDecimal): boolean {
    return this.decimal.lte(other.decimal);
  }

  /**
   * Check if greater than another FinancialDecimal
   * @param other FinancialDecimal to compare
   * @returns True if greater than
   */
  greaterThan(other: FinancialDecimal): boolean {
    return this.decimal.gt(other.decimal);
  }

  /**
   * Check if greater than or equal to another FinancialDecimal
   * @param other FinancialDecimal to compare
   * @returns True if greater than or equal
   */
  greaterThanOrEqual(other: FinancialDecimal): boolean {
    return this.decimal.gte(other.decimal);
  }

  // Utility Methods

  /**
   * Check if value is zero
   * @returns True if zero
   */
  isZero(): boolean {
    return this.decimal.isZero();
  }

  /**
   * Check if value is positive (greater than zero)
   * @returns True if positive
   */
  isPositive(): boolean {
    return this.decimal.isPositive() && !this.decimal.isZero();
  }

  /**
   * Check if value is negative
   * @returns True if negative
   */
  isNegative(): boolean {
    return this.decimal.isNegative();
  }

  /**
   * Get absolute value
   * @returns New FinancialDecimal with absolute value
   */
  abs(): FinancialDecimal {
    return new FinancialDecimal(this.decimal.abs());
  }

  // Financial Calculations

  /**
   * Calculate percentage change from this value to new value
   * Formula: ((new - old) / old) * 100
   * @param newValue New value for comparison
   * @returns Result<FinancialDecimal> with percentage change
   */
  percentageChange(newValue: FinancialDecimal): Result<FinancialDecimal, any> {
    if (this.isZero()) {
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

    try {
      // ((new - old) / old) * 100
      const difference = newValue.subtract(this);
      const ratio = difference.decimal.div(this.decimal);
      const percentage = ratio.mul(100);
      return success(new FinancialDecimal(percentage));
    } catch (error) {
      return failure(
        createMarketDataError(
          "PERCENTAGE_CHANGE_ERROR",
          "Percentage change calculation failed",
          "VALIDATION",
          {
            oldValue: this.toString(),
            newValue: newValue.toString(),
            error: error instanceof Error ? error.message : String(error),
          }
        )
      );
    }
  }

  /**
   * Calculate basis points change from this value to new value
   * Formula: ((new - old) / old) * 10000
   * @param newValue New value for comparison
   * @returns Result<FinancialDecimal> with basis points change
   */
  basisPointsChange(newValue: FinancialDecimal): Result<FinancialDecimal, any> {
    if (this.isZero()) {
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

    try {
      // ((new - old) / old) * 10000
      const difference = newValue.subtract(this);
      const ratio = difference.decimal.div(this.decimal);
      const basisPoints = ratio.mul(10000);
      return success(new FinancialDecimal(basisPoints));
    } catch (error) {
      return failure(
        createMarketDataError(
          "BASIS_POINTS_ERROR",
          "Basis points calculation failed",
          "VALIDATION",
          {
            oldValue: this.toString(),
            newValue: newValue.toString(),
            error: error instanceof Error ? error.message : String(error),
          }
        )
      );
    }
  }

  // Static Financial Calculations

  /**
   * Calculate bid-ask spread
   * Formula: ask - bid
   * @param bid Bid price
   * @param ask Ask price
   * @returns Result<FinancialDecimal> with spread
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
            bid: Number(bid.toString()),
            price: Number(ask.toString()),
          }
        )
      );
    }

    return success(ask.subtract(bid));
  }

  /**
   * Calculate spread percentage
   * Formula: spread / ((bid + ask) / 2) * 100
   * @param bid Bid price
   * @param ask Ask price
   * @returns Result<FinancialDecimal> with spread percentage
   */
  static calculateSpreadPercentage(
    bid: FinancialDecimal,
    ask: FinancialDecimal
  ): Result<FinancialDecimal, any> {
    const spreadResult = FinancialDecimal.calculateSpread(bid, ask);
    if (spreadResult.tag === "failure") {
      return spreadResult;
    }

    try {
      // Calculate midpoint: (bid + ask) / 2
      const sum = bid.add(ask);
      const two = new FinancialDecimal(new Decimal(2));
      const midpoint = sum.decimal.div(two.decimal);

      if (midpoint.isZero()) {
        return failure(
          createMarketDataError(
            "SPREAD_PERCENTAGE_ZERO_MID",
            "Cannot calculate spread percentage with zero midpoint",
            "VALIDATION",
            {
              bid: Number(bid.toString()),
              price: Number(ask.toString()),
            }
          )
        );
      }

      // Calculate percentage: (spread / midpoint) * 100
      const percentage = spreadResult.value.decimal.div(midpoint).mul(100);
      return success(new FinancialDecimal(percentage));
    } catch (error) {
      return failure(
        createMarketDataError(
          "SPREAD_PERCENTAGE_ERROR",
          "Spread percentage calculation failed",
          "VALIDATION",
          {
            bid: Number(bid.toString()),
            price: Number(ask.toString()),
            error: error instanceof Error ? error.message : String(error),
          }
        )
      );
    }
  }

  /**
   * Calculate weighted average
   * Formula: Σ(price[i] * weight[i]) / Σ(weight[i])
   * @param prices Array of prices
   * @param weights Array of weights
   * @returns Result<FinancialDecimal> with weighted average
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
          "VALIDATION",
          {}
        )
      );
    }

    try {
      let weightedSum = new FinancialDecimal(new Decimal(0));
      let totalWeight = new FinancialDecimal(new Decimal(0));

      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const weight = weights[i];

        if (!price || !weight) {
          return failure(
            createMarketDataError(
              "INVALID_ARRAY_ELEMENT",
              "Invalid price or weight at index",
              "VALIDATION",
              {
                value: i,
              }
            )
          );
        }

        if (weight.isNegative()) {
          return failure(
            createMarketDataError("NEGATIVE_WEIGHT", "Weights cannot be negative", "VALIDATION", {
              value: i,
              size: Number(weight.toString()),
            })
          );
        }

        const weightedPrice = price.multiply(weight);
        weightedSum = weightedSum.add(weightedPrice);
        totalWeight = totalWeight.add(weight);
      }

      if (totalWeight.isZero()) {
        return failure(
          createMarketDataError("ZERO_TOTAL_WEIGHT", "Total weight cannot be zero", "VALIDATION", {
            size: Number(totalWeight.toString()),
          })
        );
      }

      const averageResult = weightedSum.divide(totalWeight);
      return averageResult;
    } catch (error) {
      return failure(
        createMarketDataError(
          "WEIGHTED_AVERAGE_ERROR",
          "Weighted average calculation failed",
          "VALIDATION",
          {
            error: error instanceof Error ? error.message : String(error),
          }
        )
      );
    }
  }

  // Formatting and Conversion

  /**
   * Default decimal representation
   * @returns String representation
   */
  toString(): string {
    return this.decimal.toString();
  }

  /**
   * Fixed decimal places
   * @param decimalPlaces Number of decimal places
   * @returns Formatted string
   */
  toFixed(decimalPlaces: number): string {
    return this.decimal.toFixed(decimalPlaces);
  }

  /**
   * Significant digits
   * @param significantDigits Number of significant digits
   * @returns Formatted string
   */
  toPrecision(significantDigits: number): string {
    return this.decimal.toPrecision(significantDigits);
  }

  /**
   * JSON serialization
   * @returns String for JSON
   */
  toJSON(): string {
    return this.decimal.toString();
  }

  /**
   * Convert to JavaScript number (warning: precision may be lost)
   * @returns JavaScript number
   */
  toNumber(): number {
    return this.decimal.toNumber();
  }
}
