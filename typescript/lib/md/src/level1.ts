/**
 * Level1 smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Level1 Implementation
 * FIX Protocol: MDEntryType=0/1 with bid/ask entries
 */

import type { Result } from "@qi/base";
import { Err, Ok, create, flatMap } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { isOptionalNonEmptyString, isPositiveDecimal, isValidTimestamp } from "./validation.js";

export class Level1 implements DSL.Level1 {
  public readonly quoteId?: string;
  public readonly bidTime?: string;
  public readonly askTime?: string;

  private constructor(
    public readonly timestamp: string,
    public readonly bidPrice: DSL.decimal,
    public readonly bidSize: DSL.decimal,
    public readonly askPrice: DSL.decimal,
    public readonly askSize: DSL.decimal,
    quoteId?: string,
    bidTime?: string,
    askTime?: string
  ) {
    if (quoteId !== undefined) {
      this.quoteId = quoteId;
    }
    if (bidTime !== undefined) {
      this.bidTime = bidTime;
    }
    if (askTime !== undefined) {
      this.askTime = askTime;
    }
  }

  /**
   * Creates a validated Level1 instance
   * @param timestamp ISO 8601 datetime string
   * @param bidPrice Positive decimal string
   * @param bidSize Positive decimal string
   * @param askPrice Positive decimal string
   * @param askSize Positive decimal string
   * @param quoteId Optional quote identifier
   * @param bidTime Optional bid-specific timestamp
   * @param askTime Optional ask-specific timestamp
   * @returns Result<Level1> with validation
   */
  static create(
    timestamp: string,
    bidPrice: DSL.decimal,
    bidSize: DSL.decimal,
    askPrice: DSL.decimal,
    askSize: DSL.decimal,
    quoteId?: string,
    bidTime?: string,
    askTime?: string
  ): Result<Level1> {
    // Helper function for optional timestamp validation
    const validateOptionalTimestamp = (
      value: string | undefined,
      fieldName: string
    ): Result<string | undefined> => {
      if (value === undefined) return Ok(undefined);

      const result = isValidTimestamp(value);
      if (result.tag === "failure") {
        return Err(
          create(
            `INVALID_${fieldName.toUpperCase()}`,
            `${fieldName} must be valid ISO 8601 format`,
            "VALIDATION",
            {
              value,
              originalError: result.error,
            }
          )
        );
      }
      return Ok(result.value);
    };

    // Chain validation using functional composition
    return flatMap(
      (validTimestamp) =>
        flatMap(
          (validBidPrice) =>
            flatMap(
              (validBidSize) =>
                flatMap(
                  (validAskPrice) =>
                    flatMap(
                      (validAskSize) =>
                        flatMap(
                          (validQuoteId) =>
                            flatMap(
                              (validBidTime) =>
                                flatMap(
                                  (validAskTime) => {
                                    // Business rule: no crossed market (askPrice >= bidPrice)
                                    const bidPriceNum = Number(validBidPrice);
                                    const askPriceNum = Number(validAskPrice);

                                    if (askPriceNum < bidPriceNum) {
                                      return Err(
                                        create(
                                          "CROSSED_MARKET",
                                          "Ask price must be greater than or equal to bid price",
                                          "VALIDATION",
                                          {
                                            bidPrice: validBidPrice,
                                            askPrice: validAskPrice,
                                            spread: askPriceNum - bidPriceNum,
                                          }
                                        )
                                      );
                                    }

                                    return Ok(
                                      new Level1(
                                        validTimestamp,
                                        validBidPrice,
                                        validBidSize,
                                        validAskPrice,
                                        validAskSize,
                                        validQuoteId,
                                        validBidTime,
                                        validAskTime
                                      )
                                    );
                                  },
                                  validateOptionalTimestamp(askTime, "ask time")
                                ),
                              validateOptionalTimestamp(bidTime, "bid time")
                            ),
                          isOptionalNonEmptyString(quoteId, "quoteId")
                        ),
                      isPositiveDecimal(askSize, "askSize")
                    ),
                  isPositiveDecimal(askPrice, "askPrice")
                ),
              isPositiveDecimal(bidSize, "bidSize")
            ),
          isPositiveDecimal(bidPrice, "bidPrice")
        ),
      isValidTimestamp(timestamp)
    );
  }

  /**
   * Creates a Level1 from a DSL Level1 interface
   * @param obj DSL Level1 object
   * @returns Result<Level1> with validation
   */
  static fromDSL(obj: DSL.Level1): Result<Level1> {
    return Level1.create(
      obj.timestamp,
      obj.bidPrice,
      obj.bidSize,
      obj.askPrice,
      obj.askSize,
      obj.quoteId,
      obj.bidTime,
      obj.askTime
    );
  }

  /**
   * Calculates the bid-ask spread
   * @returns Spread as a number
   */
  getSpread(): number {
    return Number(this.askPrice) - Number(this.bidPrice);
  }

  /**
   * Calculates the mid-price
   * @returns Mid-price as a decimal string
   */
  getMidPrice(): DSL.decimal {
    const bidNum = Number(this.bidPrice);
    const askNum = Number(this.askPrice);
    const mid = (bidNum + askNum) / 2;
    return mid.toString();
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    const spread = this.getSpread();
    return `Level1{timestamp: ${this.timestamp}, bid: ${this.bidPrice}@${this.bidSize}, ask: ${this.askPrice}@${this.askSize}, spread: ${spread}${
      this.quoteId ? `, quoteId: ${this.quoteId}` : ""
    }}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.Level1 {
    return {
      timestamp: this.timestamp,
      bidPrice: this.bidPrice,
      bidSize: this.bidSize,
      askPrice: this.askPrice,
      askSize: this.askSize,
      ...(this.quoteId && { quoteId: this.quoteId }),
      ...(this.bidTime && { bidTime: this.bidTime }),
      ...(this.askTime && { askTime: this.askTime }),
    };
  }
}
