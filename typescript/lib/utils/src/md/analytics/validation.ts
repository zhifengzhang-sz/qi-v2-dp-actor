/**
 * Validation functions for analytics types
 * Implements: docs/utils/md/analytics.md Validation Functions
 */

import type {
  AnalyticsMarketData,
  ChangeMetrics,
  DominanceMetrics,
  LiquidityMetrics,
  MarketAnalytics,
  MarketSummary,
  VolatilityMetrics,
} from "./types.js";

/**
 * Validates DominanceMetrics
 * Constraints:
 * - All shares: 0-100%
 * - Concentration: 0-1 (Herfindahl index)
 * - Ordering: top1 ≤ top5 ≤ top10
 */
export function isValidDominanceMetrics(obj: unknown): obj is DominanceMetrics {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;

  // Check required properties exist and are numbers
  if (
    typeof metrics.topInstrumentShare !== "number" ||
    typeof metrics.top5InstrumentShare !== "number" ||
    typeof metrics.top10InstrumentShare !== "number" ||
    typeof metrics.exchangeConcentration !== "number"
  ) {
    return false;
  }

  // Check all values are finite
  if (
    !Number.isFinite(metrics.topInstrumentShare) ||
    !Number.isFinite(metrics.top5InstrumentShare) ||
    !Number.isFinite(metrics.top10InstrumentShare) ||
    !Number.isFinite(metrics.exchangeConcentration)
  ) {
    return false;
  }

  // Check share percentages are in valid range (0-100%)
  if (
    metrics.topInstrumentShare < 0 ||
    metrics.topInstrumentShare > 100 ||
    metrics.top5InstrumentShare < 0 ||
    metrics.top5InstrumentShare > 100 ||
    metrics.top10InstrumentShare < 0 ||
    metrics.top10InstrumentShare > 100
  ) {
    return false;
  }

  // Check concentration is in valid range (0-1)
  if (metrics.exchangeConcentration < 0 || metrics.exchangeConcentration > 1) {
    return false;
  }

  // Check ordering: top1 ≤ top5 ≤ top10
  if (
    metrics.topInstrumentShare > metrics.top5InstrumentShare ||
    metrics.top5InstrumentShare > metrics.top10InstrumentShare
  ) {
    return false;
  }

  return true;
}

/**
 * Validates ChangeMetrics
 * Constraint: All values must be finite numbers (can be positive or negative)
 */
export function isValidChangeMetrics(obj: unknown): obj is ChangeMetrics {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;

  // Check required properties exist and are numbers
  if (
    typeof metrics.change1h !== "number" ||
    typeof metrics.change24h !== "number" ||
    typeof metrics.change7d !== "number" ||
    typeof metrics.change30d !== "number"
  ) {
    return false;
  }

  // Check all required values are finite
  if (
    !Number.isFinite(metrics.change1h) ||
    !Number.isFinite(metrics.change24h) ||
    !Number.isFinite(metrics.change7d) ||
    !Number.isFinite(metrics.change30d)
  ) {
    return false;
  }

  // Check optional changeYTD if present
  if (metrics.changeYTD !== undefined) {
    if (typeof metrics.changeYTD !== "number" || !Number.isFinite(metrics.changeYTD)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates VolatilityMetrics
 * Constraint: All values must be non-negative finite numbers
 */
export function isValidVolatilityMetrics(obj: unknown): obj is VolatilityMetrics {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;

  // Check required properties exist and are numbers
  if (
    typeof metrics.volatility24h !== "number" ||
    typeof metrics.volatility7d !== "number" ||
    typeof metrics.volatility30d !== "number"
  ) {
    return false;
  }

  // Check all required values are finite and non-negative
  if (
    !Number.isFinite(metrics.volatility24h) ||
    metrics.volatility24h < 0 ||
    !Number.isFinite(metrics.volatility7d) ||
    metrics.volatility7d < 0 ||
    !Number.isFinite(metrics.volatility30d) ||
    metrics.volatility30d < 0
  ) {
    return false;
  }

  // Check optional averageTrueRange if present
  if (metrics.averageTrueRange !== undefined) {
    if (
      typeof metrics.averageTrueRange !== "number" ||
      !Number.isFinite(metrics.averageTrueRange) ||
      metrics.averageTrueRange < 0
    ) {
      return false;
    }
  }

  // Check optional betaToMarket if present
  if (metrics.betaToMarket !== undefined) {
    if (
      typeof metrics.betaToMarket !== "number" ||
      !Number.isFinite(metrics.betaToMarket) ||
      metrics.betaToMarket < 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates LiquidityMetrics
 * Constraints:
 * - Spreads: 0-100% (percentage values)
 * - Depth: Must be positive
 * - Turnover: Must be non-negative
 * - All values must be finite
 */
export function isValidLiquidityMetrics(obj: unknown): obj is LiquidityMetrics {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = obj as any;

  // Check required properties exist and are numbers
  if (
    typeof metrics.averageSpread !== "number" ||
    typeof metrics.medianSpread !== "number" ||
    typeof metrics.averageDepth !== "number" ||
    typeof metrics.turnoverRatio !== "number"
  ) {
    return false;
  }

  // Check all required values are finite
  if (
    !Number.isFinite(metrics.averageSpread) ||
    !Number.isFinite(metrics.medianSpread) ||
    !Number.isFinite(metrics.averageDepth) ||
    !Number.isFinite(metrics.turnoverRatio)
  ) {
    return false;
  }

  // Check spreads are in valid range (0-100%)
  if (
    metrics.averageSpread < 0 ||
    metrics.averageSpread > 100 ||
    metrics.medianSpread < 0 ||
    metrics.medianSpread > 100
  ) {
    return false;
  }

  // Check depth is positive
  if (metrics.averageDepth <= 0) {
    return false;
  }

  // Check turnover is non-negative
  if (metrics.turnoverRatio < 0) {
    return false;
  }

  // Check optional amihudRatio if present
  if (metrics.amihudRatio !== undefined) {
    if (
      typeof metrics.amihudRatio !== "number" ||
      !Number.isFinite(metrics.amihudRatio) ||
      metrics.amihudRatio < 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates MarketAnalytics
 */
export function isValidMarketAnalytics(obj: unknown): obj is MarketAnalytics {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics = obj as any;

  // Check basic properties
  if (
    typeof analytics.timestamp !== "string" ||
    !analytics.market ||
    typeof analytics.market !== "object" ||
    !analytics.calculationPeriod ||
    typeof analytics.calculationPeriod !== "object" ||
    typeof analytics.totalMarketCap !== "number" ||
    typeof analytics.totalVolume !== "number" ||
    typeof analytics.instrumentCount !== "number" ||
    typeof analytics.activeExchangeCount !== "number"
  ) {
    return false;
  }

  // Check numeric values are finite and non-negative
  if (
    !Number.isFinite(analytics.totalMarketCap) ||
    analytics.totalMarketCap < 0 ||
    !Number.isFinite(analytics.totalVolume) ||
    analytics.totalVolume < 0 ||
    !Number.isFinite(analytics.instrumentCount) ||
    analytics.instrumentCount < 0 ||
    !Number.isFinite(analytics.activeExchangeCount) ||
    analytics.activeExchangeCount < 0
  ) {
    return false;
  }

  // Check timestamp is valid ISO 8601 format
  const timestamp = new Date(analytics.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  // Validate nested metrics
  if (
    !isValidDominanceMetrics(analytics.dominanceMetrics) ||
    !isValidChangeMetrics(analytics.changeMetrics) ||
    !isValidVolatilityMetrics(analytics.volatilityMetrics) ||
    !isValidLiquidityMetrics(analytics.liquidityMetrics)
  ) {
    return false;
  }

  return true;
}

/**
 * Validates MarketSummary
 */
export function isValidMarketSummary(obj: unknown): obj is MarketSummary {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary = obj as any;

  // Check basic properties
  if (
    typeof summary.timestamp !== "string" ||
    !summary.market ||
    typeof summary.market !== "object" ||
    !summary.period ||
    typeof summary.period !== "object" ||
    typeof summary.totalValue !== "number" ||
    typeof summary.totalActivity !== "number" ||
    typeof summary.dominantInstrument !== "string" ||
    typeof summary.dominantExchange !== "string" ||
    typeof summary.overallTrend !== "string" ||
    typeof summary.volatilityLevel !== "string" ||
    typeof summary.liquidityLevel !== "string" ||
    typeof summary.dataQuality !== "string" ||
    typeof summary.calculationConfidence !== "number"
  ) {
    return false;
  }

  // Check numeric values are finite and non-negative
  if (
    !Number.isFinite(summary.totalValue) ||
    summary.totalValue < 0 ||
    !Number.isFinite(summary.totalActivity) ||
    summary.totalActivity < 0 ||
    !Number.isFinite(summary.calculationConfidence) ||
    summary.calculationConfidence < 0 ||
    summary.calculationConfidence > 1
  ) {
    return false;
  }

  // Check timestamp is valid ISO 8601 format
  const timestamp = new Date(summary.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  // Check enum values
  const validTrends = ["UP", "DOWN", "SIDEWAYS"];
  const validVolatilityLevels = ["LOW", "MEDIUM", "HIGH"];
  const validLiquidityLevels = ["LOW", "MEDIUM", "HIGH"];
  const validDataQualities = ["EXCELLENT", "GOOD", "FAIR", "POOR"];

  if (
    !validTrends.includes(summary.overallTrend) ||
    !validVolatilityLevels.includes(summary.volatilityLevel) ||
    !validLiquidityLevels.includes(summary.liquidityLevel) ||
    !validDataQualities.includes(summary.dataQuality)
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard for AnalyticsMarketData
 */
export function isAnalyticsMarketData(obj: unknown): obj is AnalyticsMarketData {
  if (!obj || typeof obj !== "object") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = obj as any;

  return (
    data.context &&
    typeof data.context === "object" &&
    data.coreData &&
    isValidMarketAnalytics(data.coreData)
  );
}
