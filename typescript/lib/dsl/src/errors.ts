/**
 * DSL error type definitions for market data domain
 * Pure vocabulary - interface definitions only (implementation in utils/errors.ts)
 */

import type { QiError } from "@qi/base";

// === Market Data Domain Error Types ===

// Market data validation errors (price validation, timeframe issues, etc.)
export interface MarketDataError extends QiError {
  readonly category: "VALIDATION" | "BUSINESS" | "NETWORK" | "TIMEOUT";
  readonly context: {
    readonly symbol?: string | undefined;
    readonly exchange?: string | undefined;
    readonly market?: string | undefined;
    readonly instrument?: string | undefined;
    readonly field?: string | undefined;
    readonly value?: unknown;
    readonly price?: number | undefined;
    readonly size?: number | undefined;
    readonly timestamp?: string | undefined;
    readonly timeframe?: string | undefined;
    readonly levels?: number | undefined;
    readonly minPrice?: number | undefined;
    readonly maxPrice?: number | undefined;
    readonly minSize?: number | undefined;
    readonly maxSize?: number | undefined;
    readonly spread?: number | undefined;
    readonly maxSpread?: number | undefined;
    // Additional context fields for specific validations
    readonly isNaN?: boolean;
    readonly error?: string;
    readonly actualValue?: unknown;
    readonly numerator?: number;
    readonly oldValue?: unknown;
    readonly newValue?: unknown;
    readonly bid?: number;
    readonly pricesLength?: number;
    readonly weightsLength?: number;
    readonly totalWeight?: number;
    readonly isFinite?: boolean;
  };
}

// Data source provider errors (CoinGecko, Binance, TwelveData)
export interface DataSourceError extends QiError {
  readonly category: "NETWORK" | "BUSINESS" | "TIMEOUT" | "SYSTEM";
  readonly context: {
    readonly provider?: string | undefined;
    readonly endpoint?: string | undefined;
    readonly apiKey?: string | undefined;
    readonly rateLimit?: number | undefined;
    readonly requestCount?: number | undefined;
    readonly responseCode?: number | undefined;
    readonly symbol?: string | undefined;
    readonly exchange?: string | undefined;
    readonly retryAfter?: number | undefined;
    readonly maxRetries?: number | undefined;
    readonly timeoutMs?: number | undefined;
  };
}

// Market depth and order book errors
export interface MarketDepthError extends QiError {
  readonly category: "VALIDATION" | "BUSINESS" | "NETWORK";
  readonly context: {
    readonly symbol?: string | undefined;
    readonly exchange?: string | undefined;
    readonly levels?: number | undefined;
    readonly maxLevels?: number | undefined;
    readonly bidCount?: number | undefined;
    readonly askCount?: number | undefined;
    readonly spread?: number | undefined;
    readonly maxSpread?: number | undefined;
    readonly timestamp?: string | undefined;
    readonly sequenceNumber?: number | undefined;
    readonly field?: string; // Additional field for MarketDepthError
  };
}

// Streaming and real-time data errors
export interface StreamingError extends QiError {
  readonly category: "NETWORK" | "TIMEOUT" | "SYSTEM";
  readonly context: {
    readonly streamId?: string | undefined;
    readonly symbol?: string | undefined;
    readonly exchange?: string | undefined;
    readonly connectionId?: string | undefined;
    readonly reconnectCount?: number | undefined;
    readonly maxReconnects?: number | undefined;
    readonly messageCount?: number | undefined;
    readonly lastHeartbeat?: string | undefined;
    readonly bufferSize?: number | undefined;
    readonly maxBufferSize?: number | undefined;
  };
}

// Historical data retrieval errors
export interface HistoricalDataError extends QiError {
  readonly category: "VALIDATION" | "BUSINESS" | "NETWORK" | "TIMEOUT";
  readonly context: {
    readonly symbol?: string | undefined;
    readonly exchange?: string | undefined;
    readonly startDate?: string | undefined;
    readonly endDate?: string | undefined;
    readonly timeframe?: string | undefined;
    readonly recordCount?: number | undefined;
    readonly maxRecords?: number | undefined;
    readonly dataGaps?: readonly string[];
    readonly missingDates?: readonly string[];
  };
}

// === Union Type for All DSL Errors ===

export type DSLError =
  | MarketDataError
  | DataSourceError
  | MarketDepthError
  | StreamingError
  | HistoricalDataError;
