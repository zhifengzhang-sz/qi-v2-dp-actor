/**
 * @qi/dp Market Data DSL - Main export module
 *
 * This module provides a complete TypeScript implementation of the @qi/dp
 * market data Domain Specific Language (DSL) with FIX Protocol 4.4 compliance.
 *
 * @module @qi/dp/dsl
 * @version 4.0
 */

// Foundation types from @qi/base and @qi/core
export type {
  QiError,
  ErrorCategory,
  Result,
  Success,
  Failure,
} from "@qi/base";

export type {
  Config,
  ConfigData,
  Logger,
  LoggerConfig,
  ICache as Cache,
  CacheConfig,
} from "@qi/core";

export {
  success,
  failure,
  isSuccess,
  isFailure,
  map,
  flatMap,
  match,
  getValue,
  getError,
  validationError,
  networkError,
  systemError,
  timeoutError,
  businessError,
  authorizationError,
  create,
} from "@qi/base";

// DSL-specific error handling
export type {
  DSLError,
  MarketDataError,
  DataSourceError,
  MarketDepthError,
  StreamingError,
  HistoricalDataError,
} from "./errors.js";

export {
  createMarketDataError,
  createDataSourceError,
  createMarketDepthError,
  createStreamingError,
  createHistoricalDataError,
  INVALID_PRICE,
  INVALID_SIZE,
  INVALID_TIMESTAMP,
  SPREAD_TOO_WIDE,
  RATE_LIMIT_EXCEEDED,
  SYMBOL_NOT_FOUND,
  API_KEY_INVALID,
  MARKET_CLOSED,
  INSUFFICIENT_DEPTH,
  INVALID_DEPTH_LEVELS,
  STREAM_DISCONNECTED,
  STREAM_BUFFER_OVERFLOW,
  MAX_RECONNECTS_EXCEEDED,
  DATE_RANGE_INVALID,
  DATE_RANGE_TOO_LARGE,
  DATA_GAPS_DETECTED,
} from "./errors.js";

// Core types and interfaces
export type {
  AssetClass,
  MarketType,
  Side,
  Timeframe,
  Levels,
  DateRange,
  ContextQuery,
  Market,
  Exchange,
  Instrument,
  DataContext,
  DepthLevel,
} from "./types.js";

// Market data types
export type {
  MarketData,
  CoreMarketData,
  Price,
  Level1,
  OHLCV,
  MarketDepth,
} from "./market-data.js";

// Operation interfaces
export type {
  Subscription,
  PriceStream,
  Level1Stream,
  MarketDepthStream,
  OHLCVStream,
  MarketDataContextManager,
  MarketDataReader,
  HistoricalMarketDataReader,
  StreamingMarketDataReader,
  MarketDataWriter,
  HistoricalMarketDataWriter,
  StreamingMarketDataWriter,
} from "./operations.js";

// Financial precision arithmetic moved to utils/market-data-precision.ts

// Validation functions moved to utils/market-data-validation.ts

// Factory functions moved to utils/market-data-factories.ts

// Common constants for convenience
export {
  EXCHANGES,
  TIMEFRAMES,
  DEPTH_LEVELS,
  INTERVALS_MS,
  CURRENCIES,
  TRADING_PAIRS,
  ASSET_CLASSES,
  MARKET_TYPES,
} from "./constants.js";

// DSL version and metadata
export const DSL_VERSION = "4.0.0" as const;
export const DSL_NAME = "@qi/dp Market Data DSL" as const;
export const FIX_PROTOCOL_VERSION = "4.4" as const;

/**
 * DSL capability flags
 * Indicates which features are implemented in this version
 */
export const DSL_CAPABILITIES = {
  // Core data types
  PRICE_DATA: true,
  LEVEL1_DATA: true,
  OHLCV_DATA: true,
  MARKET_DEPTH: true,

  // Operations
  CURRENT_DATA_READING: true,
  HISTORICAL_DATA_READING: true,
  STREAMING_DATA_READING: true,
  DATA_WRITING: true,
  HISTORICAL_DATA_WRITING: true,
  STREAMING_DATA_WRITING: true,

  // Context management
  CONTEXT_CREATION: true,
  CONTEXT_QUERYING: true,
  CONTEXT_UPDATING: true,
  CONTEXT_VALIDATION: true,

  // Validation and type safety
  RUNTIME_VALIDATION: true,
  TYPE_GUARDS: true,
  FACTORY_FUNCTIONS: true,
  BUSINESS_LOGIC_VALIDATION: true,

  // Protocol compliance
  FIX_PROTOCOL_COMPLIANCE: true,
  RESULT_ERROR_HANDLING: true,
} as const;

/**
 * Quick reference for common DSL usage patterns
 */
export const DSL_PATTERNS = {
  // Create a basic crypto context
  CRYPTO_CONTEXT_EXAMPLE: "createDataContext(market, exchange, instrument)",

  // Validate market data
  VALIDATION_EXAMPLE: "isValidPrice(data) && isValidMarketData(data, isValidPrice)",

  // Safe data creation
  FACTORY_EXAMPLE:
    "createPrice(timestamp, price, size).map(price => createMarketData(context, price))",

  // Error handling
  ERROR_HANDLING_EXAMPLE: "result.match(data => console.log(data), error => console.error(error))",
} as const;
