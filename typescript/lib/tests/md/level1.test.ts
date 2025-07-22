/**
 * Unit tests for Level1 smart constructor
 * Tests the MD layer implementation of DSL Level1 interface
 *
 * CORRECT PARAMETER ORDER: Level1.create(timestamp, bidPrice, bidSize, askPrice, askSize, ...)
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import type { Level1 as DSLLevel1 } from "@qi/dp/dsl";
import { describe, expect, it } from "vitest";
import { Level1 } from "../../src/md/level1.js";

describe("Level1 Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid Level1 with all required fields", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "64999.50", // bidPrice
        "10.5", // bidSize
        "65000.50", // askPrice
        "15.25" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(level1.bidPrice).toBe("64999.50");
      expect(level1.bidSize).toBe("10.5");
      expect(level1.askPrice).toBe("65000.50");
      expect(level1.askSize).toBe("15.25");
    });

    it("should create valid Level1 with minimal spread", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // bidPrice
        "1.0", // bidSize
        "100.01", // askPrice
        "1.0" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidPrice).toBe("100.00");
      expect(level1.bidSize).toBe("1.0");
      expect(level1.askPrice).toBe("100.01");
      expect(level1.askSize).toBe("1.0");
    });

    it("should create valid Level1 with equal bid and ask prices", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "50000.00", // bidPrice
        "2.0", // bidSize
        "50000.00", // askPrice
        "3.0" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidPrice).toBe("50000.00");
      expect(level1.bidSize).toBe("2.0");
      expect(level1.askPrice).toBe("50000.00");
      expect(level1.askSize).toBe("3.0");
    });

    describe("timestamp validation", () => {
      it("should reject invalid timestamp format", () => {
        const result = Level1.create("invalid-timestamp", "100.00", "1.0", "100.50", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });

      it("should reject empty timestamp", () => {
        const result = Level1.create("", "100.00", "1.0", "100.50", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP");
      });

      it("should reject non-ISO 8601 timestamp", () => {
        const result = Level1.create("not-a-date-at-all", "100.00", "1.0", "100.50", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });
    });

    describe("bid price validation", () => {
      it("should reject zero bid price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "0", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative bid price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "-100.00", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric bid price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "not-a-number", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very small positive bid price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "0.00000001", // bidPrice
          "1.0", // bidSize
          "0.00000002", // askPrice
          "1.0" // askSize
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).bidPrice).toBe("0.00000001");
      });
    });

    describe("ask price validation", () => {
      it("should reject zero ask price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "0", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative ask price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "-100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric ask price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "invalid", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very large ask price", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "999999999.99999999", // askPrice
          "1.0" // askSize
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).askPrice).toBe("999999999.99999999");
      });
    });

    describe("crossed market validation", () => {
      it("should reject crossed market (bid > ask)", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.50", // bidPrice
          "1.0", // bidSize
          "100.00", // askPrice (< bidPrice)
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("CROSSED_MARKET");
      });

      it("should reject significantly crossed market", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "105.00", // bidPrice
          "1.0", // bidSize
          "100.00", // askPrice (< bidPrice)
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("CROSSED_MARKET");
      });
    });

    describe("bid size validation", () => {
      it("should reject zero bid size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "0", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative bid size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "-1.0", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric bid size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "invalid", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very small positive bid size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "0.00000001", // bidSize
          "100.50", // askPrice
          "1.0" // askSize
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).bidSize).toBe("0.00000001");
      });
    });

    describe("ask size validation", () => {
      it("should reject zero ask size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative ask size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "-1.0" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric ask size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "invalid" // askSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very large ask size", () => {
        const result = Level1.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // bidPrice
          "1.0", // bidSize
          "100.50", // askPrice
          "999999999.99999999" // askSize
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).askSize).toBe("999999999.99999999");
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create Level1 from valid DSL Level1 object", () => {
      const dslLevel1: DSLLevel1 = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bidPrice: "64999.50",
        bidSize: "10.5",
        askPrice: "65000.50",
        askSize: "15.25",
      };

      const result = Level1.fromDSL(dslLevel1);

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(level1.bidPrice).toBe("64999.50");
      expect(level1.bidSize).toBe("10.5");
      expect(level1.askPrice).toBe("65000.50");
      expect(level1.askSize).toBe("15.25");
    });

    it("should create Level1 from DSL object with minimal spread", () => {
      const dslLevel1: DSLLevel1 = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bidPrice: "75000.00",
        bidSize: "1.0",
        askPrice: "75000.01",
        askSize: "2.0",
      };

      const result = Level1.fromDSL(dslLevel1);

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidPrice).toBe("75000.00");
      expect(level1.bidSize).toBe("1.0");
      expect(level1.askPrice).toBe("75000.01");
      expect(level1.askSize).toBe("2.0");
    });

    it("should fail validation for invalid DSL Level1 object", () => {
      const invalidDslLevel1: DSLLevel1 = {
        timestamp: "invalid",
        bidPrice: "-100.00",
        bidSize: "1.0",
        askPrice: "100.50",
        askSize: "1.0",
      };

      const result = Level1.fromDSL(invalidDslLevel1);

      expect(isFailure(result)).toBe(true);
    });

    it("should fail for crossed market in DSL object", () => {
      const crossedDslLevel1: DSLLevel1 = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bidPrice: "100.50",
        bidSize: "1.0",
        askPrice: "100.00",
        askSize: "1.0",
      };

      const result = Level1.fromDSL(crossedDslLevel1);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("CROSSED_MARKET");
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with all fields", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "64999.50", // bidPrice
        "10.5", // bidSize
        "65000.50", // askPrice
        "15.25" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      const str = level1.toString();

      expect(str).toContain("Level1{");
      expect(str).toContain("timestamp: 2025-07-21T12:00:00.000Z");
      expect(str).toContain("bid: 64999.50@10.5");
      expect(str).toContain("ask: 65000.50@15.25");
      expect(str).toContain("spread: 1");
    });

    it("should return formatted string with equal bid/ask", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "50000.00", // bidPrice
        "2.0", // bidSize
        "50000.00", // askPrice
        "3.0" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      const str = level1.toString();

      expect(str).toContain("Level1{");
      expect(str).toContain("bid: 50000.00@2.0");
      expect(str).toContain("ask: 50000.00@3.0");
      expect(str).toContain("spread: 0");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "64999.50", // bidPrice
        "10.5", // bidSize
        "65000.50", // askPrice
        "15.25" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      const obj = level1.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        bidPrice: "64999.50",
        bidSize: "10.5",
        askPrice: "65000.50",
        askSize: "15.25",
      });
    });

    it("should return object that can be used with fromDSL", () => {
      const originalResult = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "64999.50", // bidPrice
        "10.5", // bidSize
        "65000.50", // askPrice
        "15.25" // askSize
      );

      expect(isSuccess(originalResult)).toBe(true);
      const originalLevel1 = getValue(originalResult);
      const obj = originalLevel1.toObject();

      const recreatedResult = Level1.fromDSL(obj);
      expect(isSuccess(recreatedResult)).toBe(true);

      const recreatedLevel1 = getValue(recreatedResult);
      expect(recreatedLevel1.timestamp).toBe(originalLevel1.timestamp);
      expect(recreatedLevel1.bidPrice).toBe(originalLevel1.bidPrice);
      expect(recreatedLevel1.bidSize).toBe(originalLevel1.bidSize);
      expect(recreatedLevel1.askPrice).toBe(originalLevel1.askPrice);
      expect(recreatedLevel1.askSize).toBe(originalLevel1.askSize);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle high precision decimal prices", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "123.123456789012345", // bidPrice
        "0.987654321098765", // bidSize
        "123.123456789012346", // askPrice (slightly higher)
        "1.123456789012345" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidPrice).toBe("123.123456789012345");
      expect(level1.bidSize).toBe("0.987654321098765");
      expect(level1.askPrice).toBe("123.123456789012346");
      expect(level1.askSize).toBe("1.123456789012345");
    });

    it("should handle timestamps with different timezone formats", () => {
      const utcResult = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // bidPrice
        "1.0", // bidSize
        "100.50", // askPrice
        "1.0" // askSize
      );

      const offsetResult = Level1.create(
        "2025-07-21T12:00:00.000+00:00",
        "100.00", // bidPrice
        "1.0", // bidSize
        "100.50", // askPrice
        "1.0" // askSize
      );

      expect(isSuccess(utcResult)).toBe(true);
      expect(isSuccess(offsetResult)).toBe(true);
    });

    it("should handle very tight spreads", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "50000.00000000", // bidPrice
        "100.0", // bidSize
        "50000.00000001", // askPrice (minimal spread)
        "200.0" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidPrice).toBe("50000.00000000");
      expect(level1.askPrice).toBe("50000.00000001");
    });

    it("should handle very large sizes", () => {
      const result = Level1.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // bidPrice
        "999999999.99999999", // bidSize
        "100.50", // askPrice
        "888888888.88888888" // askSize
      );

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result);
      expect(level1.bidSize).toBe("999999999.99999999");
      expect(level1.askSize).toBe("888888888.88888888");
    });
  });
});
