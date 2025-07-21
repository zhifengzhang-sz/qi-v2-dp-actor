/**
 * Utility functions for financial precision operations
 * Implements: docs/utils/md/precision.md Utility Functions
 */

import { failure, success } from "@qi/base";
import type { Result } from "@qi/base";
import { createMarketDataError } from "../errors.js";
import { FinancialDecimal } from "./financial-decimal.js";

/**
 * Parse price from string with validation
 * @param priceStr String representation of price
 * @returns Result<FinancialDecimal> with price validation
 */
export function parsePrice(priceStr: string): Result<FinancialDecimal, any> {
  if (typeof priceStr !== "string") {
    return failure(
      createMarketDataError("INVALID_PRICE_STRING", "Price must be a string", "VALIDATION", {
        value: priceStr,
        error: typeof priceStr,
      })
    );
  }

  const trimmed = priceStr.trim();
  if (trimmed === "") {
    return failure(
      createMarketDataError("INVALID_PRICE_STRING", "Price string cannot be empty", "VALIDATION", {
        value: priceStr,
      })
    );
  }

  return FinancialDecimal.createPrice(trimmed);
}

/**
 * Parse size from string with validation
 * @param sizeStr String representation of size
 * @returns Result<FinancialDecimal> with size validation
 */
export function parseSize(sizeStr: string): Result<FinancialDecimal, any> {
  if (typeof sizeStr !== "string") {
    return failure(
      createMarketDataError("INVALID_SIZE_STRING", "Size must be a string", "VALIDATION", {
        value: sizeStr,
        error: typeof sizeStr,
      })
    );
  }

  const trimmed = sizeStr.trim();
  if (trimmed === "") {
    return failure(
      createMarketDataError("INVALID_SIZE_STRING", "Size string cannot be empty", "VALIDATION", {
        value: sizeStr,
      })
    );
  }

  return FinancialDecimal.createSize(trimmed);
}

/**
 * Format price with specified decimal places
 * @param price FinancialDecimal price
 * @param decimalPlaces Number of decimal places (default: 8)
 * @returns Formatted price string
 */
export function formatPrice(price: FinancialDecimal, decimalPlaces = 8): string {
  return price.toFixed(decimalPlaces);
}

/**
 * Format percentage with specified decimal places
 * @param percentage FinancialDecimal percentage
 * @param decimalPlaces Number of decimal places (default: 2)
 * @returns Formatted percentage string with % suffix
 */
export function formatPercentage(percentage: FinancialDecimal, decimalPlaces = 2): string {
  return `${percentage.toFixed(decimalPlaces)}%`;
}

/**
 * Format basis points with specified decimal places
 * @param basisPoints FinancialDecimal basis points
 * @param decimalPlaces Number of decimal places (default: 0)
 * @returns Formatted basis points string with bps suffix
 */
export function formatBasisPoints(basisPoints: FinancialDecimal, decimalPlaces = 0): string {
  return `${basisPoints.toFixed(decimalPlaces)} bps`;
}

/**
 * Create zero FinancialDecimal
 * @returns Result<FinancialDecimal> with zero value
 */
export function zero(): Result<FinancialDecimal, any> {
  return FinancialDecimal.create("0");
}

/**
 * Create one FinancialDecimal
 * @returns Result<FinancialDecimal> with one value
 */
export function one(): Result<FinancialDecimal, any> {
  return FinancialDecimal.create("1");
}

/**
 * Type guard for FinancialDecimal
 * @param value Unknown value to check
 * @returns True if value is FinancialDecimal
 */
export function isFinancialDecimal(value: unknown): value is FinancialDecimal {
  return value instanceof FinancialDecimal;
}
