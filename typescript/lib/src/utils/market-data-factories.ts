/**
 * Factory functions for creating validated market data objects
 * Provides safe object creation with proper validation and error handling
 */

import type { Result } from "@qi/base";
import { failure, success } from "@qi/base";
import { createMarketDataError } from "../dsl/errors.js";
import type {
  CoreMarketData,
  Level1,
  MarketData,
  MarketDepth,
  OHLCV,
  Price,
} from "../dsl/market-data.js";
import type { DataContext, DepthLevel, Exchange, Instrument, Market, Side } from "../dsl/types.js";
import {
  isValidDataContext,
  isValidLevel1,
  isValidMarketDepth,
  isValidOHLCV,
  isValidPrice,
  isValidTimestamp,
} from "./market-data-validation.js";

/**
 * Create a validated Price object
 */
export const createPrice = (
  timestamp: string,
  price: number,
  size: number,
  tradeId?: string,
  aggressor?: Side
): Result<Price, any> => {
  if (!isValidTimestamp(timestamp)) {
    return failure(
      createMarketDataError("INVALID_TIMESTAMP", "Invalid timestamp format", "VALIDATION", {
        value: timestamp,
        field: "timestamp",
      })
    );
  }

  if (typeof price !== "number" || price <= 0 || !Number.isFinite(price)) {
    return failure(
      createMarketDataError(
        "INVALID_PRICE",
        "Price must be a positive finite number",
        "VALIDATION",
        {
          value: price,
          field: "price",
        }
      )
    );
  }

  if (typeof size !== "number" || size <= 0 || !Number.isFinite(size)) {
    return failure(
      createMarketDataError("INVALID_SIZE", "Size must be a positive finite number", "VALIDATION", {
        value: size,
        field: "size",
      })
    );
  }

  const priceObj: Price = {
    timestamp,
    price,
    size,
    ...(tradeId && { tradeId }),
    ...(aggressor && { aggressor }),
  };

  if (!isValidPrice(priceObj)) {
    return failure(
      createMarketDataError(
        "PRICE_VALIDATION_FAILED",
        "Created price object failed validation",
        "VALIDATION",
        {
          value: priceObj,
        }
      )
    );
  }

  return success(priceObj);
};

/**
 * Create a validated Level1 object
 */
export const createLevel1 = (
  timestamp: string,
  bidPrice: number,
  bidSize: number,
  askPrice: number,
  askSize: number,
  quoteId?: string,
  bidTime?: string,
  askTime?: string
): Result<Level1, any> => {
  if (!isValidTimestamp(timestamp)) {
    return failure(
      createMarketDataError("INVALID_TIMESTAMP", "Invalid timestamp format", "VALIDATION", {
        value: timestamp,
        field: "timestamp",
      })
    );
  }

  if (typeof bidPrice !== "number" || bidPrice <= 0 || !Number.isFinite(bidPrice)) {
    return failure(
      createMarketDataError(
        "INVALID_PRICE",
        "Bid price must be a positive finite number",
        "VALIDATION",
        {
          value: bidPrice,
          field: "bidPrice",
        }
      )
    );
  }

  if (typeof askPrice !== "number" || askPrice <= 0 || !Number.isFinite(askPrice)) {
    return failure(
      createMarketDataError(
        "INVALID_PRICE",
        "Ask price must be a positive finite number",
        "VALIDATION",
        {
          value: askPrice,
          field: "askPrice",
        }
      )
    );
  }

  if (askPrice < bidPrice) {
    return failure(
      createMarketDataError(
        "CROSSED_MARKET",
        "Ask price cannot be less than bid price",
        "VALIDATION",
        {
          value: `bid: ${bidPrice}, ask: ${askPrice}`,
          field: "prices",
        }
      )
    );
  }

  if (typeof bidSize !== "number" || bidSize <= 0 || !Number.isFinite(bidSize)) {
    return failure(
      createMarketDataError(
        "INVALID_SIZE",
        "Bid size must be a positive finite number",
        "VALIDATION",
        {
          value: bidSize,
          field: "bidSize",
        }
      )
    );
  }

  if (typeof askSize !== "number" || askSize <= 0 || !Number.isFinite(askSize)) {
    return failure(
      createMarketDataError(
        "INVALID_SIZE",
        "Ask size must be a positive finite number",
        "VALIDATION",
        {
          value: askSize,
          field: "askSize",
        }
      )
    );
  }

  const level1Obj: Level1 = {
    timestamp,
    bidPrice,
    bidSize,
    askPrice,
    askSize,
    ...(quoteId && { quoteId }),
    ...(bidTime && { bidTime }),
    ...(askTime && { askTime }),
  };

  if (!isValidLevel1(level1Obj)) {
    return failure(
      createMarketDataError(
        "LEVEL1_VALIDATION_FAILED",
        "Created Level1 object failed validation",
        "VALIDATION",
        {
          value: level1Obj,
        }
      )
    );
  }

  return success(level1Obj);
};

/**
 * Create a validated OHLCV object
 */
export const createOHLCV = (
  timestamp: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  baseVolume?: number,
  quoteVolume?: number,
  tradeCount?: number,
  weightedAveragePrice?: number
): Result<OHLCV, any> => {
  if (!isValidTimestamp(timestamp)) {
    return failure(
      createMarketDataError("INVALID_TIMESTAMP", "Invalid timestamp format", "VALIDATION", {
        value: timestamp,
        field: "timestamp",
      })
    );
  }

  // Validate all prices are positive and finite
  const prices = { open, high, low, close };
  for (const [field, price] of Object.entries(prices)) {
    if (typeof price !== "number" || price <= 0 || !Number.isFinite(price)) {
      return failure(
        createMarketDataError(
          "INVALID_PRICE",
          `${field} must be a positive finite number`,
          "VALIDATION",
          {
            value: price,
            field,
          }
        )
      );
    }
  }

  // Validate OHLC relationships
  if (high < low || high < open || high < close || low > open || low > close) {
    return failure(
      createMarketDataError(
        "INVALID_OHLC",
        "OHLC values violate expected relationships",
        "VALIDATION",
        {
          value: `O:${open} H:${high} L:${low} C:${close}`,
          field: "ohlc",
        }
      )
    );
  }

  if (typeof volume !== "number" || volume < 0 || !Number.isFinite(volume)) {
    return failure(
      createMarketDataError(
        "INVALID_VOLUME",
        "Volume must be a non-negative finite number",
        "VALIDATION",
        {
          value: volume,
          field: "volume",
        }
      )
    );
  }

  const ohlcvObj: OHLCV = {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    ...(baseVolume !== undefined && { baseVolume }),
    ...(quoteVolume !== undefined && { quoteVolume }),
    ...(tradeCount !== undefined && { tradeCount }),
    ...(weightedAveragePrice !== undefined && { weightedAveragePrice }),
  };

  if (!isValidOHLCV(ohlcvObj)) {
    return failure(
      createMarketDataError(
        "OHLCV_VALIDATION_FAILED",
        "Created OHLCV object failed validation",
        "VALIDATION",
        {
          value: ohlcvObj,
        }
      )
    );
  }

  return success(ohlcvObj);
};

/**
 * Create a validated MarketDepth object
 */
export const createMarketDepth = (
  timestamp: string,
  bids: DepthLevel[],
  asks: DepthLevel[],
  sequenceNumber?: number,
  totalBidSize?: number,
  totalAskSize?: number
): Result<MarketDepth, any> => {
  if (!isValidTimestamp(timestamp)) {
    return failure(
      createMarketDataError("INVALID_TIMESTAMP", "Invalid timestamp format", "VALIDATION", {
        value: timestamp,
        field: "timestamp",
      })
    );
  }

  if (!Array.isArray(bids)) {
    return failure(
      createMarketDataError("INVALID_BIDS", "Bids must be an array", "VALIDATION", {
        value: bids,
        field: "bids",
      })
    );
  }

  if (!Array.isArray(asks)) {
    return failure(
      createMarketDataError("INVALID_ASKS", "Asks must be an array", "VALIDATION", {
        value: asks,
        field: "asks",
      })
    );
  }

  const depthObj: MarketDepth = {
    timestamp,
    bids,
    asks,
    ...(sequenceNumber !== undefined && { sequenceNumber }),
    ...(totalBidSize !== undefined && { totalBidSize }),
    ...(totalAskSize !== undefined && { totalAskSize }),
  };

  if (!isValidMarketDepth(depthObj)) {
    return failure(
      createMarketDataError(
        "MARKET_DEPTH_VALIDATION_FAILED",
        "Created MarketDepth object failed validation",
        "VALIDATION",
        {
          value: depthObj,
        }
      )
    );
  }

  return success(depthObj);
};

/**
 * Create a validated MarketData wrapper
 */
export const createMarketData = <T extends CoreMarketData>(
  context: DataContext,
  coreData: T
): Result<MarketData<T>, any> => {
  if (!isValidDataContext(context)) {
    return failure(
      createMarketDataError("INVALID_CONTEXT", "Invalid data context", "VALIDATION", {
        value: context,
        field: "context",
      })
    );
  }

  const marketDataObj: MarketData<T> = {
    context,
    coreData,
  };

  return success(marketDataObj);
};

/**
 * Create a validated DataContext
 */
export const createDataContext = (
  market: Market,
  exchange: Exchange,
  instrument: Instrument
): Result<DataContext, any> => {
  const contextObj: DataContext = {
    market,
    exchange,
    instrument,
  };

  if (!isValidDataContext(contextObj)) {
    return failure(
      createMarketDataError(
        "CONTEXT_VALIDATION_FAILED",
        "Created DataContext object failed validation",
        "VALIDATION",
        {
          value: contextObj,
        }
      )
    );
  }

  return success(contextObj);
};

/**
 * Create a validated DepthLevel
 */
export const createDepthLevel = (
  price: number,
  size: number,
  level: number
): Result<DepthLevel, any> => {
  if (typeof price !== "number" || price <= 0 || !Number.isFinite(price)) {
    return failure(
      createMarketDataError(
        "INVALID_PRICE",
        "Price must be a positive finite number",
        "VALIDATION",
        {
          value: price,
          field: "price",
        }
      )
    );
  }

  if (typeof size !== "number" || size < 0 || !Number.isFinite(size)) {
    return failure(
      createMarketDataError(
        "INVALID_SIZE",
        "Size must be a non-negative finite number",
        "VALIDATION",
        {
          value: size,
          field: "size",
        }
      )
    );
  }

  if (typeof level !== "number" || !Number.isInteger(level) || level < 1) {
    return failure(
      createMarketDataError("INVALID_LEVEL", "Level must be a positive integer", "VALIDATION", {
        value: level,
        field: "level",
      })
    );
  }

  const depthLevelObj: DepthLevel = {
    price,
    size,
    level,
  };

  return success(depthLevelObj);
};

/**
 * Create a validated timestamp (ISO 8601 format)
 */
export const createTimestamp = (date?: Date): Result<string, any> => {
  const targetDate = date || new Date();

  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
    return failure(
      createMarketDataError("INVALID_DATE", "Invalid Date object", "VALIDATION", {
        value: targetDate,
        field: "date",
      })
    );
  }

  const timestamp = targetDate.toISOString();

  if (!isValidTimestamp(timestamp)) {
    return failure(
      createMarketDataError(
        "TIMESTAMP_VALIDATION_FAILED",
        "Created timestamp failed validation",
        "VALIDATION",
        {
          value: timestamp,
        }
      )
    );
  }

  return success(timestamp);
};
