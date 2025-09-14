/**
 * Instrument smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Instrument Implementation
 * Standards: 12-character ISIN (ISO 6166), 3-letter currency codes (ISO 4217)
 */

import type { Result } from "@qi/base";
import { Err, Ok, create } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { isNonEmptyString } from "./validation.js";

export class Instrument implements DSL.Instrument {
  private constructor(
    public readonly symbol: string,
    public readonly isin: string | null,
    public readonly name: string,
    public readonly assetClass: DSL.AssetClass,
    public readonly currency: string
  ) {}

  /**
   * Creates a validated Instrument instance
   * @param symbol Instrument symbol (non-empty string)
   * @param isin Optional 12-character ISIN (ISO 6166)
   * @param name Instrument name (non-empty string)
   * @param assetClass Asset class (STOCK, CRYPTO, CURRENCY, etc.)
   * @param currency 3-letter currency code (ISO 4217)
   * @returns Result<Instrument> with validation
   */
  static create(
    symbol: string,
    isin: string | null,
    name: string,
    assetClass: DSL.AssetClass,
    currency: string
  ): Result<Instrument> {
    // Validate symbol
    const symbolResult = isNonEmptyString(symbol, "symbol");
    if (symbolResult.tag === "failure") {
      return symbolResult;
    }

    // Validate optional ISIN
    let validatedIsin: string | null = null;
    if (isin !== null) {
      if (typeof isin !== "string") {
        return Err(
          create("INVALID_ISIN_TYPE", "ISIN must be a string or null", "VALIDATION", {
            value: isin,
            type: typeof isin,
          })
        );
      }

      if (isin.trim() === "") {
        return Err(
          create(
            "INVALID_ISIN_EMPTY",
            "ISIN cannot be empty (use null if not available)",
            "VALIDATION",
            { value: isin }
          )
        );
      }

      // ISIN should be 12 characters: 2-letter country code + 9 alphanumeric + 1 check digit
      if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
        return Err(
          create(
            "INVALID_ISIN_FORMAT",
            "ISIN must be 12 characters: 2-letter country code + 9 alphanumeric + 1 check digit (ISO 6166)",
            "VALIDATION",
            { value: isin, expectedFormat: "CCNNNNNNNND (C=country, N=alphanumeric, D=digit)" }
          )
        );
      }

      validatedIsin = isin;
    }

    // Validate name
    const nameResult = isNonEmptyString(name, "name");
    if (nameResult.tag === "failure") {
      return nameResult;
    }

    // Validate asset class
    const validAssetClasses: DSL.AssetClass[] = [
      "STOCK",
      "CRYPTO",
      "CURRENCY",
      "COMMODITY",
      "BOND",
      "INDEX",
    ];

    if (!validAssetClasses.includes(assetClass)) {
      return Err(
        create(
          "INVALID_ASSET_CLASS",
          "Asset class must be one of: STOCK, CRYPTO, CURRENCY, COMMODITY, BOND, INDEX",
          "VALIDATION",
          { value: assetClass, validValues: validAssetClasses }
        )
      );
    }

    // Validate currency (ISO 4217)
    const currencyResult = isNonEmptyString(currency, "currency");
    if (currencyResult.tag === "failure") {
      return currencyResult;
    }

    // Currency should be 3 uppercase letters
    if (!/^[A-Z]{3}$/.test(currency)) {
      return Err(
        create(
          "INVALID_CURRENCY_FORMAT",
          "Currency must be a 3-letter ISO 4217 currency code (e.g., USD, EUR, JPY)",
          "VALIDATION",
          { value: currency, expectedFormat: "XXX (three uppercase letters)" }
        )
      );
    }

    return Ok(
      new Instrument(
        symbolResult.value,
        validatedIsin,
        nameResult.value,
        assetClass,
        currencyResult.value
      )
    );
  }

  /**
   * Creates an Instrument from a DSL Instrument interface
   * @param obj DSL Instrument object
   * @returns Result<Instrument> with validation
   */
  static fromDSL(obj: DSL.Instrument): Result<Instrument> {
    return Instrument.create(obj.symbol, obj.isin, obj.name, obj.assetClass, obj.currency);
  }

  /**
   * Checks if this instrument has an ISIN
   * @returns True if ISIN is available
   */
  hasIsin(): boolean {
    return this.isin !== null;
  }

  /**
   * Gets the ISIN with Result<T> pattern
   * @returns Result<string> with ISIN code or error
   */
  getIsin(): Result<string> {
    if (this.isin === null) {
      return Err(
        create(
          "ISIN_NOT_AVAILABLE",
          `Instrument ${this.symbol} does not have an ISIN`,
          "VALIDATION",
          { symbol: this.symbol, name: this.name, assetClass: this.assetClass }
        )
      );
    }
    return Ok(this.isin);
  }

  /**
   * Checks if this is a stock instrument
   * @returns True if asset class is STOCK
   */
  isStock(): boolean {
    return this.assetClass === "STOCK";
  }

  /**
   * Checks if this is a crypto instrument
   * @returns True if asset class is CRYPTO
   */
  isCrypto(): boolean {
    return this.assetClass === "CRYPTO";
  }

  /**
   * Checks if this is a currency instrument
   * @returns True if asset class is CURRENCY
   */
  isCurrency(): boolean {
    return this.assetClass === "CURRENCY";
  }

  /**
   * Checks if this is a commodity instrument
   * @returns True if asset class is COMMODITY
   */
  isCommodity(): boolean {
    return this.assetClass === "COMMODITY";
  }

  /**
   * Checks if this is a bond instrument
   * @returns True if asset class is BOND
   */
  isBond(): boolean {
    return this.assetClass === "BOND";
  }

  /**
   * Checks if this is an index instrument
   * @returns True if asset class is INDEX
   */
  isIndex(): boolean {
    return this.assetClass === "INDEX";
  }

  /**
   * Gets the ISIN country code if available
   * @returns 2-letter country code or null
   */
  getIsinCountryCode(): string | null {
    if (!this.isin) return null;
    return this.isin.substring(0, 2);
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    return `Instrument{symbol: ${this.symbol}, name: ${this.name}, assetClass: ${this.assetClass}, currency: ${this.currency}${
      this.isin ? `, isin: ${this.isin}` : ""
    }}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.Instrument {
    return {
      symbol: this.symbol,
      isin: this.isin,
      name: this.name,
      assetClass: this.assetClass,
      currency: this.currency,
    };
  }
}
