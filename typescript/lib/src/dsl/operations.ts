/**
 * DSL operation interfaces for reading and writing market data
 * Implements: docs/dsl/qi.dp.dsl.md Reading and Writing Operations Contracts
 */

import type { Result } from "@qi/base";
import type { Level1, MarketData, MarketDepth, OHLCV, Price } from "./market-data.js";
import type {
  ContextQuery,
  DataContext,
  DateRange,
  Exchange,
  Instrument,
  Levels,
  Market,
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
  write(data: Price): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

export interface Level1Stream {
  write(data: Level1): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

export interface MarketDepthStream {
  write(data: MarketDepth): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
}

export interface OHLCVStream {
  write(data: OHLCV): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
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
  createContext(
    market: Market,
    exchange: Exchange,
    instrument: Instrument
  ): Promise<Result<DataContext>>;

  /**
   * Query existing contexts by criteria
   * Empty query (all nulls) returns all available contexts
   * Results ordered by creation time (newest first)
   */
  getContext(query: ContextQuery): Promise<Result<DataContext[]>>;

  /**
   * Update market component of existing context
   * Returns new context with updated market, preserves other components
   */
  updateMarket(context: DataContext, newMarket: Market): Promise<Result<DataContext>>;

  /**
   * Update exchange component of existing context
   * Returns new context with updated exchange, preserves other components
   */
  updateExchange(context: DataContext, newExchange: Exchange): Promise<Result<DataContext>>;

  /**
   * Update instrument component of existing context
   * Returns new context with updated instrument, preserves other components
   */
  updateInstrument(context: DataContext, newInstrument: Instrument): Promise<Result<DataContext>>;

  /**
   * Validate context consistency and component compatibility
   * Checks each component and cross-component relationships
   */
  validateContext(context: DataContext): Promise<Result<void>>;
}

/**
 * Current market data reading interface
 * All operations return Result<T> for functional error handling
 */
export interface MarketDataReader {
  /**
   * Get current price for a single context
   */
  getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;

  /**
   * Get current prices for multiple contexts
   */
  getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;

  /**
   * Get current Level1 quote
   */
  getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;

  /**
   * Get market depth for specified levels
   */
  getMarketDepth(context: DataContext, levels: Levels): Promise<Result<MarketData<MarketDepth>>>;

  /**
   * Get OHLCV data for specified timeframe
   */
  getOHLCV(context: DataContext, timeframe: Timeframe): Promise<Result<MarketData<OHLCV>>>;
}

/**
 * Historical market data reading interface
 */
export interface HistoricalMarketDataReader {
  /**
   * Get historical price data within date range
   */
  getPriceHistory(context: DataContext, dateRange: DateRange): Promise<Result<MarketData<Price>[]>>;

  /**
   * Get historical Level1 data within date range
   */
  getLevel1History(
    context: DataContext,
    dateRange: DateRange
  ): Promise<Result<MarketData<Level1>[]>>;

  /**
   * Get historical OHLCV data for timeframe within date range
   */
  getOHLCVHistory(
    context: DataContext,
    timeframe: Timeframe,
    dateRange: DateRange
  ): Promise<Result<MarketData<OHLCV>[]>>;

  /**
   * Get historical market depth snapshots within date range
   */
  getMarketDepthHistory(
    context: DataContext,
    levels: Levels,
    dateRange: DateRange
  ): Promise<Result<MarketData<MarketDepth>[]>>;
}

/**
 * Real-time streaming market data reading interface
 */
export interface StreamingMarketDataReader {
  /**
   * Subscribe to real-time price updates
   */
  subscribePriceStream(
    context: DataContext,
    callback: (data: MarketData<Price>) => void
  ): Promise<Result<Subscription>>;

  /**
   * Subscribe to real-time Level1 updates
   */
  subscribeLevel1Stream(
    context: DataContext,
    callback: (data: MarketData<Level1>) => void
  ): Promise<Result<Subscription>>;

  /**
   * Subscribe to real-time OHLCV updates
   */
  subscribeOHLCVStream(
    context: DataContext,
    timeframe: Timeframe,
    callback: (data: MarketData<OHLCV>) => void
  ): Promise<Result<Subscription>>;

  /**
   * Subscribe to real-time market depth updates
   */
  subscribeMarketDepthStream(
    context: DataContext,
    levels: Levels,
    callback: (data: MarketData<MarketDepth>) => void
  ): Promise<Result<Subscription>>;
}

/**
 * Market data writing interface
 */
export interface MarketDataWriter {
  /**
   * Write single price data point
   */
  writePrice(data: MarketData<Price>): Promise<Result<void>>;

  /**
   * Write multiple price data points
   */
  writePrices(data: MarketData<Price>[]): Promise<Result<void>>;

  /**
   * Write Level1 quote data
   */
  writeLevel1(data: MarketData<Level1>): Promise<Result<void>>;

  /**
   * Write market depth data
   */
  writeMarketDepth(data: MarketData<MarketDepth>): Promise<Result<void>>;

  /**
   * Write OHLCV data
   */
  writeOHLCV(data: MarketData<OHLCV>): Promise<Result<void>>;

  /**
   * Write multiple OHLCV data points
   */
  writeOHLCVBatch(data: MarketData<OHLCV>[]): Promise<Result<void>>;
}

/**
 * Historical market data writing interface
 */
export interface HistoricalMarketDataWriter {
  /**
   * Write historical price data
   */
  writePriceHistory(data: MarketData<Price>[]): Promise<Result<void>>;

  /**
   * Write historical Level1 data
   */
  writeLevel1History(data: MarketData<Level1>[]): Promise<Result<void>>;

  /**
   * Write historical OHLCV data
   */
  writeOHLCVHistory(data: MarketData<OHLCV>[]): Promise<Result<void>>;

  /**
   * Write historical market depth data
   */
  writeMarketDepthHistory(data: MarketData<MarketDepth>[]): Promise<Result<void>>;
}

/**
 * Real-time streaming market data writing interface
 */
export interface StreamingMarketDataWriter {
  /**
   * Start a real-time price writing stream
   */
  startPriceStream(context: DataContext): Promise<Result<PriceStream>>;

  /**
   * Start a real-time Level1 writing stream
   */
  startLevel1Stream(context: DataContext): Promise<Result<Level1Stream>>;

  /**
   * Start a real-time market depth writing stream
   */
  startMarketDepthStream(context: DataContext, levels: Levels): Promise<Result<MarketDepthStream>>;

  /**
   * Start a real-time OHLCV writing stream
   */
  startOHLCVStream(context: DataContext, timeframe: Timeframe): Promise<Result<OHLCVStream>>;
}
