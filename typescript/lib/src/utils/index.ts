/**
 * @qi/dp Market Data Utilities
 *
 * This module provides utilities that operate on top of the core DSL market data types.
 * These utilities are separated from the DSL to maintain clean architectural boundaries.
 */

// MD Layer - Smart constructors for DSL types
export {
  Price,
  Level1,
  OHLCV,
  MarketDepth,
  Market,
  Exchange,
  Instrument,
  DataContext,
  MarketData,
} from "../md/index.js";

// MD Layer - Convenient factory aliases
export { Price as createPrice } from "../md/price.js";
export { Level1 as createLevel1 } from "../md/level1.js";
export { OHLCV as createOHLCV } from "../md/ohlcv.js";
export { MarketDepth as createMarketDepth } from "../md/market-depth.js";
export { MarketData as createMarketData } from "../md/market-data.js";

// Analytics utilities - Business intelligence for market data (MD layer)
export type {
  // Core analytics metrics
  DominanceMetrics,
  ChangeMetrics,
  VolatilityMetrics,
  LiquidityMetrics,
  MarketAnalytics,
  // Summary and reporting types
  MarketSummary,
  TrendDirection,
  VolatilityLevel,
  LiquidityLevel,
  DataQuality,
  // Operation interfaces
  MarketAnalyticsCalculator,
  AnalyticsAggregator,
  // Configuration and input types
  AnalyticsConfig,
  AnalyticsInputData,
  // Wrapper types
  AnalyticsMarketData,
} from "./md/analytics/index.js";

export {
  // Analytics validation functions
  isValidDominanceMetrics,
  isValidChangeMetrics,
  isValidVolatilityMetrics,
  isValidLiquidityMetrics,
  isValidMarketAnalytics,
  isValidMarketSummary,
  isAnalyticsMarketData,
  // Analytics utility functions
  createAnalyticsMarketData,
} from "./md/analytics/index.js";

// Precision utilities - Financial arithmetic with decimal.js (MD layer)
export {
  FinancialDecimal,
  parsePrice,
  parseSize,
  formatPrice,
  formatPercentage,
  formatBasisPoints,
  zero,
  one,
  isFinancialDecimal,
} from "./md/precision/index.js";

// Validation utilities removed - not the responsibility of utils layer

// Error utilities - Market data domain error factories (MD layer)
export {
  createMarketDataError,
  createDataSourceError,
  createMarketDepthError,
  createStreamingError,
  createHistoricalDataError,
  // Error factory functions
  INVALID_PRICE,
  INVALID_SIZE,
  INVALID_TIMESTAMP,
  SPREAD_TOO_WIDE,
  RATE_LIMIT_EXCEEDED,
  SYMBOL_NOT_FOUND,
  API_KEY_INVALID,
  MARKET_CLOSED,
  INSUFFICIENT_DEPTH,
  INVALID_DEPTH_LEVELS,
  STREAM_DISCONNECTED,
  STREAM_BUFFER_OVERFLOW,
  MAX_RECONNECTS_EXCEEDED,
  DATE_RANGE_INVALID,
  DATE_RANGE_TOO_LARGE,
  DATA_GAPS_DETECTED,
} from "./md/errors.js";
