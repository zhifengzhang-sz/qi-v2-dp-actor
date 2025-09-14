/**
 * DSL constants and enumerations
 * Common values for market data operations
 */

import type { AssetClass, Levels, MarketType, Timeframe } from "./types.js";

// Export common constants for convenience - NOT part of namespace structure

export const MARKET_TYPES: readonly MarketType[] = [
  "EQUITY",
  "CRYPTO",
  "FOREX",
  "COMMODITY",
  "BOND",
  "DERIVATIVE",
] as const;

export const ASSET_CLASSES: readonly AssetClass[] = [
  "STOCK",
  "CRYPTO",
  "CURRENCY",
  "COMMODITY",
  "BOND",
  "INDEX",
] as const;

export const TIMEFRAMES: readonly Timeframe[] = [
  "1s",
  "5s",
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
  "1M",
  "1Y",
] as const;

export const DEPTH_LEVELS: readonly Levels[] = [1, 5, 10, 50, 100, 500, 1000] as const;

// Common timeframe to milliseconds conversion
export const INTERVALS_MS = {
  "1s": 1000,
  "5s": 5000,
  "1m": 60000,
  "5m": 300000,
  "15m": 900000,
  "1h": 3600000,
  "4h": 14400000,
  "1d": 86400000,
  "1w": 604800000,
  "1M": 2629746000, // Average month
  "1Y": 31556952000, // Average year
} as const satisfies Record<Timeframe, number>;

// NOTE: Concrete exchange, currency, and trading pair data has been moved to utils layer
// DSL should contain only vocabulary types, not implementation data
// These concrete arrays belong in utils/exchanges, utils/currencies, utils/trading-pairs modules
