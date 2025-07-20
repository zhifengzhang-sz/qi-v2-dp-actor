/**
 * Core DSL types for market data
 * Implements: docs/dsl/qi.dp.dsl.md Data Context Types and Support Types
 */

// Support types - Enums as union types
export type AssetClass = "STOCK" | "CRYPTO" | "CURRENCY" | "COMMODITY" | "BOND" | "INDEX";

export type MarketType = "EQUITY" | "CRYPTO" | "FOREX" | "COMMODITY" | "BOND" | "DERIVATIVE";

export type Side = "BUY" | "SELL";

// Composite value types
export type Timeframe = string; // Pattern: "1m", "5m", "1h", "1d", etc.

export type Levels = number; // 1-1000 constraint

// DateRange interface
export interface DateRange {
  readonly startDate: string; // ISO 8601 datetime (inclusive)
  readonly endDate: string; // ISO 8601 datetime (inclusive)
}

// Context query criteria
export interface ContextQuery {
  readonly marketType: MarketType | null;
  readonly exchangeId: string | null;
  readonly assetClass: AssetClass | null;
  readonly symbol: string | null;
  readonly region: string | null;
}

// Market classification
export interface Market {
  readonly type: MarketType;
  readonly region: string; // ISO country code or 'GLOBAL'
  readonly segment: "CASH" | "FUTURES" | "OPTIONS";
}

// Exchange identification
export interface Exchange {
  readonly id: string;
  readonly name: string;
  readonly mic: string | null; // ISO 10383 Market Identifier Code
  readonly timezone: string; // IANA timezone
}

// Financial instrument details
export interface Instrument {
  readonly symbol: string;
  readonly isin: string | null; // International Securities Identification Number
  readonly name: string;
  readonly assetClass: AssetClass;
  readonly currency: string; // ISO 4217 currency code
}

// Data context for routing and identification
export interface DataContext {
  readonly market: Market;
  readonly exchange: Exchange;
  readonly instrument: Instrument;
}

// Order book depth level
export interface DepthLevel {
  readonly price: number;
  readonly size: number;
  readonly level: number; // 1=top of book
}
