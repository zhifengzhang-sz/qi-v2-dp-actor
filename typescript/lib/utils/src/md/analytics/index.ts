/**
 * Analytics Module - Business Intelligence for Market Data
 * Implements: docs/utils/md/analytics.md Complete Analytics Module
 *
 * This module provides comprehensive analytics types and interfaces for computing
 * derived metrics and business intelligence from raw market data. This module represents
 * the business logic layer that depends on the MD smart constructor layer for validated
 * market data instances.
 *
 * Architectural Position: dsl/* (interfaces) → md/* (implementations) → utils/analytics (business logic)
 */

// Export all types
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
  // Re-exported convenience type
  Result,
} from "./types.js";

// Export validation functions
export {
  isValidDominanceMetrics,
  isValidChangeMetrics,
  isValidVolatilityMetrics,
  isValidLiquidityMetrics,
  isValidMarketAnalytics,
  isValidMarketSummary,
  isAnalyticsMarketData,
} from "./validation.js";

// Export utility functions
export { createAnalyticsMarketData } from "./utilities.js";
