/**
 * Validation functions and type guards for market data types
 * Provides runtime validation utilities for DSL data types
 */

import type {
  CoreMarketData,
  Level1,
  MarketData,
  MarketDepth,
  OHLCV,
  Price,
} from "../dsl/market-data.js";
import type {
  AssetClass,
  ContextQuery,
  DataContext,
  DateRange,
  DepthLevel,
  Exchange,
  Instrument,
  Levels,
  Market,
  MarketType,
  Side,
  Timeframe,
} from "../dsl/types.js";

// Helper function for ISO 8601 timestamp validation
const isValidISO8601 = (timestamp: string): boolean => {
  try {
    const date = new Date(timestamp);
    return !Number.isNaN(date.getTime()) && date.toISOString() === timestamp;
  } catch {
    return false;
  }
};

// Public timestamp validation function for external use
export const isValidTimestamp = (timestamp: unknown): timestamp is string => {
  return typeof timestamp === "string" && isValidISO8601(timestamp);
};

// Helper function for positive finite numbers
const isPositiveFinite = (value: number): boolean => {
  return Number.isFinite(value) && value > 0;
};

// Helper function for non-negative finite numbers
const isNonNegativeFinite = (value: number): boolean => {
  return Number.isFinite(value) && value >= 0;
};

// Type guard for AssetClass
export const isValidAssetClass = (value: unknown): value is AssetClass => {
  return (
    typeof value === "string" &&
    ["STOCK", "CRYPTO", "CURRENCY", "COMMODITY", "BOND", "INDEX"].includes(value)
  );
};

// Type guard for MarketType
export const isValidMarketType = (value: unknown): value is MarketType => {
  return (
    typeof value === "string" &&
    ["EQUITY", "CRYPTO", "FOREX", "COMMODITY", "BOND", "DERIVATIVE"].includes(value)
  );
};

// Type guard for Side
export const isValidSide = (value: unknown): value is Side => {
  return typeof value === "string" && ["BUY", "SELL"].includes(value);
};

// Type guard for Timeframe
export const isValidTimeframe = (value: unknown): value is Timeframe => {
  if (typeof value !== "string") return false;
  // Pattern: digits followed by time unit (s, m, h, d, w, M, Y)
  return /^(\d+[smhdwMY]|\d+[MS])$/.test(value);
};

// Type guard for Levels
export const isValidLevels = (value: unknown): value is Levels => {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1000;
};

// Type guard for DateRange
export const isValidDateRange = (obj: unknown): obj is DateRange => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "startDate" in obj &&
    "endDate" in obj &&
    typeof obj.startDate === "string" &&
    typeof obj.endDate === "string" &&
    isValidISO8601(obj.startDate) &&
    isValidISO8601(obj.endDate) &&
    new Date(obj.startDate) <= new Date(obj.endDate)
  );
};

// Type guard for Market
export const isValidMarket = (obj: unknown): obj is Market => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "type" in obj &&
    "region" in obj &&
    "segment" in obj &&
    isValidMarketType(obj.type) &&
    typeof obj.region === "string" &&
    (obj.region.match(/^[A-Z]{2}$/) || obj.region === "GLOBAL") &&
    typeof obj.segment === "string" &&
    ["CASH", "FUTURES", "OPTIONS"].includes(obj.segment)
  );
};

// Type guard for Exchange
export const isValidExchange = (obj: unknown): obj is Exchange => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "id" in obj &&
    "name" in obj &&
    "mic" in obj &&
    "timezone" in obj &&
    typeof obj.id === "string" &&
    obj.id.length > 0 &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    (obj.mic === null || (typeof obj.mic === "string" && /^[A-Z]{4}$/.test(obj.mic))) &&
    typeof obj.timezone === "string" &&
    (/^[A-Za-z]+\/[A-Za-z_]+$/.test(obj.timezone) || obj.timezone === "UTC")
  );
};

// Type guard for Instrument
export const isValidInstrument = (obj: unknown): obj is Instrument => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "symbol" in obj &&
    "isin" in obj &&
    "name" in obj &&
    "assetClass" in obj &&
    "currency" in obj &&
    typeof obj.symbol === "string" &&
    obj.symbol.length > 0 &&
    (obj.isin === null ||
      (typeof obj.isin === "string" && /^[A-Z]{2}[A-Z0-9]{10}$/.test(obj.isin))) &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    isValidAssetClass(obj.assetClass) &&
    typeof obj.currency === "string" &&
    /^[A-Z]{3}$/.test(obj.currency)
  );
};

// Type guard for DataContext
export const isValidDataContext = (obj: unknown): obj is DataContext => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "market" in obj &&
    "exchange" in obj &&
    "instrument" in obj &&
    isValidMarket(obj.market) &&
    isValidExchange(obj.exchange) &&
    isValidInstrument(obj.instrument)
  );
};

// Type guard for ContextQuery
export const isValidContextQuery = (obj: unknown): obj is ContextQuery => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "marketType" in obj &&
    "exchangeId" in obj &&
    "assetClass" in obj &&
    "symbol" in obj &&
    "region" in obj &&
    (obj.marketType === null || isValidMarketType(obj.marketType)) &&
    (obj.exchangeId === null || typeof obj.exchangeId === "string") &&
    (obj.assetClass === null || isValidAssetClass(obj.assetClass)) &&
    (obj.symbol === null || typeof obj.symbol === "string") &&
    (obj.region === null || typeof obj.region === "string")
  );
};

// Type guard for DepthLevel
export const isValidDepthLevel = (obj: unknown): obj is DepthLevel => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "price" in obj &&
    "size" in obj &&
    "level" in obj &&
    typeof obj.price === "number" &&
    obj.price > 0 &&
    Number.isFinite(obj.price) &&
    typeof obj.size === "number" &&
    obj.size >= 0 &&
    Number.isFinite(obj.size) &&
    typeof obj.level === "number" &&
    Number.isInteger(obj.level) &&
    obj.level >= 1
  );
};

// Type guard for Price
export const isValidPrice = (obj: unknown): obj is Price => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "price" in obj &&
    "size" in obj &&
    typeof obj.timestamp === "string" &&
    isValidISO8601(obj.timestamp) &&
    typeof obj.price === "number" &&
    isPositiveFinite(obj.price) &&
    typeof obj.size === "number" &&
    isPositiveFinite(obj.size) &&
    (!("tradeId" in obj) || typeof obj.tradeId === "string") &&
    (!("aggressor" in obj) || isValidSide(obj.aggressor))
  );
};

// Type guard for Level1
export const isValidLevel1 = (obj: unknown): obj is Level1 => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "bidPrice" in obj &&
    "bidSize" in obj &&
    "askPrice" in obj &&
    "askSize" in obj &&
    typeof obj.timestamp === "string" &&
    isValidISO8601(obj.timestamp) &&
    typeof obj.bidPrice === "number" &&
    isPositiveFinite(obj.bidPrice) &&
    typeof obj.bidSize === "number" &&
    isPositiveFinite(obj.bidSize) &&
    typeof obj.askPrice === "number" &&
    isPositiveFinite(obj.askPrice) &&
    typeof obj.askSize === "number" &&
    isPositiveFinite(obj.askSize) &&
    obj.askPrice >= obj.bidPrice && // No crossed market
    (!("quoteId" in obj) || typeof obj.quoteId === "string") &&
    (!("bidTime" in obj) || (typeof obj.bidTime === "string" && isValidISO8601(obj.bidTime))) &&
    (!("askTime" in obj) || (typeof obj.askTime === "string" && isValidISO8601(obj.askTime)))
  );
};

// Type guard for OHLCV
export const isValidOHLCV = (obj: unknown): obj is OHLCV => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "open" in obj &&
    "high" in obj &&
    "low" in obj &&
    "close" in obj &&
    "volume" in obj &&
    typeof obj.timestamp === "string" &&
    isValidISO8601(obj.timestamp) &&
    typeof obj.open === "number" &&
    isPositiveFinite(obj.open) &&
    typeof obj.high === "number" &&
    isPositiveFinite(obj.high) &&
    typeof obj.low === "number" &&
    isPositiveFinite(obj.low) &&
    typeof obj.close === "number" &&
    isPositiveFinite(obj.close) &&
    typeof obj.volume === "number" &&
    isNonNegativeFinite(obj.volume) &&
    obj.high >= obj.low && // High >= Low
    obj.high >= obj.open && // High >= Open
    obj.high >= obj.close && // High >= Close
    obj.low <= obj.open && // Low <= Open
    obj.low <= obj.close && // Low <= Close
    (!("baseVolume" in obj) ||
      (typeof obj.baseVolume === "number" && isNonNegativeFinite(obj.baseVolume))) &&
    (!("quoteVolume" in obj) ||
      (typeof obj.quoteVolume === "number" && isNonNegativeFinite(obj.quoteVolume))) &&
    (!("tradeCount" in obj) ||
      (typeof obj.tradeCount === "number" &&
        Number.isInteger(obj.tradeCount) &&
        obj.tradeCount >= 0)) &&
    (!("weightedAveragePrice" in obj) ||
      (typeof obj.weightedAveragePrice === "number" && isPositiveFinite(obj.weightedAveragePrice)))
  );
};

// Type guard for MarketDepth
export const isValidMarketDepth = (obj: unknown): obj is MarketDepth => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "timestamp" in obj &&
    "bids" in obj &&
    "asks" in obj &&
    typeof obj.timestamp === "string" &&
    isValidISO8601(obj.timestamp) &&
    Array.isArray(obj.bids) &&
    Array.isArray(obj.asks) &&
    obj.bids.every(isValidDepthLevel) &&
    obj.asks.every(isValidDepthLevel) &&
    (!("sequenceNumber" in obj) ||
      (typeof obj.sequenceNumber === "number" && Number.isInteger(obj.sequenceNumber))) &&
    (!("totalBidSize" in obj) ||
      (typeof obj.totalBidSize === "number" && isNonNegativeFinite(obj.totalBidSize))) &&
    (!("totalAskSize" in obj) ||
      (typeof obj.totalAskSize === "number" && isNonNegativeFinite(obj.totalAskSize)))
  );
};

// Type guard for CoreMarketData
export const isValidCoreMarketData = (obj: unknown): obj is CoreMarketData => {
  return isValidPrice(obj) || isValidLevel1(obj) || isValidOHLCV(obj) || isValidMarketDepth(obj);
};

// Type guard for MarketData<T>
export const isValidMarketData = <T extends CoreMarketData>(
  obj: unknown,
  isValidCoreData: (data: unknown) => data is T
): obj is MarketData<T> => {
  return (
    obj != null &&
    typeof obj === "object" &&
    "context" in obj &&
    "coreData" in obj &&
    isValidDataContext(obj.context) &&
    isValidCoreData(obj.coreData)
  );
};

// Additional validation helpers for business logic

/**
 * Validate market depth levels are properly ordered
 * Bids should be in descending price order, asks in ascending
 */
export const isValidMarketDepthOrdering = (depth: MarketDepth): boolean => {
  // Check bid ordering (descending)
  for (let i = 1; i < depth.bids.length; i++) {
    const current = depth.bids[i];
    const previous = depth.bids[i - 1];
    if (current && previous && current.price > previous.price) {
      return false;
    }
  }

  // Check ask ordering (ascending)
  for (let i = 1; i < depth.asks.length; i++) {
    const current = depth.asks[i];
    const previous = depth.asks[i - 1];
    if (current && previous && current.price < previous.price) {
      return false;
    }
  }

  // Check no crossed market (if both sides have data)
  if (depth.bids.length > 0 && depth.asks.length > 0) {
    const topBid = depth.bids[0];
    const topAsk = depth.asks[0];
    if (topBid && topAsk) {
      return topBid.price < topAsk.price;
    }
  }

  return true;
};

/**
 * Validate OHLCV bar integrity with proper relationships
 */
export const isValidOHLCVIntegrity = (ohlcv: OHLCV): boolean => {
  // Basic OHLC relationships
  return (
    ohlcv.high >= ohlcv.low &&
    ohlcv.high >= ohlcv.open &&
    ohlcv.high >= ohlcv.close &&
    ohlcv.low <= ohlcv.open &&
    ohlcv.low <= ohlcv.close
  );
};

/**
 * Validate context component compatibility
 */
export const isValidContextCompatibility = (context: DataContext): boolean => {
  // Market type should align with exchange capabilities
  // This is a basic check - real implementations might have more complex rules
  return (
    context.market.type !== "CRYPTO" ||
    context.exchange.id.toLowerCase().includes("crypto") ||
    context.exchange.id.toLowerCase().includes("binance") ||
    context.exchange.id.toLowerCase().includes("coinbase") ||
    context.exchange.name.toLowerCase().includes("crypto")
  );
};
