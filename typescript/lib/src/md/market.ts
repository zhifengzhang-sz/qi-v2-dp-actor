/**
 * Market smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Market Implementation
 * Standards: ISO 3166-1 alpha-2 country codes
 */

import type { Result } from "@qi/base";
import { create, failure, success } from "@qi/base";
import type * as DSL from "../dsl/index.js";
import { isNonEmptyString } from "./validation.js";

export class Market implements DSL.Market {
  private constructor(
    public readonly type: DSL.MarketType,
    public readonly region: string,
    public readonly segment: DSL.Segment
  ) {}

  /**
   * Creates a validated Market instance
   * @param type Market type (EQUITY, CRYPTO, FOREX, etc.)
   * @param region ISO 3166-1 alpha-2 country code
   * @param segment Market segment (CASH, FUTURES, OPTIONS)
   * @returns Result<Market> with validation
   */
  static create(type: DSL.MarketType, region: string, segment: DSL.Segment): Result<Market> {
    // Validate market type
    const validMarketTypes: DSL.MarketType[] = [
      "EQUITY",
      "CRYPTO",
      "FOREX",
      "COMMODITY",
      "BOND",
      "DERIVATIVE",
    ];

    if (!validMarketTypes.includes(type)) {
      return failure(
        create(
          "INVALID_MARKET_TYPE",
          "Market type must be one of: EQUITY, CRYPTO, FOREX, COMMODITY, BOND, DERIVATIVE",
          "VALIDATION",
          { value: type, validValues: validMarketTypes }
        )
      );
    }

    // Validate region (should be ISO 3166-1 alpha-2)
    const regionResult = isNonEmptyString(region, "region");
    if (regionResult.tag === "failure") {
      return regionResult;
    }

    // Basic ISO 3166-1 alpha-2 format validation
    if (!/^[A-Z]{2}$/.test(region)) {
      return failure(
        create(
          "INVALID_REGION_FORMAT",
          "Region must be a 2-letter ISO 3166-1 alpha-2 country code (e.g., US, GB, JP)",
          "VALIDATION",
          { value: region, expectedFormat: "XX (two uppercase letters)" }
        )
      );
    }

    // Validate segment
    const validSegments: DSL.Segment[] = ["CASH", "FUTURES", "OPTIONS"];

    if (!validSegments.includes(segment)) {
      return failure(
        create(
          "INVALID_SEGMENT",
          "Market segment must be one of: CASH, FUTURES, OPTIONS",
          "VALIDATION",
          { value: segment, validValues: validSegments }
        )
      );
    }

    return success(new Market(type, regionResult.value, segment));
  }

  /**
   * Creates a Market from a DSL Market interface
   * @param obj DSL Market object
   * @returns Result<Market> with validation
   */
  static fromDSL(obj: DSL.Market): Result<Market> {
    return Market.create(obj.type, obj.region, obj.segment);
  }

  /**
   * Checks if this is an equity market
   * @returns True if market type is EQUITY
   */
  isEquity(): boolean {
    return this.type === "EQUITY";
  }

  /**
   * Checks if this is a crypto market
   * @returns True if market type is CRYPTO
   */
  isCrypto(): boolean {
    return this.type === "CRYPTO";
  }

  /**
   * Checks if this is a forex market
   * @returns True if market type is FOREX
   */
  isForex(): boolean {
    return this.type === "FOREX";
  }

  /**
   * Checks if this is a cash market
   * @returns True if segment is CASH
   */
  isCash(): boolean {
    return this.segment === "CASH";
  }

  /**
   * Checks if this is a derivatives market
   * @returns True if segment is FUTURES or OPTIONS
   */
  isDerivatives(): boolean {
    return this.segment === "FUTURES" || this.segment === "OPTIONS";
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    return `Market{type: ${this.type}, region: ${this.region}, segment: ${this.segment}}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.Market {
    return {
      type: this.type,
      region: this.region,
      segment: this.segment,
    };
  }
}
