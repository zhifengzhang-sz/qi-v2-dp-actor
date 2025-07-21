/**
 * DSL error type definitions for market data domain
 * Pure vocabulary - interface definitions only (implementation in utils/errors.ts)
 */

import type { QiError } from "@qi/base";

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

// === Union Type for All DSL Errors ===

export type DSLError =
  | MarketDataError
  | DataSourceError
  | MarketDepthError
  | StreamingError
  | HistoricalDataError;
