/**
 * MarketDepth smart constructor implementation
 * Implements: docs/md/impl.marketdata.md MarketDepth Implementation
 * FIX Protocol: Multi-level MDEntryType=0/1 with Tag 1023
 */

import type { Result } from "@qi/base";
import { create, failure, success } from "@qi/base";
import type * as DSL from "../dsl/index.js";
import { isNonNegativeDecimal, isPositiveDecimal, isValidTimestamp } from "./validation.js";

export class MarketDepth implements DSL.MarketDepth {
  public readonly sequenceNumber?: number;
  public readonly totalBidSize?: DSL.decimal;
  public readonly totalAskSize?: DSL.decimal;

  private constructor(
    public readonly timestamp: string,
    public readonly bids: readonly DSL.DepthLevel[],
    public readonly asks: readonly DSL.DepthLevel[],
    sequenceNumber?: number,
    totalBidSize?: DSL.decimal,
    totalAskSize?: DSL.decimal
  ) {
    if (sequenceNumber !== undefined) {
      this.sequenceNumber = sequenceNumber;
    }
    if (totalBidSize !== undefined) {
      this.totalBidSize = totalBidSize;
    }
    if (totalAskSize !== undefined) {
      this.totalAskSize = totalAskSize;
    }
  }

  /**
   * Creates a validated MarketDepth instance
   * @param timestamp ISO 8601 datetime string
   * @param bids Bid side depth levels (descending price order)
   * @param asks Ask side depth levels (ascending price order)
   * @param sequenceNumber Optional order book sequence
   * @param totalBidSize Optional total bid volume
   * @param totalAskSize Optional total ask volume
   * @returns Result<MarketDepth> with validation
   */
  static create(
    timestamp: string,
    bids: readonly DSL.DepthLevel[],
    asks: readonly DSL.DepthLevel[],
    sequenceNumber?: number,
    totalBidSize?: DSL.decimal,
    totalAskSize?: DSL.decimal
  ): Result<MarketDepth> {
    // Validate timestamp
    const timestampResult = isValidTimestamp(timestamp);
    if (timestampResult.tag === "failure") {
      return timestampResult;
    }

    // Validate bids array
    if (!Array.isArray(bids)) {
      return failure(
        create("INVALID_BIDS_TYPE", "Bids must be an array", "VALIDATION", {
          value: bids,
          type: typeof bids,
        })
      );
    }

    // Validate asks array
    if (!Array.isArray(asks)) {
      return failure(
        create("INVALID_ASKS_TYPE", "Asks must be an array", "VALIDATION", {
          value: asks,
          type: typeof asks,
        })
      );
    }

    // At least one side should have data
    if (bids.length === 0 && asks.length === 0) {
      return failure(
        create(
          "EMPTY_DEPTH",
          "Market depth must have at least one bid or ask level",
          "VALIDATION",
          { bidsCount: bids.length, asksCount: asks.length }
        )
      );
    }

    // Validate each bid level
    const validatedBids: DSL.DepthLevel[] = [];
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      if (bid === undefined) {
        return failure(
          create("UNDEFINED_BID_LEVEL", `Bid level at index ${i} is undefined`, "VALIDATION", {
            index: i,
          })
        );
      }
      const bidResult = MarketDepth.validateDepthLevel(bid, "bid", i);
      if (bidResult.tag === "failure") {
        return bidResult;
      }
      validatedBids.push(bidResult.value);
    }

    // Validate each ask level
    const validatedAsks: DSL.DepthLevel[] = [];
    for (let i = 0; i < asks.length; i++) {
      const ask = asks[i];
      if (ask === undefined) {
        return failure(
          create("UNDEFINED_ASK_LEVEL", `Ask level at index ${i} is undefined`, "VALIDATION", {
            index: i,
          })
        );
      }
      const askResult = MarketDepth.validateDepthLevel(ask, "ask", i);
      if (askResult.tag === "failure") {
        return askResult;
      }
      validatedAsks.push(askResult.value);
    }

    // Business rule: bids must be in descending price order
    for (let i = 1; i < validatedBids.length; i++) {
      const prevPrice = Number(validatedBids[i - 1]?.price);
      const currPrice = Number(validatedBids[i]?.price);
      if (currPrice >= prevPrice) {
        return failure(
          create(
            "INVALID_BID_ORDERING",
            "Bid levels must be in descending price order",
            "VALIDATION",
            {
              level: i,
              previousPrice: validatedBids[i - 1]?.price,
              currentPrice: validatedBids[i]?.price,
            }
          )
        );
      }
    }

    // Business rule: asks must be in ascending price order
    for (let i = 1; i < validatedAsks.length; i++) {
      const prevPrice = Number(validatedAsks[i - 1]?.price);
      const currPrice = Number(validatedAsks[i]?.price);
      if (currPrice <= prevPrice) {
        return failure(
          create(
            "INVALID_ASK_ORDERING",
            "Ask levels must be in ascending price order",
            "VALIDATION",
            {
              level: i,
              previousPrice: validatedAsks[i - 1]?.price,
              currentPrice: validatedAsks[i]?.price,
            }
          )
        );
      }
    }

    // Business rule: no crossed market (best ask >= best bid)
    if (validatedBids.length > 0 && validatedAsks.length > 0) {
      const bestBid = Number(validatedBids[0]?.price);
      const bestAsk = Number(validatedAsks[0]?.price);
      if (bestAsk < bestBid) {
        return failure(
          create(
            "CROSSED_MARKET",
            "Best ask price must be greater than or equal to best bid price",
            "VALIDATION",
            {
              bestBid: validatedBids[0]?.price,
              bestAsk: validatedAsks[0]?.price,
              spread: bestAsk - bestBid,
            }
          )
        );
      }
    }

    // Validate optional sequence number
    if (sequenceNumber !== undefined) {
      if (
        typeof sequenceNumber !== "number" ||
        !Number.isInteger(sequenceNumber) ||
        sequenceNumber < 0
      ) {
        return failure(
          create(
            "INVALID_SEQUENCE_NUMBER",
            "Sequence number must be a non-negative integer",
            "VALIDATION",
            { value: sequenceNumber, type: typeof sequenceNumber }
          )
        );
      }
    }

    // Validate optional total bid size
    let validatedTotalBidSize: DSL.decimal | undefined;
    if (totalBidSize !== undefined) {
      const totalBidResult = isNonNegativeDecimal(totalBidSize, "totalBidSize");
      if (totalBidResult.tag === "failure") {
        return totalBidResult;
      }
      validatedTotalBidSize = totalBidResult.value;
    }

    // Validate optional total ask size
    let validatedTotalAskSize: DSL.decimal | undefined;
    if (totalAskSize !== undefined) {
      const totalAskResult = isNonNegativeDecimal(totalAskSize, "totalAskSize");
      if (totalAskResult.tag === "failure") {
        return totalAskResult;
      }
      validatedTotalAskSize = totalAskResult.value;
    }

    return success(
      new MarketDepth(
        timestampResult.value,
        validatedBids,
        validatedAsks,
        sequenceNumber,
        validatedTotalBidSize,
        validatedTotalAskSize
      )
    );
  }

  /**
   * Validates a single depth level
   * @param level The depth level to validate
   * @param side 'bid' or 'ask' for error context
   * @param index Array index for error context
   * @returns Result<DepthLevel> with validation
   */
  private static validateDepthLevel(
    level: unknown,
    side: "bid" | "ask",
    index: number
  ): Result<DSL.DepthLevel> {
    if (level === null || typeof level !== "object") {
      return failure(
        create("INVALID_DEPTH_LEVEL_TYPE", `${side} level must be an object`, "VALIDATION", {
          side,
          index,
          value: level,
          type: typeof level,
        })
      );
    }

    const record = level as Record<string, unknown>;
    const { price, size, level: levelNum } = record;

    // Validate price
    if (typeof price !== "string") {
      return failure(
        create(
          "INVALID_DEPTH_LEVEL_PRICE_TYPE",
          `${side} level price must be a string`,
          "VALIDATION",
          { side, index, value: price, type: typeof price }
        )
      );
    }

    const priceResult = isPositiveDecimal(price, `${side}[${index}].price`);
    if (priceResult.tag === "failure") {
      return priceResult;
    }

    // Validate size
    if (typeof size !== "string") {
      return failure(
        create(
          "INVALID_DEPTH_LEVEL_SIZE_TYPE",
          `${side} level size must be a string`,
          "VALIDATION",
          { side, index, value: size, type: typeof size }
        )
      );
    }

    const sizeResult = isPositiveDecimal(size, `${side}[${index}].size`);
    if (sizeResult.tag === "failure") {
      return sizeResult;
    }

    // Validate level number
    if (typeof levelNum !== "number" || !Number.isInteger(levelNum) || levelNum < 1) {
      return failure(
        create(
          "INVALID_DEPTH_LEVEL_NUMBER",
          `${side} level number must be a positive integer`,
          "VALIDATION",
          { side, index, value: levelNum, type: typeof levelNum }
        )
      );
    }

    return success({
      price: priceResult.value,
      size: sizeResult.value,
      level: levelNum,
    });
  }

  /**
   * Creates a MarketDepth from a DSL MarketDepth interface
   * @param obj DSL MarketDepth object
   * @returns Result<MarketDepth> with validation
   */
  static fromDSL(obj: DSL.MarketDepth): Result<MarketDepth> {
    return MarketDepth.create(
      obj.timestamp,
      obj.bids,
      obj.asks,
      obj.sequenceNumber,
      obj.totalBidSize,
      obj.totalAskSize
    );
  }

  /**
   * Gets the best bid price (highest bid)
   * @returns Best bid price or null if no bids
   */
  getBestBid(): DSL.decimal | null {
    return this.bids.length > 0 ? (this.bids[0]?.price ?? null) : null;
  }

  /**
   * Gets the best ask price (lowest ask)
   * @returns Best ask price or null if no asks
   */
  getBestAsk(): DSL.decimal | null {
    return this.asks.length > 0 ? (this.asks[0]?.price ?? null) : null;
  }

  /**
   * Calculates the bid-ask spread
   * @returns Spread as a number or null if missing bid/ask
   */
  getSpread(): number | null {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();

    if (bestBid === null || bestAsk === null) {
      return null;
    }

    return Number(bestAsk) - Number(bestBid);
  }

  /**
   * Calculates the mid-price
   * @returns Mid-price as a decimal string or null if missing bid/ask
   */
  getMidPrice(): DSL.decimal | null {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();

    if (bestBid === null || bestAsk === null) {
      return null;
    }

    const mid = (Number(bestBid) + Number(bestAsk)) / 2;
    return mid.toString();
  }

  /**
   * Gets total size at all bid levels
   * @returns Total bid size as a number
   */
  getTotalBidSize(): number {
    return this.bids.reduce((total, level) => total + Number(level.size), 0);
  }

  /**
   * Gets total size at all ask levels
   * @returns Total ask size as a number
   */
  getTotalAskSize(): number {
    return this.asks.reduce((total, level) => total + Number(level.size), 0);
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    const spread = this.getSpread();
    const bidCount = this.bids.length;
    const askCount = this.asks.length;
    return `MarketDepth{timestamp: ${this.timestamp}, levels: ${bidCount}×${askCount}, spread: ${spread?.toFixed(4) ?? "N/A"}${
      this.sequenceNumber !== undefined ? `, seq: ${this.sequenceNumber}` : ""
    }}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.MarketDepth {
    return {
      timestamp: this.timestamp,
      bids: this.bids,
      asks: this.asks,
      ...(this.sequenceNumber !== undefined && { sequenceNumber: this.sequenceNumber }),
      ...(this.totalBidSize && { totalBidSize: this.totalBidSize }),
      ...(this.totalAskSize && { totalAskSize: this.totalAskSize }),
    };
  }
}
