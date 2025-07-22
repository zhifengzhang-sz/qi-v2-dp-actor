/**
 * Unit tests for OHLCV smart constructor
 * Tests the MD layer implementation of DSL OHLCV interface
 *
 * CORRECT PARAMETER ORDER: OHLCV.create(timestamp, open, high, low, close, volume, ...)
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import type { OHLCV as DSLOHLCV } from "@qi/dp/dsl";
import { describe, expect, it } from "vitest";
import { OHLCV } from "../../src/md/ohlcv.js";

describe("OHLCV Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid OHLCV with all required fields", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z", // timestamp
        "65000.00", // open
        "65500.00", // high
        "64800.00", // low
        "65200.00", // close
        "1250.75" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(ohlcv.open).toBe("65000.00");
      expect(ohlcv.high).toBe("65500.00");
      expect(ohlcv.low).toBe("64800.00");
      expect(ohlcv.close).toBe("65200.00");
      expect(ohlcv.volume).toBe("1250.75");
    });

    it("should create valid OHLCV with OHLC all equal", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z", // timestamp
        "50000.00", // open
        "50000.00", // high
        "50000.00", // low
        "50000.00", // close
        "100.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.open).toBe("50000.00");
      expect(ohlcv.high).toBe("50000.00");
      expect(ohlcv.low).toBe("50000.00");
      expect(ohlcv.close).toBe("50000.00");
    });

    it("should create valid OHLCV with zero volume", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z", // timestamp
        "100.00", // open
        "105.00", // high
        "95.00", // low
        "102.00", // close
        "0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.volume).toBe("0");
    });

    describe("timestamp validation", () => {
      it("should reject invalid timestamp format", () => {
        const result = OHLCV.create(
          "invalid-timestamp",
          "100.00",
          "105.00",
          "95.00",
          "102.00",
          "100.0"
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });

      it("should reject empty timestamp", () => {
        const result = OHLCV.create("", "100.00", "105.00", "95.00", "102.00", "100.0");

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP");
      });

      it("should reject non-ISO 8601 timestamp", () => {
        const result = OHLCV.create(
          "not-a-date-at-all",
          "100.00",
          "105.00",
          "95.00",
          "102.00",
          "100.0"
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });
    });

    describe("OHLC validation", () => {
      it("should reject zero open price", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "0", // open
          "105.00", // high
          "95.00", // low
          "102.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject negative high price", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "-105.00", // high
          "95.00", // low
          "102.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject non-numeric low price", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "105.00", // high
          "not-a-number", // low
          "102.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should reject zero close price", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "105.00", // high
          "95.00", // low
          "0", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });
    });

    describe("OHLC constraints validation", () => {
      it("should reject high < open", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "105.00", // open
          "100.00", // high < open
          "95.00", // low
          "102.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_OHLC_HIGH");
      });

      it("should reject high < close", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "102.00", // high
          "95.00", // low
          "105.00", // close > high
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_OHLC_HIGH");
      });

      it("should reject low > open", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "110.00", // high
          "105.00", // low > open
          "102.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_OHLC_LOW");
      });

      it("should reject low > close", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "105.00", // open
          "110.00", // high
          "103.00", // low
          "102.00", // close < low
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_OHLC_LOW");
      });

      it("should reject high < low", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "95.00", // high
          "105.00", // low > high
          "100.00", // close
          "100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_OHLC_HIGH");
      });

      it("should accept valid OHLC constraints", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "110.00", // high >= max(open, close)
          "90.00", // low <= min(open, close)
          "105.00", // close
          "100.0" // volume
        );

        expect(isSuccess(result)).toBe(true);
      });
    });

    describe("volume validation", () => {
      it("should reject negative volume", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "105.00", // high
          "95.00", // low
          "102.00", // close
          "-100.0" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_NON_NEGATIVE");
      });

      it("should reject non-numeric volume", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "105.00", // high
          "95.00", // low
          "102.00", // close
          "invalid" // volume
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_PATTERN");
      });

      it("should accept very large volume", () => {
        const result = OHLCV.create(
          "2025-07-21T12:00:00.000Z",
          "100.00", // open
          "105.00", // high
          "95.00", // low
          "102.00", // close
          "999999999.99999999" // volume
        );

        expect(isSuccess(result)).toBe(true);
        expect(getValue(result).volume).toBe("999999999.99999999");
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create OHLCV from valid DSL OHLCV object", () => {
      const dslOHLCV: DSLOHLCV = {
        timestamp: "2025-07-21T12:00:00.000Z",
        open: "65000.00",
        high: "65500.00",
        low: "64800.00",
        close: "65200.00",
        volume: "1250.75",
      };

      const result = OHLCV.fromDSL(dslOHLCV);

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(ohlcv.open).toBe("65000.00");
      expect(ohlcv.high).toBe("65500.00");
      expect(ohlcv.low).toBe("64800.00");
      expect(ohlcv.close).toBe("65200.00");
      expect(ohlcv.volume).toBe("1250.75");
    });

    it("should create OHLCV from DSL object with equal OHLC", () => {
      const dslOHLCV: DSLOHLCV = {
        timestamp: "2025-07-21T12:00:00.000Z",
        open: "50000.00",
        high: "50000.00",
        low: "50000.00",
        close: "50000.00",
        volume: "100.0",
      };

      const result = OHLCV.fromDSL(dslOHLCV);

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.open).toBe("50000.00");
      expect(ohlcv.high).toBe("50000.00");
      expect(ohlcv.low).toBe("50000.00");
      expect(ohlcv.close).toBe("50000.00");
    });

    it("should fail validation for invalid DSL OHLCV object", () => {
      const invalidDslOHLCV: DSLOHLCV = {
        timestamp: "invalid",
        open: "-100.00",
        high: "105.00",
        low: "95.00",
        close: "102.00",
        volume: "100.0",
      };

      const result = OHLCV.fromDSL(invalidDslOHLCV);

      expect(isFailure(result)).toBe(true);
    });

    it("should fail for invalid OHLC constraints in DSL object", () => {
      const invalidConstraintsDslOHLCV: DSLOHLCV = {
        timestamp: "2025-07-21T12:00:00.000Z",
        open: "105.00",
        high: "100.00", // high < open (invalid)
        low: "95.00",
        close: "102.00",
        volume: "100.0",
      };

      const result = OHLCV.fromDSL(invalidConstraintsDslOHLCV);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_OHLC_HIGH");
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with all fields", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "65000.00",
        "65500.00",
        "64800.00",
        "65200.00",
        "1250.75"
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      const str = ohlcv.toString();

      expect(str).toContain("OHLCV{");
      expect(str).toContain("timestamp: 2025-07-21T12:00:00.000Z");
      expect(str).toContain("O: 65000.00");
      expect(str).toContain("H: 65500.00");
      expect(str).toContain("L: 64800.00");
      expect(str).toContain("C: 65200.00");
      expect(str).toContain("V: 1250.75");
    });

    it("should return formatted string with equal OHLC", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "50000.00",
        "50000.00",
        "50000.00",
        "50000.00",
        "100.0"
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      const str = ohlcv.toString();

      expect(str).toContain("OHLCV{");
      expect(str).toContain("O: 50000.00");
      expect(str).toContain("H: 50000.00");
      expect(str).toContain("L: 50000.00");
      expect(str).toContain("C: 50000.00");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "65000.00",
        "65500.00",
        "64800.00",
        "65200.00",
        "1250.75"
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      const obj = ohlcv.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        open: "65000.00",
        high: "65500.00",
        low: "64800.00",
        close: "65200.00",
        volume: "1250.75",
      });
    });

    it("should return object that can be used with fromDSL", () => {
      const originalResult = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "65000.00",
        "65500.00",
        "64800.00",
        "65200.00",
        "1250.75"
      );

      expect(isSuccess(originalResult)).toBe(true);
      const originalOHLCV = getValue(originalResult);
      const obj = originalOHLCV.toObject();

      const recreatedResult = OHLCV.fromDSL(obj);
      expect(isSuccess(recreatedResult)).toBe(true);

      const recreatedOHLCV = getValue(recreatedResult);
      expect(recreatedOHLCV.timestamp).toBe(originalOHLCV.timestamp);
      expect(recreatedOHLCV.open).toBe(originalOHLCV.open);
      expect(recreatedOHLCV.high).toBe(originalOHLCV.high);
      expect(recreatedOHLCV.low).toBe(originalOHLCV.low);
      expect(recreatedOHLCV.close).toBe(originalOHLCV.close);
      expect(recreatedOHLCV.volume).toBe(originalOHLCV.volume);
    });
  });

  describe("helper methods", () => {
    it("should calculate range correctly", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // open
        "105.00", // high
        "95.00", // low
        "102.00", // close
        "1000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.getRange()).toBe(10); // 105 - 95
    });

    it("should calculate change correctly", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // open
        "105.00", // high
        "95.00", // low
        "102.00", // close
        "1000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.getChange()).toBe(2); // 102 - 100
    });

    it("should identify bullish candle", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // open
        "105.00", // high
        "95.00", // low
        "102.00", // close > open
        "1000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.isBullish()).toBe(true);
      expect(ohlcv.isBearish()).toBe(false);
    });

    it("should identify bearish candle", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "105.00", // open
        "105.00", // high
        "95.00", // low
        "98.00", // close < open
        "1000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.isBullish()).toBe(false);
      expect(ohlcv.isBearish()).toBe(true);
    });

    it("should identify doji candle", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // open
        "105.00", // high
        "95.00", // low
        "100.00", // close = open
        "1000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.isDoji()).toBe(true);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle high precision decimal prices", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "123.123456789012345", // open
        "123.123456789012346", // high (slightly higher)
        "123.123456789012344", // low (slightly lower)
        "123.123456789012345", // close (same as open)
        "0.987654321098765" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.open).toBe("123.123456789012345");
      expect(ohlcv.high).toBe("123.123456789012346");
      expect(ohlcv.low).toBe("123.123456789012344");
      expect(ohlcv.close).toBe("123.123456789012345");
      expect(ohlcv.volume).toBe("0.987654321098765");
    });

    it("should handle timestamps with different timezone formats", () => {
      const utcResult = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00",
        "105.00",
        "95.00",
        "102.00",
        "100.0"
      );

      const offsetResult = OHLCV.create(
        "2025-07-21T12:00:00.000+00:00",
        "100.00",
        "105.00",
        "95.00",
        "102.00",
        "100.0"
      );

      expect(isSuccess(utcResult)).toBe(true);
      expect(isSuccess(offsetResult)).toBe(true);
    });

    it("should handle very small price movements", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "50000.00000000", // open
        "50000.00000001", // high (minimal increase)
        "49999.99999999", // low (minimal decrease)
        "50000.00000000", // close (back to open)
        "1000000.0" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.open).toBe("50000.00000000");
      expect(ohlcv.high).toBe("50000.00000001");
      expect(ohlcv.low).toBe("49999.99999999");
      expect(ohlcv.close).toBe("50000.00000000");
    });

    it("should handle very large volume", () => {
      const result = OHLCV.create(
        "2025-07-21T12:00:00.000Z",
        "100.00", // open
        "200.00", // high
        "50.00", // low
        "150.00", // close
        "999999999.99999999" // volume
      );

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result);
      expect(ohlcv.volume).toBe("999999999.99999999");
    });
  });
});
