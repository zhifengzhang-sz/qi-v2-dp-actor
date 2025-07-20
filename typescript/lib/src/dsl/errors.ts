/**
 * DSL error handling with extended categories for market data domain
 * Follows patterns from @qi/base error-extension demo
 */

import { type ErrorCategory, type QiError, create } from "@qi/base";

// === Market Data Domain Error Types ===

// Market data validation errors (price validation, timeframe issues, etc.)
export interface MarketDataError extends QiError {
  category: "VALIDATION" | "BUSINESS" | "NETWORK" | "TIMEOUT";
  context: {
    symbol?: string | undefined;
    exchange?: string | undefined;
    market?: string | undefined;
    instrument?: string | undefined;
    field?: string | undefined;
    value?: unknown;
    price?: number | undefined;
    size?: number | undefined;
    timestamp?: string | undefined;
    timeframe?: string | undefined;
    levels?: number | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minSize?: number | undefined;
    maxSize?: number | undefined;
    spread?: number | undefined;
    maxSpread?: number | undefined;
    // Additional context fields for specific validations
    isNaN?: boolean;
    error?: string;
    actualValue?: unknown;
    numerator?: number;
    oldValue?: unknown;
    newValue?: unknown;
    bid?: number;
    pricesLength?: number;
    weightsLength?: number;
    totalWeight?: number;
    isFinite?: boolean;
  };
}

// Data source provider errors (CoinGecko, Binance, TwelveData)
export interface DataSourceError extends QiError {
  category: "NETWORK" | "BUSINESS" | "TIMEOUT" | "SYSTEM";
  context: {
    provider?: string | undefined;
    endpoint?: string | undefined;
    apiKey?: string | undefined;
    rateLimit?: number | undefined;
    requestCount?: number | undefined;
    responseCode?: number | undefined;
    symbol?: string | undefined;
    exchange?: string | undefined;
    retryAfter?: number | undefined;
    maxRetries?: number | undefined;
    timeoutMs?: number | undefined;
  };
}

// Market depth and order book errors
export interface MarketDepthError extends QiError {
  category: "VALIDATION" | "BUSINESS" | "NETWORK";
  context: {
    symbol?: string | undefined;
    exchange?: string | undefined;
    levels?: number | undefined;
    maxLevels?: number | undefined;
    bidCount?: number | undefined;
    askCount?: number | undefined;
    spread?: number | undefined;
    maxSpread?: number | undefined;
    timestamp?: string | undefined;
    sequenceNumber?: number | undefined;
    field?: string; // Additional field for MarketDepthError
  };
}

// Streaming and real-time data errors
export interface StreamingError extends QiError {
  category: "NETWORK" | "TIMEOUT" | "SYSTEM";
  context: {
    streamId?: string | undefined;
    symbol?: string | undefined;
    exchange?: string | undefined;
    connectionId?: string | undefined;
    reconnectCount?: number | undefined;
    maxReconnects?: number | undefined;
    messageCount?: number | undefined;
    lastHeartbeat?: string | undefined;
    bufferSize?: number | undefined;
    maxBufferSize?: number | undefined;
  };
}

// Historical data retrieval errors
export interface HistoricalDataError extends QiError {
  category: "VALIDATION" | "BUSINESS" | "NETWORK" | "TIMEOUT";
  context: {
    symbol?: string | undefined;
    exchange?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    timeframe?: string | undefined;
    recordCount?: number | undefined;
    maxRecords?: number | undefined;
    dataGaps?: string[];
    missingDates?: string[];
  };
}

// === Error Factory Functions ===

export function createMarketDataError(
  code: string,
  message: string,
  category: MarketDataError["category"],
  context: MarketDataError["context"] = {}
): MarketDataError {
  return create(code, message, category, context) as MarketDataError;
}

export function createDataSourceError(
  code: string,
  message: string,
  category: DataSourceError["category"],
  context: DataSourceError["context"] = {}
): DataSourceError {
  return create(code, message, category, context) as DataSourceError;
}

export function createMarketDepthError(
  code: string,
  message: string,
  category: MarketDepthError["category"],
  context: MarketDepthError["context"] = {}
): MarketDepthError {
  return create(code, message, category, context) as MarketDepthError;
}

export function createStreamingError(
  code: string,
  message: string,
  category: StreamingError["category"],
  context: StreamingError["context"] = {}
): StreamingError {
  return create(code, message, category, context) as StreamingError;
}

export function createHistoricalDataError(
  code: string,
  message: string,
  category: HistoricalDataError["category"],
  context: HistoricalDataError["context"] = {}
): HistoricalDataError {
  return create(code, message, category, context) as HistoricalDataError;
}

// === Common Market Data Error Patterns ===

// Price validation errors
export const INVALID_PRICE = (price: number, symbol?: string) =>
  createMarketDataError("INVALID_PRICE", "Price must be positive and finite", "VALIDATION", {
    price,
    symbol,
    field: "price",
  });

export const INVALID_SIZE = (size: number, symbol?: string) =>
  createMarketDataError("INVALID_SIZE", "Size must be positive and finite", "VALIDATION", {
    size,
    symbol,
    field: "size",
  });

export const INVALID_TIMESTAMP = (timestamp: unknown, symbol?: string) =>
  createMarketDataError("INVALID_TIMESTAMP", "Timestamp must be a valid Date", "VALIDATION", {
    timestamp: String(timestamp),
    symbol,
    field: "timestamp",
  });

export const SPREAD_TOO_WIDE = (spread: number, maxSpread: number, symbol?: string) =>
  createMarketDataError("SPREAD_TOO_WIDE", "Bid-ask spread exceeds maximum allowed", "BUSINESS", {
    spread,
    maxSpread,
    symbol,
  });

// Data source errors
export const RATE_LIMIT_EXCEEDED = (provider: string, retryAfter?: number) =>
  createDataSourceError("RATE_LIMIT_EXCEEDED", "API rate limit exceeded", "NETWORK", {
    provider,
    retryAfter,
  });

export const SYMBOL_NOT_FOUND = (symbol: string, exchange: string, provider: string) =>
  createDataSourceError("SYMBOL_NOT_FOUND", "Symbol not found on exchange", "BUSINESS", {
    symbol,
    exchange,
    provider,
  });

export const API_KEY_INVALID = (provider: string) =>
  createDataSourceError("API_KEY_INVALID", "Invalid or missing API key", "BUSINESS", {
    provider,
  });

export const MARKET_CLOSED = (symbol: string, exchange: string) =>
  createDataSourceError("MARKET_CLOSED", "Market is currently closed", "BUSINESS", {
    symbol,
    exchange,
  });

// Market depth errors
export const INSUFFICIENT_DEPTH = (levels: number, available: number, symbol?: string) =>
  createMarketDepthError("INSUFFICIENT_DEPTH", "Insufficient market depth levels", "BUSINESS", {
    levels,
    symbol,
    bidCount: available,
  });

export const INVALID_DEPTH_LEVELS = (levels: number, maxLevels: number) =>
  createMarketDepthError(
    "INVALID_DEPTH_LEVELS",
    "Invalid number of depth levels requested",
    "VALIDATION",
    {
      levels,
      maxLevels,
      field: "levels",
    }
  );

// Streaming errors
export const STREAM_DISCONNECTED = (streamId: string, symbol?: string) =>
  createStreamingError("STREAM_DISCONNECTED", "Real-time stream disconnected", "NETWORK", {
    streamId,
    symbol,
  });

export const STREAM_BUFFER_OVERFLOW = (
  streamId: string,
  bufferSize: number,
  maxBufferSize: number
) =>
  createStreamingError("STREAM_BUFFER_OVERFLOW", "Stream buffer overflow", "SYSTEM", {
    streamId,
    bufferSize,
    maxBufferSize,
  });

export const MAX_RECONNECTS_EXCEEDED = (streamId: string, maxReconnects: number) =>
  createStreamingError(
    "MAX_RECONNECTS_EXCEEDED",
    "Maximum reconnection attempts exceeded",
    "NETWORK",
    {
      streamId,
      maxReconnects,
    }
  );

// Historical data errors
export const DATE_RANGE_INVALID = (startDate: string, endDate: string) =>
  createHistoricalDataError("DATE_RANGE_INVALID", "Invalid date range specified", "VALIDATION", {
    startDate,
    endDate,
  });

export const DATE_RANGE_TOO_LARGE = (startDate: string, endDate: string, maxRecords: number) =>
  createHistoricalDataError(
    "DATE_RANGE_TOO_LARGE",
    "Date range exceeds maximum allowed records",
    "BUSINESS",
    {
      startDate,
      endDate,
      maxRecords,
    }
  );

export const DATA_GAPS_DETECTED = (symbol: string, missingDates: string[]) =>
  createHistoricalDataError(
    "DATA_GAPS_DETECTED",
    "Missing data for specified date range",
    "BUSINESS",
    {
      symbol,
      missingDates,
    }
  );

// === Union Type for All DSL Errors ===

export type DSLError =
  | MarketDataError
  | DataSourceError
  | MarketDepthError
  | StreamingError
  | HistoricalDataError;
