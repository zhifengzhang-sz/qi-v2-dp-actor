/**
 * Exchange smart constructor implementation
 * Implements: docs/md/impl.marketdata.md Exchange Implementation
 * Standards: 4-letter MIC codes (ISO 10383), IANA timezone identifiers
 */

import type { Result } from "@qi/base";
import { Err, Ok, create, flatMap } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { isNonEmptyString } from "./validation.js";

export class Exchange implements DSL.Exchange {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly mic: string | null,
    public readonly timezone: string
  ) {}

  /**
   * Creates a validated Exchange instance
   * @param id Exchange identifier (non-empty string)
   * @param name Exchange name (non-empty string)
   * @param mic Optional 4-letter MIC code (ISO 10383)
   * @param timezone IANA timezone identifier
   * @returns Result<Exchange> with validation
   */
  static create(id: string, name: string, mic: string | null, timezone: string): Result<Exchange> {
    // Validate using flatMap composition
    return flatMap(
      (validId) =>
        flatMap(
          (validName) =>
            flatMap(
              (validTimezone) => {
                // Validate optional MIC code
                let validatedMic: string | null = null;
                if (mic !== null) {
                  if (typeof mic !== "string") {
                    return Err(
                      create(
                        "INVALID_MIC_TYPE",
                        "MIC code must be a string or null",
                        "VALIDATION",
                        {
                          value: mic,
                          type: typeof mic,
                        }
                      )
                    );
                  }

                  if (mic.trim() === "") {
                    return Err(
                      create(
                        "INVALID_MIC_EMPTY",
                        "MIC code cannot be empty (use null if not available)",
                        "VALIDATION",
                        { value: mic }
                      )
                    );
                  }

                  // MIC codes should be 4 uppercase letters
                  if (!/^[A-Z]{4}$/.test(mic)) {
                    return Err(
                      create(
                        "INVALID_MIC_FORMAT",
                        "MIC code must be 4 uppercase letters (ISO 10383 format)",
                        "VALIDATION",
                        { value: mic, expectedFormat: "XXXX (four uppercase letters)" }
                      )
                    );
                  }

                  validatedMic = mic;
                }

                // Basic IANA timezone format validation
                if (!/^[A-Za-z]+\/[A-Za-z_]+$/.test(validTimezone) && validTimezone !== "UTC") {
                  return Err(
                    create(
                      "INVALID_TIMEZONE_FORMAT",
                      "Timezone must be a valid IANA timezone identifier (e.g., America/New_York, Europe/London, UTC)",
                      "VALIDATION",
                      { value: validTimezone, expectedFormat: "Region/City or UTC" }
                    )
                  );
                }

                return Ok(new Exchange(validId, validName, validatedMic, validTimezone));
              },
              isNonEmptyString(timezone, "timezone")
            ),
          isNonEmptyString(name, "name")
        ),
      isNonEmptyString(id, "id")
    );
  }

  /**
   * Creates an Exchange from a DSL Exchange interface
   * @param obj DSL Exchange object
   * @returns Result<Exchange> with validation
   */
  static fromDSL(obj: DSL.Exchange): Result<Exchange> {
    return Exchange.create(obj.id, obj.name, obj.mic, obj.timezone);
  }

  /**
   * Checks if this exchange has a MIC code
   * @returns True if MIC code is available
   */
  hasMic(): boolean {
    return this.mic !== null;
  }

  /**
   * Gets the MIC code with Result<T> pattern
   * @returns Result<string> with MIC code or error
   */
  getMic(): Result<string> {
    if (this.mic === null) {
      return Err(
        create("MIC_NOT_AVAILABLE", `Exchange ${this.id} does not have a MIC code`, "VALIDATION", {
          exchangeId: this.id,
          name: this.name,
        })
      );
    }
    return Ok(this.mic);
  }

  /**
   * Checks if this is a major exchange based on common MIC codes
   * @returns True if recognized as major exchange
   */
  isMajorExchange(): boolean {
    if (!this.mic) return false;

    const majorMics = new Set([
      "XNYS", // NYSE
      "XNAS", // NASDAQ
      "XLON", // London Stock Exchange
      "XTKS", // Tokyo Stock Exchange
      "XHKG", // Hong Kong Stock Exchange
      "XPAR", // Euronext Paris
      "XFRA", // Frankfurt Stock Exchange
      "XMIL", // Borsa Italiana
      "XAMS", // Euronext Amsterdam
      "XSWX", // SIX Swiss Exchange
      "XTSE", // Toronto Stock Exchange
      "XASX", // Australian Securities Exchange
    ]);

    return majorMics.has(this.mic);
  }

  /**
   * Returns a string representation for debugging
   */
  toString(): string {
    return `Exchange{id: ${this.id}, name: ${this.name}${
      this.mic ? `, mic: ${this.mic}` : ""
    }, timezone: ${this.timezone}}`;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DSL.Exchange {
    return {
      id: this.id,
      name: this.name,
      mic: this.mic,
      timezone: this.timezone,
    };
  }
}
