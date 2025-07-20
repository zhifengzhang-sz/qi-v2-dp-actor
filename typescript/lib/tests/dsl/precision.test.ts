/**
 * Tests for financial precision arithmetic using decimal.js
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import { describe, expect, it } from "vitest";
import {
  FinancialDecimal,
  formatBasisPoints,
  formatPercentage,
  formatPrice,
  isFinancialDecimal,
  one,
  parsePrice,
  parseSize,
  zero,
} from "../../src/utils/market-data-precision.js";

describe("FinancialDecimal", () => {
  describe("creation", () => {
    it("should create from number", () => {
      const result = FinancialDecimal.create(123.456);

      expect(isSuccess(result)).toBe(true);
      const decimal = getValue(result);
      expect(decimal.toString()).toBe("123.456");
    });

    it("should create from string", () => {
      const result = FinancialDecimal.create("123.456789");

      expect(isSuccess(result)).toBe(true);
      const decimal = getValue(result);
      expect(decimal.toString()).toBe("123.456789");
    });

    it("should handle large numbers with precision", () => {
      const result = FinancialDecimal.create("123456789.123456789123456789");

      expect(isSuccess(result)).toBe(true);
      const decimal = getValue(result);
      expect(decimal.toString()).toBe("123456789.123456789123456789");
    });

    it("should reject NaN", () => {
      const result = FinancialDecimal.create(Number.NaN);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DECIMAL");
    });

    it("should reject Infinity", () => {
      const result = FinancialDecimal.create(Number.POSITIVE_INFINITY);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DECIMAL");
    });

    it("should reject invalid strings", () => {
      const result = FinancialDecimal.create("not-a-number");

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("DECIMAL_CREATION_ERROR");
    });
  });

  describe("price creation", () => {
    it("should create positive price", () => {
      const result = FinancialDecimal.createPrice(50000.99);

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result);
      expect(price.toString()).toBe("50000.99");
    });

    it("should reject zero price", () => {
      const result = FinancialDecimal.createPrice(0);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_PRICE");
    });

    it("should reject negative price", () => {
      const result = FinancialDecimal.createPrice(-100);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_PRICE");
    });
  });

  describe("size creation", () => {
    it("should create positive size", () => {
      const result = FinancialDecimal.createSize(1.5);

      expect(isSuccess(result)).toBe(true);
      const size = getValue(result);
      expect(size.toString()).toBe("1.5");
    });

    it("should allow zero size", () => {
      const result = FinancialDecimal.createSize(0);

      expect(isSuccess(result)).toBe(true);
      const size = getValue(result);
      expect(size.toString()).toBe("0");
    });

    it("should reject negative size", () => {
      const result = FinancialDecimal.createSize(-1);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_SIZE");
    });
  });

  describe("arithmetic operations", () => {
    it("should add decimals", () => {
      const a = getValue(FinancialDecimal.create(10.1));
      const b = getValue(FinancialDecimal.create(20.2));

      const result = a.add(b);
      expect(result.toString()).toBe("30.3");
    });

    it("should subtract decimals", () => {
      const a = getValue(FinancialDecimal.create(30.5));
      const b = getValue(FinancialDecimal.create(10.2));

      const result = a.subtract(b);
      expect(result.toString()).toBe("20.3");
    });

    it("should multiply decimals", () => {
      const a = getValue(FinancialDecimal.create(10.5));
      const b = getValue(FinancialDecimal.create(2));

      const result = a.multiply(b);
      expect(result.toString()).toBe("21");
    });

    it("should divide decimals", () => {
      const a = getValue(FinancialDecimal.create(21));
      const b = getValue(FinancialDecimal.create(2));

      const result = a.divide(b);
      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("10.5");
    });

    it("should handle division by zero", () => {
      const a = getValue(FinancialDecimal.create(21));
      const b = getValue(FinancialDecimal.create(0));

      const result = a.divide(b);
      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("DIVISION_BY_ZERO");
    });

    it("should maintain precision in calculations", () => {
      const a = getValue(FinancialDecimal.create("0.1"));
      const b = getValue(FinancialDecimal.create("0.2"));

      const result = a.add(b);
      expect(result.toString()).toBe("0.3"); // Should be exact, not 0.30000000000000004
    });
  });

  describe("comparison operations", () => {
    it("should compare equal decimals", () => {
      const a = getValue(FinancialDecimal.create(100));
      const b = getValue(FinancialDecimal.create(100));

      expect(a.equals(b)).toBe(true);
    });

    it("should compare less than", () => {
      const a = getValue(FinancialDecimal.create(50));
      const b = getValue(FinancialDecimal.create(100));

      expect(a.lessThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(false);
    });

    it("should compare greater than", () => {
      const a = getValue(FinancialDecimal.create(100));
      const b = getValue(FinancialDecimal.create(50));

      expect(a.greaterThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(false);
    });

    it("should handle precision in comparisons", () => {
      const a = getValue(FinancialDecimal.create("0.1"));
      const b = getValue(FinancialDecimal.create("0.10"));

      expect(a.equals(b)).toBe(true);
    });
  });

  describe("financial calculations", () => {
    it("should calculate percentage change", () => {
      const oldPrice = getValue(FinancialDecimal.create(100));
      const newPrice = getValue(FinancialDecimal.create(110));

      const result = oldPrice.percentageChange(newPrice);
      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("10");
    });

    it("should calculate negative percentage change", () => {
      const oldPrice = getValue(FinancialDecimal.create(100));
      const newPrice = getValue(FinancialDecimal.create(90));

      const result = oldPrice.percentageChange(newPrice);
      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("-10");
    });

    it("should handle zero base in percentage change", () => {
      const oldPrice = getValue(FinancialDecimal.create(0));
      const newPrice = getValue(FinancialDecimal.create(100));

      const result = oldPrice.percentageChange(newPrice);
      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("PERCENTAGE_CHANGE_ZERO_BASE");
    });

    it("should calculate basis points change", () => {
      const oldPrice = getValue(FinancialDecimal.create(100));
      const newPrice = getValue(FinancialDecimal.create(101));

      const result = oldPrice.basisPointsChange(newPrice);
      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("100"); // 1% = 100 basis points
    });

    it("should calculate bid-ask spread", () => {
      const bid = getValue(FinancialDecimal.create(99.5));
      const ask = getValue(FinancialDecimal.create(100.5));

      const result = FinancialDecimal.calculateSpread(bid, ask);
      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("1");
    });

    it("should detect crossed market", () => {
      const bid = getValue(FinancialDecimal.create(100.5));
      const ask = getValue(FinancialDecimal.create(99.5));

      const result = FinancialDecimal.calculateSpread(bid, ask);
      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("CROSSED_MARKET");
    });

    it("should calculate weighted average", () => {
      const prices = [
        getValue(FinancialDecimal.create(100)),
        getValue(FinancialDecimal.create(200)),
        getValue(FinancialDecimal.create(300)),
      ];
      const weights = [
        getValue(FinancialDecimal.create(1)),
        getValue(FinancialDecimal.create(2)),
        getValue(FinancialDecimal.create(3)),
      ];

      const result = FinancialDecimal.calculateWeightedAverage(prices, weights);
      expect(isSuccess(result)).toBe(true);

      // (100*1 + 200*2 + 300*3) / (1+2+3) = 1400 / 6 = 233.333...
      const avg = getValue(result);
      expect(avg.toFixed(6)).toBe("233.333333");
    });

    it("should handle mismatched array lengths", () => {
      const prices = [getValue(FinancialDecimal.create(100))];
      const weights = [getValue(FinancialDecimal.create(1)), getValue(FinancialDecimal.create(2))];

      const result = FinancialDecimal.calculateWeightedAverage(prices, weights);
      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("MISMATCHED_ARRAYS");
    });

    it("should handle empty arrays", () => {
      const result = FinancialDecimal.calculateWeightedAverage([], []);
      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("EMPTY_ARRAYS");
    });
  });

  describe("utility methods", () => {
    it("should check if zero", () => {
      const zero = getValue(FinancialDecimal.create(0));
      const nonZero = getValue(FinancialDecimal.create(1));

      expect(zero.isZero()).toBe(true);
      expect(nonZero.isZero()).toBe(false);
    });

    it("should check if positive", () => {
      const positive = getValue(FinancialDecimal.create(1));
      const zero = getValue(FinancialDecimal.create(0));
      const negative = getValue(FinancialDecimal.create(-1));

      expect(positive.isPositive()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(negative.isPositive()).toBe(false);
    });

    it("should check if negative", () => {
      const positive = getValue(FinancialDecimal.create(1));
      const zero = getValue(FinancialDecimal.create(0));
      const negative = getValue(FinancialDecimal.create(-1));

      expect(positive.isNegative()).toBe(false);
      expect(zero.isNegative()).toBe(false);
      expect(negative.isNegative()).toBe(true);
    });

    it("should calculate absolute value", () => {
      const positive = getValue(FinancialDecimal.create(123));
      const negative = getValue(FinancialDecimal.create(-123));

      expect(positive.abs().toString()).toBe("123");
      expect(negative.abs().toString()).toBe("123");
    });

    it("should format to fixed decimals", () => {
      const decimal = getValue(FinancialDecimal.create(123.456789));

      expect(decimal.toFixed(2)).toBe("123.46");
      expect(decimal.toFixed(4)).toBe("123.4568");
    });

    it("should format to precision", () => {
      const decimal = getValue(FinancialDecimal.create(123.456789));

      expect(decimal.toPrecision(4)).toBe("123.5");
      expect(decimal.toPrecision(6)).toBe("123.457");
    });

    it("should convert to number", () => {
      const decimal = getValue(FinancialDecimal.create(123.456));

      expect(decimal.toNumber()).toBe(123.456);
    });

    it("should serialize to JSON", () => {
      const decimal = getValue(FinancialDecimal.create(123.456));

      expect(JSON.stringify(decimal)).toBe('"123.456"');
    });
  });
});

describe("Utility functions", () => {
  describe("parsePrice", () => {
    it("should parse valid price string", () => {
      const result = parsePrice("50000.99");

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("50000.99");
    });

    it("should handle whitespace", () => {
      const result = parsePrice("  123.45  ");

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("123.45");
    });

    it("should reject empty string", () => {
      const result = parsePrice("");

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_PRICE_STRING");
    });

    it("should reject negative price string", () => {
      const result = parsePrice("-100");

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_PRICE");
    });
  });

  describe("parseSize", () => {
    it("should parse valid size string", () => {
      const result = parseSize("1.5");

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("1.5");
    });

    it("should allow zero size", () => {
      const result = parseSize("0");

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result).toString()).toBe("0");
    });

    it("should reject negative size string", () => {
      const result = parseSize("-1");

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_SIZE");
    });
  });

  describe("formatting functions", () => {
    it("should format price", () => {
      const price = getValue(FinancialDecimal.create(50000.123456));

      expect(formatPrice(price, 2)).toBe("50000.12");
      expect(formatPrice(price, 8)).toBe("50000.12345600");
    });

    it("should format percentage", () => {
      const percentage = getValue(FinancialDecimal.create(12.3456));

      expect(formatPercentage(percentage, 2)).toBe("12.35%");
      expect(formatPercentage(percentage, 1)).toBe("12.3%");
    });

    it("should format basis points", () => {
      const basisPoints = getValue(FinancialDecimal.create(123.456));

      expect(formatBasisPoints(basisPoints, 0)).toBe("123 bps");
      expect(formatBasisPoints(basisPoints, 2)).toBe("123.46 bps");
    });
  });

  describe("constants", () => {
    it("should create zero constant", () => {
      const zResult = zero();

      expect(zResult.tag).toBe("success");
      if (zResult.tag === "success") {
        expect(zResult.value.toString()).toBe("0");
        expect(zResult.value.isZero()).toBe(true);
      }
    });

    it("should create one constant", () => {
      const oResult = one();

      expect(oResult.tag).toBe("success");
      if (oResult.tag === "success") {
        expect(oResult.value.toString()).toBe("1");
        expect(oResult.value.isPositive()).toBe(true);
      }
    });
  });

  describe("type guards", () => {
    it("should identify FinancialDecimal instances", () => {
      const decimal = getValue(FinancialDecimal.create(123));
      const notDecimal = 123;

      expect(isFinancialDecimal(decimal)).toBe(true);
      expect(isFinancialDecimal(notDecimal)).toBe(false);
    });
  });
});
