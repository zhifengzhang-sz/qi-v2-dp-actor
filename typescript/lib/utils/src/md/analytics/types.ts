/**
 * Analytics types and business intelligence functionality for market data
 * Implements: docs/utils/md/analytics.md Analytics Types
 *
 * Analytics provide business intelligence derived FROM market data but are not part of the core vocabulary.
 * They depend on the MD layer for validated market data instances.
 */

import type {
  CoreMarketData,
  DataContext,
  DateRange,
  Level1,
  Market,
  MarketData,
  MarketDepth,
  OHLCV,
  Price,
} from "@qi/dp/dsl";

// Core Analytics Types

/**
 * Market dominance and concentration metrics for understanding market structure
 */
export interface DominanceMetrics {
  readonly topInstrumentShare: number; // Largest instrument market share (%)
  readonly top5InstrumentShare: number; // Top 5 instruments market share (%)
  readonly top10InstrumentShare: number; // Top 10 instruments market share (%)
  readonly exchangeConcentration: number; // Herfindahl index (0-1)
}

/**
 * Period-over-period percentage changes for trend analysis
 */
export interface ChangeMetrics {
  readonly change1h: number; // 1-hour percentage change
  readonly change24h: number; // 24-hour percentage change
  readonly change7d: number; // 7-day percentage change
  readonly change30d: number; // 30-day percentage change
  readonly changeYTD?: number; // Year-to-date percentage change
}

/**
 * Price volatility and risk measures for risk assessment
 */
export interface VolatilityMetrics {
  readonly volatility24h: number; // 24-hour price volatility
  readonly volatility7d: number; // 7-day price volatility
  readonly volatility30d: number; // 30-day price volatility
  readonly averageTrueRange?: number; // Average True Range (ATR)
  readonly betaToMarket?: number; // Beta coefficient relative to market
}

/**
 * Market liquidity indicators for understanding market depth
 */
export interface LiquidityMetrics {
  readonly averageSpread: number; // Average bid-ask spread percentage
  readonly medianSpread: number; // Median bid-ask spread percentage
  readonly averageDepth: number; // Average order book depth
  readonly turnoverRatio: number; // Volume/Market Cap ratio
  readonly amihudRatio?: number; // Amihud illiquidity ratio
}

/**
 * Complete market analytics combining all derived metrics
 */
export interface MarketAnalytics {
  readonly timestamp: string; // ISO 8601 calculation time
  readonly market: Market; // Market scope
  readonly calculationPeriod: DateRange; // Analysis period

  // Market aggregates
  readonly totalMarketCap: number;
  readonly totalVolume: number;
  readonly instrumentCount: number;
  readonly activeExchangeCount: number;

  // Derived metrics
  readonly dominanceMetrics: DominanceMetrics;
  readonly changeMetrics: ChangeMetrics;
  readonly volatilityMetrics: VolatilityMetrics;
  readonly liquidityMetrics: LiquidityMetrics;
}

// Supporting Types

/**
 * Trend direction indicators
 */
export type TrendDirection = "UP" | "DOWN" | "SIDEWAYS";

/**
 * Volatility level classifications
 */
export type VolatilityLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Liquidity level classifications
 */
export type LiquidityLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Data quality assessments
 */
export type DataQuality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

/**
 * High-level executive reporting summary
 */
export interface MarketSummary {
  readonly timestamp: string;
  readonly market: Market;
  readonly period: DateRange;

  // Key metrics
  readonly totalValue: number;
  readonly totalActivity: number;
  readonly dominantInstrument: string;
  readonly dominantExchange: string;

  // Trend indicators
  readonly overallTrend: TrendDirection; // "UP" | "DOWN" | "SIDEWAYS"
  readonly volatilityLevel: VolatilityLevel; // "LOW" | "MEDIUM" | "HIGH"
  readonly liquidityLevel: LiquidityLevel; // "LOW" | "MEDIUM" | "HIGH"

  // Quality metrics
  readonly dataQuality: DataQuality; // "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
  readonly calculationConfidence: number; // 0-1 confidence level
}

// Operation Interfaces

/**
 * Interface for computing analytics from DSL data
 */
export interface MarketAnalyticsCalculator {
  calculateMarketAnalytics(
    market: Market,
    period: DateRange
  ): Promise<Result<MarketAnalytics, QiError>>;
  calculateDominanceMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<DominanceMetrics, QiError>>;
  calculateChangeMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<ChangeMetrics, QiError>>;
  calculateVolatilityMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<VolatilityMetrics, QiError>>;
  calculateLiquidityMetrics(
    market: Market,
    period: DateRange
  ): Promise<Result<LiquidityMetrics, QiError>>;
}

/**
 * Interface for aggregating analytics across dimensions
 */
export interface AnalyticsAggregator {
  aggregateByExchange(
    analytics: MarketAnalytics[]
  ): Promise<Result<Map<string, MarketAnalytics>, QiError>>;
  aggregateByAssetClass(
    analytics: MarketAnalytics[]
  ): Promise<Result<Map<string, MarketAnalytics>, QiError>>;
  aggregateByTimeframe(
    analytics: MarketAnalytics[],
    timeframe: string
  ): Promise<Result<MarketAnalytics[], QiError>>;
  createMarketSummary(analytics: MarketAnalytics[]): Promise<Result<MarketSummary, QiError>>;
}

// Configuration Types

/**
 * Configuration for analytics calculation engines
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

// Input Types

/**
 * Type union for consuming DSL market data
 * Specifically typed for FIX Protocol 4.4 core data types
 */
export type AnalyticsInputData =
  | MarketData<Price>[]
  | MarketData<Level1>[]
  | MarketData<OHLCV>[]
  | MarketData<MarketDepth>[];

// Wrapper Types

/**
 * Since analytics are no longer part of CoreMarketData, a separate wrapper maintains DSL structure consistency
 */
export interface AnalyticsMarketData {
  readonly context: DataContext;
  readonly coreData: MarketAnalytics;
}

// Re-export Result type for convenience
import type { QiError, Result } from "@qi/base";
export type { Result };
