/**
 * MarketData<T> generic wrapper smart constructor implementation
 * Implements: docs/md/impl.marketdata.md MarketData<T> Generic Wrapper
 * Pattern: Generic smart constructor with type safety
 */

import type { Result } from "@qi/base";
import { Err, Ok, create } from "@qi/base";
import type * as DSL from "../dsl/index.js";
import { DataContext } from "./data-context.js";
import { Level1 } from "./level1.js";
import { MarketDepth } from "./market-depth.js";
import { OHLCV } from "./ohlcv.js";
import { Price } from "./price.js";

export class MarketData<T extends DSL.CoreMarketData> implements DSL.MarketData<T> {
  private constructor(
    public readonly context: DSL.DataContext,
    public readonly coreData: T
  ) {}

  /**
   * Creates a validated MarketData<T> instance
   * @param context DataContext with market, exchange, and instrument information
   * @param coreData Core market data (Price, Level1, OHLCV, or MarketDepth)
   * @returns Result<MarketData<T>> with validation
   */
  static create<T extends DSL.CoreMarketData>(
    context: DSL.DataContext,
    coreData: T
  ): Result<MarketData<T>> {
    // Validate context
    if (context === null || typeof context !== "object") {
      return Err(
        create("INVALID_CONTEXT", "Context must be a valid DataContext object", "VALIDATION", {
          value: context,
          type: typeof context,
        })
      );
    }

    // Validate coreData
    if (coreData === null || typeof coreData !== "object") {
      return Err(
        create("INVALID_CORE_DATA", "Core data must be a valid market data object", "VALIDATION", {
          value: coreData,
          type: typeof coreData,
        })
      );
    }

    return Ok(new MarketData(context, coreData));
  }

  /**
   * Creates a MarketData<T> from a DSL MarketData interface
   * @param obj DSL MarketData<T> object
   * @returns Result<MarketData<T>> with validation
   */
  static fromDSL<T extends DSL.CoreMarketData>(obj: DSL.MarketData<T>): Result<MarketData<T>> {
    return MarketData.create(obj.context, obj.coreData);
  }

  /**
   * Type guard to check if this contains Price data
   * @returns True if coreData is Price
   */
  isPrice(): this is MarketData<DSL.Price> {
    return "price" in this.coreData && "size" in this.coreData;
  }

  /**
   * Type guard to check if this contains Level1 data
   * @returns True if coreData is Level1
   */
  isLevel1(): this is MarketData<DSL.Level1> {
    return "bidPrice" in this.coreData && "askPrice" in this.coreData;
  }

  /**
   * Type guard to check if this contains OHLCV data
   * @returns True if coreData is OHLCV
   */
  isOHLCV(): this is MarketData<DSL.OHLCV> {
    return (
      "open" in this.coreData &&
      "high" in this.coreData &&
      "low" in this.coreData &&
      "close" in this.coreData
    );
  }

  /**
   * Type guard to check if this contains MarketDepth data
   * @returns True if coreData is MarketDepth
   */
  isMarketDepth(): this is MarketData<DSL.MarketDepth> {
    return "bids" in this.coreData && "asks" in this.coreData;
  }

  /**
   * Gets the timestamp from the core data
   * @returns ISO 8601 timestamp string
   */
  getTimestamp(): string {
    return this.coreData.timestamp;
  }

  /**
   * Gets the symbol from the context
   * @returns Instrument symbol
   */
  getSymbol(): string {
    return this.context.instrument.symbol;
  }

  /**
   * Gets the exchange ID from the context
   * @returns Exchange identifier
   */
  getExchangeId(): string {
    return this.context.exchange.id;
  }

  /**
   * Gets the market type from the context
   * @returns Market type (EQUITY, CRYPTO, etc.)
   */
  getMarketType(): DSL.MarketType {
    return this.context.market.type;
  }

  /**
   * Gets the asset class from the context
   * @returns Asset class (STOCK, CRYPTO, etc.)
   */
  getAssetClass(): DSL.AssetClass {
    return this.context.instrument.assetClass;
  }

  /**
   * Gets the trading currency from the context
   * @returns Currency code
   */
  getCurrency(): string {
    return this.context.instrument.currency;
  }

  /**
   * Gets a unique identifier for this market data
   * @returns String combining context and timestamp
   */
  getUniqueId(): string {
    return `${this.context.market.type}:${this.context.exchange.id}:${this.context.instrument.symbol}:${this.getTimestamp()}`;
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    const coreDataType = this.isPrice()
      ? "Price"
      : this.isLevel1()
        ? "Level1"
        : this.isOHLCV()
          ? "OHLCV"
          : this.isMarketDepth()
            ? "MarketDepth"
            : "Unknown";

    return `MarketData<${coreDataType}>{symbol: ${this.getSymbol()}, exchange: ${this.getExchangeId()}, timestamp: ${this.getTimestamp()}}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.MarketData<T> {
    return {
      context: this.context,
      coreData: this.coreData,
    };
  }
}
