/**
 * Unit tests for Price smart constructor
 * Tests the MD layer implementation of DSL Price interface
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import type { Price as DSLPrice } from "@qi/dp/dsl";
import { describe, expect, it } from "vitest";
import { Price } from "../../src/md/price.js";

describe("Price Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid Price with all required fields", () => {
      const result = Price.create(
        "2025-07-21T12:00:00.000Z",
        "65000.50",
        "1.5",
        "trade-123",
        "BUY"
      );

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(price.price).toBe("65000.50");
      expect(price.size).toBe("1.5");
      expect(price.tradeId).toBe("trade-123");
      expect(price.aggressor).toBe("BUY");
    });

    it("should create valid Price with only required fields", () => {
      const result = Price.create("2025-07-21T12:00:00.000Z", "100.25", "2.0");

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(price.price).toBe("100.25");
      expect(price.size).toBe("2.0");
      expect(price.tradeId).toBeUndefined();
      expect(price.aggressor).toBeUndefined();
    });

    it("should create valid Price with SELL aggressor", () => {
      const result = Price.create("2025-07-21T12:00:00.000Z", "50000.00", "0.5", undefined, "SELL");

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.aggressor).toBe("SELL");
      expect(price.tradeId).toBeUndefined();
    });

    describe("timestamp validation", () => {
      it("should reject invalid timestamp format", () => {
        const result = Price.create("invalid-timestamp", "100.00", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });

      it("should reject empty timestamp", () => {
        const result = Price.create("", "100.00", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP");
      });

      it("should reject non-ISO 8601 timestamp", () => {
        const result = Price.create("not-a-date-at-all", "100.00", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });
    });

    describe("price validation", () => {
      it("should reject zero price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "0", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "-100.00", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "not-a-number", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should reject empty price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "", "1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_EMPTY");
      });

      it("should accept very small positive price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "0.00000001", "1.0");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).price).toBe("0.00000001");
      });

      it("should accept very large price", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "999999999.99999999", "1.0");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).price).toBe("999999999.99999999");
      });
    });

    describe("size validation", () => {
      it("should reject zero size", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative size", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "-1.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric size", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "invalid");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very small positive size", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "0.00000001");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).size).toBe("0.00000001");
      });
    });

    describe("tradeId validation", () => {
      it("should reject empty tradeId when provided", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", "");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_STRING_EMPTY");
      });

      it("should accept undefined tradeId", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", undefined);

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).tradeId).toBeUndefined();
      });

      it("should accept valid tradeId", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", "TXN-12345");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).tradeId).toBe("TXN-12345");
      });
    });

    describe("aggressor validation", () => {
      it("should reject invalid aggressor value", () => {
        const result = Price.create(
          "2025-07-21T12:00:00.000Z",
          "100.00",
          "1.0",
          undefined,
          "INVALID" as any
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_AGGRESSOR");
      });

      it("should accept undefined aggressor", () => {
        const result = Price.create(
          "2025-07-21T12:00:00.000Z",
          "100.00",
          "1.0",
          undefined,
          undefined
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).aggressor).toBeUndefined();
      });

      it("should accept BUY aggressor", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", undefined, "BUY");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).aggressor).toBe("BUY");
      });

      it("should accept SELL aggressor", () => {
        const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", undefined, "SELL");

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).aggressor).toBe("SELL");
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create Price from valid DSL Price object", () => {
      const dslPrice: DSLPrice = {
        timestamp: "2025-07-21T12:00:00.000Z",
        price: "50000.00",
        size: "2.5",
        tradeId: "DSL-123",
        aggressor: "BUY",
      };

      const result = Price.fromDSL(dslPrice);

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(price.price).toBe("50000.00");
      expect(price.size).toBe("2.5");
      expect(price.tradeId).toBe("DSL-123");
      expect(price.aggressor).toBe("BUY");
    });

    it("should create Price from DSL object with minimal fields", () => {
      const dslPrice: DSLPrice = {
        timestamp: "2025-07-21T12:00:00.000Z",
        price: "75000.00",
        size: "1.0",
      };

      const result = Price.fromDSL(dslPrice);

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(price.price).toBe("75000.00");
      expect(price.size).toBe("1.0");
      expect(price.tradeId).toBeUndefined();
      expect(price.aggressor).toBeUndefined();
    });

    it("should fail validation for invalid DSL Price object", () => {
      const invalidDslPrice: DSLPrice = {
        timestamp: "invalid",
        price: "-100.00",
        size: "1.0",
      };

      const result = Price.fromDSL(invalidDslPrice);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with all fields", () => {
      const result = Price.create(
        "2025-07-21T12:00:00.000Z",
        "65000.50",
        "1.5",
        "trade-123",
        "BUY"
      );

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      const str = price.toString();

      expect(str).toContain("Price{");
      expect(str).toContain("timestamp: 2025-07-21T12:00:00.000Z");
      expect(str).toContain("price: 65000.50");
      expect(str).toContain("size: 1.5");
      expect(str).toContain("tradeId: trade-123");
      expect(str).toContain("aggressor: BUY");
    });

    it("should return formatted string with minimal fields", () => {
      const result = Price.create("2025-07-21T12:00:00.000Z", "50000.00", "2.0");

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      const str = price.toString();

      expect(str).toContain("Price{");
      expect(str).toContain("timestamp: 2025-07-21T12:00:00.000Z");
      expect(str).toContain("price: 50000.00");
      expect(str).toContain("size: 2.0");
      expect(str).not.toContain("tradeId:");
      expect(str).not.toContain("aggressor:");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object with all fields", () => {
      const result = Price.create(
        "2025-07-21T12:00:00.000Z",
        "65000.50",
        "1.5",
        "trade-123",
        "BUY"
      );

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      const obj = price.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        price: "65000.50",
        size: "1.5",
        tradeId: "trade-123",
        aggressor: "BUY",
      });
    });

    it("should return DSL-compatible object with minimal fields", () => {
      const result = Price.create("2025-07-21T12:00:00.000Z", "50000.00", "2.0");

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      const obj = price.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        price: "50000.00",
        size: "2.0",
      });

      expect(obj.tradeId).toBeUndefined();
      expect(obj.aggressor).toBeUndefined();
    });

    it("should return object that can be used with fromDSL", () => {
      const originalResult = Price.create(
        "2025-07-21T12:00:00.000Z",
        "65000.50",
        "1.5",
        "trade-123",
        "SELL"
      );

      expect(isSuccess(originalResult)).toBe(true);
      const originalPrice = getValue(originalResult);
      const obj = originalPrice.toObject();

      const recreatedResult = Price.fromDSL(obj);
      expect(isSuccess(recreatedResult)).toBe(true);

      const recreatedPrice = getValue(recreatedResult);
      expect(recreatedPrice.timestamp).toBe(originalPrice.timestamp);
      expect(recreatedPrice.price).toBe(originalPrice.price);
      expect(recreatedPrice.size).toBe(originalPrice.size);
      expect(recreatedPrice.tradeId).toBe(originalPrice.tradeId);
      expect(recreatedPrice.aggressor).toBe(originalPrice.aggressor);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle high precision decimal prices", () => {
      const result = Price.create(
        "2025-07-21T12:00:00.000Z",
        "123.123456789012345",
        "0.987654321098765"
      );

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.price).toBe("123.123456789012345");
      expect(price.size).toBe("0.987654321098765");
    });

    it("should handle timestamps with different timezone formats", () => {
      const utcResult = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0");

      const offsetResult = Price.create("2025-07-21T12:00:00.000+00:00", "100.00", "1.0");

      expect(isSuccess(utcResult)).toBe(true);
      expect(isSuccess(offsetResult)).toBe(true);
    });

    it("should handle very long tradeId", () => {
      const longTradeId = "A".repeat(100);
      const result = Price.create("2025-07-21T12:00:00.000Z", "100.00", "1.0", longTradeId);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).tradeId).toBe(longTradeId);
    });
  });
});
