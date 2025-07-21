/**
 * DSL core types and supporting structures
 * Implements: docs/dsl/qi.dp.dsl.md Data Context Types
 */

import type { decimal } from "./market-data.js";

// Market classification types
export type MarketType = "EQUITY" | "CRYPTO" | "FOREX" | "COMMODITY" | "BOND" | "DERIVATIVE";

export type Segment = "CASH" | "FUTURES" | "OPTIONS";

export type Side = "BUY" | "SELL";

export type AssetClass = "STOCK" | "CRYPTO" | "CURRENCY" | "COMMODITY" | "BOND" | "INDEX";

// Context interfaces
export interface Market {
  readonly type: MarketType;
  readonly region: string;
  readonly segment: Segment;
}

export interface Exchange {
  readonly id: string;
  readonly name: string;
  readonly mic: string | null;
  readonly timezone: string;
}

export interface Instrument {
  readonly symbol: string;
  readonly isin: string | null;
  readonly name: string;
  readonly assetClass: AssetClass;
  readonly currency: string;
}

export interface DataContext {
  readonly market: Market;
  readonly exchange: Exchange;
  readonly instrument: Instrument;
}

// Query and filter types
export interface ContextQuery {
  readonly marketType: MarketType | null;
  readonly exchangeId: string | null;
  readonly assetClass: AssetClass | null;
  readonly symbol: string | null;
  readonly region: string | null;
}

// Market depth support
export interface DepthLevel {
  readonly price: decimal;
  readonly size: decimal;
  readonly level: number;
}

// Time and range types
export interface DateRange {
  readonly startDate: string;
  readonly endDate: string;
}

export type Timeframe = "1s" | "5s" | "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1M" | "1Y";

export type Levels = 1 | 5 | 10 | 50 | 100 | 500 | 1000;
