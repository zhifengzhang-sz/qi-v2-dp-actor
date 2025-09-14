/**
 * Market Data (MD) Smart Constructors - Named Exports
 * Implements: docs/md/impl.marketdata.md architecture
 *
 * This module provides validated implementations of DSL interfaces using
 * the smart constructor pattern with Result<T> functional error handling.
 */

// Re-export all smart constructor classes
export { Price } from "./price.js";
export { Level1 } from "./level1.js";
export { OHLCV } from "./ohlcv.js";
export { MarketDepth } from "./market-depth.js";
export { Market } from "./market.js";
export { Exchange } from "./exchange.js";
export { Instrument } from "./instrument.js";
export { DataContext } from "./data-context.js";
export { MarketData } from "./market-data.js";

// Re-export validation utilities for advanced usage
export {
  isValidTimestamp,
  isPositiveFiniteNumber,
  isNonNegativeFiniteNumber,
  isValidDecimal,
  isPositiveDecimal,
  isNonNegativeDecimal,
  isNonEmptyString,
  isOptionalNonEmptyString,
} from "./validation.js";

// Type re-exports from DSL for convenience
export type {
  // Core market data types (from DSL)
  Price as PriceInterface,
  Level1 as Level1Interface,
  OHLCV as OHLCVInterface,
  MarketDepth as MarketDepthInterface,
  CoreMarketData,
  MarketData as MarketDataInterface,
  decimal,
  // Context types (from DSL)
  Market as MarketInterface,
  Exchange as ExchangeInterface,
  Instrument as InstrumentInterface,
  DataContext as DataContextInterface,
  DepthLevel,
  // Supporting types (from DSL)
  MarketType,
  Segment,
  Side,
  AssetClass,
  DateRange,
  Timeframe,
  Levels,
  ContextQuery,
} from "@qi/dp/dsl";
