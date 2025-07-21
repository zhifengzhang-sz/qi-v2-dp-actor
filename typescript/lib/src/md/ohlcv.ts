/**
 * OHLCV smart constructor implementation
 * Implements: docs/md/impl.marketdata.md OHLCV Implementation
 * FIX Protocol: Derived from MDEntryType=2 aggregations
 */

import type { Result } from "@qi/base";
import { create, failure, success } from "@qi/base";
import type * as DSL from "../dsl/index.js";
import { isNonNegativeDecimal, isPositiveDecimal, isValidTimestamp } from "./validation.js";

export class OHLCV implements DSL.OHLCV {
  public readonly baseVolume?: DSL.decimal;
  public readonly quoteVolume?: DSL.decimal;
  public readonly tradeCount?: number;
  public readonly weightedAveragePrice?: DSL.decimal;

  private constructor(
    public readonly timestamp: string,
    public readonly open: DSL.decimal,
    public readonly high: DSL.decimal,
    public readonly low: DSL.decimal,
    public readonly close: DSL.decimal,
    public readonly volume: DSL.decimal,
    baseVolume?: DSL.decimal,
    quoteVolume?: DSL.decimal,
    tradeCount?: number,
    weightedAveragePrice?: DSL.decimal
  ) {
    if (baseVolume !== undefined) {
      this.baseVolume = baseVolume;
    }
    if (quoteVolume !== undefined) {
      this.quoteVolume = quoteVolume;
    }
    if (tradeCount !== undefined) {
      this.tradeCount = tradeCount;
    }
    if (weightedAveragePrice !== undefined) {
      this.weightedAveragePrice = weightedAveragePrice;
    }
  }

  /**
   * Creates a validated OHLCV instance
   * @param timestamp ISO 8601 datetime string (bar start time)
   * @param open First trade price in period
   * @param high Highest trade price in period
   * @param low Lowest trade price in period
   * @param close Last trade price in period
   * @param volume Total volume traded in period
   * @param baseVolume Optional volume in base currency
   * @param quoteVolume Optional volume in quote currency
   * @param tradeCount Optional number of trades in period
   * @param weightedAveragePrice Optional VWAP for period
   * @returns Result<OHLCV> with validation
   */
  static create(
    timestamp: string,
    open: DSL.decimal,
    high: DSL.decimal,
    low: DSL.decimal,
    close: DSL.decimal,
    volume: DSL.decimal,
    baseVolume?: DSL.decimal,
    quoteVolume?: DSL.decimal,
    tradeCount?: number,
    weightedAveragePrice?: DSL.decimal
  ): Result<OHLCV> {
    // Validate timestamp
    const timestampResult = isValidTimestamp(timestamp);
    if (timestampResult.tag === "failure") {
      return timestampResult;
    }

    // Validate OHLC prices (all must be positive)
    const openResult = isPositiveDecimal(open, "open");
    if (openResult.tag === "failure") {
      return openResult;
    }

    const highResult = isPositiveDecimal(high, "high");
    if (highResult.tag === "failure") {
      return highResult;
    }

    const lowResult = isPositiveDecimal(low, "low");
    if (lowResult.tag === "failure") {
      return lowResult;
    }

    const closeResult = isPositiveDecimal(close, "close");
    if (closeResult.tag === "failure") {
      return closeResult;
    }

    // Validate volume (must be non-negative)
    const volumeResult = isNonNegativeDecimal(volume, "volume");
    if (volumeResult.tag === "failure") {
      return volumeResult;
    }

    // Business rules: OHLC relationships
    const openNum = Number(openResult.value);
    const highNum = Number(highResult.value);
    const lowNum = Number(lowResult.value);
    const closeNum = Number(closeResult.value);

    // High must be >= max(open, close)
    const maxOpenClose = Math.max(openNum, closeNum);
    if (highNum < maxOpenClose) {
      return failure(
        create(
          "INVALID_OHLC_HIGH",
          "High must be greater than or equal to max(open, close)",
          "VALIDATION",
          {
            open: openResult.value,
            high: highResult.value,
            close: closeResult.value,
            maxOpenClose,
          }
        )
      );
    }

    // Low must be <= min(open, close)
    const minOpenClose = Math.min(openNum, closeNum);
    if (lowNum > minOpenClose) {
      return failure(
        create(
          "INVALID_OHLC_LOW",
          "Low must be less than or equal to min(open, close)",
          "VALIDATION",
          {
            open: openResult.value,
            low: lowResult.value,
            close: closeResult.value,
            minOpenClose,
          }
        )
      );
    }

    // High must be >= low
    if (highNum < lowNum) {
      return failure(
        create("INVALID_OHLC_HIGH_LOW", "High must be greater than or equal to low", "VALIDATION", {
          high: highResult.value,
          low: lowResult.value,
        })
      );
    }

    // Validate optional base volume
    let validatedBaseVolume: DSL.decimal | undefined;
    if (baseVolume !== undefined) {
      const baseVolumeResult = isNonNegativeDecimal(baseVolume, "baseVolume");
      if (baseVolumeResult.tag === "failure") {
        return baseVolumeResult;
      }
      validatedBaseVolume = baseVolumeResult.value;
    }

    // Validate optional quote volume
    let validatedQuoteVolume: DSL.decimal | undefined;
    if (quoteVolume !== undefined) {
      const quoteVolumeResult = isNonNegativeDecimal(quoteVolume, "quoteVolume");
      if (quoteVolumeResult.tag === "failure") {
        return quoteVolumeResult;
      }
      validatedQuoteVolume = quoteVolumeResult.value;
    }

    // Validate optional trade count
    if (tradeCount !== undefined) {
      if (typeof tradeCount !== "number" || !Number.isInteger(tradeCount) || tradeCount < 0) {
        return failure(
          create(
            "INVALID_TRADE_COUNT",
            "Trade count must be a non-negative integer",
            "VALIDATION",
            { value: tradeCount, type: typeof tradeCount }
          )
        );
      }
    }

    // Validate optional weighted average price
    let validatedWAP: DSL.decimal | undefined;
    if (weightedAveragePrice !== undefined) {
      const wapResult = isPositiveDecimal(weightedAveragePrice, "weightedAveragePrice");
      if (wapResult.tag === "failure") {
        return wapResult;
      }
      validatedWAP = wapResult.value;

      // Business rule: VWAP should be within OHLC range
      const wapNum = Number(wapResult.value);
      if (wapNum < lowNum || wapNum > highNum) {
        return failure(
          create(
            "INVALID_VWAP_RANGE",
            "Weighted average price must be within low-high range",
            "VALIDATION",
            {
              weightedAveragePrice: wapResult.value,
              low: lowResult.value,
              high: highResult.value,
            }
          )
        );
      }
    }

    return success(
      new OHLCV(
        timestampResult.value,
        openResult.value,
        highResult.value,
        lowResult.value,
        closeResult.value,
        volumeResult.value,
        validatedBaseVolume,
        validatedQuoteVolume,
        tradeCount,
        validatedWAP
      )
    );
  }

  /**
   * Creates an OHLCV from a DSL OHLCV interface
   * @param obj DSL OHLCV object
   * @returns Result<OHLCV> with validation
   */
  static fromDSL(obj: DSL.OHLCV): Result<OHLCV> {
    return OHLCV.create(
      obj.timestamp,
      obj.open,
      obj.high,
      obj.low,
      obj.close,
      obj.volume,
      obj.baseVolume,
      obj.quoteVolume,
      obj.tradeCount,
      obj.weightedAveragePrice
    );
  }

  /**
   * Calculates the price range (high - low)
   * @returns Range as a number
   */
  getRange(): number {
    return Number(this.high) - Number(this.low);
  }

  /**
   * Calculates the price change (close - open)
   * @returns Change as a number
   */
  getChange(): number {
    return Number(this.close) - Number(this.open);
  }

  /**
   * Calculates the percentage change
   * @returns Percentage change as a number
   */
  getChangePercent(): number {
    const openNum = Number(this.open);
    const change = this.getChange();
    return (change / openNum) * 100;
  }

  /**
   * Checks if this is a bullish candle (close > open)
   * @returns True if bullish
   */
  isBullish(): boolean {
    return Number(this.close) > Number(this.open);
  }

  /**
   * Checks if this is a bearish candle (close < open)
   * @returns True if bearish
   */
  isBearish(): boolean {
    return Number(this.close) < Number(this.open);
  }

  /**
   * Checks if this is a doji candle (close ≈ open)
   * @param tolerance Tolerance for doji detection (default 0.001%)
   * @returns True if doji
   */
  isDoji(tolerance = 0.001): boolean {
    const openNum = Number(this.open);
    const closeNum = Number(this.close);
    const changePercent = Math.abs((closeNum - openNum) / openNum);
    return changePercent <= tolerance;
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    const change = this.getChange();
    const changePercent = this.getChangePercent();
    return `OHLCV{timestamp: ${this.timestamp}, O: ${this.open}, H: ${this.high}, L: ${this.low}, C: ${this.close}, V: ${this.volume}, Δ: ${change.toFixed(4)} (${changePercent.toFixed(2)}%)}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.OHLCV {
    return {
      timestamp: this.timestamp,
      open: this.open,
      high: this.high,
      low: this.low,
      close: this.close,
      volume: this.volume,
      ...(this.baseVolume && { baseVolume: this.baseVolume }),
      ...(this.quoteVolume && { quoteVolume: this.quoteVolume }),
      ...(this.tradeCount !== undefined && { tradeCount: this.tradeCount }),
      ...(this.weightedAveragePrice && { weightedAveragePrice: this.weightedAveragePrice }),
    };
  }
}
