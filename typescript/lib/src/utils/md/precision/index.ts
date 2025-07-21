/**
 * Precision Module - Financial Arithmetic with Decimal.js
 * Implements: docs/utils/md/precision.md Complete Precision Module
 *
 * This module provides safe decimal arithmetic for financial calculations.
 * JavaScript's IEEE 754 floating-point arithmetic is unsuitable for financial
 * calculations due to precision loss. This module uses decimal.js to provide
 * exact decimal arithmetic with guaranteed precision.
 *
 * Architectural Position: dsl/* (interfaces) → md/* (implementations) → utils/precision (pure utilities)
 * The precision module provides pure financial arithmetic utilities used by the MD layer
 * smart constructors and analytics calculations. This module has no dependencies on market data types.
 */

// Export the main FinancialDecimal class
export { FinancialDecimal } from "./financial-decimal.js";

// Export utility functions
export {
  parsePrice,
  parseSize,
  formatPrice,
  formatPercentage,
  formatBasisPoints,
  zero,
  one,
  isFinancialDecimal,
} from "./utilities.js";
