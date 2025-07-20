/**
 * @qi/dp Market Data Utilities
 *
 * This module provides utilities that operate on top of the core DSL market data types.
 * These utilities are separated from the DSL to maintain clean architectural boundaries.
 */

// Analytics utilities (moved from DSL core to maintain separation of concerns)
export type {
  // Analytics data types
  MarketAnalytics,
  DominanceMetrics,
  ChangeMetrics,
  VolatilityMetrics,
  LiquidityMetrics,
  MarketSummary,
  TrendDirection,
  VolatilityLevel,
  LiquidityLevel,
  DataQuality,
  // Analytics wrapper type
  AnalyticsMarketData,
  // Operation interfaces
  MarketAnalyticsCalculator,
  AnalyticsAggregator,
  // Configuration and input types
  AnalyticsConfig,
  AnalyticsInputData,
} from "./marketdata-analytics.js";

export {
  // Validation functions
  isValidMarketAnalytics,
  isValidDominanceMetrics,
  isValidChangeMetrics,
  isValidVolatilityMetrics,
  isValidLiquidityMetrics,
  isValidMarketSummary,
  // Utility functions
  createAnalyticsMarketData,
  isAnalyticsMarketData,
} from "./marketdata-analytics.js";

// Financial precision utilities (moved from DSL core to maintain separation of concerns)
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
} from "./market-data-precision.js";

// Market data validation utilities (moved from DSL core to maintain separation of concerns)
export {
  // Enum validators
  isValidAssetClass,
  isValidMarketType,
  isValidSide,
  isValidTimeframe,
  isValidLevels,
  // Object validators
  isValidDateRange,
  isValidMarket,
  isValidExchange,
  isValidInstrument,
  isValidDataContext,
  isValidContextQuery,
  isValidDepthLevel,
  // Market data validators
  isValidPrice,
  isValidLevel1,
  isValidOHLCV,
  isValidMarketDepth,
  isValidCoreMarketData,
  isValidMarketData,
  // Business logic validators
  isValidMarketDepthOrdering,
  isValidOHLCVIntegrity,
  isValidContextCompatibility,
  isValidTimestamp,
} from "./market-data-validation.js";

// Market data factory utilities (moved from DSL core to maintain separation of concerns)
export {
  createPrice,
  createLevel1,
  createOHLCV,
  createMarketDepth,
  createMarketData,
  createDataContext,
  createDepthLevel,
  createTimestamp,
} from "./market-data-factories.js";
