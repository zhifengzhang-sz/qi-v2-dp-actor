/**
 * Market Data (MD) Smart Constructors - Named Exports
 * Implements: docs/md/impl.marketdata.md architecture
 *
 * This module provides validated implementations of DSL interfaces using
 * the smart constructor pattern with Result<T> functional error handling.
 */

// Type re-exports from DSL for convenience
export type {
  AssetClass,
  ContextQuery,
  CoreMarketData,
  DataContext as DataContextInterface,
  DateRange,
  DepthLevel,
  decimal,
  Exchange as ExchangeInterface,
  Instrument as InstrumentInterface,
  Level1 as Level1Interface,
  Levels,
  // Context types (from DSL)
  Market as MarketInterface,
  MarketData as MarketDataInterface,
  MarketDepth as MarketDepthInterface,
  // Supporting types (from DSL)
  MarketType,
  OHLCV as OHLCVInterface,
  // Core market data types (from DSL)
  Price as PriceInterface,
  Segment,
  Side,
  Timeframe,
} from "@qi/dp/dsl";
export { DataContext } from "./data-context.js";
export { Exchange } from "./exchange.js";
export { Instrument } from "./instrument.js";
export { Level1 } from "./level1.js";
export { Market } from "./market.js";
export { MarketData } from "./market-data.js";
export { MarketDepth } from "./market-depth.js";
export { OHLCV } from "./ohlcv.js";
// Re-export all smart constructor classes
export { Price } from "./price.js";
// Re-export validation utilities for advanced usage
export {
  isNonEmptyString,
  isNonNegativeDecimal,
  isNonNegativeFiniteNumber,
  isOptionalNonEmptyString,
  isPositiveDecimal,
  isPositiveFiniteNumber,
  isValidDecimal,
  isValidTimestamp,
} from "./validation.js";
