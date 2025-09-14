/**
 * Price smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Price Implementation
 * FIX Protocol: MDEntryType=2 with Tags 273, 270, 271
 */

import type { Result } from "@qi/base";
import { Err, Ok, create, flatMap } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { isOptionalNonEmptyString, isPositiveDecimal, isValidTimestamp } from "./validation.js";

export class Price implements DSL.Price {
  public readonly tradeId?: string;
  public readonly aggressor?: DSL.Side;

  private constructor(
    public readonly timestamp: string,
    public readonly price: DSL.decimal,
    public readonly size: DSL.decimal,
    tradeId?: string,
    aggressor?: DSL.Side
  ) {
    if (tradeId !== undefined) {
      this.tradeId = tradeId;
    }
    if (aggressor !== undefined) {
      this.aggressor = aggressor;
    }
  }

  /**
   * Creates a validated Price instance
   * @param timestamp ISO 8601 datetime string
   * @param price Positive decimal string
   * @param size Positive decimal string
   * @param tradeId Optional trade identifier
   * @param aggressor Optional trade side (BUY/SELL)
   * @returns Result<Price> with validation
   */
  static create(
    timestamp: string,
    price: DSL.decimal,
    size: DSL.decimal,
    tradeId?: string,
    aggressor?: DSL.Side
  ): Result<Price> {
    // Validate optional aggressor first (simple check)
    if (aggressor !== undefined && aggressor !== "BUY" && aggressor !== "SELL") {
      return Err(
        create("INVALID_AGGRESSOR", "Aggressor must be BUY or SELL", "VALIDATION", {
          value: aggressor,
          field: "aggressor",
        })
      );
    }

    // Chain validation using functional composition
    return flatMap(
      (validTimestamp) =>
        flatMap(
          (validPrice) =>
            flatMap(
              (validSize) =>
                flatMap(
                  (validTradeId) =>
                    Ok(new Price(validTimestamp, validPrice, validSize, validTradeId, aggressor)),
                  isOptionalNonEmptyString(tradeId, "tradeId")
                ),
              isPositiveDecimal(size, "size")
            ),
          isPositiveDecimal(price, "price")
        ),
      isValidTimestamp(timestamp)
    );
  }

  /**
   * Creates a Price from a DSL Price interface
   * @param obj DSL Price object
   * @returns Result<Price> with validation
   */
  static fromDSL(obj: DSL.Price): Result<Price> {
    return Price.create(obj.timestamp, obj.price, obj.size, obj.tradeId, obj.aggressor);
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    return `Price{timestamp: ${this.timestamp}, price: ${this.price}, size: ${this.size}${
      this.tradeId ? `, tradeId: ${this.tradeId}` : ""
    }${this.aggressor ? `, aggressor: ${this.aggressor}` : ""}}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.Price {
    return {
      timestamp: this.timestamp,
      price: this.price,
      size: this.size,
      ...(this.tradeId && { tradeId: this.tradeId }),
      ...(this.aggressor && { aggressor: this.aggressor }),
    };
  }
}
