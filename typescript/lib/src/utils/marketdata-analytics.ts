/**
 * Market Data Analytics - Utilities for computing derived metrics and statistics
 *
 * This module provides analytics types and utilities that operate on top of the core DSL market data types.
 * Analytics compute derived insights and business intelligence from raw market data.
 *
 * Architectural Note: Analytics are separated from core DSL to maintain clean boundaries.
 * DSL provides pure market data vocabulary; Analytics provides business intelligence.
 */

import type { Result } from "@qi/base";
import type { Level1, MarketData, MarketDepth, OHLCV, Price } from "../dsl/market-data.js";
import type { DataContext, DateRange, Market } from "../dsl/types.js";

// ============================================================================
// Analytics Data Types
// ============================================================================

/**
 * Market dominance and concentration metrics
 */
export interface DominanceMetrics {
  readonly topInstrumentShare: number; // Largest instrument market share (%)
  readonly top5InstrumentShare: number; // Top 5 instruments market share (%)
  readonly top10InstrumentShare: number; // Top 10 instruments market share (%)
  readonly exchangeConcentration: number; // Herfindahl index for exchange concentration (0-1)
}

/**
 * Period-over-period percentage changes
 */
export interface ChangeMetrics {
  readonly change1h: number; // 1-hour percentage change
  readonly change24h: number; // 24-hour percentage change
  readonly change7d: number; // 7-day percentage change
  readonly change30d: number; // 30-day percentage change
  readonly changeYTD?: number; // Year-to-date percentage change
}

/**
 * Price volatility and risk measures
 */
export interface VolatilityMetrics {
  readonly volatility24h: number; // 24-hour price volatility (standard deviation)
  readonly volatility7d: number; // 7-day price volatility
  readonly volatility30d: number; // 30-day price volatility
  readonly averageTrueRange?: number; // Average True Range (ATR)
  readonly betaToMarket?: number; // Beta coefficient relative to market
}

/**
 * Market liquidity indicators
 */
export interface LiquidityMetrics {
  readonly averageSpread: number; // Average bid-ask spread percentage
  readonly medianSpread: number; // Median bid-ask spread percentage
  readonly averageDepth: number; // Average order book depth
  readonly turnoverRatio: number; // Volume/Market Cap ratio
  readonly amihudRatio?: number; // Amihud illiquidity ratio
}

/**
 * Comprehensive market analytics combining all derived metrics
 *
 * Note: This was moved from DSL core data types to maintain architectural separation.
 * Analytics are derived from DSL data types but are not part of the core vocabulary.
 */
export interface MarketAnalytics {
  readonly timestamp: string; // When analytics were calculated - ISO 8601 datetime
  readonly market: Market; // Market scope for analytics
  readonly calculationPeriod: DateRange; // Time period for analytics calculation

  // Market aggregates
  readonly totalMarketCap: number; // Total market capitalization
  readonly totalVolume: number; // Total trading volume for period
  readonly instrumentCount: number; // Number of active instruments
  readonly activeExchangeCount: number; // Number of exchanges with activity

  // Derived metrics
  readonly dominanceMetrics: DominanceMetrics;
  readonly changeMetrics: ChangeMetrics;
  readonly volatilityMetrics: VolatilityMetrics;
  readonly liquidityMetrics: LiquidityMetrics;
}

/**
 * High-level market summary for executive reporting
 */
export interface MarketSummary {
  readonly timestamp: string;
  readonly market: Market;
  readonly period: DateRange;

  // Key metrics
  readonly totalValue: number; // Total market value
  readonly totalActivity: number; // Total trading activity
  readonly dominantInstrument: string; // Most dominant instrument
  readonly dominantExchange: string; // Most dominant exchange

  // Trend indicators
  readonly overallTrend: TrendDirection;
  readonly volatilityLevel: VolatilityLevel;
  readonly liquidityLevel: LiquidityLevel;

  // Confidence metrics
  readonly dataQuality: DataQuality;
  readonly calculationConfidence: number; // Confidence level (0-1)
}

// Supporting enums for summary
export type TrendDirection = "UP" | "DOWN" | "SIDEWAYS";
export type VolatilityLevel = "LOW" | "MEDIUM" | "HIGH";
export type LiquidityLevel = "LOW" | "MEDIUM" | "HIGH";
export type DataQuality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

// ============================================================================
// Analytics Operation Interfaces
// ============================================================================

/**
 * Main interface for computing market analytics from DSL data types
 */
export interface MarketAnalyticsCalculator {
  /**
   * Compute comprehensive market analytics for specified period
   */
  calculateMarketAnalytics(market: Market, period: DateRange): Promise<Result<MarketAnalytics>>;

  /**
   * Compute market dominance and concentration metrics
   */
  calculateDominanceMetrics(market: Market, period: DateRange): Promise<Result<DominanceMetrics>>;

  /**
   * Compute period-over-period change statistics
   */
  calculateChangeMetrics(market: Market, period: DateRange): Promise<Result<ChangeMetrics>>;

  /**
   * Compute market volatility and risk metrics
   */
  calculateVolatilityMetrics(market: Market, period: DateRange): Promise<Result<VolatilityMetrics>>;

  /**
   * Compute market liquidity and depth metrics
   */
  calculateLiquidityMetrics(market: Market, period: DateRange): Promise<Result<LiquidityMetrics>>;
}

/**
 * Interface for aggregating analytics across different dimensions
 */
export interface AnalyticsAggregator {
  /**
   * Group and aggregate analytics by exchange
   */
  aggregateByExchange(analytics: MarketAnalytics[]): Promise<Result<Map<string, MarketAnalytics>>>;

  /**
   * Group and aggregate analytics by asset class
   */
  aggregateByAssetClass(
    analytics: MarketAnalytics[]
  ): Promise<Result<Map<string, MarketAnalytics>>>;

  /**
   * Aggregate analytics data into specified timeframes
   */
  aggregateByTimeframe(
    analytics: MarketAnalytics[],
    timeframe: string
  ): Promise<Result<MarketAnalytics[]>>;

  /**
   * Create high-level market summary from detailed analytics
   */
  createMarketSummary(analytics: MarketAnalytics[]): Promise<Result<MarketSummary>>;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates DominanceMetrics structure
 */
export const isValidDominanceMetrics = (obj: unknown): obj is DominanceMetrics => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "topInstrumentShare" in obj &&
    "top5InstrumentShare" in obj &&
    "top10InstrumentShare" in obj &&
    "exchangeConcentration" in obj &&
    typeof (obj as any).topInstrumentShare === "number" &&
    typeof (obj as any).top5InstrumentShare === "number" &&
    typeof (obj as any).top10InstrumentShare === "number" &&
    typeof (obj as any).exchangeConcentration === "number" &&
    (obj as any).topInstrumentShare >= 0 &&
    (obj as any).topInstrumentShare <= 100 &&
    (obj as any).top5InstrumentShare >= 0 &&
    (obj as any).top5InstrumentShare <= 100 &&
    (obj as any).top10InstrumentShare >= 0 &&
    (obj as any).top10InstrumentShare <= 100 &&
    (obj as any).exchangeConcentration >= 0 &&
    (obj as any).exchangeConcentration <= 1 &&
    // Ordering constraint: top1 <= top5 <= top10
    (obj as any).topInstrumentShare <= (obj as any).top5InstrumentShare &&
    (obj as any).top5InstrumentShare <= (obj as any).top10InstrumentShare
  );
};

/**
 * Validates ChangeMetrics structure
 */
export const isValidChangeMetrics = (obj: unknown): obj is ChangeMetrics => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "change1h" in obj &&
    "change24h" in obj &&
    "change7d" in obj &&
    "change30d" in obj &&
    typeof (obj as any).change1h === "number" &&
    typeof (obj as any).change24h === "number" &&
    typeof (obj as any).change7d === "number" &&
    typeof (obj as any).change30d === "number" &&
    Number.isFinite((obj as any).change1h) &&
    Number.isFinite((obj as any).change24h) &&
    Number.isFinite((obj as any).change7d) &&
    Number.isFinite((obj as any).change30d)
  );
};

/**
 * Validates VolatilityMetrics structure
 */
export const isValidVolatilityMetrics = (obj: unknown): obj is VolatilityMetrics => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "volatility24h" in obj &&
    "volatility7d" in obj &&
    "volatility30d" in obj &&
    typeof (obj as any).volatility24h === "number" &&
    typeof (obj as any).volatility7d === "number" &&
    typeof (obj as any).volatility30d === "number" &&
    Number.isFinite((obj as any).volatility24h) &&
    Number.isFinite((obj as any).volatility7d) &&
    Number.isFinite((obj as any).volatility30d) &&
    (obj as any).volatility24h >= 0 &&
    (obj as any).volatility7d >= 0 &&
    (obj as any).volatility30d >= 0
  );
};

/**
 * Validates LiquidityMetrics structure
 */
export const isValidLiquidityMetrics = (obj: unknown): obj is LiquidityMetrics => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "averageSpread" in obj &&
    "medianSpread" in obj &&
    "averageDepth" in obj &&
    "turnoverRatio" in obj &&
    typeof (obj as any).averageSpread === "number" &&
    typeof (obj as any).medianSpread === "number" &&
    typeof (obj as any).averageDepth === "number" &&
    typeof (obj as any).turnoverRatio === "number" &&
    (obj as any).averageSpread >= 0 &&
    (obj as any).averageSpread <= 100 &&
    (obj as any).medianSpread >= 0 &&
    (obj as any).medianSpread <= 100 &&
    (obj as any).averageDepth > 0 &&
    (obj as any).turnoverRatio >= 0 &&
    Number.isFinite((obj as any).averageSpread) &&
    Number.isFinite((obj as any).medianSpread) &&
    Number.isFinite((obj as any).averageDepth) &&
    Number.isFinite((obj as any).turnoverRatio)
  );
};

/**
 * Validates MarketAnalytics structure
 */
export const isValidMarketAnalytics = (obj: unknown): obj is MarketAnalytics => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "market" in obj &&
    "calculationPeriod" in obj &&
    "totalMarketCap" in obj &&
    "totalVolume" in obj &&
    "instrumentCount" in obj &&
    "activeExchangeCount" in obj &&
    "dominanceMetrics" in obj &&
    "changeMetrics" in obj &&
    "volatilityMetrics" in obj &&
    "liquidityMetrics" in obj &&
    typeof (obj as any).timestamp === "string" &&
    typeof (obj as any).totalMarketCap === "number" &&
    typeof (obj as any).totalVolume === "number" &&
    typeof (obj as any).instrumentCount === "number" &&
    typeof (obj as any).activeExchangeCount === "number" &&
    Number.isFinite((obj as any).totalMarketCap) &&
    Number.isFinite((obj as any).totalVolume) &&
    (obj as any).totalMarketCap > 0 &&
    (obj as any).totalVolume > 0 &&
    Number.isInteger((obj as any).instrumentCount) &&
    (obj as any).instrumentCount > 0 &&
    Number.isInteger((obj as any).activeExchangeCount) &&
    (obj as any).activeExchangeCount > 0 &&
    isValidDominanceMetrics((obj as any).dominanceMetrics) &&
    isValidChangeMetrics((obj as any).changeMetrics) &&
    isValidVolatilityMetrics((obj as any).volatilityMetrics) &&
    isValidLiquidityMetrics((obj as any).liquidityMetrics)
  );
};

/**
 * Validates MarketSummary structure
 */
export const isValidMarketSummary = (obj: unknown): obj is MarketSummary => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "market" in obj &&
    "period" in obj &&
    "totalValue" in obj &&
    "totalActivity" in obj &&
    "dominantInstrument" in obj &&
    "dominantExchange" in obj &&
    "overallTrend" in obj &&
    "volatilityLevel" in obj &&
    "liquidityLevel" in obj &&
    "dataQuality" in obj &&
    "calculationConfidence" in obj &&
    typeof (obj as any).timestamp === "string" &&
    typeof (obj as any).totalValue === "number" &&
    typeof (obj as any).totalActivity === "number" &&
    typeof (obj as any).dominantInstrument === "string" &&
    typeof (obj as any).dominantExchange === "string" &&
    typeof (obj as any).calculationConfidence === "number" &&
    ["UP", "DOWN", "SIDEWAYS"].includes((obj as any).overallTrend) &&
    ["LOW", "MEDIUM", "HIGH"].includes((obj as any).volatilityLevel) &&
    ["LOW", "MEDIUM", "HIGH"].includes((obj as any).liquidityLevel) &&
    ["EXCELLENT", "GOOD", "FAIR", "POOR"].includes((obj as any).dataQuality) &&
    (obj as any).totalValue > 0 &&
    (obj as any).totalActivity > 0 &&
    (obj as any).calculationConfidence >= 0 &&
    (obj as any).calculationConfidence <= 1
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Analytics-specific MarketData wrapper
 * Since MarketAnalytics is no longer part of CoreMarketData, we define a separate wrapper
 */
export interface AnalyticsMarketData {
  readonly context: DataContext;
  readonly coreData: MarketAnalytics;
}

/**
 * Create MarketAnalytics wrapper that includes DSL DataContext
 * This bridges analytics with DSL market data structure
 */
export const createAnalyticsMarketData = (
  context: DataContext,
  analytics: MarketAnalytics
): AnalyticsMarketData => {
  return {
    context,
    coreData: analytics,
  };
};

/**
 * Type guard to check if data contains analytics
 */
export const isAnalyticsMarketData = (obj: unknown): obj is AnalyticsMarketData => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "context" in obj &&
    "coreData" in obj &&
    isValidMarketAnalytics((obj as any).coreData)
  );
};

// ============================================================================
// Analytics Input Types (for consuming DSL data)
// ============================================================================

/**
 * Type union for analytics input data (consumes DSL market data types)
 */
export type AnalyticsInputData =
  | MarketData<Price>[]
  | MarketData<Level1>[]
  | MarketData<OHLCV>[]
  | MarketData<MarketDepth>[];

/**
 * Configuration for analytics calculations
 */
export interface AnalyticsConfig {
  readonly calculationEngine: "STANDARD" | "ENHANCED" | "CUSTOM";
  readonly precisionMode: "FAST" | "BALANCED" | "PRECISE";
  readonly defaultTimeframes: string[];
  readonly maxHistoryWindow: number; // milliseconds
  readonly minDataPoints: number;
  readonly volatilityThresholds: {
    readonly lowThreshold: number;
    readonly highThreshold: number;
  };
  readonly liquidityThresholds: {
    readonly tightSpreadThreshold: number;
    readonly deepMarketThreshold: number;
  };
  readonly dominanceThresholds: {
    readonly significantShareThreshold: number;
    readonly concentrationThreshold: number;
  };
}
