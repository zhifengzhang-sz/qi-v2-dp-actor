/**
 * OHLCV smart constructor implementation
 * Implements: docs/md/impl.marketdata.md OHLCV Implementation
 * FIX Protocol: Derived from MDEntryType=2 aggregations
 */

import type { Result } from "@qi/base";
import { Err, Ok, create, flatMap } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
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
    // Validate all required fields using flatMap composition
    return flatMap(
      (validTimestamp) =>
        flatMap(
          (validOpen) =>
            flatMap(
              (validHigh) =>
                flatMap(
                  (validLow) =>
                    flatMap(
                      (validClose) =>
                        flatMap(
                          (validVolume) => {
                            // Business rules: OHLC relationships
                            const openNum = Number(validOpen);
                            const highNum = Number(validHigh);
                            const lowNum = Number(validLow);
                            const closeNum = Number(validClose);

                            // High must be >= max(open, close)
                            const maxOpenClose = Math.max(openNum, closeNum);
                            if (highNum < maxOpenClose) {
                              return Err(
                                create(
                                  "INVALID_OHLC_HIGH",
                                  "High must be greater than or equal to max(open, close)",
                                  "VALIDATION",
                                  {
                                    open: validOpen,
                                    high: validHigh,
                                    close: validClose,
                                    maxOpenClose,
                                  }
                                )
                              );
                            }

                            // Low must be <= min(open, close)
                            const minOpenClose = Math.min(openNum, closeNum);
                            if (lowNum > minOpenClose) {
                              return Err(
                                create(
                                  "INVALID_OHLC_LOW",
                                  "Low must be less than or equal to min(open, close)",
                                  "VALIDATION",
                                  {
                                    open: validOpen,
                                    low: validLow,
                                    close: validClose,
                                    minOpenClose,
                                  }
                                )
                              );
                            }

                            // High must be >= low
                            if (highNum < lowNum) {
                              return Err(
                                create(
                                  "INVALID_OHLC_HIGH_LOW",
                                  "High must be greater than or equal to low",
                                  "VALIDATION",
                                  {
                                    high: validHigh,
                                    low: validLow,
                                  }
                                )
                              );
                            }

                            // Validate optional fields using flatMap composition
                            return flatMap(
                              (validatedBaseVolume) =>
                                flatMap(
                                  (validatedQuoteVolume) => {
                                    // Validate optional trade count (simple validation)
                                    if (tradeCount !== undefined) {
                                      if (
                                        typeof tradeCount !== "number" ||
                                        !Number.isInteger(tradeCount) ||
                                        tradeCount < 0
                                      ) {
                                        return Err(
                                          create(
                                            "INVALID_TRADE_COUNT",
                                            "Trade count must be a non-negative integer",
                                            "VALIDATION",
                                            { value: tradeCount, type: typeof tradeCount }
                                          )
                                        );
                                      }
                                    }

                                    return flatMap(
                                      (validatedWAP) => {
                                        // Business rule: VWAP should be within OHLC range
                                        if (validatedWAP !== undefined) {
                                          const wapNum = Number(validatedWAP);
                                          if (wapNum < lowNum || wapNum > highNum) {
                                            return Err(
                                              create(
                                                "INVALID_VWAP_RANGE",
                                                "Weighted average price must be within low-high range",
                                                "VALIDATION",
                                                {
                                                  weightedAveragePrice: validatedWAP,
                                                  low: validLow,
                                                  high: validHigh,
                                                }
                                              )
                                            );
                                          }
                                        }

                                        return Ok(
                                          new OHLCV(
                                            validTimestamp,
                                            validOpen,
                                            validHigh,
                                            validLow,
                                            validClose,
                                            validVolume,
                                            validatedBaseVolume,
                                            validatedQuoteVolume,
                                            tradeCount,
                                            validatedWAP
                                          )
                                        );
                                      },
                                      weightedAveragePrice !== undefined
                                        ? isPositiveDecimal(
                                            weightedAveragePrice,
                                            "weightedAveragePrice"
                                          )
                                        : Ok(undefined)
                                    );
                                  },
                                  quoteVolume !== undefined
                                    ? isNonNegativeDecimal(quoteVolume, "quoteVolume")
                                    : Ok(undefined)
                                ),
                              baseVolume !== undefined
                                ? isNonNegativeDecimal(baseVolume, "baseVolume")
                                : Ok(undefined)
                            );
                          },
                          isNonNegativeDecimal(volume, "volume")
                        ),
                      isPositiveDecimal(close, "close")
                    ),
                  isPositiveDecimal(low, "low")
                ),
              isPositiveDecimal(high, "high")
            ),
          isPositiveDecimal(open, "open")
        ),
      isValidTimestamp(timestamp)
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
