/**
 * Core market data types with FIX Protocol compliance
 * Implements: docs/dsl/qi.dp.dsl.md Core Data Types
 */

import type { DataContext, DepthLevel, Side } from "./types.js";

// Decimal type for financial precision
export type decimal = string;

/**
 * Real-time trade/tick data (FIX MDEntryType=2)
 * Implements: qi.dp.dsl.contracts.md#Price
 */
export interface Price {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime
  readonly price: decimal; // FIX Tag 270 (MDEntryPrice)
  readonly size: decimal; // FIX Tag 271 (MDEntrySize)

  // Extended FIX fields (optional)
  readonly tradeId?: string; // FIX Tag 1003 (TradeID)
  readonly aggressor?: Side; // FIX Tag 54 (Side)
}

/**
 * Top-of-book bid/ask quotes (FIX MDEntryType=0/1)
 * Implements: qi.dp.dsl.contracts.md#Level1
 */
export interface Level1 {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime
  readonly bidPrice: decimal; // FIX Tag 270 + MDEntryType=0
  readonly bidSize: decimal; // FIX Tag 271 + MDEntryType=0
  readonly askPrice: decimal; // FIX Tag 270 + MDEntryType=1
  readonly askSize: decimal; // FIX Tag 271 + MDEntryType=1

  // Extended FIX fields (optional)
  readonly quoteId?: string; // FIX Tag 117 (QuoteID)
  readonly bidTime?: string; // FIX Tag 273 for bid specifically - ISO 8601 datetime
  readonly askTime?: string; // FIX Tag 273 for ask specifically - ISO 8601 datetime
}

/**
 * Time-series aggregated price data (FIX-derived from trade aggregations)
 * Implements: qi.dp.dsl.contracts.md#OHLCV
 */
export interface OHLCV {
  readonly timestamp: string; // Bar/candle start time - ISO 8601 datetime
  readonly open: decimal; // First trade price in period
  readonly high: decimal; // Highest trade price in period
  readonly low: decimal; // Lowest trade price in period
  readonly close: decimal; // Last trade price in period
  readonly volume: decimal; // Total volume traded in period

  // Extended fields
  readonly baseVolume?: decimal; // Volume in base currency
  readonly quoteVolume?: decimal; // Volume in quote currency
  readonly tradeCount?: number; // Number of trades in period
  readonly weightedAveragePrice?: decimal; // VWAP for period
}

/**
 * Multi-level order book depth (FIX multi-level MDEntryType=0/1)
 * Implements: qi.dp.dsl.contracts.md#MarketDepth
 */
export interface MarketDepth {
  readonly timestamp: string; // FIX Tag 273 (MDEntryTime) - ISO 8601 datetime
  readonly bids: readonly DepthLevel[]; // Bid side (MDEntryType=0)
  readonly asks: readonly DepthLevel[]; // Ask side (MDEntryType=1)

  // Extended fields
  readonly sequenceNumber?: number; // Order book sequence
  readonly totalBidSize?: decimal; // Total bid volume
  readonly totalAskSize?: decimal; // Total ask volume
}

// Union of all core market data types
export type CoreMarketData = Price | Level1 | OHLCV | MarketDepth;

// Generic wrapper for all market data
export interface MarketData<T extends CoreMarketData> {
  readonly context: DataContext;
  readonly coreData: T;
}
