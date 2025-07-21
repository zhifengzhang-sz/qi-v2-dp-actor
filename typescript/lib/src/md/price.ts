/**
 * Price smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Price Implementation
 * FIX Protocol: MDEntryType=2 with Tags 273, 270, 271
 */

import type { Result } from "@qi/base";
import { create, failure, flatMap, match, success } from "@qi/base";
import type * as DSL from "../dsl/index.js";
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
    // Validate timestamp
    const timestampResult = isValidTimestamp(timestamp);
    if (timestampResult.tag === "failure") {
      return timestampResult;
    }

    // Validate price
    const priceResult = isPositiveDecimal(price, "price");
    if (priceResult.tag === "failure") {
      return priceResult;
    }

    // Validate size
    const sizeResult = isPositiveDecimal(size, "size");
    if (sizeResult.tag === "failure") {
      return sizeResult;
    }

    // Validate optional tradeId
    const tradeIdResult = isOptionalNonEmptyString(tradeId, "tradeId");
    if (tradeIdResult.tag === "failure") {
      return tradeIdResult;
    }

    // Validate optional aggressor
    if (aggressor !== undefined && aggressor !== "BUY" && aggressor !== "SELL") {
      return failure(
        create("INVALID_AGGRESSOR", "Aggressor must be BUY or SELL", "VALIDATION", {
          value: aggressor,
          field: "aggressor",
        })
      );
    }

    return success(
      new Price(
        timestampResult.value,
        priceResult.value,
        sizeResult.value,
        tradeIdResult.value,
        aggressor
      )
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
