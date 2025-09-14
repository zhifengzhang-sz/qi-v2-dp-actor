/**
 * DSL operation interfaces for reading and writing market data
 * Implements: docs/dsl/qi.dp.dsl.md Reading and Writing Operations Contracts
 */

import type { QiError, Result } from "@qi/base";
import type { Level1, MarketDepth, OHLCV, Price } from "./market-data.js";
import type {
  ContextQuery,
  DataContext,
  DateRange,
  Exchange,
  Instrument,
  Levels,
  Market,
  MarketData,
  Timeframe,
} from "./types.js";

// File-scoped operation interface exports (following DSL specification)

// Subscription handle for streaming operations
export interface Subscription {
  readonly id: string;
  readonly context: DataContext;
  readonly isActive: boolean;
}

// Stream handles for writing operations
export interface PriceStream {
  readonly write: (data: Price) => Promise<Result<void, QiError>>;
  readonly stop: () => Promise<Result<void, QiError>>;
}

export interface Level1Stream {
  readonly write: (data: Level1) => Promise<Result<void, QiError>>;
  readonly stop: () => Promise<Result<void, QiError>>;
}

export interface MarketDepthStream {
  readonly write: (data: MarketDepth) => Promise<Result<void, QiError>>;
  readonly stop: () => Promise<Result<void, QiError>>;
}

export interface OHLCVStream {
  readonly write: (data: OHLCV) => Promise<Result<void, QiError>>;
  readonly stop: () => Promise<Result<void, QiError>>;
}

/**
 * Context lifecycle management interface
 * Manages creation, retrieval, updates, and validation of DataContext components
 */
export interface MarketDataContextManager {
  /**
   * Create new market data context from components
   * Validates all components and their compatibility
   */
  readonly createContext: (
    market: Market,
    exchange: Exchange,
    instrument: Instrument,
  ) => Promise<Result<DataContext, QiError>>;

  /**
   * Query existing contexts by criteria
   * Empty query (all nulls) returns all available contexts
   * Results ordered by creation time (newest first)
   */
  readonly getContext: (query: ContextQuery) => Promise<Result<DataContext[], QiError>>;

  /**
   * Update market component of existing context
   * Returns new context with updated market, preserves other components
   */
  readonly updateMarket: (
    context: DataContext,
    newMarket: Market,
  ) => Promise<Result<DataContext, QiError>>;

  /**
   * Update exchange component of existing context
   * Returns new context with updated exchange, preserves other components
   */
  readonly updateExchange: (
    context: DataContext,
    newExchange: Exchange,
  ) => Promise<Result<DataContext, QiError>>;

  /**
   * Update instrument component of existing context
   * Returns new context with updated instrument, preserves other components
   */
  readonly updateInstrument: (
    context: DataContext,
    newInstrument: Instrument,
  ) => Promise<Result<DataContext, QiError>>;

  /**
   * Validate context consistency and component compatibility
   * Checks each component and cross-component relationships
   */
  readonly validateContext: (context: DataContext) => Promise<Result<void, QiError>>;
}

/**
 * Current market data reading interface
 * All operations return Result<T, QiError> for functional error handling
 */
export interface MarketDataReader {
  /**
   * Get current price for a single context
   */
  readonly getCurrentPrice: (context: DataContext) => Promise<Result<MarketData<Price>, QiError>>;

  /**
   * Get current prices for multiple contexts
   */
  readonly getCurrentPrices: (
    contexts: DataContext[],
  ) => Promise<Result<MarketData<Price>[], QiError>>;

  /**
   * Get current Level1 quote
   */
  readonly getLevel1: (context: DataContext) => Promise<Result<MarketData<Level1>, QiError>>;

  /**
   * Get market depth for specified levels
   */
  readonly getMarketDepth: (
    context: DataContext,
    levels: Levels,
  ) => Promise<Result<MarketData<MarketDepth>, QiError>>;

  /**
   * Get OHLCV data for specified timeframe
   */
  readonly getOHLCV: (
    context: DataContext,
    timeframe: Timeframe,
  ) => Promise<Result<MarketData<OHLCV>, QiError>>;
}

/**
 * Historical market data reading interface
 */
export interface HistoricalMarketDataReader {
  /**
   * Get historical price data within date range
   */
  readonly getPriceHistory: (
    context: DataContext,
    dateRange: DateRange,
  ) => Promise<Result<MarketData<Price>[], QiError>>;

  /**
   * Get historical Level1 data within date range
   */
  readonly getLevel1History: (
    context: DataContext,
    dateRange: DateRange,
  ) => Promise<Result<MarketData<Level1>[], QiError>>;

  /**
   * Get historical OHLCV data for timeframe within date range
   */
  readonly getOHLCVHistory: (
    context: DataContext,
    timeframe: Timeframe,
    dateRange: DateRange,
  ) => Promise<Result<MarketData<OHLCV>[], QiError>>;

  /**
   * Get historical market depth snapshots within date range
   */
  readonly getMarketDepthHistory: (
    context: DataContext,
    levels: Levels,
    dateRange: DateRange,
  ) => Promise<Result<MarketData<MarketDepth>[], QiError>>;
}

/**
 * Real-time streaming market data reading interface
 */
export interface StreamingMarketDataReader {
  /**
   * Subscribe to real-time price updates
   */
  readonly subscribePriceStream: (
    context: DataContext,
    callback: (data: MarketData<Price>) => void,
  ) => Promise<Result<Subscription, QiError>>;

  /**
   * Subscribe to real-time Level1 updates
   */
  readonly subscribeLevel1Stream: (
    context: DataContext,
    callback: (data: MarketData<Level1>) => void,
  ) => Promise<Result<Subscription, QiError>>;

  /**
   * Subscribe to real-time OHLCV updates
   */
  readonly subscribeOHLCVStream: (
    context: DataContext,
    timeframe: Timeframe,
    callback: (data: MarketData<OHLCV>) => void,
  ) => Promise<Result<Subscription, QiError>>;

  /**
   * Subscribe to real-time market depth updates
   */
  readonly subscribeMarketDepthStream: (
    context: DataContext,
    levels: Levels,
    callback: (data: MarketData<MarketDepth>) => void,
  ) => Promise<Result<Subscription, QiError>>;

  /**
   * Unsubscribe from a streaming subscription
   */
  readonly unsubscribe: (subscription: Subscription) => Promise<Result<void, QiError>>;
}

/**
 * Market data writing interface
 */
export interface MarketDataWriter {
  /**
   * Write single price data point
   */
  readonly writePrice: (data: MarketData<Price>) => Promise<Result<void, QiError>>;

  /**
   * Write multiple price data points
   */
  readonly writePrices: (data: MarketData<Price>[]) => Promise<Result<void, QiError>>;

  /**
   * Write Level1 quote data
   */
  readonly writeLevel1: (data: MarketData<Level1>) => Promise<Result<void, QiError>>;

  /**
   * Write market depth data
   */
  readonly writeMarketDepth: (data: MarketData<MarketDepth>) => Promise<Result<void, QiError>>;

  /**
   * Write OHLCV data
   */
  readonly writeOHLCV: (data: MarketData<OHLCV>) => Promise<Result<void, QiError>>;

  /**
   * Write multiple OHLCV data points
   */
  readonly writeOHLCVBatch: (data: MarketData<OHLCV>[]) => Promise<Result<void, QiError>>;
}

/**
 * Historical market data writing interface
 */
export interface HistoricalMarketDataWriter {
  /**
   * Write historical price data
   */
  readonly writePriceHistory: (data: MarketData<Price>[]) => Promise<Result<void, QiError>>;

  /**
   * Write historical Level1 data
   */
  readonly writeLevel1History: (data: MarketData<Level1>[]) => Promise<Result<void, QiError>>;

  /**
   * Write historical OHLCV data
   */
  readonly writeOHLCVHistory: (data: MarketData<OHLCV>[]) => Promise<Result<void, QiError>>;

  /**
   * Write historical market depth data
   */
  readonly writeMarketDepthHistory: (
    data: MarketData<MarketDepth>[],
  ) => Promise<Result<void, QiError>>;
}

/**
 * Real-time streaming market data writing interface
 */
export interface StreamingMarketDataWriter {
  /**
   * Start a real-time price writing stream
   */
  readonly startPriceStream: (context: DataContext) => Promise<Result<PriceStream, QiError>>;

  /**
   * Start a real-time Level1 writing stream
   */
  readonly startLevel1Stream: (context: DataContext) => Promise<Result<Level1Stream, QiError>>;

  /**
   * Start a real-time market depth writing stream
   */
  readonly startMarketDepthStream: (
    context: DataContext,
    levels: Levels,
  ) => Promise<Result<MarketDepthStream, QiError>>;

  /**
   * Start a real-time OHLCV writing stream
   */
  readonly startOHLCVStream: (
    context: DataContext,
    timeframe: Timeframe,
  ) => Promise<Result<OHLCVStream, QiError>>;
}
