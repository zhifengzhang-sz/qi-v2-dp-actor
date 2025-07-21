/**
 * DataContext smart constructor implementation
 * Implements: docs/md/impl.marketdata.md DataContext Implementation
 * Pattern: Composition validation with cross-checks
 */

import type { Result } from "@qi/base";
import { create, failure, success } from "@qi/base";
import type * as DSL from "../dsl/index.js";
import { Exchange } from "./exchange.js";
import { Instrument } from "./instrument.js";
import { Market } from "./market.js";

export class DataContext implements DSL.DataContext {
  private constructor(
    public readonly market: DSL.Market,
    public readonly exchange: DSL.Exchange,
    public readonly instrument: DSL.Instrument
  ) {}

  /**
   * Creates a validated DataContext instance
   * @param market Market information (type, region, segment)
   * @param exchange Exchange information (id, name, mic, timezone)
   * @param instrument Instrument information (symbol, isin, name, assetClass, currency)
   * @returns Result<DataContext> with validation and cross-checks
   */
  static create(
    market: DSL.Market,
    exchange: DSL.Exchange,
    instrument: DSL.Instrument
  ): Result<DataContext> {
    // Validate market
    if (market === null || typeof market !== "object") {
      return failure(
        create("INVALID_MARKET", "Market must be a valid Market object", "VALIDATION", {
          value: market,
          type: typeof market,
        })
      );
    }

    // Validate exchange
    if (exchange === null || typeof exchange !== "object") {
      return failure(
        create("INVALID_EXCHANGE", "Exchange must be a valid Exchange object", "VALIDATION", {
          value: exchange,
          type: typeof exchange,
        })
      );
    }

    // Validate instrument
    if (instrument === null || typeof instrument !== "object") {
      return failure(
        create("INVALID_INSTRUMENT", "Instrument must be a valid Instrument object", "VALIDATION", {
          value: instrument,
          type: typeof instrument,
        })
      );
    }

    // Business rule: Market-Instrument compatibility validation
    const compatibilityResult = DataContext.validateMarketInstrumentCompatibility(
      market,
      instrument
    );
    if (compatibilityResult.tag === "failure") {
      return compatibilityResult;
    }

    // Business rule: Exchange-Market region compatibility (optional but recommended)
    const regionCompatibilityResult = DataContext.validateExchangeMarketCompatibility(
      exchange,
      market
    );
    if (regionCompatibilityResult.tag === "failure") {
      return regionCompatibilityResult;
    }

    return success(new DataContext(market, exchange, instrument));
  }

  /**
   * Creates a DataContext from a DSL DataContext interface
   * @param obj DSL DataContext object
   * @returns Result<DataContext> with validation
   */
  static fromDSL(obj: DSL.DataContext): Result<DataContext> {
    return DataContext.create(obj.market, obj.exchange, obj.instrument);
  }

  /**
   * Validates market-instrument compatibility
   * @param market Market to validate
   * @param instrument Instrument to validate
   * @returns Result with compatibility validation
   */
  private static validateMarketInstrumentCompatibility(
    market: DSL.Market,
    instrument: DSL.Instrument
  ): Result<void> {
    // Crypto instruments should typically be in CRYPTO markets
    if (instrument.assetClass === "CRYPTO" && market.type !== "CRYPTO") {
      return failure(
        create(
          "MARKET_INSTRUMENT_MISMATCH",
          "Crypto instruments should typically trade in CRYPTO markets",
          "VALIDATION",
          {
            marketType: market.type,
            instrumentAssetClass: instrument.assetClass,
            suggestion: "Use CRYPTO market type for crypto instruments",
          }
        )
      );
    }

    // Stocks should typically be in EQUITY markets
    if (instrument.assetClass === "STOCK" && market.type !== "EQUITY") {
      return failure(
        create(
          "MARKET_INSTRUMENT_MISMATCH",
          "Stock instruments should typically trade in EQUITY markets",
          "VALIDATION",
          {
            marketType: market.type,
            instrumentAssetClass: instrument.assetClass,
            suggestion: "Use EQUITY market type for stock instruments",
          }
        )
      );
    }

    // Currency instruments should typically be in FOREX markets
    if (instrument.assetClass === "CURRENCY" && market.type !== "FOREX") {
      return failure(
        create(
          "MARKET_INSTRUMENT_MISMATCH",
          "Currency instruments should typically trade in FOREX markets",
          "VALIDATION",
          {
            marketType: market.type,
            instrumentAssetClass: instrument.assetClass,
            suggestion: "Use FOREX market type for currency instruments",
          }
        )
      );
    }

    return success(undefined);
  }

  /**
   * Validates exchange-market region compatibility
   * @param exchange Exchange to validate
   * @param market Market to validate
   * @returns Result with region compatibility validation
   */
  private static validateExchangeMarketCompatibility(
    exchange: DSL.Exchange,
    market: DSL.Market
  ): Result<void> {
    // This is a soft validation - some cross-region trading is valid
    // For now, we'll just return success but could add specific rules later

    // Example rule: US exchanges should typically be in US markets
    const usExchanges = new Set(["NYSE", "NASDAQ", "nyse", "nasdaq"]);
    if (usExchanges.has(exchange.id.toLowerCase()) && market.region !== "US") {
      // This is just a warning-level validation, not an error
      // Could be enhanced to return a warning type in the future
    }

    return success(undefined);
  }

  /**
   * Gets a unique identifier for this context
   * @returns String identifier combining market, exchange, and instrument
   */
  getContextId(): string {
    return `${this.market.type}:${this.exchange.id}:${this.instrument.symbol}`;
  }

  /**
   * Checks if this context represents crypto trading
   * @returns True if market is crypto or instrument is crypto
   */
  isCrypto(): boolean {
    return this.market.type === "CRYPTO" || this.instrument.assetClass === "CRYPTO";
  }

  /**
   * Checks if this context represents equity trading
   * @returns True if market is equity and instrument is stock
   */
  isEquity(): boolean {
    return this.market.type === "EQUITY" && this.instrument.assetClass === "STOCK";
  }

  /**
   * Checks if this context represents forex trading
   * @returns True if market is forex and instrument is currency
   */
  isForex(): boolean {
    return this.market.type === "FOREX" && this.instrument.assetClass === "CURRENCY";
  }

  /**
   * Checks if this context represents derivatives trading
   * @returns True if market segment is futures or options
   */
  isDerivatives(): boolean {
    return this.market.segment === "FUTURES" || this.market.segment === "OPTIONS";
  }

  /**
   * Gets the trading currency for this context
   * @returns Currency code from instrument
   */
  getTradingCurrency(): string {
    return this.instrument.currency;
  }

  /**
   * Gets the trading region for this context
   * @returns Region code from market
   */
  getTradingRegion(): string {
    return this.market.region;
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    return `DataContext{contextId: ${this.getContextId()}, market: ${this.market.type}/${this.market.region}, exchange: ${this.exchange.id}, instrument: ${this.instrument.symbol}/${this.instrument.assetClass}}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.DataContext {
    return {
      market: this.market,
      exchange: this.exchange,
      instrument: this.instrument,
    };
  }
}
